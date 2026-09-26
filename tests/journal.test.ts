import { describe, expect, it } from "vitest";
import {
  CSV_COLUMNS,
  createEntry,
  escapeCsvField,
  journalCsv,
  journalFormSchema,
  parseStoredJournal,
  sortEntriesNewestFirst,
  type JournalEntry,
} from "@/lib/journal";

function sampleEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "entry-1",
    createdAt: "2026-09-01T10:00:00.000Z",
    experiment: "AND gate, A=1 B=1",
    module: "logic",
    inputs: "A=1, B=1",
    prediction: "Output will be 1",
    result: "Y=1",
    observation: "Both switches on, lamp lit",
    conclusion: "AND needs both inputs",
    ...overrides,
  };
}

describe("escapeCsvField", () => {
  it("leaves plain fields untouched", () => {
    expect(escapeCsvField("A=1 B=0")).toBe("A=1 B=0");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("A=1, B=0")).toBe('"A=1, B=0"');
  });

  it("doubles embedded quotes and wraps the field", () => {
    expect(escapeCsvField('said "on"')).toBe('"said ""on"""');
  });

  it("quotes fields containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("journalCsv", () => {
  it("writes the header row plus one row per entry", () => {
    const csv = journalCsv([sampleEntry()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("AND gate, A=1 B=1"); // inside quotes
  });

  it("escapes commas inside fields so columns stay aligned", () => {
    const csv = journalCsv([sampleEntry({ inputs: "A=1, B=0" })]);
    const dataRow = csv.split("\r\n")[1];
    // Date,experiment,module are comma-free; the inputs field must be one quoted cell.
    expect(dataRow).toMatch(/^2026-09-01T10:00:00.000Z,"AND gate, A=1 B=1",Logic Gates,"A=1, B=0",/);
  });

  it("renders module ids as human labels", () => {
    const csv = journalCsv([sampleEntry({ module: "physics" })]);
    expect(csv).toContain("Physics Circuits");
  });

  it("exports an empty journal as just the header", () => {
    expect(journalCsv([])).toBe(CSV_COLUMNS.join(","));
  });
});

describe("createEntry", () => {
  it("fills in id and createdAt around the form values", () => {
    const form = {
      experiment: "XOR truth table",
      module: "logic" as const,
      inputs: "A=0, B=1",
      prediction: "1",
      result: "1",
      observation: "",
      conclusion: "XOR detects difference",
    };
    const entry = createEntry(form);
    expect(entry.id).toMatch(/./); // non-empty
    expect(Number.isNaN(Date.parse(entry.createdAt))).toBe(false);
    expect(entry.experiment).toBe("XOR truth table");
  });
});

describe("journalFormSchema", () => {
  const valid = {
    experiment: "AND gate",
    module: "logic" as const,
    inputs: "A=1, B=0",
    prediction: "0",
    result: "0",
    observation: "",
    conclusion: "",
  };

  it("accepts a minimal complete form", () => {
    expect(journalFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty experiment name with a teaching message", () => {
    const result = journalFormSchema.safeParse({ ...valid, experiment: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      const experimentIssue = result.error.issues.find((issue) => issue.path[0] === "experiment");
      expect(experimentIssue?.message).toMatch(/short name/i);
    }
  });

  it("rejects an unknown module", () => {
    const result = journalFormSchema.safeParse({ ...valid, module: "chemistry" });
    expect(result.success).toBe(false);
  });

  it("requires a prediction", () => {
    const result = journalFormSchema.safeParse({ ...valid, prediction: "" });
    expect(result.success).toBe(false);
  });
});

describe("parseStoredJournal", () => {
  it("returns an empty list for null, empty, or corrupt JSON", () => {
    expect(parseStoredJournal(null)).toEqual([]);
    expect(parseStoredJournal("")).toEqual([]);
    expect(parseStoredJournal("{not json")).toEqual([]);
  });

  it("returns an empty list when the stored value is not an array", () => {
    expect(parseStoredJournal('{"experiment":"AND"}')).toEqual([]);
  });

  it("drops invalid entries but keeps valid ones", () => {
    const raw = JSON.stringify([
      sampleEntry(),
      { id: "broken" }, // missing required fields
      sampleEntry({ id: "entry-2", module: "physics" }),
    ]);
    const entries = parseStoredJournal(raw);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.id)).toEqual(["entry-1", "entry-2"]);
  });

  it("survives a full save/load round trip", () => {
    const entries = [sampleEntry(), sampleEntry({ id: "entry-2" })];
    expect(parseStoredJournal(JSON.stringify(entries))).toEqual(entries);
  });
});

describe("sortEntriesNewestFirst", () => {
  it("orders newest first and does not mutate the input", () => {
    const older = sampleEntry({ id: "older", createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = sampleEntry({ id: "newer", createdAt: "2026-09-27T00:00:00.000Z" });
    const input = [older, newer];
    expect(sortEntriesNewestFirst(input).map((entry) => entry.id)).toEqual(["newer", "older"]);
    expect(input.map((entry) => entry.id)).toEqual(["older", "newer"]);
  });
});
