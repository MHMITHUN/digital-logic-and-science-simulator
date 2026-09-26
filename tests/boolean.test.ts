import { describe, expect, it } from "vitest";
import {
  BooleanParseError,
  evaluate,
  parse,
  toNormalizedString,
  tokenize,
  truthTable,
  variables,
} from "@/engines/boolean";

const ONE: Record<string, 0 | 1> = { A: 1, B: 1, C: 1 };
const ZERO_B: Record<string, 0 | 1> = { A: 1, B: 0, C: 1 };

describe("parse + evaluate golden cases", () => {
  it.each([
    ["A.B", { A: 1, B: 0 }, 0],
    ["A.B", { A: 1, B: 1 }, 1],
    ["A+B", { A: 0, B: 1 }, 1],
    ["A+B", { A: 0, B: 0 }, 0],
    ["!A", { A: 0 }, 1],
    ["!A", { A: 1 }, 0],
    ["!(A.B)", { A: 1, B: 1 }, 0],
    ["!(A+B)", { A: 0, B: 0 }, 1],
    ["A^B", { A: 1, B: 0 }, 1],
    ["A^B", { A: 1, B: 1 }, 0],
    ["A.B+C", { A: 0, B: 0, C: 1 }, 1],
    ["(A+B).C", { A: 1, B: 0, C: 0 }, 0],
    ["1", {}, 1],
    ["0", {}, 0],
    ["A.0", { A: 1 }, 0],
    ["A+1", { A: 0 }, 1],
    ["!0", {}, 1],
  ] as const)("%s with %j evaluates to %i", (expr, values, expected) => {
    expect(evaluate(parse(expr), values)).toBe(expected);
  });

  it("supports multi-character variable names like X1", () => {
    expect(variables("X1.Y")).toEqual(["X1", "Y"]);
    expect(evaluate(parse("X1.Y"), { X1: 1, Y: 1 })).toBe(1);
  });

  it("normalizes lowercase variables to uppercase", () => {
    expect(variables("a+b")).toEqual(["A", "B"]);
  });
});

