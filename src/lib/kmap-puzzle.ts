/**
 * Random K-map puzzle generation (pure TypeScript, no React).
 *
 * A puzzle is generated honestly: random minterms are chosen, turned into a
 * real sum-of-products expression, and the /boolean K-map exercise builds
 * its grid from that expression through the kmap engine — so every puzzle
 * grid is a genuine truth table, not a hand-drawn pattern.
 */

export type KmapVarCount = 2 | 3 | 4;

const VAR_NAMES = ["A", "B", "C", "D"] as const;

export interface KmapPuzzle {
  /** Sum-of-products expression listing exactly the one-minterms. */
  expression: string;
  /** The minterm numbers that are 1 on the map (A = most significant bit). */
  minterms: number[];
  varCount: KmapVarCount;
}

/**
 * Build the canonical SOP expression for a set of minterms: one full
 * product term per minterm, literals joined with "." and negation in
 * postfix form (A'.B) so the string re-parses in the boolean engine.
 */
export function mintermsToExpression(varCount: KmapVarCount, minterms: number[]): string {
  const total = 2 ** varCount;
  if (minterms.length === 0) return "0";
  if (minterms.length === total) return "1";

  const vars = VAR_NAMES.slice(0, varCount);
  const terms = minterms.map((minterm) =>
    vars
      .map((name, index) =>
        ((minterm >> (varCount - 1 - index)) & 1) === 1 ? name : `${name}'`,
      )
      .join("."),
  );
  return terms.join(" + ");
}

/**
 * Generate a random puzzle for the given variable count: every cell is a
 * coin flip, rerolled until the map has at least one 1 AND at least one 0
 * (all-0 and all-1 maps make useless exercises). Pass a seeded `random`
 * for deterministic tests.
 */
export function generateKmapPuzzle(
  varCount: KmapVarCount,
  random: () => number = Math.random,
): KmapPuzzle {
  const total = 2 ** varCount;
  let minterms: number[] = [];
  let attempts = 0;
  do {
    minterms = [];
    for (let index = 0; index < total; index += 1) {
      if (random() < 0.5) minterms.push(index);
    }
    attempts += 1;
  } while (
    (minterms.length === 0 || minterms.length === total) &&
    attempts < 1000
  );

  // A fair coin practically never needs the fallback, but stay honest:
  // if the rerolls somehow failed, serve the classic one-hot puzzle.
  if (minterms.length === 0 || minterms.length === total) {
    minterms = [total - 1];
  }

  return {
    expression: mintermsToExpression(varCount, minterms),
    minterms,
    varCount,
  };
}
