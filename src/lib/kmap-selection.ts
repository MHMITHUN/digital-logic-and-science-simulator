/**
 * K-map exercise selection state (pure TypeScript, no React).
 *
 * The click/drag selection logic of the K-map exercise board, extracted so
 * it can be unit-tested without a DOM: which cells a drag from anchor to
 * corner covers (with wraparound), and whether the resulting rectangle is
 * an acceptable student group — duplicate, shape, and zero-cell checks all
 * run through the kmap engine. The component keeps only rendering + tone.
 */

import { groupTerm, validateGroup, type KMapGrid } from "@/engines/kmap";

/** A cell position on the map grid. */
export interface CellPos {
  row: number;
  col: number;
}

/** The rectangle a selection covers: axis indices plus the minterms inside. */
export interface SelectionRectangle {
  rows: number[];
  cols: number[];
  minterms: number[];
}

/** A group the exercise accepted, labelled with its engine-derived term. */
export interface StudentGroup extends SelectionRectangle {
  term: string;
  literals: number;
}

/**
 * The shorter of the two cyclic spans between two indices on an axis of
 * `dim` cells (inclusive of both ends) — dragging from the right edge to
 * the left edge selects the wraparound pair, not the long way round.
 */
export function cyclicSpan(a: number, b: number, dim: number): number[] {
  const forwardLength = ((((b - a) % dim) + dim) % dim) + 1;
  const backwardLength = ((((a - b) % dim) + dim) % dim) + 1;
  const forward = forwardLength <= backwardLength;
  const length = forward ? forwardLength : backwardLength;
  const start = forward ? a : b;
  return Array.from({ length }, (_, k) => (start + k) % dim);
}

/** The wraparound rectangle from an anchor cell to the opposite corner. */
export function rectangleBetween(
  grid: KMapGrid,
  from: CellPos,
  to: CellPos,
): SelectionRectangle {
  const rowCount = grid.cells.length;
  const colCount = grid.cells[0]?.length ?? 1;
  const rows = cyclicSpan(from.row, to.row, rowCount);
  const cols = cyclicSpan(from.col, to.col, colCount);
  const minterms = rows.flatMap((row) => cols.map((col) => grid.cells[row][col].minterm));
  return { rows, cols, minterms };
}

/** Do two minterm lists cover the exact same set of cells? */
export function sameMintermSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((minterm) => b.includes(minterm));
}

export interface SelectionFeedback {
  tone: "info" | "success" | "warning" | "danger";
  text: string;
}

export type GroupAssessment =
  | { status: "duplicate"; feedback: SelectionFeedback }
  | { status: "invalid-shape"; feedback: SelectionFeedback }
  | { status: "covers-zeros"; feedback: SelectionFeedback }
  | { status: "accepted"; feedback: SelectionFeedback; group: StudentGroup };

/**
 * Judge a student's selected rectangle against the map and the groups they
 * already placed. Pure: same grid + groups + rectangle always yields the
 * same verdict, so the exercise's acceptance rules are testable directly.
 */
export function assessStudentGroup(
  grid: KMapGrid,
  existing: StudentGroup[],
  rectangle: SelectionRectangle,
): GroupAssessment {
  const { rows, cols, minterms } = rectangle;

  if (existing.some((group) => sameMintermSet(group.minterms, minterms))) {
    return {
      status: "duplicate",
      feedback: { tone: "info", text: "That exact group is already on the map." },
    };
  }

  const validation = validateGroup(minterms, grid);
  if (!validation.valid) {
    return { status: "invalid-shape", feedback: { tone: "danger", text: validation.reason } };
  }

  const valueByMinterm = new Map<number, number>();
  grid.cells.forEach((row) => row.forEach((cell) => valueByMinterm.set(cell.minterm, cell.value)));
  const zeros = minterms.filter((minterm) => valueByMinterm.get(minterm) !== 1);
  if (zeros.length > 0) {
    return {
      status: "covers-zeros",
      feedback: {
        tone: "danger",
        text: `A group may only cover cells that hold 1 — your rectangle includes ${zeros.length} zero cell${zeros.length > 1 ? "s" : ""} (minterm${zeros.length > 1 ? "s" : ""} ${zeros.join(", ")}). Shrink the rectangle.`,
      },
    };
  }

  const { term, literals } = groupTerm(grid, rows, cols);
  return {
    status: "accepted",
    feedback: {
      tone: "success",
      text: `Group accepted — ${minterms.length} cell${minterms.length > 1 ? "s" : ""}, product term ${term}.`,
    },
    group: { rows, cols, minterms, term, literals },
  };
}
