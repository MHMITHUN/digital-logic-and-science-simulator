import { describe, expect, it } from "vitest";
import {
  binOctHexTable,
  convert,
  fromDecimal,
  toDecimal,
  validate,
  type DivisionStep,
  type GroupStep,
  type PositionalStep,
} from "@/engines/numbers";

describe("validate", () => {
  it("accepts valid digits per base and normalizes case and leading zeros", () => {
    expect(validate("1010", "binary")).toEqual({ ok: true, normalizedValue: "1010" });
    expect(validate("000101", "binary").normalizedValue).toBe("101");
    expect(validate("7A3f", "hexadecimal").normalizedValue).toBe("7A3F");
    expect(validate(" 777 ", "octal").normalizedValue).toBe("777");
    expect(validate("0", "decimal").normalizedValue).toBe("0");
    expect(validate("0000", "binary").normalizedValue).toBe("0");
  });

  it("rejects digits outside the base", () => {
    expect(validate("102", "binary").ok).toBe(false);
    expect(validate("102", "binary").error).toContain("1");
    expect(validate("789", "octal").ok).toBe(false);
    expect(validate("G1", "hexadecimal").ok).toBe(false);
    expect(validate("1A", "decimal").ok).toBe(false);
  });

  it("rejects signs, fractions, empty input, and over-long digits", () => {
    expect(validate("-5", "decimal").error).toContain("Signs");
    expect(validate("+7", "binary").ok).toBe(false);
    expect(validate("1.5", "decimal").error).toContain("whole numbers");
    expect(validate("", "binary").error).toContain("Enter a number");
    expect(validate("1".repeat(17), "binary").ok).toBe(false);
  });
});

describe("toDecimal", () => {
  it("expands binary 11001 with exact positional steps", () => {
    const { value, steps } = toDecimal("11001", "binary");
    expect(value).toBe(25);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toEqual<PositionalStep>({
      digit: "1",
      position: 4,
      term: "1 × 2^4 = 16",
      runningTotal: 16,
    });
    expect(steps[4]).toEqual<PositionalStep>({
      digit: "1",
      position: 0,
      term: "1 × 2^0 = 1",
      runningTotal: 25,
    });
    expect(steps[1].term).toBe("1 × 2^3 = 8");
    expect(steps[2].term).toBe("0 × 2^2 = 0");
  });

  it("expands hexadecimal 1F to 31", () => {
    const { value, steps } = toDecimal("1F", "hexadecimal");
    expect(value).toBe(31);
    expect(steps[0].term).toBe("1 × 16^1 = 16");
    expect(steps[1].term).toBe("15 × 16^0 = 15");
    expect(steps[1].runningTotal).toBe(31);
  });

  it("expands octal 31 to 25", () => {
    expect(toDecimal("31", "octal").value).toBe(25);
  });

  it("throws on invalid input", () => {
    expect(() => toDecimal("2", "binary")).toThrow(/not a valid binary digit/);
  });
});

describe("fromDecimal", () => {
  it("converts decimal 25 to binary 11001 with the exact spec steps", () => {
    const { result, steps, readUp } = fromDecimal(25, "binary");
    expect(result).toBe("11001");
    expect(steps).toEqual<DivisionStep[]>([
      { dividend: 25, divisor: 2, quotient: 12, remainder: 1 },
      { dividend: 12, divisor: 2, quotient: 6, remainder: 0 },
      { dividend: 6, divisor: 2, quotient: 3, remainder: 0 },
      { dividend: 3, divisor: 2, quotient: 1, remainder: 1 },
      { dividend: 1, divisor: 2, quotient: 0, remainder: 1 },
    ]);
    expect(readUp).toContain("11001");
    expect(readUp.toLowerCase()).toContain("upward");
  });

  it("handles zero without dividing", () => {
    const { result, steps } = fromDecimal(0, "binary");
    expect(result).toBe("0");
    expect(steps).toHaveLength(1);
  });

  it("converts decimal 25 to hexadecimal 19", () => {
    const { result, steps } = fromDecimal(25, "hexadecimal");
    expect(result).toBe("19");
    expect(steps).toEqual<DivisionStep[]>([
      { dividend: 25, divisor: 16, quotient: 1, remainder: 9 },
      { dividend: 1, divisor: 16, quotient: 0, remainder: 1 },
    ]);
  });

  it("rejects negative and fractional input", () => {
    expect(() => fromDecimal(-1, "binary")).toThrow();
    expect(() => fromDecimal(1.5, "binary")).toThrow();
  });
});

