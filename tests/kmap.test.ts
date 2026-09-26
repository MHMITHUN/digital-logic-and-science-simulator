import { describe, expect, it } from "vitest";
import {
  findGroups,
  grayOrder,
  kmapGrid,
  resultSop,
  sopExpression,
  toBits,
  validateGroup,
} from "@/engines/kmap";

describe("grayOrder", () => {
  it("returns the reflected Gray sequence for each width", () => {
    expect(grayOrder(1)).toEqual([0, 1]);
    expect(grayOrder(2)).toEqual([0, 1, 3, 2]);
    expect(grayOrder(3)).toEqual([0, 1, 3, 2, 6, 7, 5, 4]);
    expect(grayOrder(4)).toEqual([
      0, 1, 3, 2, 6, 7, 5, 4, 12, 13, 15, 14, 10, 11, 9, 8,
    ]);
  });

  it("adjacent entries differ in exactly one bit", () => {
    const order = grayOrder(4);
    for (let i = 0; i < order.length; i += 1) {
      const next = order[(i + 1) % order.length];
      const diff = order[i] ^ next;
      expect(diff && (diff & (diff - 1))).toBe(0); // power of two
    }
  });

  it("rejects widths outside 1..4", () => {
    expect(() => grayOrder(5)).toThrow(/1 to 4/);
    expect(() => grayOrder(0)).toThrow();
  });
});

describe("toBits", () => {
  it("splits values most-significant-bit first", () => {
    expect(toBits(5, 3)).toEqual([1, 0, 1]);
    expect(toBits(0, 2)).toEqual([0, 0]);
  });
});

describe("kmapGrid", () => {
  it("lays out 2 variables as a 2x2 grid with correct minterm numbering", () => {
    const grid = kmapGrid("A.B");
    expect(grid.vars).toEqual(["A", "B"]);
    expect(grid.cells).toHaveLength(2);
    expect(grid.cells[0]).toHaveLength(2);
    // Row 0 (A=0): minterms 0, 1 across Gray-ordered columns; row 1: 2, 3.
    expect(grid.cells[0].map((cell) => cell.minterm)).toEqual([0, 1]);
    expect(grid.cells[1].map((cell) => cell.minterm)).toEqual([2, 3]);
    expect(grid.minterms).toEqual([3]);
  });

  it("lays out 3 variables as 2x4 with Gray-ordered columns", () => {
    const grid = kmapGrid("A+B+C");
    expect(grid.rowLabels).toEqual(["0", "1"]);
    expect(grid.colLabels).toEqual(["00", "01", "11", "10"]);
    // A=0 row: B,C combinations 00,01,11,10 -> minterms 0,1,3,2.
    expect(grid.cells[0].map((cell) => cell.minterm)).toEqual([0, 1, 3, 2]);
    // A=1 row: minterms 4,5,7,6.
    expect(grid.cells[1].map((cell) => cell.minterm)).toEqual([4, 5, 7, 6]);
    expect(grid.minterms).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("lays out 4 variables as 4x4 with Gray labels on both axes", () => {
    const grid = kmapGrid("A.B.C.D");
    expect(grid.rowLabels).toEqual(["00", "01", "11", "10"]);
    expect(grid.colLabels).toEqual(["00", "01", "11", "10"]);
    expect(grid.cells).toHaveLength(4);
    grid.cells.forEach((row) => expect(row).toHaveLength(4));
  });

  it("rejects expressions with fewer than 2 or more than 4 variables", () => {
    expect(() => kmapGrid("A")).toThrow(/2, 3, or 4/);
    expect(() => kmapGrid("A+B+C+D+E")).toThrow();
  });
});

describe("sopExpression", () => {
  it("builds the canonical SOP from minterms", () => {
    expect(sopExpression("A.B")).toBe("AB");
    expect(sopExpression("A^B")).toBe("A'B + AB'");
    expect(sopExpression("A.B'")).toBe("AB'");
  });

  it("returns 0 for never-true and 1 for always-true expressions", () => {
    expect(sopExpression("A.!A")).toBe("0");
    expect(sopExpression("A+A'")).toBe("1");
  });
});

describe("findGroups", () => {
  it("finds the single-cell group for A.B", () => {
    const groups = findGroups(kmapGrid("A.B"));
    expect(groups).toHaveLength(1);
    expect(groups[0].minterms).toEqual([3]);
    expect(groups[0].term).toBe("AB");
    expect(resultSop(groups)).toBe("AB");
  });

  it("covers the whole map with one group for a tautology", () => {
    const groups = findGroups(kmapGrid("(A+A').(B+B')"));
    expect(groups).toHaveLength(1);
    expect(groups[0].size).toBe(4);
    expect(groups[0].term).toBe("1");
    expect(resultSop(groups)).toBe("1");
  });

  it("returns no groups when the map is empty of 1s", () => {
    const groups = findGroups(kmapGrid("A.!A.B"));
    expect(groups).toEqual([]);
    expect(resultSop(groups)).toBe("0");
  });

  it("finds a wraparound corner group on a 4-variable map", () => {
    // !B.!D with A and C padding so all four variables are present:
    // true exactly at the four corners (minterms 0, 2, 8, 10).
    const grid = kmapGrid("!B.!D.(A+A').(C+C')");
    expect(grid.minterms).toEqual([0, 2, 8, 10]);
    const groups = findGroups(grid);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toEqual([0, 3]);
    expect(groups[0].cols).toEqual([0, 3]);
    expect(groups[0].size).toBe(4);
    expect(groups[0].term).toBe("B'D'");
    expect(resultSop(groups)).toBe("B'D'");
  });

  it("finds the minimal two-group cover for A.B + A.C", () => {
    const groups = findGroups(kmapGrid("A.B + A.C"));
    expect(groups).toHaveLength(2);
    expect(resultSop(groups)).toBe("AC + AB");
  });
});

describe("validateGroup", () => {
  const grid2 = kmapGrid("A.B");
  const grid3 = kmapGrid("A+B+C");

  it("accepts a single cell", () => {
    const check = validateGroup([3], grid2);
    expect(check.valid).toBe(true);
    expect(check.reason).toContain("Valid group");
  });

  it("accepts a full row or column (2 cells)", () => {
    expect(validateGroup([1, 3], grid2).valid).toBe(true); // column B=1
    expect(validateGroup([0, 2], grid2).valid).toBe(true); // column B=0
  });

  it("accepts wraparound column groups on the 3-variable map", () => {
    // BC = 00 and 10 sit at the far edges of the column axis and wrap.
    expect(validateGroup([0, 2], grid3).valid).toBe(true);
  });

  it("rejects a non-rectangular selection", () => {
    const check = validateGroup([0, 3], grid3); // BC = 00 and 11: not adjacent
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("rectangle");
  });

  it("rejects a rectangle with a hole", () => {
    const check = validateGroup([0, 1, 3], grid2);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("hole");
  });

  it("rejects three cells in a line (not a power of two)", () => {
    // 3-variable map row A=1 with BC = 00, 01, 11 -> 3 cells in a row.
    const check = validateGroup([4, 5, 7], grid3);
    expect(check.valid).toBe(false);
  });

  it("rejects an empty selection", () => {
    const check = validateGroup([], grid2);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("at least one cell");
  });
});
