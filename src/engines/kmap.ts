/**
 * Karnaugh map engine (pure TypeScript, no React).
 *
 * Builds Gray-coded K-maps for 2, 3, or 4 variables from a Boolean
 * expression, finds a minimal rectangular group cover (powers of two,
 * including wraparound edges and corners), validates student-selected
 * groups, and turns groups back into a simplified SOP expression.
 *
 * All computation is real: the map is generated from the expression's own
 * truth table — nothing is looked up from a canned list.
 */

import { truthTable } from "./boolean";
import type { Bit } from "./logic";

// ---------------------------------------------------------------------------
// Gray code
// ---------------------------------------------------------------------------

/**
 * Gray code ordering for `n` bits (n = 1..4), e.g. n=2 -> [0, 1, 3, 2]
 * (binary 00, 01, 11, 10). Adjacent values differ in exactly one bit.
 */
export function grayOrder(n: number): number[] {
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    throw new Error(
      `Gray code order needs 1 to 4 bits — received ${n}. K-maps in this lab cover 2 to 4 variables.`,
    );
  }
  return Array.from({ length: 2 ** n }, (_, i) => i ^ (i >> 1));
}

/** Split a value into `width` bits, most significant first. */
export function toBits(value: number, width: number): Bit[] {
  return Array.from({ length: width }, (_, i) => ((value >> (width - 1 - i)) & 1) as Bit);
}

// ---------------------------------------------------------------------------
// Grid construction
// ---------------------------------------------------------------------------

export interface KMapCell {
  /** Canonical minterm number (variables in alphabetical order, first = MSB). */
  minterm: number;
  value: Bit;
}

export interface KMapGrid {
  /** All variables, alphabetical (e.g. ["A","B","C"]). */
  vars: string[];
  /** Variables laid out on the vertical axis. */
  rowVars: string[];
  /** Variables laid out on the horizontal axis. */
  colVars: string[];
  /** Row/column labels in Gray order, e.g. ["00","01","11","10"]. */
  rowLabels: string[];
  colLabels: string[];
  /** Bit combinations behind each label (parallel to the label arrays). */
  rowBits: Bit[][];
  colBits: Bit[][];
  /** cells[row][col] — 2x2, 2x4, or 4x4 depending on variable count. */
  cells: KMapCell[][];
  /** Minterm numbers where the output is 1. */
  minterms: number[];
  /** Canonical SOP of the source expression (for comparison). */
  sop: string;
}

/**
 * Build the K-map grid for a Boolean expression with 2, 3, or 4 variables.
 * Layouts: 2 vars -> 2x2, 3 vars -> 2x4, 4 vars -> 4x4.
 */
export function kmapGrid(expr: string): KMapGrid {
  const table = truthTable(expr);
  const vars = table.vars;
  if (vars.length < 2 || vars.length > 4) {
    throw new Error(
      `A Karnaugh map needs 2, 3, or 4 variables — this expression has ${vars.length}.`,
    );
  }

  const rowVarCount = vars.length === 4 ? 2 : 1;
  const rowVars = vars.slice(0, rowVarCount);
  const colVars = vars.slice(rowVarCount);

  const rowCodes = grayOrder(rowVars.length);
  const colCodes = grayOrder(colVars.length);
  const rowBits = rowCodes.map((code) => toBits(code, rowVars.length));
  const colBits = colCodes.map((code) => toBits(code, colVars.length));

  const oneMinterms = new Set(table.minterms);
  const cells: KMapCell[][] = rowBits.map((rowCombo) =>
    colBits.map((colCombo) => {
      const bits: Bit[] = [...rowCombo, ...colCombo];
      const minterm = bits.reduce((acc: number, bit) => acc * 2 + bit, 0);
      return { minterm, value: (oneMinterms.has(minterm) ? 1 : 0) as Bit };
    }),
  );

  return {
    vars,
    rowVars,
    colVars,
    rowLabels: rowBits.map((bits) => bits.join("")),
    colLabels: colBits.map((bits) => bits.join("")),
    rowBits,
    colBits,
    cells,
    minterms: table.minterms,
    sop: sopExpression(expr),
  };
}

/**
 * Canonical sum-of-products for an expression: one product term per 1-minterm.
 * Returns "0" when never true, "1" when always true.
 */
