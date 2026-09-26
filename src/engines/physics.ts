/**
 * Physics circuit engine (pure TypeScript, no React).
 *
 * Ohm's law, electrical power, and series/parallel resistor networks with
 * guard rails against impossible inputs. Every result includes the formula
 * and the substitution so students see HOW the number was produced.
 */

export type Quantity = "v" | "i" | "r";

/** Friendly, teaching-voice error for impossible inputs. */
export class PhysicsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhysicsError";
  }
}

interface OhmInput {
  v?: number;
  i?: number;
  r?: number;
}

const round = (value: number): number => Math.round(value * 1e6) / 1e6;

function requireNonNegative(name: string, symbol: string, value: number): void {
  if (value < 0) {
    throw new PhysicsError(
      `${name} cannot be negative in this lab — enter a value of 0 or more. You typed ${value} ${symbol}.`,
    );
  }
}

export interface OhmResult {
  value: number;
  /** The formula used, e.g. "I = V ÷ R". */
  formula: string;
  /** Numeric substitution, e.g. "I = 12 V ÷ 4 Ω = 3 A". */
  substitution: string;
  /** Teacher note about the relationship. */
  note: string;
  /** Unit symbol of the solved quantity. */
  unit: "V" | "A" | "Ω";
}

/**
 * Solve Ohm's law V = I × R for one of the three quantities. The two given
 * quantities must be present and non-negative; r = 0 is rejected when
 * solving for current (division by zero) and i = 0 when solving for
 * resistance.
 */
export function ohm(input: OhmInput, solveFor: Quantity): OhmResult {
  const { v, i, r } = input;

  if (v !== undefined) requireNonNegative("Voltage", "V", v);
  if (i !== undefined) requireNonNegative("Current", "A", i);
  if (r !== undefined) requireNonNegative("Resistance", "Ω", r);

  if (solveFor === "v") {
    if (i === undefined || r === undefined) {
      throw new PhysicsError("To solve for voltage, supply both current (I) and resistance (R).");
    }
    const value = i * r;
    return {
      value: round(value),
      formula: "V = I × R",
      substitution: `V = ${i} A × ${r} Ω = ${round(value)} V`,
      note: "Voltage is the push. More current or more resistance — both raise the voltage needed.",
      unit: "V",
    };
  }

  if (solveFor === "i") {
    if (v === undefined || r === undefined) {
      throw new PhysicsError("To solve for current, supply both voltage (V) and resistance (R).");
    }
    if (r === 0) {
      throw new PhysicsError(
        "Resistance cannot be zero when solving for current — dividing by zero has no answer. A real 0 Ω branch is a short circuit.",
      );
    }
    const value = v / r;
    return {
      value: round(value),
      formula: "I = V ÷ R",
      substitution: `I = ${v} V ÷ ${r} Ω = ${round(value)} A`,
      note: "Current is the flow: push harder (more V) and it grows; tighten the pipe (more R) and it shrinks.",
      unit: "A",
    };
  }

  // solveFor === "r"
  if (v === undefined || i === undefined) {
    throw new PhysicsError("To solve for resistance, supply both voltage (V) and current (I).");
  }
  if (i === 0) {
    throw new PhysicsError(
      "Current cannot be zero when solving for resistance — with no flow there is nothing to divide by. Check the circuit: is it open?",
    );
  }
  const value = v / i;
  return {
    value: round(value),
    formula: "R = V ÷ I",
    substitution: `R = ${v} V ÷ ${i} A = ${round(value)} Ω`,
    note: "Resistance is the opposition. Divide the push by the flow to see how much the circuit resists.",
    unit: "Ω",
  };
}

export interface PowerResult {
  p: number;
  formula: string;
  substitution: string;
}

/**
 * Electrical power from any two of V, I, R:
 *   P = V × I   (both given)
 *   P = I² × R  (voltage missing)
 *   P = V² ÷ R  (current missing)
 */
export function power(input: OhmInput): PowerResult {
  const { v, i, r } = input;
  if (v !== undefined) requireNonNegative("Voltage", "V", v);
  if (i !== undefined) requireNonNegative("Current", "A", i);
  if (r !== undefined) requireNonNegative("Resistance", "Ω", r);

  if (v !== undefined && i !== undefined) {
    return {
      p: round(v * i),
      formula: "P = V × I",
      substitution: `P = ${v} V × ${i} A = ${round(v * i)} W`,
    };
  }
  if (i !== undefined && r !== undefined) {
    return {
      p: round(i * i * r),
      formula: "P = I² × R",
      substitution: `P = ${i}² A² × ${r} Ω = ${round(i * i * r)} W`,
    };
  }
  if (v !== undefined && r !== undefined) {
    if (r === 0) {
      throw new PhysicsError("Resistance cannot be zero when computing P = V² ÷ R — division by zero.");
    }
    return {
      p: round((v * v) / r),
      formula: "P = V² ÷ R",
      substitution: `P = ${v}² V² ÷ ${r} Ω = ${round((v * v) / r)} W`,
    };
  }
  throw new PhysicsError("Power needs any two of voltage (V), current (I), and resistance (R).");
}

