import { describe, expect, it } from "vitest";
import { deMorganSteps, simplifyDemo, SUPPORTED_RULES } from "@/engines/boolean-simplify";
import { truthTable } from "@/engines/boolean";

describe("each documented rule applies", () => {
  it("double negation: !!A -> A", () => {
    const result = simplifyDemo("!!A");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].rule).toBe("double-negation");
    expect(result.result).toBe("A");
  });

  it("identity: A.1 = A", () => {
    const result = simplifyDemo("A.1");
    expect(result.steps[0].rule).toBe("identity");
    expect(result.result).toBe("A");
  });

  it("identity: A+0 = A", () => {
    const result = simplifyDemo("A+0");
    expect(result.steps[0].rule).toBe("identity");
    expect(result.result).toBe("A");
  });

  it("domination: A.0 = 0", () => {
    const result = simplifyDemo("A.0");
    expect(result.steps[0].rule).toBe("domination");
    expect(result.result).toBe("0");
  });

  it("domination: A+1 = 1", () => {
    const result = simplifyDemo("A+1");
    expect(result.steps[0].rule).toBe("domination");
    expect(result.result).toBe("1");
  });

  it("idempotent: A.A = A", () => {
    const result = simplifyDemo("A.A");
    expect(result.steps[0].rule).toBe("idempotent");
    expect(result.result).toBe("A");
  });

  it("idempotent: A+A = A", () => {
    const result = simplifyDemo("A+A");
    expect(result.steps[0].rule).toBe("idempotent");
    expect(result.result).toBe("A");
  });

  it("complement: A.!A = 0", () => {
    const result = simplifyDemo("A.!A");
    expect(result.steps[0].rule).toBe("complement");
    expect(result.result).toBe("0");
  });

  it("complement: A+!A = 1", () => {
    const result = simplifyDemo("A+!A");
    expect(result.steps[0].rule).toBe("complement");
    expect(result.result).toBe("1");
  });

  it("De Morgan: !(A.B) -> !A + !B", () => {
    const result = simplifyDemo("!(A.B)");
    expect(result.steps[0].rule).toBe("de-morgan");
    expect(result.result).toBe("(!A+!B)");
  });
});

describe("multi-step simplification reaches a fixpoint", () => {
  it("pushes two De Morgan inversions separately", () => {
    const result = simplifyDemo("!(A.B).!(C+D)");
    expect(result.steps.map((step) => step.rule)).toEqual(["de-morgan", "de-morgan"]);
    expect(result.result).toBe("((!A+!B).(!C.!D))");
    expect(result.capped).toBe(false);
  });

  it("chains complement then identity: A.(!A+A) -> A", () => {
    const result = simplifyDemo("A.(!A+A)");
    expect(result.steps.map((step) => step.rule)).toEqual(["complement", "identity"]);
    expect(result.result).toBe("A");
  });

  it("chains double negation then idempotent: !!A.A+B -> A+B", () => {
    const result = simplifyDemo("!!A.A+B");
    expect(result.steps.map((step) => step.rule)).toEqual(["double-negation", "idempotent"]);
    expect(result.result).toBe("(A+B)");
  });

  it("returns zero steps when already simplest (fixpoint immediately)", () => {
    const result = simplifyDemo("A.B");
    expect(result.steps).toEqual([]);
    expect(result.result).toBe("(A.B)");
    expect(result.original).toBe("(A.B)");
    expect(result.capped).toBe(false);
  });

  it("never loops forever: step count stays within the cap", () => {
    const result = simplifyDemo("!!!!!(A.B)");
    expect(result.steps.length).toBeLessThanOrEqual(20);
    expect(result.capped).toBe(false);
  });

  it("records before/after strings that differ on every step", () => {
    const result = simplifyDemo("!!A.A+B");
    result.steps.forEach((step) => {
      expect(step.before).not.toBe(step.after);
      expect(step.title).toMatch(/^Step \d+ — /);
      expect(step.explanation.length).toBeGreaterThan(20);
    });
  });
});

describe("honesty: simplification preserves the truth table", () => {
  it.each([
    "A.(!A+A)",
    "!(A.B)",
    "!!A.A+B",
    "A.B+C.A",
    "!(A+B).C",
    "A.A+B.B",
  ])("%s simplifies to something logically identical", (expr) => {
    const result = simplifyDemo(expr);
    const before = truthTable(expr);
    const after = truthTable(result.result);
    expect(after.vars).toEqual(before.vars);
    expect(after.rows.map((row) => row.output)).toEqual(before.rows.map((row) => row.output));
  });
});

describe("deMorganSteps", () => {
  it("walks a single De Morgan push", () => {
    const steps = deMorganSteps("!(A.B)");
    expect(steps).toHaveLength(1);
    expect(steps[0].rule).toBe("de-morgan");
    expect(steps[0].after).toBe("(!A+!B)");
  });

  it("removes double negation before pushing the bar", () => {
    const steps = deMorganSteps("!(!(!(A.B)))");
    expect(steps.map((step) => step.rule)).toEqual(["double-negation", "de-morgan"]);
  });

  it("returns no steps when no bar sits over an AND/OR", () => {
    expect(deMorganSteps("A.B+C")).toEqual([]);
    expect(deMorganSteps("!A.B")).toEqual([]);
  });

  it("pushes bars fully inward on a nested expression", () => {
    const steps = deMorganSteps("!(A.!(B+C))");
    expect(steps.length).toBeGreaterThan(1);
    const final = steps[steps.length - 1].after;
    // No NOT remains above an AND/OR in the final form.
    expect(final).not.toMatch(/!\(\s*[!A-Z0-9]*[.+^]/);
  });
});

describe("supported rule documentation", () => {
  it("lists exactly the six documented rule families", () => {
    expect(SUPPORTED_RULES.map((rule) => rule.rule)).toEqual([
      "double-negation",
      "de-morgan",
      "identity",
      "domination",
      "idempotent",
      "complement",
    ]);
  });
});
