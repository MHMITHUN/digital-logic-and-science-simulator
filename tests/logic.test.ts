import { describe, expect, it } from "vitest";
import { GATES, GATE_KEYS, truthTable, type Bit, type GateKey } from "@/engines/logic";

const golden: Record<GateKey, Array<[Bit, Bit | undefined, Bit]>> = {
  // [A, B (undefined for NOT), Y] in counting order 00, 01, 10, 11
  AND: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
  OR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]],
  NOT: [[0, undefined, 1], [1, undefined, 0]],
  NAND: [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
  NOR: [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]],
  XOR: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]],
  XNOR: [[0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
};

describe("GATES", () => {
  it("defines exactly the seven syllabus gates", () => {
    expect(GATE_KEYS).toEqual(["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"]);
    GATE_KEYS.forEach((key) => {
      expect(GATES[key].key).toBe(key);
      expect(GATES[key].icName).toMatch(/^74\d{2,3}$/);
      expect(GATES[key].explanation.split(/\s+/).length).toBeGreaterThan(10);
    });
  });

  it("declares one input for NOT and two for the rest", () => {
    expect(GATES.NOT.inputs).toBe(1);
    GATE_KEYS.filter((key) => key !== "NOT").forEach((key) => {
      expect(GATES[key].inputs).toBe(2);
    });
  });

  it("uses the classic 74-series part numbers", () => {
    expect(GATES.AND.icName).toBe("7408");
    expect(GATES.OR.icName).toBe("7432");
    expect(GATES.NOT.icName).toBe("7404");
    expect(GATES.NAND.icName).toBe("7400");
    expect(GATES.NOR.icName).toBe("7402");
    expect(GATES.XOR.icName).toBe("7486");
  });
});

describe("truthTable", () => {
  it.each(GATE_KEYS)("%s matches the golden truth table in counting order", (key) => {
    const rows = truthTable(key);
    const expected = golden[key];
    expect(rows).toHaveLength(expected.length);
    rows.forEach((row, index) => {
      const [a, b, y] = expected[index];
      expect(row.a).toBe(a);
      if (b === undefined) {
        expect(row.b).toBeUndefined();
      } else {
        expect(row.b).toBe(b);
      }
      expect(row.y).toBe(y);
    });
  });

  it("orders two-input rows 00, 01, 10, 11 (A is the major bit)", () => {
    const rows = truthTable("AND");
    expect(rows.map((row) => `${row.a}${row.b}`)).toEqual(["00", "01", "10", "11"]);
  });
});

describe("booleanExpr", () => {
  it("renders the textbook expression for every gate", () => {
    expect(GATES.AND.booleanExpr("A", "B")).toBe("Y = A . B");
    expect(GATES.OR.booleanExpr("A", "B")).toBe("Y = A + B");
    expect(GATES.NOT.booleanExpr("A")).toBe("Y = A'");
    expect(GATES.NAND.booleanExpr("A", "B")).toBe("Y = (A . B)'");
    expect(GATES.NOR.booleanExpr("A", "B")).toBe("Y = (A + B)'");
    expect(GATES.XOR.booleanExpr("A", "B")).toBe("Y = A ⊕ B");
    expect(GATES.XNOR.booleanExpr("A", "B")).toBe("Y = (A ⊕ B)'");
  });
});

describe("evaluate", () => {
  it("is pure: same inputs always give the same output", () => {
    const gate = GATES.XOR;
    for (const a of [0, 1] as Bit[]) {
      for (const b of [0, 1] as Bit[]) {
        expect(gate.evaluate(a, b)).toBe(gate.evaluate(a, b));
      }
    }
  });
});
