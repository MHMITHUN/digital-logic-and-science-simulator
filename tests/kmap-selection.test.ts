import { describe, expect, it } from "vitest";
import { kmapGrid } from "@/engines/kmap";
import {
  assessStudentGroup,
  cyclicSpan,
  rectangleBetween,
  sameMintermSet,
} from "@/lib/kmap-selection";

/**
 * The K-map exercise board's selection state, extracted as pure functions
 * (src/lib/kmap-selection.ts) so the acceptance rules — wraparound
 * rectangles, duplicates, zero cells, engine-labelled terms — are tested
 * without a DOM.
 */

describe("cyclicSpan", () => {
  it("takes the direct neighbour forward", () => {
    expect(cyclicSpan(0, 1, 4)).toEqual([0, 1]);
  });

  it("takes the short wraparound path between the two edges", () => {
    expect(cyclicSpan(3, 0, 4)).toEqual([3, 0]);
    expect(cyclicSpan(0, 3, 4)).toEqual([3, 0]);
  });

  it("wraps on a 2-cell axis", () => {
    expect(cyclicSpan(1, 0, 2)).toEqual([1, 0]);
  });

  it("returns just the cell itself for a zero-length drag", () => {
    expect(cyclicSpan(2, 2, 4)).toEqual([2]);
  });
});

describe("rectangleBetween", () => {
  it("selects the wraparound column pair on a 3-variable map", () => {
    const grid = kmapGrid("A'.B + A.B'.C"); // rows: A (2), cols: B,C (4)
    const rect = rectangleBetween(grid, { row: 0, col: 0 }, { row: 0, col: 3 });
    expect(rect.rows).toEqual([0]);
    // The short way from col 0 to col 3 is across the right edge: [3, 0].
    expect(rect.cols).toEqual([3, 0]);
    // (A=0, B=1, C=0) = m2 and (A=0, B=0, C=0) = m0 — the wrapped pair.
    expect(rect.minterms).toEqual([2, 0]);
  });

  it("drags corner to corner on a 4-variable map select the four corners", () => {
    const grid = kmapGrid("A + B + C + D"); // 4x4 map
    const rect = rectangleBetween(grid, { row: 0, col: 0 }, { row: 3, col: 3 });
    expect(rect.rows).toEqual([3, 0]);
    expect(rect.cols).toEqual([3, 0]);
    // m10, m8, m2, m0 = the classic wraparound corner group.
    expect(rect.minterms).toEqual([10, 8, 2, 0]);
  });
});

describe("assessStudentGroup", () => {
  it("accepts a valid all-ones rectangle and labels it with the engine term", () => {
    const grid = kmapGrid("A.B"); // single 1 at minterm 3
    const assessment = assessStudentGroup(grid, [], {
      rows: [1],
      cols: [1],
      minterms: [3],
    });
    expect(assessment.status).toBe("accepted");
    if (assessment.status !== "accepted") return;
    expect(assessment.group.term).toBe("AB");
    expect(assessment.group.literals).toBe(2);
    expect(assessment.feedback.tone).toBe("success");
    expect(assessment.feedback.text).toContain("product term AB");
  });

  it("derives the term from the constants that survive the rectangle", () => {
    // Ones at m2, m3 (A=0, B=1) and m5 — the B column pair drops C.
    const grid = kmapGrid("A'.B + A.B'.C");
    const assessment = assessStudentGroup(grid, [], {
      rows: [0],
      cols: [2, 3],
      minterms: [3, 2],
    });
    expect(assessment.status).toBe("accepted");
    if (assessment.status === "accepted") {
      expect(assessment.group.term).toBe("A'B");
      expect(assessment.group.literals).toBe(2);
    }
  });

  it("rejects an exact duplicate of an existing group with info feedback", () => {
    const grid = kmapGrid("A.B");
    const existing = [
      { rows: [1], cols: [1], minterms: [3], term: "AB", literals: 2 },
    ];
    const assessment = assessStudentGroup(grid, existing, {
      rows: [1],
      cols: [1],
      minterms: [3],
    });
    expect(assessment.status).toBe("duplicate");
    if (assessment.status === "duplicate") {
      expect(assessment.feedback.tone).toBe("info");
      expect(assessment.feedback.text).toContain("already on the map");
    }
  });

  it("rejects a rectangle that covers zero cells, naming them", () => {
    const grid = kmapGrid("A.B"); // only minterm 3 holds a 1
    const assessment = assessStudentGroup(grid, [], {
      rows: [0, 1],
      cols: [0, 1],
      minterms: [0, 1, 2, 3],
    });
    expect(assessment.status).toBe("covers-zeros");
    if (assessment.status === "covers-zeros") {
      expect(assessment.feedback.tone).toBe("danger");
      expect(assessment.feedback.text).toContain("3 zero cells");
      expect(assessment.feedback.text).toContain("minterms 0, 1, 2");
    }
  });

  it("rejects a non-rectangular selection through the engine's validator", () => {
    const grid = kmapGrid("A'.B + A.B'.C");
    // cols 0, 1, 3 on a 4-column axis: three columns is not a power of two.
    const assessment = assessStudentGroup(grid, [], {
      rows: [0],
      cols: [0, 1, 3],
      minterms: [0, 1, 2],
    });
    expect(assessment.status).toBe("invalid-shape");
    if (assessment.status === "invalid-shape") {
      expect(assessment.feedback.tone).toBe("danger");
      expect(assessment.feedback.text).toContain("rectangle");
    }
  });

  it("checks shape before zero cells, so holes are reported as shape errors", () => {
    // A 1x4 row of a 3-var map contains zero cells AND is a legal shape —
    // the zero-cell verdict must be the one shown (shape passes first).
    const grid = kmapGrid("A'.B + A.B'.C");
    const assessment = assessStudentGroup(grid, [], {
      rows: [1],
      cols: [0, 1, 2, 3],
      minterms: [4, 5, 7, 6],
    });
    // Row A=1 holds ones at m5 (101) and m7 (111); m4 and m6 are zeros.
    expect(assessment.status).toBe("covers-zeros");
  });
});

describe("sameMintermSet", () => {
  it("ignores order", () => {
    expect(sameMintermSet([1, 2, 3], [3, 1, 2])).toBe(true);
  });

  it("catches different sizes and different members", () => {
    expect(sameMintermSet([1, 2], [1, 2, 2])).toBe(false);
    expect(sameMintermSet([1, 2], [1, 3])).toBe(false);
  });
});
