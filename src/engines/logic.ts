/**
 * Logic gate engine (pure TypeScript, no React).
 *
 * Defines the seven gates of the SSC/HSC ICT syllabus, their truth tables,
 * Boolean expressions, IC numbers, and teacher-voice explanations.
 * The SVG symbol drawing itself lives in a component; this file only
 * exports geometry *hints* (shape kind + bubble flag).
 */

/** A single logic level. */
export type Bit = 0 | 1;

export const GATE_KEYS = [
  "AND",
  "OR",
  "NOT",
  "NAND",
  "NOR",
  "XOR",
  "XNOR",
] as const;

export type GateKey = (typeof GATE_KEYS)[number];

/** Shape family used by the symbol component to pick an SVG path. */
export type GateShape = "and" | "or" | "triangle";

export interface GateDef {
  key: GateKey;
  /** Human-friendly label, e.g. "AND". */
  label: string;
  /** Number of inputs: 1 for NOT, 2 for the rest. */
  inputs: 1 | 2;
  /** Pure Boolean function. For NOT the second argument is ignored. */
  evaluate: (a: Bit, b: Bit) => Bit;
  /** Symbolic expression, e.g. "Y = A . B". */
  booleanExpr: (a: string, b?: string) => string;
  /** 2-3 teacher sentences with a real-world analogy. */
  explanation: string;
  /** Classic 74-series TTL part number, as referenced in ICT textbooks. */
  icName: string;
  /** SVG geometry hints for the symbol component. */
  shape: GateShape;
  /** Output inversion bubble (NAND, NOR, NOT, XNOR). */
  bubble: boolean;
  /** XOR/XNOR draw an extra back arc. */
  backArc: boolean;
  /** Where this gate appears in the Bangladesh ICT curriculum. */
  syllabusRef: string;
}

const bit = (v: boolean): Bit => (v ? 1 : 0);

export const GATES: Record<GateKey, GateDef> = {
  AND: {
    key: "AND",
    label: "AND",
    inputs: 2,
    evaluate: (a, b) => bit(a === 1 && b === 1),
    booleanExpr: (a, b) => `Y = ${a} . ${b ?? ""}`.trim(),
    explanation:
      "The AND gate outputs 1 only when BOTH inputs are 1. Think of two switches wired in series with a lamp: the lamp lights only when switch A and switch B are both pressed at the same time.",
    icName: "7408",
    shape: "and",
    bubble: false,
    backArc: false,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  OR: {
    key: "OR",
    label: "OR",
    inputs: 2,
    evaluate: (a, b) => bit(a === 1 || b === 1),
    booleanExpr: (a, b) => `Y = ${a} + ${b ?? ""}`.trim(),
    explanation:
      "The OR gate outputs 1 when AT LEAST ONE input is 1. Picture two switches in parallel: pressing either switch A or switch B (or both) lets the current reach the lamp.",
    icName: "7432",
    shape: "or",
    bubble: false,
    backArc: false,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  NOT: {
    key: "NOT",
    label: "NOT",
    inputs: 1,
    evaluate: (a) => bit(a === 0),
    booleanExpr: (a) => `Y = ${a}'`,
    explanation:
      "The NOT gate (inverter) simply flips its single input: 0 becomes 1 and 1 becomes 0. It works like a seesaw — when one side goes up, the other must come down.",
    icName: "7404",
    shape: "triangle",
    bubble: true,
    backArc: false,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  NAND: {
    key: "NAND",
    label: "NAND",
    inputs: 2,
    evaluate: (a, b) => bit(!(a === 1 && b === 1)),
    booleanExpr: (a, b) => `Y = (${a} . ${b ?? ""})'`.trim(),
    explanation:
      "NAND is an AND gate followed by an inverter: the output is 0 only when both inputs are 1. Engineers call it the universal gate because any circuit can be built from NAND gates alone.",
    icName: "7400",
    shape: "and",
    bubble: true,
    backArc: false,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  NOR: {
    key: "NOR",
    label: "NOR",
    inputs: 2,
    evaluate: (a, b) => bit(!(a === 1 || b === 1)),
    booleanExpr: (a, b) => `Y = (${a} + ${b ?? ""})'`.trim(),
    explanation:
      "NOR is an OR gate followed by an inverter: the output is 1 only when both inputs are 0. Like NAND, it is a universal gate — whole CPUs can be assembled from NOR gates.",
    icName: "7402",
    shape: "or",
    bubble: true,
    backArc: false,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  XOR: {
    key: "XOR",
    label: "XOR",
    inputs: 2,
    evaluate: (a, b) => bit(a !== b),
    booleanExpr: (a, b) => `Y = ${a} ⊕ ${b ?? ""}`.trim(),
    explanation:
      "The XOR (exclusive OR) gate outputs 1 when the inputs are DIFFERENT. It acts like a difference detector — the same switch pressed on both sides gives 0, pressing only one gives 1.",
    icName: "7486",
    shape: "or",
    bubble: false,
    backArc: true,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
  XNOR: {
    key: "XNOR",
    label: "XNOR",
    inputs: 2,
    evaluate: (a, b) => bit(a === b),
    booleanExpr: (a, b) => `Y = (${a} ⊕ ${b ?? ""})'`.trim(),
    explanation:
      "The XNOR gate is the opposite of XOR: it outputs 1 when both inputs are EQUAL. Use it as an equality checker — it answers the question, are A and B the same?",
    icName: "74266",
    shape: "or",
    bubble: true,
    backArc: true,
    syllabusRef: "SSC/HSC ICT Chapter 3 — Number Systems and Digital Devices",
  },
};

export function isGateKey(value: string): value is GateKey {
  return (GATE_KEYS as readonly string[]).includes(value);
}

/** One row of a gate truth table (`b` absent for the 1-input NOT gate). */
export interface GateTruthRow {
  a: Bit;
  b?: Bit;
  y: Bit;
}

/**
 * Truth table for a gate, in counting order (A is the more significant
 * bit): 00, 01, 10, 11 for two-input gates; 0, 1 for NOT.
 */
export function truthTable(gateKey: GateKey): GateTruthRow[] {
  const gate = GATES[gateKey];
  if (gate.inputs === 1) {
    return ([0, 1] as Bit[]).map((a) => ({ a, y: gate.evaluate(a, 0) }));
  }
  const rows: GateTruthRow[] = [];
  for (const a of [0, 1] as Bit[]) {
    for (const b of [0, 1] as Bit[]) {
      rows.push({ a, b, y: gate.evaluate(a, b) });
    }
  }
  return rows;
}