describe("convert (method routing)", () => {
  it("decimal -> binary uses division-remainder (spec 16.4 example)", () => {
    const conversion = convert("25", "decimal", "binary");
    expect(conversion.result).toBe("11001");
    expect(conversion.method).toBe("division-remainder");
    expect((conversion.steps as DivisionStep[])).toHaveLength(5);
  });

  it("binary -> decimal uses positional expansion", () => {
    const conversion = convert("11001", "binary", "decimal");
    expect(conversion.result).toBe("25");
    expect(conversion.method).toBe("positional");
    expect((conversion.steps as PositionalStep[])).toHaveLength(5);
  });

  it("same-base conversion is a no-op", () => {
    const conversion = convert("1010", "binary", "binary");
    expect(conversion.result).toBe("1010");
    expect(conversion.steps).toHaveLength(0);
  });

  it("binary -> hexadecimal groups bits in fours", () => {
    const conversion = convert("11011010", "binary", "hexadecimal");
    expect(conversion.result).toBe("DA");
    expect(conversion.method).toBe("grouping");
    expect(conversion.steps as GroupStep[]).toEqual([
      { group: "1101", digit: "D" },
      { group: "1010", digit: "A" },
    ]);
  });

  it("pads the left when bit count is not a multiple of the group size", () => {
    const conversion = convert("11001", "binary", "octal");
    expect(conversion.result).toBe("31");
    expect(conversion.steps as GroupStep[]).toEqual([
      { group: "011", digit: "3" },
      { group: "001", digit: "1" },
    ]);
  });

  it("hexadecimal -> binary expands each digit to 4 bits", () => {
    const conversion = convert("DA", "hexadecimal", "binary");
    expect(conversion.result).toBe("11011010");
    expect(conversion.steps as GroupStep[]).toEqual([
      { group: "1101", digit: "D" },
      { group: "1010", digit: "A" },
    ]);
  });

  it("octal -> binary expands each digit to 3 bits", () => {
    const conversion = convert("31", "octal", "binary");
    expect(conversion.result).toBe("11001");
  });

  it("octal <-> hexadecimal goes through decimal with both step sets", () => {
    const conversion = convert("31", "octal", "hexadecimal");
    expect(conversion.result).toBe("19");
    expect(conversion.method).toBe("division-remainder");
    expect(conversion.steps).toHaveLength(4); // 2 positional + 2 division steps
    expect(conversion.note).toContain("decimal");
  });

  it("propagates validation errors", () => {
    expect(() => convert("2", "binary", "decimal")).toThrow(/not a valid binary digit/);
    expect(() => convert("", "decimal", "binary")).toThrow();
  });
});

describe("binOctHexTable", () => {
  it("generates matching values for 0..3", () => {
    const rows = binOctHexTable(3);
    expect(rows).toEqual([
      { decimal: 0, binary: "0", octal: "0", hexadecimal: "0" },
      { decimal: 1, binary: "1", octal: "1", hexadecimal: "1" },
      { decimal: 2, binary: "10", octal: "2", hexadecimal: "2" },
      { decimal: 3, binary: "11", octal: "3", hexadecimal: "3" },
    ]);
  });

  it("includes A-F digits in hexadecimal", () => {
    const rows = binOctHexTable(15);
    expect(rows[10].hexadecimal).toBe("A");
    expect(rows[15].hexadecimal).toBe("F");
  });

  it("rejects oversized tables", () => {
    expect(() => binOctHexTable(300)).toThrow();
  });
});
