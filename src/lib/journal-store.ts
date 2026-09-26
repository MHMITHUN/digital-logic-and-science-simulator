/**
 * External store for the experiment journal (client-only module).
 *
 * localStorage sits behind useSyncExternalStore: React reads through
 * getJournalSnapshot during render and writes go through writeJournal,
 * which notifies every subscriber. Two open tabs stay in sync for free
 * via the storage event. getSnapshot must return a stable reference for
 * unchanged raw data, so the parsed entries are cached per raw string.
 */

import { JOURNAL_STORAGE_KEY, parseStoredJournal, type JournalEntry } from "./journal";

const EMPTY: JournalEntry[] = [];

interface Snapshot {
  raw: string | null;
  entries: JournalEntry[];
}

let cache: Snapshot = { raw: null, entries: EMPTY };
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(JOURNAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Subscribe to journal changes (same-tab writes and cross-tab storage events). */
export function subscribeJournal(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === JOURNAL_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

/** Client snapshot — cached so identical storage state returns the same array. */
export function getJournalSnapshot(): JournalEntry[] {
  const raw = readRaw();
  if (raw !== cache.raw) {
    cache = { raw, entries: parseStoredJournal(raw) };
  }
  return cache.entries;
}

/** Server snapshot: the journal is per-browser, so SSR and hydration see an empty list. */
export function getJournalServerSnapshot(): JournalEntry[] {
  return EMPTY;
}

/**
 * Persist the journal and notify every subscriber. Returns false when the
 * browser refuses the write (blocked storage / private mode) — the in-page
 * cache still updates so an export stays possible.
 */
export function writeJournal(entries: JournalEntry[]): boolean {
  const raw = JSON.stringify(entries);
  cache = { raw, entries };
  let ok = true;
  try {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, raw);
  } catch {
    ok = false;
  }
  listeners.forEach((listener) => listener());
  return ok;
}
