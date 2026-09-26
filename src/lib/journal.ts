/**
 * Experiment journal: types, validation, CSV export, and localStorage
 * access (pure TypeScript + zod — no React).
 *
 * Spec §16.9: students record experiment, inputs, prediction, actual
 * result, observation, and conclusion. Data lives in this browser only
 * (localStorage) — there is no server.
 */

import { z } from "zod";

/** localStorage key for the saved journal (versioned for future format changes). */
export const JOURNAL_STORAGE_KEY = "logic-science-journal-v1";

export const JOURNAL_MODULE_IDS = [
  "logic",
  "circuit",
  "number-system",
  "boolean",
  "physics",
  "other",
] as const;

export type JournalModuleId = (typeof JOURNAL_MODULE_IDS)[number];

export const JOURNAL_MODULE_LABELS: Record<JournalModuleId, string> = {
  logic: "Logic Gates",
  circuit: "Circuit Builder",
  "number-system": "Number Systems",
  boolean: "Boolean & K-map",
  physics: "Physics Circuits",
  other: "Other / Free experiment",
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Shape of a stored entry. Kept permissive: it gates corrupt data, not users. */
export const journalEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  experiment: z.string(),
  module: z.enum(JOURNAL_MODULE_IDS),
  inputs: z.string(),
  prediction: z.string(),
  result: z.string(),
  observation: z.string(),
  conclusion: z.string(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

/** The add-form: what the student fills in. Observation/conclusion may wait. */
export const journalFormSchema = z.object({
  experiment: z
    .string()
    .trim()
    .min(1, "Give the experiment a short name — e.g. “AND gate, A=1 B=1”.")
    .max(120, "Keep the name to 120 characters or fewer."),
  module: z.enum(JOURNAL_MODULE_IDS, {
    error: "Choose the module this experiment belongs to.",
  }),
  inputs: z
    .string()
    .trim()
    .min(1, "Write the inputs you set — e.g. A=1, B=0 or 12 V across 10 Ω.")
    .max(400, "Keep the inputs note to 400 characters or fewer."),
  prediction: z
    .string()
    .trim()
    .min(1, "Write your prediction before you check — a guess you can test.")
    .max(400, "Keep the prediction to 400 characters or fewer."),
  result: z
    .string()
    .trim()
    .min(1, "Record what actually happened — the actual output or value.")
    .max(400, "Keep the result to 400 characters or fewer."),
  observation: z.string().trim().max(800, "Keep the observation to 800 characters or fewer."),
  conclusion: z.string().trim().max(800, "Keep the conclusion to 800 characters or fewer."),
});

export type JournalFormValues = z.infer<typeof journalFormSchema>;

/** Field keys of the add form, in display order. */
export const JOURNAL_FORM_FIELDS = [
  "experiment",
  "module",
  "inputs",
  "prediction",
  "result",
  "observation",
  "conclusion",
] as const;

// ---------------------------------------------------------------------------
// Creation and storage
// ---------------------------------------------------------------------------

function makeId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Turn validated form values into a dated, addressed journal entry. */
export function createEntry(form: JournalFormValues): JournalEntry {
  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    ...form,
  };
}

/** Read the journal from localStorage; never throws (private mode, blocked storage). */
export function loadJournal(): JournalEntry[] {
  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    return parseStoredJournal(raw);
  } catch {
    return [];
  }
}

/** Persist the journal. Returns false when storage is unavailable. */
export function saveJournal(entries: JournalEntry[]): boolean {
  try {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse raw stored JSON into valid entries. Corrupt JSON, non-array data,
 * and entries that fail the schema are dropped — one bad row must never
 * take the whole journal down.
 */
export function parseStoredJournal(raw: string | null): JournalEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (entry): entry is JournalEntry => journalEntrySchema.safeParse(entry).success,
  );
}

/** Newest first — the journal lists the latest experiment on top. */
export function sortEntriesNewestFirst(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  "Date",
  "Experiment",
  "Module",
  "Inputs used",
  "My prediction",
  "Actual result",
  "Observation",
  "Conclusion",
] as const;

/** RFC 4180 escaping: quote a field that contains a comma, quote, or newline. */
export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialize entries to CSV (header row + one row per entry, given order). */
export function journalCsv(entries: JournalEntry[]): string {
  const rows = entries.map((entry) => [
    entry.createdAt,
    entry.experiment,
    JOURNAL_MODULE_LABELS[entry.module],
    entry.inputs,
    entry.prediction,
    entry.result,
    entry.observation,
    entry.conclusion,
  ]);
  return [CSV_COLUMNS, ...rows]
    .map((row) => row.map((cell) => escapeCsvField(cell)).join(","))
    .join("\r\n");
}