describe("operator aliases", () => {
  it.each([
    ["A and B"],
    ["A AND B"],
    ["A.B"],
    ["A*B"],
    ["A && B"],
  ])("%s behaves as AND", (expr) => {
    expect(evaluate(parse(expr), { A: 1, B: 1 })).toBe(1);
    expect(evaluate(parse(expr), { A: 1, B: 0 })).toBe(0);
  });

  it.each([
    ["A or B"],
    ["A || B"],
    ["A | B"],
    ["A+B"],
  ])("%s behaves as OR", (expr) => {
    expect(evaluate(parse(expr), { A: 0, B: 1 })).toBe(1);
    expect(evaluate(parse(expr), { A: 0, B: 0 })).toBe(0);
  });

  it.each(["!A", "~A", "not A", "NOT A"])("%s behaves as NOT", (expr) => {
    expect(evaluate(parse(expr), { A: 1 })).toBe(0);
    expect(evaluate(parse(expr), { A: 0 })).toBe(1);
  });

  it.each(["A^B", "A xor B", "A XOR B"])("%s behaves as XOR", (expr) => {
    expect(evaluate(parse(expr), { A: 1, B: 0 })).toBe(1);
    expect(evaluate(parse(expr), { A: 1, B: 1 })).toBe(0);
  });

  it("supports the textbook postfix apostrophe: A'", () => {
    expect(evaluate(parse("A'"), { A: 1 })).toBe(0);
    expect(evaluate(parse("A'"), { A: 0 })).toBe(1);
    expect(evaluate(parse("(A+B)'"), { A: 0, B: 0 })).toBe(1);
    expect(evaluate(parse("(A+B)'"), { A: 1, B: 0 })).toBe(0);
  });

  it("treats a double apostrophe as double negation: A''= A", () => {
    expect(evaluate(parse("A''"), { A: 1 })).toBe(1);
    expect(evaluate(parse("A''.B"), { A: 1, B: 1 })).toBe(1);
  });

  it("mixes prefix and postfix NOT: !A' = A", () => {
    expect(evaluate(parse("!A'"), { A: 1 })).toBe(1);
  });

  it("teaches when an apostrophe has nothing to negate", () => {
    try {
      parse("A + 'B");
      throw new Error("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BooleanParseError);
      expect((error as BooleanParseError).kind).toBe("missing-operand");
      expect((error as BooleanParseError).position).toBe(4);
    }
  });
});

describe("precedence", () => {
  it("binds AND tighter than OR: A + B.C", () => {
    // A=1, B=0, C=0: AND-first gives 1 + 0 = 1; left-to-right would give (1+0).0 = 0.
    expect(evaluate(parse("A+B.C"), { A: 1, B: 0, C: 0 })).toBe(1);
  });

  it("binds XOR between AND and OR: A + B ^ C", () => {
    // A=0, B=1, C=0: XOR-first gives 0 + 1 = 1.
    expect(evaluate(parse("A+B^C"), { A: 0, B: 1, C: 0 })).toBe(1);
  });

  it("binds NOT tightest: !A.B", () => {
    // (!A).B with A=1, B=1 -> 0.
    expect(evaluate(parse("!A.B"), { A: 1, B: 1 })).toBe(0);
  });

  it("lets parentheses override precedence", () => {
    expect(evaluate(parse("(A+B).C"), { A: 1, B: 0, C: 0 })).toBe(0);
    expect(evaluate(parse("A.(B+C)"), { A: 0, B: 1, C: 1 })).toBe(0);
  });
});

describe("tokenize", () => {
  it("records positions for each token", () => {
    const tokens = tokenize("A + B");
    expect(tokens.map((token) => token.position)).toEqual([0, 2, 4]);
  });

  it("keeps word operators as operator tokens, not identifiers", () => {
    const tokens = tokenize("A and B");
    expect(tokens.map((token) => token.type)).toEqual(["ident", "and", "ident"]);
  });
});

describe("variables", () => {
  it("returns sorted unique variables", () => {
    expect(variables("C+A.B+A.C")).toEqual(["A", "B", "C"]);
  });

  it("rejects more than 4 variables with a friendly error", () => {
    expect(() => variables("A+B+C+D+E")).toThrow(BooleanParseError);
    try {
      variables("A+B+C+D+E");
    } catch (error) {
      const parseError = error as BooleanParseError;
      expect(parseError.kind).toBe("too-many-variables");
      expect(parseError.message).toContain("4");
      expect(parseError.message).toContain("5");
    }
  });
});

describe("truthTable", () => {
  it("builds the golden table for A.B", () => {
    const table = truthTable("A.B");
    expect(table.vars).toEqual(["A", "B"]);
    expect(table.rows).toHaveLength(4);
    expect(table.rows.map((row) => row.output)).toEqual([0, 0, 0, 1]);
    expect(table.minterms).toEqual([3]);
  });

  it("builds the golden table for A^B", () => {
    const table = truthTable("A^B");
    expect(table.minterms).toEqual([1, 2]);
  });

  it("treats the first variable as the most significant bit", () => {
    const table = truthTable("A.B");
    expect(table.rows[1].input).toEqual({ A: 0, B: 1 });
    expect(table.rows[2].input).toEqual({ A: 1, B: 0 });
  });

  it("works for constant expressions", () => {
    expect(truthTable("1").rows).toHaveLength(1);
    expect(truthTable("1").rows[0].output).toBe(1);
  });
});

describe("toNormalizedString", () => {
  it("prints explicit parentheses for every binary operation", () => {
    expect(toNormalizedString(parse("A.B+C"))).toBe("((A.B)+C)");
    expect(toNormalizedString(parse("!(A+B)"))).toBe("!(A+B)");
    expect(toNormalizedString(parse("!A"))).toBe("!A");
  });

  it("round-trips: normalized text reparses to the same AST string", () => {
    const expr = "A.B + !(C^A)";
    const normalized = toNormalizedString(parse(expr));
    expect(toNormalizedString(parse(normalized))).toBe(normalized);
  });
});

describe("parse errors teach, not just fail", () => {
  const expectError = (expr: string, kind: string, messageIncludes: string, position: number) => {
    try {
      parse(expr);
      throw new Error(`Expected "${expr}" to throw`);
    } catch (error) {
      expect(error).toBeInstanceOf(BooleanParseError);
      const parseError = error as BooleanParseError;
      expect(parseError.kind).toBe(kind);
      expect(parseError.message).toContain(messageIncludes);
      expect(parseError.position).toBe(position);
    }
  };

  it("rejects two operators in a row", () => {
    expectError("A + + B", "two-operators", "Two operators in a row", 4);
  });

  it("rejects two operands with no operator", () => {
    expectError("A B", "missing-operator", "operator", 2);
  });

  it("rejects variables glued together (AB)", () => {
    expectError("AB", "invalid-identifier", "not a valid name", 0);
  });

  it("rejects an unclosed parenthesis", () => {
    expectError("(A + B", "unclosed-paren", "never closed", 0);
  });

  it("rejects a stray closing parenthesis", () => {
    expectError("A + B)", "stray-closing-paren", "no matching", 5);
  });

  it("rejects an expression that ends with an operator", () => {
    expectError("A +", "missing-operand", "ends with", 3);
  });

  it("rejects unknown characters with their position", () => {
    expectError("A @ B", "unexpected-character", "not part of Boolean algebra", 2);
  });

  it("rejects an empty expression", () => {
    expectError("   ", "empty", "empty", 0);
  });

  it("rejects a NOT directly after an operand", () => {
    expectError("A !B", "missing-operator", "operator", 2);
  });
});

describe("evaluate guards", () => {
  it("throws a friendly error for a missing variable value", () => {
    expect(() => evaluate(parse("A.B"), { A: 1 })).toThrow(/No value supplied for variable B/);
  });
});

describe("aliasing sanity", () => {
  it("evaluates a full assignment both ways", () => {
    expect(evaluate(parse("A.B+C"), ONE)).toBe(1);
    expect(evaluate(parse("A.B+C"), ZERO_B)).toBe(1);
    expect(evaluate(parse("(A+B).C"), { A: 1, B: 0, C: 0 })).toBe(0);
    expect(evaluate(parse("(A+B).C"), { A: 1, B: 0, C: 1 })).toBe(1);
  });
});
