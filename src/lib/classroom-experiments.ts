/**
 * Curated classroom-mode experiment list (pure data, no React).
 *
 * Each experiment pairs a learning objective and guided teacher steps with
 * an interactive stage powered by the same engines the labs use. The
 * teacher can deep-link any moment as /classroom?e=<id>&step=N.
 */

import { GATE_KEYS, type GateKey } from "@/engines/logic";
import { isBase, type Base } from "@/engines/numbers";

export type ClassroomStage =
  | "gate"
  | "number-conversion"
  | "de-morgan-table"
  | "ohm"
  | "series-parallel"
  | "kmap";

interface ExperimentBase {
  id: string;
  title: string;
  objective: string;
  moduleLabel: string;
  /** Route of the full lab this experiment comes from. */
  route: string;
  /** Guided teacher prompts, shown one at a time (step 1..steps.length). */
  steps: string[];
}

export type ClassroomExperiment = ExperimentBase &
  (
    | { stage: "gate"; gate: GateKey }
    | { stage: "number-conversion"; from: Base; to: Base; value: string }
    | { stage: "de-morgan-table" }
    | { stage: "ohm" }
    | { stage: "series-parallel" }
    | { stage: "kmap"; expression: string }
  );

export const CLASSROOM_EXPERIMENTS: readonly ClassroomExperiment[] = [
  {
    id: "and-gate",
    title: "AND — Two Switches in Series",
    objective:
      "Show that an AND gate outputs 1 only when both inputs are 1 — exactly like two switches in series.",
    moduleLabel: "Logic Gates",
    route: "/logic",
    steps: [
      "Start with both switches OFF (A=0, B=0). Ask the class: will the lamp light?",
      "Switch A ON only. The output stays 0 — one switch alone cannot close a series path.",
      "Switch both ON. The lamp lights: AND needs every input.",
      "Read the truth table row by row — only the last row gives Y=1.",
    ],
    stage: "gate",
    gate: "AND",
  },
  {
    id: "xor-gate",
    title: "XOR — The Difference Detector",
    objective:
      "Show that XOR outputs 1 exactly when the inputs differ — the heart of binary addition.",
    moduleLabel: "Logic Gates",
    route: "/logic",
    steps: [
      "Both switches OFF — the inputs are equal, so the output is 0.",
      "A ON, B OFF — the inputs differ, so the output is 1.",
      "Both ON — equal again, back to 0. XOR means “exclusive”: both is not allowed.",
      "Connect it: this gate produces the SUM bit of a half-adder.",
    ],
    stage: "gate",
    gate: "XOR",
  },
  {
    id: "de-morgan",
    title: "De Morgan's Proof by Table",
    objective:
      "Verify !(A.B) = !A + !B row by row — break the bar, change the sign.",
    moduleLabel: "Boolean & K-map",
    route: "/boolean",
    steps: [
      "Reveal row A=0, B=0 — both sides give 1.",
      "Reveal row A=0, B=1 — both sides give 1.",
      "Reveal row A=1, B=0 — both sides give 1.",
      "Reveal row A=1, B=1 — both sides give 0.",
      "Conclusion: every row matches, so !(A.B) and !A + !B are the same function.",
    ],
    stage: "de-morgan-table",
  },
  {
    id: "decimal-binary",
    title: "Decimal to Binary — 25 to 11001",
    objective:
      "Convert decimal 25 to binary by repeated division by 2, reading the remainders upward.",
    moduleLabel: "Number Systems",
    route: "/number-system",
    steps: [
      "Divide 25 by 2 — quotient 12, remainder 1. Keep every remainder.",
      "Divide 12 by 2 — quotient 6, remainder 0.",
      "Divide 6 by 2 — quotient 3, remainder 0.",
      "Divide 3 by 2 — quotient 1, remainder 1.",
      "Divide 1 by 2 — quotient 0, remainder 1. Read upward: 11001.",
    ],
    stage: "number-conversion",
    from: "decimal",
    to: "binary",
    value: "25",
  },
  {
    id: "binary-hex",
    title: "Binary to Hex — 4-bit Grouping",
    objective:
      "Convert binary 11010110 to hexadecimal by grouping the bits in fours from the right.",
    moduleLabel: "Number Systems",
    route: "/number-system",
    steps: [
      "Group the bits in fours from the right: 1101 0110 (pad the left with zeros if needed).",
      "Convert the first group 1101 → D (8 + 4 + 1).",
      "Convert the second group 0110 → 6 (4 + 2).",
      "Answer: D6 — one hex digit always replaces exactly four bits.",
    ],
    stage: "number-conversion",
    from: "binary",
    to: "hexadecimal",
    value: "11010110",
  },
  {
    id: "ohms-law",
    title: "Ohm's Law Live — V = I × R",
    objective:
      "Solve V = I × R live with sliders, and watch the power grow with both factors.",
    moduleLabel: "Physics Circuits",
    route: "/physics",
    steps: [
      "Set I = 2 A and R = 10 Ω — read the solved voltage: V = 20 V.",
      "Push the current up — the voltage rises with it. V grows with I.",
      "Now raise the resistance — the voltage rises again. Both factors push V.",
      "Watch the power line: P = V × I grows with both current and voltage.",
    ],
    stage: "ohm",
  },
  {
    id: "series-drops",
    title: "Series Circuit — Voltage Divides",
    objective:
      "Show that in a series circuit the current is shared and the voltage divides in proportion to resistance.",
    moduleLabel: "Physics Circuits",
    route: "/physics",
    steps: [
      "12 V source, R1 = 10 Ω, R2 = 20 Ω in series — the total is 30 Ω.",
      "Total current I = 12 V ÷ 30 Ω = 0.4 A — the same current everywhere in series.",
      "V1 = 4 V across the 10 Ω, V2 = 8 V across the 20 Ω — the bigger resistor takes more voltage.",
      "Check: 4 V + 8 V = 12 V. Series drops always add up to the source.",
    ],
    stage: "series-parallel",
  },
  {
    id: "kmap-3var",
    title: "K-map, 3 Variables — Group and Simplify",
    objective:
      "Group the 1s on a 3-variable K-map and read the minimal SOP B + A.C.",
    moduleLabel: "Boolean & K-map",
    route: "/boolean",
    steps: [
      "Find the 1s: every cell where B = 1, plus the A=1, C=1 cell.",
      "First group: the four B = 1 cells form one rectangle — B survives, A and C drop out.",
      "Second group: A = 1 together with C = 1 — two cells, B drops out.",
      "Minimal SOP: B + A.C — grouping turned five literals into three.",
    ],
    stage: "kmap",
    expression: "B + A.C",
  },
] as const;