export interface ResistanceResult {
  value: number;
  formula: string;
  substitution: string;
}

/** Total resistance of resistors in series: R = R1 + R2 + ... */
export function seriesR(values: number[]): ResistanceResult {
  if (values.length === 0) {
    throw new PhysicsError("Add at least one resistor before calculating series resistance.");
  }
  values.forEach((value, index) => requireNonNegative(`Resistor ${index + 1}`, "Ω", value));
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    value: round(total),
    formula: `R = ${values.map((_, index) => `R${index + 1}`).join(" + ")}`,
    substitution: `R = ${values.join(" + ")} = ${round(total)} Ω`,
  };
}

/** Total resistance of resistors in parallel: R = 1 ÷ (1/R1 + 1/R2 + ...). */
export function parallelR(values: number[]): ResistanceResult {
  if (values.length === 0) {
    throw new PhysicsError("Add at least one resistor before calculating parallel resistance.");
  }
  values.forEach((value, index) => requireNonNegative(`Resistor ${index + 1}`, "Ω", value));
  if (values.includes(0)) {
    throw new PhysicsError(
      "A 0 Ω resistor in parallel is a short circuit — it makes every other branch irrelevant. Give every parallel branch a non-zero resistance.",
    );
  }
  const total = 1 / values.reduce((sum, value) => sum + 1 / value, 0);
  return {
    value: round(total),
    formula: `R = 1 ÷ (${values.map((_, index) => `1/R${index + 1}`).join(" + ")})`,
    substitution: `R = 1 ÷ (${values.map((value) => `1/${value}`).join(" + ")}) = ${round(total)} Ω`,
  };
}

export interface CircuitDrop {
  /** 1-based position of the resistor in the list. */
  index: number;
  resistance: number;
  voltage: number;
  power: number;
}

export interface CircuitResult {
  equivalentR: number;
  totalCurrent: number;
  drops: CircuitDrop[];
  totalPower: number;
  warnings: string[];
}

export const POWER_WARN_WATTS = 100;
export const CURRENT_WARN_AMPS = 10;

/**
 * Analyse a resistor network driven by a DC source.
 *   series:  same current everywhere, voltage divides by R.
 *   parallel: same voltage everywhere, current divides by R.
 * Flags classroom-extreme values (per-resistor power above 100 W or total
 * current above 10 A) as warnings instead of hiding them.
 */
export function circuit(input: {
  sourceV: number;
  resistors: number[];
  mode: "series" | "parallel";
}): CircuitResult {
  const { sourceV, resistors, mode } = input;
  requireNonNegative("Source voltage", "V", sourceV);

  if (resistors.length === 0) {
    throw new PhysicsError("Add at least one resistor before analysing the circuit.");
  }

  const combined = mode === "series" ? seriesR(resistors) : parallelR(resistors);
  const equivalentR = combined.value;

  if (equivalentR === 0) {
    throw new PhysicsError(
      "The equivalent resistance is 0 Ω — the source is short-circuited and the current would be unlimited. Add some resistance.",
    );
  }

  const totalCurrent = sourceV / equivalentR;
  const drops: CircuitDrop[] = resistors.map((resistance, index) => {
    const voltage = mode === "series" ? totalCurrent * resistance : sourceV;
    const watts =
      mode === "series" ? totalCurrent * totalCurrent * resistance : (sourceV * sourceV) / resistance;
    return { index: index + 1, resistance, voltage: round(voltage), power: round(watts) };
  });

  const totalPower = sourceV * totalCurrent;
  const warnings: string[] = [];
  drops.forEach((drop) => {
    if (drop.power > POWER_WARN_WATTS) {
      warnings.push(
        `R${drop.index} would dissipate ${drop.power} W — an extreme value for a classroom experiment (above ${POWER_WARN_WATTS} W).`,
      );
    }
  });
  if (totalCurrent > CURRENT_WARN_AMPS) {
    warnings.push(
      `Total current is ${round(totalCurrent)} A — more than ${CURRENT_WARN_AMPS} A is extreme for a classroom experiment.`,
    );
  }

  return {
    equivalentR: round(equivalentR),
    totalCurrent: round(totalCurrent),
    drops,
    totalPower: round(totalPower),
    warnings,
  };
}
