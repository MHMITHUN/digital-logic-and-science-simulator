import { describe, expect, it } from "vitest";
import { kmapGrid } from "@/engines/kmap";
import { parse } from "@/engines/boolean";
import {
  CLASSROOM_EXPERIMENTS,
  findExperiment,
  parseStepParam,
  validateRegistry,
} from "@/lib/classroom-experiments";

describe("classroom experiment registry", () => {
  it("has the curated eight experiments with unique ids", () => {
    expect(CLASSROOM_EXPERIMENTS).toHaveLength(8);
    const ids = new Set(CLASSROOM_EXPERIMENTS.map((experiment) => experiment.id));
    expect(ids.size).toBe(CLASSROOM_EXPERIMENTS.length);
  });

  it("passes its own integrity self-check", () => {
    expect(validateRegistry()).toEqual([]);
  });

  it("gives every experiment an objective and at least one step", () => {
    for (const experiment of CLASSROOM_EXPERIMENTS) {
      expect(experiment.objective.trim().length).toBeGreaterThan(0);
      expect(experiment.steps.length).toBeGreaterThanOrEqual(3);
      expect(experiment.steps.every((step) => step.trim().length > 0)).toBe(true);
    }
  });

  it("parses the kmap stage expressions with 2-4 variables", () => {
    for (const experiment of CLASSROOM_EXPERIMENTS) {
      if (experiment.stage !== "kmap") continue;
      expect(() => parse(experiment.expression)).not.toThrow();
      expect(() => kmapGrid(experiment.expression)).not.toThrow();
    }
  });

  it("finds experiments by deep-link id", () => {
    expect(findExperiment("and-gate")?.title).toContain("AND");
    expect(findExperiment("nope")).toBeUndefined();
    expect(findExperiment(null)).toBeUndefined();
  });
});

describe("parseStepParam", () => {
  it("defaults missing, invalid, or fractional values to 1", () => {
    expect(parseStepParam(null)).toBe(1);
    expect(parseStepParam("")).toBe(1);
    expect(parseStepParam("abc")).toBe(1);
    expect(parseStepParam("0")).toBe(1);
    expect(parseStepParam("-3")).toBe(1);
    expect(parseStepParam("2.9")).toBe(2);
  });

  it("reads a valid whole step number", () => {
    expect(parseStepParam("1")).toBe(1);
    expect(parseStepParam("5")).toBe(5);
  });
});