export function sopExpression(expr: string): string {
  const table = truthTable(expr);
  if (table.minterms.length === 0) return "0";
  if (table.minterms.length === 2 ** table.vars.length) return "1";

  const terms = table.minterms.map((minterm) => {
    const bits = toBits(minterm, table.vars.length);
    return table.vars
      .map((name, index) => (bits[index] === 1 ? name : `${name}'`))
      .join("");
  });
  return terms.join(" + ");
}

// ---------------------------------------------------------------------------
// Group finding
// ---------------------------------------------------------------------------

export interface KMapGroup {
  /** Row indices of the rectangle (into grid.rowBits). */
  rows: number[];
  /** Column indices of the rectangle (into grid.colBits). */
  cols: number[];
  /** Minterm numbers covered. */
  minterms: number[];
  /** Number of cells in the group (a power of two). */
  size: number;
  /** Product term for this group, e.g. "A.C'" — or "1" for the whole map. */
  term: string;
  /** Literal count in `term` (0 for "1"). */
  literals: number;
}

/**
 * All contiguous-cyclic index subsets of `dim` positions whose length is a
 * power of two (1, 2, 4). Covers wraparound pairs like {0, dim-1}.
 */
function cyclicSubsets(dim: number): number[][] {
  const sizes = [1, 2, 4, 8, 16].filter((size) => size <= dim);
  const seen = new Set<string>();
  const subsets: number[][] = [];
  for (const size of sizes) {
    for (let start = 0; start < dim; start += 1) {
      const subset = Array.from({ length: size }, (_, k) => (start + k) % dim).sort(
        (a, b) => a - b,
      );
      const key = subset.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        subsets.push(subset);
      }
    }
  }
  return subsets;
}

/**
 * Product term for a rectangle of cells: variables that stay constant
 * across the rectangle survive, the rest drop out. Exported so the
 * K-map exercise can label each student-accepted group with its term
 * (the UI never re-derives Boolean logic itself).
 */
export function groupTerm(grid: KMapGrid, rows: number[], cols: number[]): { term: string; literals: number } {
  const literals: string[] = [];
  grid.vars.forEach((name, varIndex) => {
    const isRowVar = varIndex < grid.rowVars.length;
    const combos = isRowVar ? grid.rowBits : grid.colBits;
    const indices = isRowVar ? rows : cols;
    const bitIndex = isRowVar ? varIndex : varIndex - grid.rowVars.length;
    const values = new Set(indices.map((i) => combos[i][bitIndex]));
    if (values.size === 1) {
      literals.push(values.has(1) ? name : `${name}'`);
    }
  });
  return {
    term: literals.length > 0 ? literals.join("") : "1",
    literals: literals.length,
  };
}

function makeCandidateGroups(grid: KMapGrid): KMapGroup[] {
  const rowSubsets = cyclicSubsets(grid.rowBits.length);
  const colSubsets = cyclicSubsets(grid.colBits.length);
  const groups: KMapGroup[] = [];

  for (const rows of rowSubsets) {
    for (const cols of colSubsets) {
      const minterms: number[] = [];
      let allOnes = true;
      for (const row of rows) {
        for (const col of cols) {
          const cell = grid.cells[row][col];
          minterms.push(cell.minterm);
          if (cell.value !== 1) allOnes = false;
        }
      }
      if (!allOnes) continue;
      const { term, literals } = groupTerm(grid, rows, cols);
      groups.push({
        rows,
        cols,
        minterms: minterms.sort((a, b) => a - b),
        size: rows.length * cols.length,
        term,
        literals,
      });
    }
  }
  return groups;
}

/**
 * Minimal group cover of all 1-cells: fewest groups first, then fewest
 * total literals. Runs an exact branch-on-first-uncovered-cell search
 * (the grid has at most 16 cells, so this is fast and truly minimal).
 */
