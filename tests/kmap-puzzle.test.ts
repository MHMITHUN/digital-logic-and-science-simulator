import { describe, expect, it } from "vitest";
import { parse } from "@/engines/boolean";
import { kmapGrid } from "@/engines/kmap";
import {
  generateKmapPuzzle,
  mintermsToExpression,
  type KmapVarCount,
} from "@/lib/kmap-puzzle";

describe("mintermsToExpression", () => {
  it("maps minterm bits with A as the most significant bit", () => {
    expect(mintermsToExpression(3, [1])).toBe("A'.B'.C");
    expect(mintermsToExpression(3, [6])).toBe("A.B.C'");
    expect(mintermsToExpression(3, [5])).toBe("A.B'.C");
    expect(mintermsToExpression(2, [3])).toBe("A.B");
    expect(mintermsToExpression(4, [9])).toBe("A.B'.C'.D");
  });

  it("joins multiple minterms with OR", () => {
    expect(mintermsToExpression(2, [0, 3])).toBe("A'.B' + A.B");
  });

  it("produces strings the boolean engine can parse back", () => {
    for (const varCount of [2, 3, 4] as const) {
      for (let minterm = 0; minterm < 2 ** varCount; minterm += 1) {
        expect(() => parse(mintermsToExpression(varCount, [minterm]))).not.toThrow();
      }
    }
  });

  it("degenerates to constants for empty and full maps", () => {
    expect(mintermsToExpression(3, [])).toBe("0");
    expect(mintermsToExpression(3, [0, 1, 2, 3, 4, 5, 6, 7])).toBe("1");
  });
});

describe("generateKmapPuzzle", () => {
  it("uses the random source and satisfies the constraints", () => {
    let calls = 0;
    const fakeRandom = () => {
      // Alternating 0.9/0.2 keeps both 0s and 1s on the map.
      calls += 1;
      return calls % 2 === 1 ? 0.9 : 0.2;
    };
    const puzzle = generateKmapPuzzle(3, fakeRandom);
    expect(puzzle.varCount).toBe(3);
    expect(puzzle.minterms.length).toBeGreaterThan(0);
    expect(puzzle.minterms.length).toBeLessThan(8);
  });

  it("rerolls all-0 and all-1 maps", () => {
    const allHigh = () => 0.1; // every cell 0 -> reroll forever -> fallback one-hot
    const puzzle = generateKmapPuzzle(2, allHigh);
    expect(puzzle.minterms).toEqual([3]);
    expect(puzzle.expression).toBe("A.B");
  });

  it("produces expressions the kmap engine accepts with matching minterms", () => {
    for (const varCount of [2, 3, 4] as KmapVarCount[]) {
      for (let seed = 0; seed < 40; seed += 1) {
        // Simple deterministic LCG per seed so failures are reproducible.
        let state = (seed + 1) * 2654435761;
        const lcg = () => {
          state = (state * 1103515245 + 12345) % 2147483648;
          return state / 2147483648;
        };
        const puzzle = generateKmapPuzzle(varCount, lcg);
        const grid = kmapGrid(puzzle.expression);
        expect(grid.vars).toHaveLength(varCount);
        expect([...grid.minterms].sort((a, b) => a - b)).toEqual(puzzle.minterms);
      }
    }
  });
});
