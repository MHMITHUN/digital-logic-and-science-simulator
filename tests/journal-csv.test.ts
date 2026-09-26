import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, journalCsv, type JournalEntry } from "@/lib/journal";

/**
 * CSV serialization deep-dive (complements tests/journal.test.ts): field
 * escaping is verified by round-tripping the exported text through a small
 * RFC 4180 parser written here — whatever a student types must come back
 * out of the CSV as exactly one field per column.
 */

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
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

/** Minimal RFC 4180 parser: quotes wrap fields, "" is a literal quote. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" && text[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

describe("journalCsv escaping", () => {
  it("leaves a field of plain text completely untouched", () => {
    const csv = journalCsv([entry({ inputs: "A=1 B=0" })]);
    expect(csv).toContain("A=1 B=0");
    expect(csv).not.toContain('"A=1 B=0"');
  });

  it("escapes a comma so the column count stays 8 per row", () => {
    const rows = parseCsv(journalCsv([entry({ inputs: "V=12, R=4" })]));
    expect(rows).toHaveLength(2); // header + data
    expect(rows[0]).toHaveLength(CSV_COLUMNS.length);
    expect(rows[1]).toHaveLength(CSV_COLUMNS.length);
    expect(rows[1][3]).toBe("V=12, R=4");
  });

  it("doubles embedded quotes and round-trips them", () => {
    const tricky = 'I predicted "on" — teacher said "good guess"';
    const rows = parseCsv(journalCsv([entry({ prediction: tricky })]));
    expect(rows[1][4]).toBe(tricky);
    expect(journalCsv([entry({ prediction: tricky })])).toContain('"good guess""');
  });

  it("keeps an embedded newline inside one field, not as a new row", () => {
    const twoLines = "line one\nline two";
    const csv = journalCsv([entry({ observation: twoLines })]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2); // the newline must not add a record
    expect(rows[1][6]).toBe(twoLines);
  });

  it("keeps an embedded CRLF inside one field as well", () => {
    const csv = journalCsv([entry({ conclusion: "first\r\nsecond" })]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1][7]).toBe("first\r\nsecond");
  });

  it("survives every field being nasty at once", () => {
    const nasty = 'a,b "c"\r\nd';
    const csv = journalCsv([
      entry({
        experiment: nasty,
        inputs: nasty,
        prediction: nasty,
        result: nasty,
        observation: nasty,
        conclusion: nasty,
      }),
    ]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    // Every text field (all but date and module label) survives verbatim.
    for (const index of [1, 3, 4, 5, 6, 7]) {
      expect(rows[1][index]).toBe(nasty);
    }
    // The row still has exactly 8 cells despite 6 of them being hostile.
    expect(rows[1]).toHaveLength(8);
  });

  it("round-trips two entries without their fields bleeding into each other", () => {
    const csv = journalCsv([
      entry({ id: "a", inputs: "1,000 ohms", result: 'I = "1" A' }),
      entry({
        id: "b",
        createdAt: "2026-09-02T10:00:00.000Z",
        experiment: "Second\nexperiment",
        module: "physics",
      }),
    ]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1][3]).toBe("1,000 ohms");
    expect(rows[1][5]).toBe('I = "1" A');
    expect(rows[2][1]).toBe("Second\nexperiment");
    expect(rows[2][2]).toBe("Physics Circuits");
  });
});

describe("journalCsv format details", () => {
  it("separates records with CRLF as RFC 4180 specifies", () => {
    const csv = journalCsv([entry(), entry({ id: "b" })]);
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(false); // no trailing empty record
  });

  it("starts directly with the header — the UTF-8 BOM is added by the UI, not here", () => {
    expect(journalCsv([entry()]).startsWith(CSV_COLUMNS.join(","))).toBe(true);
  });

  it("always writes the header, even for an empty journal", () => {
    expect(journalCsv([])).toBe(CSV_COLUMNS.join(","));
  });
});