export function findGroups(grid: KMapGrid): KMapGroup[] {
  const ones: number[] = [];
  grid.cells.forEach((rowCells) =>
    rowCells.forEach((cell) => {
      if (cell.value === 1) ones.push(cell.minterm);
    }),
  );
  if (ones.length === 0) return [];

  const candidates = makeCandidateGroups(grid);
  const oneIndex = new Map(ones.map((minterm, index) => [minterm, index]));
  const candidateMasks = candidates.map((group) => {
    let mask = 0;
    group.minterms.forEach((minterm) => {
      const index = oneIndex.get(minterm);
      if (index !== undefined) mask |= 1 << index;
    });
    return mask;
  });
  // Try strongest candidates first so the bound tightens quickly.
  const order = candidates
    .map((_, i) => i)
    .sort((a, b) => candidateMasks[b].toString(2).length - candidateMasks[a].toString(2).length);

  const allCovered = (1 << ones.length) - 1;
  // Holder object so assignments inside the recursive closure stay typed.
  const best = { groups: null as KMapGroup[] | null, literals: Infinity };
  const picked: number[] = [];

  const search = (covered: number, literalsSum: number): void => {
    if (covered === allCovered) {
      const bestLength = best.groups ? best.groups.length : Infinity;
      if (picked.length < bestLength || (picked.length === bestLength && literalsSum < best.literals)) {
        best.groups = picked.map((i) => candidates[i]);
        best.literals = literalsSum;
      }
      return;
    }
    if (best.groups && picked.length >= best.groups.length) return; // cannot improve

    // First uncovered one-cell.
    let firstUncovered = 0;
    while (covered & (1 << firstUncovered)) firstUncovered += 1;

    for (const candidateIndex of order) {
      if (!(candidateMasks[candidateIndex] & (1 << firstUncovered))) continue;
      picked.push(candidateIndex);
      search(
        covered | candidateMasks[candidateIndex],
        literalsSum + candidates[candidateIndex].literals,
      );
      picked.pop();
    }
  };

  search(0, 0);
  return best.groups ?? [];
}

// ---------------------------------------------------------------------------
// Student group validation
// ---------------------------------------------------------------------------

export interface GroupValidation {
  valid: boolean;
  /** Why the selection is (not) a legal group — a teacher-voice sentence. */
  reason: string;
}

/**
 * Check whether a student's selected minterms form one legal K-map group:
 * a full rectangle of 1/2/4/8/16 cells (powers of two) whose rows and
 * columns are each contiguous with wraparound allowed.
 */
export function validateGroup(selectedMinterms: number[], grid: KMapGrid): GroupValidation {
  if (selectedMinterms.length === 0) {
    return { valid: false, reason: "Select at least one cell to form a group." };
  }

  const positions = new Map<number, { row: number; col: number }>();
  grid.cells.forEach((rowCells, row) =>
    rowCells.forEach((cell, col) => positions.set(cell.minterm, { row, col })),
  );

  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const minterm of selectedMinterms) {
    const position = positions.get(minterm);
    if (!position) {
      return {
        valid: false,
        reason: `Minterm ${minterm} is not part of this map — select cells from the grid.`,
      };
    }
    rows.add(position.row);
    cols.add(position.col);
  }

  const rowRun = cyclicRun([...rows], grid.rowBits.length);
  const colRun = cyclicRun([...cols], grid.colBits.length);

  if (!rowRun || !colRun) {
    return {
      valid: false,
      reason: `A group must be a rectangle of 1, 2, 4, 8, or 16 cells. Your ${selectedMinterms.length} selected cell${selectedMinterms.length > 1 ? "s" : ""} do not sit in such a rectangle — remember that the map edges wrap around.`,
    };
  }

  if (selectedMinterms.length !== rows.size * cols.size) {
    return {
      valid: false,
      reason: `The selection spans ${rows.size} row${rows.size > 1 ? "s" : ""} and ${cols.size} column${cols.size > 1 ? "s" : ""}, which needs ${rows.size * cols.size} cells — there is a hole in the rectangle. A group must fill its whole rectangle.`,
    };
  }

  return {
    valid: true,
    reason: `Valid group: a ${rows.size * cols.size}-cell rectangle (minterms ${[...selectedMinterms].sort((a, b) => a - b).join(", ")}).`,
  };
}

/** Do `indices` form one contiguous cyclic run of power-of-two length? */
function cyclicRun(indices: number[], dim: number): boolean {
  const unique = [...new Set(indices)].sort((a, b) => a - b);
  const length = unique.length;
  if (length > dim || (length & (length - 1)) !== 0) return false;
  if (length === dim) return true; // full axis
  for (let start = 0; start < dim; start += 1) {
    const run = new Set(Array.from({ length }, (_, k) => (start + k) % dim));
    if (unique.every((index) => run.has(index))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Result expression
// ---------------------------------------------------------------------------

/** OR of the group terms — the simplified SOP the groups represent. */
export function resultSop(groups: KMapGroup[]): string {
  if (groups.length === 0) return "0";
  const terms = groups.map((group) => group.term);
  if (terms.includes("1")) return "1";
  return terms.join(" + ");
}
