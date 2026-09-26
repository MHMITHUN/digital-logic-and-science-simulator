/**
 * Number system conversion engine (pure TypeScript, no React).
 *
 * Decimal, binary, octal, hexadecimal. Every conversion returns its real
 * step-by-step working — positional expansion, division-remainder, or
 * bit-grouping shortcuts — so students see the method, not just the answer.
 */

export const BASES = ["decimal", "binary", "octal", "hexadecimal"] as const;
export type Base = (typeof BASES)[number];

export interface Validation {
  ok: boolean;
  /** Uppercase, leading zeros stripped (single "0" kept). Empty when !ok. */
  normalizedValue: string;
  /** Friendly error for students (absent when ok). */
  error?: string;
}

const BASE_INFO: Record<Base, { radix: number; digits: string; name: string }> = {
  decimal: { radix: 10, digits: "0123456789", name: "decimal" },
  binary: { radix: 2, digits: "01", name: "binary" },
  octal: { radix: 8, digits: "01234567", name: "octal" },
  hexadecimal: { radix: 16, digits: "0123456789ABCDEF", name: "hexadecimal" },
};

export const MAX_DIGITS = 16;
export const MAX_VALUE = Number.MAX_SAFE_INTEGER; // 2^53 - 1

export function isBase(value: string): value is Base {
  return (BASES as readonly string[]).includes(value);
}

/**
 * Validate digits for a base: correct digit set, no sign, no point,
 * at most 16 digits, value at most 2^53 - 1.
 */
export function validate(text: string, base: Base): Validation {
  const trimmed = text.trim().toUpperCase();
  if (trimmed.length === 0) {
    return { ok: false, normalizedValue: "", error: "Enter a number first." };
  }
  if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
    return {
      ok: false,
      normalizedValue: "",
      error: "Signs are not allowed — this lab works with unsigned (positive) integers only.",
    };
  }
  if (trimmed.includes(".") || trimmed.includes(",")) {
    return {
      ok: false,
      normalizedValue: "",
      error: "Fractions and decimal points are not supported — whole numbers only.",
    };
  }
  const allowed = BASE_INFO[base].digits;
  for (let i = 0; i < trimmed.length; i += 1) {
    if (!allowed.includes(trimmed[i])) {
      return {
        ok: false,
        normalizedValue: "",
        error: `"${trimmed[i]}" is not a valid ${base} digit. ${baseNameHint(base)}`,
      };
    }
  }
  if (trimmed.length > MAX_DIGITS) {
    return {
      ok: false,
      normalizedValue: "",
      error: `That is ${trimmed.length} digits — keep it to ${MAX_DIGITS} digits or fewer so the value stays exact.`,
    };
  }
  const stripped = trimmed.replace(/^0+(?=\d)/, "");
  const value = parseInt(stripped, BASE_INFO[base].radix);
  if (!Number.isSafeInteger(value) || value > MAX_VALUE) {
    return {
      ok: false,
      normalizedValue: "",
      error: "The value is larger than 2^53 - 1, the biggest exact integer this lab handles.",
    };
  }
  return { ok: true, normalizedValue: stripped };
}

function baseNameHint(base: Base): string {
  switch (base) {
    case "binary":
      return "Binary uses only the digits 0 and 1.";
    case "octal":
      return "Octal uses the digits 0 to 7.";
    case "decimal":
      return "Decimal uses the digits 0 to 9.";
    case "hexadecimal":
      return "Hexadecimal uses 0-9 and the letters A to F.";
  }
}

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

export interface PositionalStep {
  digit: string;
  /** Power of the base (exponent), leftmost digit first. */
  position: number;
  /** e.g. "1 × 2^4 = 16". */
  term: string;
  runningTotal: number;
}

export interface DivisionStep {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
}

export interface GroupStep {
  /** The bit group, e.g. "101". */
  group: string;
  /** The digit it becomes (or came from), e.g. "5". */
  digit: string;
}

export type ConversionMethod = "positional" | "division-remainder" | "grouping";

export interface ConversionResult {
  result: string;
  method: ConversionMethod;
  steps: Array<PositionalStep | DivisionStep | GroupStep>;
  /** Extra note for grouping shortcuts (padding, direction). */
  note?: string;
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

/** Positional expansion to decimal, digit by digit. */
export function toDecimal(text: string, base: Base): { value: number; steps: PositionalStep[] } {
  const check = validate(text, base);
  if (!check.ok) throw new Error(check.error);
  const { radix } = BASE_INFO[base];
  const digits = check.normalizedValue;

  const steps: PositionalStep[] = [];
  let total = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const digitValue = BASE_INFO[base].digits.indexOf(digits[i]);
    const position = digits.length - 1 - i;
    const termValue = digitValue * radix ** position;
    total += termValue;
    steps.push({
      digit: digits[i],
      position,
      term: `${digitValue} × ${radix}^${position} = ${termValue}`,
      runningTotal: total,
    });
  }
  return { value: total, steps };
}