/** Find an experiment by its deep-link id (?e=<id>). */
export function findExperiment(id: string | null): ClassroomExperiment | undefined {
  if (!id) return undefined;
  return CLASSROOM_EXPERIMENTS.find((experiment) => experiment.id === id);
}

/** Parse the ?step=N parameter: a whole number >= 1 (default 1). */
export function parseStepParam(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

/** Registry self-check used by unit tests (the classroom must never crash). */
export function validateRegistry(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const experiment of CLASSROOM_EXPERIMENTS) {
    if (ids.has(experiment.id)) problems.push(`Duplicate experiment id: ${experiment.id}`);
    ids.add(experiment.id);
    if (experiment.steps.length === 0) {
      problems.push(`Experiment ${experiment.id} has no steps`);
    }
    if (!experiment.route.startsWith("/")) {
      problems.push(`Experiment ${experiment.id} has a non-internal route`);
    }
    switch (experiment.stage) {
      case "gate":
        if (!GATE_KEYS.includes(experiment.gate)) {
          problems.push(`Experiment ${experiment.id} uses unknown gate ${experiment.gate}`);
        }
        break;
      case "number-conversion":
        if (!isBase(experiment.from) || !isBase(experiment.to)) {
          problems.push(`Experiment ${experiment.id} uses an unknown base`);
        }
        break;
      default:
        break;
    }
  }
  return problems;
}
