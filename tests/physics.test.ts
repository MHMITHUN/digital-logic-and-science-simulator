import { describe, expect, it } from "vitest";
import {
  PhysicsError,
  circuit,
  ohm,
  parallelR,
  power,
  seriesR,
} from "@/engines/physics";

describe("ohm", () => {
  it("solves V = I × R", () => {
    const result = ohm({ i: 3, r: 4 }, "v");
    expect(result.value).toBe(12);
    expect(result.formula).toBe("V = I × R");
    expect(result.substitution).toBe("V = 3 A × 4 Ω = 12 V");
    expect(result.unit).toBe("V");
  });

  it("solves I = V ÷ R", () => {
    const result = ohm({ v: 12, r: 4 }, "i");
    expect(result.value).toBe(3);
    expect(result.formula).toBe("I = V ÷ R");
    expect(result.substitution).toBe("I = 12 V ÷ 4 Ω = 3 A");
  });

  it("solves R = V ÷ I", () => {
    const result = ohm({ v: 12, i: 3 }, "r");
    expect(result.value).toBe(4);
    expect(result.formula).toBe("R = V ÷ I");
  });

  it("rejects zero resistance when solving for current with the exact teaching message", () => {
    expect(() => ohm({ v: 9, r: 0 }, "i")).toThrow(PhysicsError);
    expect(() => ohm({ v: 9, r: 0 }, "i")).toThrow(
      "Resistance cannot be zero when solving for current",
    );
  });

  it("rejects zero current when solving for resistance", () => {
    expect(() => ohm({ v: 9, i: 0 }, "r")).toThrow(
      "Current cannot be zero when solving for resistance",
    );
  });

  it("rejects negative quantities", () => {
    expect(() => ohm({ v: -1, i: 1 }, "r")).toThrow(/cannot be negative/);
    expect(() => ohm({ v: 1, r: -2 }, "i")).toThrow(/cannot be negative/);
    expect(() => ohm({ i: -3, r: 2 }, "v")).toThrow(/cannot be negative/);
  });

  it("requires the two known quantities", () => {
    expect(() => ohm({ v: 5 }, "i")).toThrow(PhysicsError);
    expect(() => ohm({}, "v")).toThrow(PhysicsError);
  });

  it("handles fractional results with sane rounding", () => {
    const result = ohm({ v: 10, r: 3 }, "i");
    expect(result.value).toBeCloseTo(3.333333, 5);
  });
});

describe("power", () => {
  it("uses P = V × I when both are given", () => {
    const result = power({ v: 12, i: 2 });
    expect(result.p).toBe(24);
    expect(result.formula).toBe("P = V × I");
  });

  it("uses P = I² × R when voltage is missing", () => {
    const result = power({ i: 2, r: 3 });
    expect(result.p).toBe(12);
    expect(result.formula).toBe("P = I² × R");
  });

  it("uses P = V² ÷ R when current is missing", () => {
    const result = power({ v: 12, r: 4 });
    expect(result.p).toBe(36);
    expect(result.formula).toBe("P = V² ÷ R");
  });

  it("guards zero resistance in P = V² ÷ R", () => {
    expect(() => power({ v: 5, r: 0 })).toThrow(PhysicsError);
  });

  it("requires at least two quantities", () => {
    expect(() => power({ v: 5 })).toThrow(PhysicsError);
  });
});

describe("seriesR / parallelR", () => {
  it("sums series resistances", () => {
    const result = seriesR([10, 20, 30]);
    expect(result.value).toBe(60);
    expect(result.substitution).toContain("10 + 20 + 30");
  });

  it("computes parallel resistance", () => {
    expect(parallelR([10, 10]).value).toBe(5);
    expect(parallelR([50, 50]).value).toBe(25);
    expect(parallelR([100, 100, 100]).value).toBeCloseTo(33.333333, 4);
  });

  it("rejects a zero resistor in parallel with a clear message", () => {
    expect(() => parallelR([10, 0])).toThrow(PhysicsError);
    expect(() => parallelR([10, 0])).toThrow(/0 Ω resistor in parallel/);
  });

  it("rejects negative resistors", () => {
    expect(() => seriesR([10, -5])).toThrow(/cannot be negative/);
    expect(() => parallelR([-5, 10])).toThrow(/cannot be negative/);
  });

  it("rejects empty resistor lists", () => {
    expect(() => seriesR([])).toThrow(PhysicsError);
    expect(() => parallelR([])).toThrow(PhysicsError);
  });
});

describe("circuit", () => {
  it("analysing a series circuit: golden values", () => {
    const result = circuit({ sourceV: 12, resistors: [4, 8], mode: "series" });
    expect(result.equivalentR).toBe(12);
    expect(result.totalCurrent).toBe(1);
    expect(result.drops).toEqual([
      { index: 1, resistance: 4, voltage: 4, power: 4 },
      { index: 2, resistance: 8, voltage: 8, power: 8 },
    ]);
    expect(result.totalPower).toBe(12);
    expect(result.warnings).toEqual([]);
  });

  it("analysing a parallel circuit: golden values", () => {
    const result = circuit({ sourceV: 12, resistors: [6, 3], mode: "parallel" });
    expect(result.equivalentR).toBe(2);
    expect(result.totalCurrent).toBe(6);
    // Same voltage across every branch; power divides by resistance.
    expect(result.drops[0]).toEqual({ index: 1, resistance: 6, voltage: 12, power: 24 });
    expect(result.drops[1]).toEqual({ index: 2, resistance: 3, voltage: 12, power: 48 });
    expect(result.totalPower).toBe(72);
  });

  it("warns when a resistor dissipates more than 100 W", () => {
    const result = circuit({ sourceV: 100, resistors: [50], mode: "series" });
    expect(result.drops[0].power).toBe(200);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("extreme value for a classroom experiment");
  });

  it("warns when total current exceeds 10 A", () => {
    const result = circuit({ sourceV: 60, resistors: [5], mode: "series" });
    expect(result.totalCurrent).toBe(12);
    expect(result.warnings.some((warning) => warning.includes("12 A"))).toBe(true);
  });

  it("emits both warnings for an extreme circuit", () => {
    const result = circuit({ sourceV: 220, resistors: [10], mode: "series" });
    expect(result.warnings).toHaveLength(2);
  });

  it("rejects a short-circuited parallel network", () => {
    expect(() => circuit({ sourceV: 5, resistors: [0, 10], mode: "parallel" })).toThrow(
      /0 Ω resistor in parallel/,
    );
  });

  it("rejects a zero-equivalent series source (short circuit)", () => {
    expect(() => circuit({ sourceV: 5, resistors: [0], mode: "series" })).toThrow(
      /short-circuited/,
    );
  });

  it("rejects negative source voltage", () => {
    expect(() => circuit({ sourceV: -9, resistors: [10], mode: "series" })).toThrow(
      /cannot be negative/,
    );
  });

  it("rejects an empty resistor list", () => {
    expect(() => circuit({ sourceV: 9, resistors: [], mode: "parallel" })).toThrow(PhysicsError);
  });
});