/** Division-remainder conversion from decimal, with read-up instruction. */
export function fromDecimal(n: number, base: Base): { result: string; steps: DivisionStep[]; readUp: string } {
  if (!Number.isInteger(n) || n < 0 || !Number.isSafeInteger(n)) {
    throw new Error("Converting from decimal needs a whole number from 0 up to 2^53 - 1.");
  }
  const { radix, digits } = BASE_INFO[base];

  const steps: DivisionStep[] = [];
  let dividend = n;
  if (dividend === 0) {
    return { result: "0", steps: [{ dividend: 0, divisor: radix, quotient: 0, remainder: 0 }], readUp: "Read the remainder upward: 0." };
  }
  do {
    const quotient = Math.floor(dividend / radix);
    const remainder = dividend % radix;
    steps.push({ dividend, divisor: radix, quotient, remainder });
    dividend = quotient;
  } while (dividend > 0);

  const result = steps.map((step) => digits[step.remainder]).reverse().join("");
  return {
    result,
    steps,
    readUp: `Read the remainders from bottom to top (upward): ${result}.`,
  };
}

const GROUP_SIZE: Record<string, number> = { octal: 3, hexadecimal: 4 };

/** Grouping shortcut binary -> octal (3-bit) or binary -> hex (4-bit). */
function binaryToBaseViaGrouping(text: string, to: "octal" | "hexadecimal"): ConversionResult {
  const size = GROUP_SIZE[to];
  const { radix, digits } = BASE_INFO[to];
  const padded = text.padStart(Math.ceil(text.length / size) * size, "0");

  const steps: GroupStep[] = [];
  let result = "";
  for (let i = 0; i < padded.length; i += size) {
    const group = padded.slice(i, i + size);
    const digitValue = parseInt(group, 2);
    const digit = digits[digitValue];
    result += digit;
    steps.push({ group, digit });
  }
  return {
    result,
    method: "grouping",
    steps,
    note: `Split the bits into groups of ${size} from the right (pad the left with zeros), then convert each group into one ${to} digit (base ${radix}).`,
  };
}

/** Grouping shortcut octal/hex -> binary (expand each digit). */
function baseToBinaryViaGrouping(text: string, from: "octal" | "hexadecimal"): ConversionResult {
  const size = GROUP_SIZE[from];

  const steps: GroupStep[] = [];
  let result = "";
  for (const ch of text) {
    const group = parseInt(ch, BASE_INFO[from].radix).toString(2).padStart(size, "0");
    result += group;
    steps.push({ group, digit: ch });
  }
  return {
    result: result.replace(/^0+(?=\d)/, ""),
    method: "grouping",
    steps,
    note: `Expand each ${from} digit into its ${size}-bit binary group, keeping the digit order.`,
  };
}

/**
 * Convert between any pair of bases with the appropriate method:
 *  - anything -> decimal: positional expansion
 *  - decimal -> anything: division-remainder
 *  - binary <-> octal / binary <-> hexadecimal: 3-bit / 4-bit grouping
 *  - octal <-> hexadecimal: via decimal (positional, then division)
 */
export function convert(text: string, from: Base, to: Base): ConversionResult {
  const check = validate(text, from);
  if (!check.ok) throw new Error(check.error);
  const value = check.normalizedValue;

  if (from === to) {
    return { result: value, method: "positional", steps: [], note: "Same base — the number is unchanged." };
  }

  if (to === "decimal") {
    const { value: decimal, steps } = toDecimal(value, from);
    return {
      result: String(decimal),
      method: "positional",
      steps,
      note: "Multiply each digit by its base power and add up the terms.",
    };
  }

  if (from === "decimal") {
    const { result, steps, readUp } = fromDecimal(parseInt(value, 10), to);
    return { result, method: "division-remainder", steps, note: readUp };
  }

  const groupingPair =
    (from === "binary" && (to === "octal" || to === "hexadecimal")) ||
    ((from === "octal" || from === "hexadecimal") && to === "binary");

  if (groupingPair) {
    return from === "binary"
      ? binaryToBaseViaGrouping(value, to as "octal" | "hexadecimal")
      : baseToBinaryViaGrouping(value, from as "octal" | "hexadecimal");
  }

  // Remaining pairs: octal <-> hexadecimal — go through decimal honestly.
  const { value: decimal, steps: positionalSteps } = toDecimal(value, from);
  const { result, steps: divisionSteps, readUp } = fromDecimal(decimal, to);
  return {
    result,
    method: "division-remainder",
    steps: [...positionalSteps, ...divisionSteps] as (PositionalStep | DivisionStep)[],
    note: `No direct shortcut exists — first expand ${from} to decimal (positional method), then divide by ${BASE_INFO[to].radix} (remainder method). ${readUp}`,
  };
}

// ---------------------------------------------------------------------------
// Reference table
// ---------------------------------------------------------------------------

export interface NumberTableRow {
  decimal: number;
  binary: string;
  octal: string;
  hexadecimal: string;
}

/** Small decimal/binary/octal/hex reference table (0..n) for the UI. */
export function binOctHexTable(n: number): NumberTableRow[] {
  if (!Number.isInteger(n) || n < 0 || n > 256) {
    throw new Error("The reference table shows at most the first 256 values (0 to 256).");
  }
  return Array.from({ length: n + 1 }, (_, value) => ({
    decimal: value,
    binary: value.toString(2),
    octal: value.toString(8),
    hexadecimal: value.toString(16).toUpperCase(),
  }));
}
