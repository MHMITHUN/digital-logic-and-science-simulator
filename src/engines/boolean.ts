/**
 * Boolean expression engine (pure TypeScript, no React).
 *
 * Tokenize, parse, and evaluate Boolean expressions typed by students.
 *
 * SUPPORTED SYNTAX (documented for the UI):
 *   - Identifiers: a single letter A-Z (lowercase accepted), optionally
 *     followed by digits, e.g. A, B, X1. Normalized to uppercase.
 *   - AND : .  *  &&  and   (word, any case)
 *   - OR  : +  |  ||   or   (word, any case)
 *   - XOR : ^   xor          (word, any case)
 *   - NOT : !  ~  not   (prefix, any case)  or  '  (postfix: A', (A+B)')
 *   - Parentheses ( )
 *   - Constants 0 and 1
 *   - Overline (bar) notation is NOT supported in typed text — write A'
 *     or !A instead.
 *
 * PRECEDENCE (tightest first): NOT > AND > XOR > OR.
 * So "A + B . !C" means A + (B . (!C)).
 *
 * Errors throw BooleanParseError with a character position and a
 * human-friendly, teaching-style message.
 */

import type { Bit } from "./logic";

/** Maximum number of distinct variables (K-map sized limit). */
export const MAX_VARIABLES = 4;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type BooleanErrorKind =
  | "empty"
  | "unexpected-character"
  | "invalid-identifier"
  | "two-operands"
  | "two-operators"
  | "missing-operand"
  | "missing-operator"
  | "unclosed-paren"
  | "stray-closing-paren"
  | "too-many-variables"
  | "unknown-variable"
  | "not-boolean";

/** A parse/validation error that teaches, positioned at the offending char. */
export class BooleanParseError extends Error {
  readonly kind: BooleanErrorKind;
  /** 0-based character index in the source expression (-1 = whole expr). */
  readonly position: number;

  constructor(kind: BooleanErrorKind, position: number, message: string) {
    super(message);
    this.name = "BooleanParseError";
    this.kind = kind;
    this.position = position;
  }
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type TokenType =
  | "ident"
  | "const"
  | "and"
  | "or"
  | "xor"
  | "not"
  | "postfix-not"
  | "lparen"
  | "rparen";

export interface Token {
  type: TokenType;
  text: string;
  /** 0-based index of the first character in the source string. */
  position: number;
}

const WORD_OPERATORS: Record<string, Exclude<TokenType, "ident" | "const" | "lparen" | "rparen">> = {
  and: "and",
  or: "or",
  xor: "xor",
  not: "not",
};

/**
 * Split an expression into tokens. Throws BooleanParseError on characters
 * that cannot start any token.
 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Whitespace (including tabs) is skipped.
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Identifiers: letter then digits. Single-letter names are the norm
    // (A, B, C...); multi-character names like X1 are also accepted.
    // Word operators (and/or/not/xor) are recognised first, any case.
    if (/[A-Za-z]/.test(ch)) {
      const start = i;
      let raw = "";
      while (i < expr.length && /[A-Za-z0-9]/.test(expr[i])) {
        raw += expr[i];
        i += 1;
      }
      const keywordType = WORD_OPERATORS[raw.toLowerCase()];
      if (keywordType) {
        tokens.push({ type: keywordType, text: raw, position: start });
        continue;
      }
      if (/^[A-Za-z][0-9]*$/.test(raw)) {
        tokens.push({ type: "ident", text: raw.toUpperCase(), position: start });
        continue;
      }
      throw new BooleanParseError(
        "invalid-identifier",
        start,
        `"${raw}" at position ${start} is not a valid name. Variables are one letter (A-Z) optionally followed by digits, e.g. A or X1. To AND two variables use "." or the word "and": write A.B, not AB.`,
      );
    }

    // Constants.
    if (ch === "0" || ch === "1") {
      tokens.push({ type: "const", text: ch, position: i });
      i += 1;
      continue;
    }

    // Postfix NOT (apostrophe): negates the term before it, e.g. A' or (A+B)'.
    if (ch === "'") {
      tokens.push({ type: "postfix-not", text: ch, position: i });
      i += 1;
      continue;
    }

    // Operators and parentheses.
    const two = expr.slice(i, i + 2);
    if (two === "&&") {
      tokens.push({ type: "and", text: two, position: i });
      i += 2;
      continue;
    }
    if (two === "||") {
      tokens.push({ type: "or", text: two, position: i });
      i += 2;
      continue;
    }
    const single: Record<string, TokenType> = {
      ".": "and",
      "*": "and",
      "+": "or",
      "|": "or",
      "^": "xor",
      "!": "not",
      "~": "not",
      "(": "lparen",
      ")": "rparen",
    };
    if (ch in single) {
      tokens.push({ type: single[ch], text: ch, position: i });
      i += 1;
      continue;
    }

    throw new BooleanParseError(
      "unexpected-character",
      i,
      `"${ch}" at position ${i} is not part of Boolean algebra. Use . * + ! ^ ( ) 0 1 or variable names like A and B.`,
    );
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

export type BooleanAst =
  | { kind: "const"; value: 0 | 1 }
  | { kind: "var"; name: string }
  | { kind: "not"; operand: BooleanAst }
  | { kind: "and"; left: BooleanAst; right: BooleanAst }
  | { kind: "or"; left: BooleanAst; right: BooleanAst }
  | { kind: "xor"; left: BooleanAst; right: BooleanAst };

/** Describe a token for error messages ("operator +", "variable A"...). */
function describeToken(token: Token): string {
  switch (token.type) {
    case "ident":
      return `variable ${token.text}`;
    case "const":
      return `constant ${token.text}`;
    case "and":
      return `AND operator (${token.text})`;
    case "or":
      return `OR operator (${token.text})`;
    case "xor":
      return `XOR operator (${token.text})`;
    case "not":
      return `NOT operator (${token.text})`;
    case "postfix-not":
      return "apostrophe (')";
    case "lparen":
      return "opening parenthesis";
    case "rparen":
      return "closing parenthesis";
  }
}

/**
 * Recursive-descent parser. Grammar (lowest precedence first):
 *   orExpr  := xorExpr (OR xorExpr)*
 *   xorExpr := andExpr (XOR andExpr)*
 *   andExpr := unary (AND unary)*
 *   unary   := NOT unary | primary
 *   primary := ident | const | "(" orExpr ")"
 */
export function parse(expr: string): BooleanAst {
  const tokens = tokenize(expr);
  if (tokens.length === 0) {
    throw new BooleanParseError(
      "empty",
      0,
      "The expression is empty. Type something like A.B + A.C to begin.",
    );
  }

  let index = 0;

  const peek = (): Token | undefined => tokens[index];
  const advance = (): Token => {
    const token = tokens[index];
    index += 1;
    return token;
  };

  function parseOr(): BooleanAst {
    let left = parseXor();
    while (peek()?.type === "or") {
      advance();
      const right = parseXor();
      left = { kind: "or", left, right };
    }
    return left;
  }

  function parseXor(): BooleanAst {
    let left = parseAnd();
    while (peek()?.type === "xor") {
      advance();
      const right = parseAnd();
      left = { kind: "xor", left, right };
    }
    return left;
  }

  function parseAnd(): BooleanAst {
    let left = parseUnary();
    while (peek()?.type === "and") {
      advance();
      const right = parseUnary();
      left = { kind: "and", left, right };
    }
    return left;
  }

  function parseUnary(): BooleanAst {
    if (peek()?.type === "not") {
      advance();
      return { kind: "not", operand: parseUnary() };
    }
    return parsePrimary();
  }

  /** Consume any number of postfix apostrophes: A, A', A'' ... */
  function parsePostfix(node: BooleanAst): BooleanAst {
    let result = node;
    while (peek()?.type === "postfix-not") {
      advance();
      result = { kind: "not", operand: result };
    }
    return result;
  }

  function parsePrimary(): BooleanAst {
    const token = peek();

    if (token === undefined) {
      const last = tokens[tokens.length - 1];
      throw new BooleanParseError(
        "missing-operand",
        last.position + last.text.length,
        `The expression ends with ${describeToken(last)} at position ${last.position}. An operand (a variable, 0, or 1) must come after it.`,
      );
    }

    if (token.type === "ident") {
      advance();
      return parsePostfix({ kind: "var", name: token.text });
    }

    if (token.type === "const") {
      advance();
      return parsePostfix({ kind: "const", value: token.text === "1" ? 1 : 0 });
    }

    if (token.type === "lparen") {
      advance();
      const inner = parseOr();
      const next = peek();
      if (next?.type !== "rparen") {
        throw new BooleanParseError(
          "unclosed-paren",
          token.position,
          `The "(" opened at position ${token.position} is never closed. Add a matching ")" at the end.`,
        );
      }
      advance();
      return parsePostfix(inner);
    }

    if (token.type === "rparen") {
      throw new BooleanParseError(
        "stray-closing-paren",
        token.position,
        `There is a ")" at position ${token.position} with no matching "(" before it. Remove it or add an opening parenthesis.`,
      );
    }

    if (token.type === "postfix-not") {
      throw new BooleanParseError(
        "missing-operand",
        token.position,
        `The apostrophe (') at position ${token.position} negates what comes before it, e.g. A' or (A+B)'. There is nothing in front of it to negate.`,
      );
    }

    // A binary operator or NOT where an operand belongs.
    if (token.type === "and" || token.type === "or" || token.type === "xor") {
      const previous = tokens[index - 1];
      throw new BooleanParseError(
        "two-operators",
        token.position,
        `Two operators in a row at position ${token.position} — did you miss an operand? ${describeToken(token)} follows ${describeToken(previous)}. Write something like A.B between them.`,
      );
    }

    // token.type === "not" after an operand, e.g. "A !B".
    throw new BooleanParseError(
      "missing-operator",
      token.position,
      `An operand is followed by the NOT operator (!) at position ${token.position}. Put an AND operator between them, e.g. "A.!B".`,
    );
  }

  const ast = parseOr();

  if (index < tokens.length) {
    const extra = tokens[index];
    const previous = tokens[index - 1];
    if (
      extra.type === "and" ||
      extra.type === "or" ||
      extra.type === "xor" ||
      extra.type === "not"
    ) {
      throw new BooleanParseError(
        "missing-operator",
        extra.position,
        `Two operands in a row: ${describeToken(extra)} appears at position ${extra.position} right after ${describeToken(previous)}. Insert an AND operator — "A.B", "A * B", or "A and B".`,
      );
    }
    if (extra.type === "rparen") {
      throw new BooleanParseError(
        "stray-closing-paren",
        extra.position,
        `There is an extra ")" at position ${extra.position} with no matching "(". Check that every parenthesis pair is balanced.`,
      );
    }
    throw new BooleanParseError(
      "missing-operator",
      extra.position,
      `Unexpected ${describeToken(extra)} at position ${extra.position} after a complete expression. An operator (+, ., ^) is missing.`,
    );
  }

  return ast;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate an AST against a variable assignment. Missing variables throw a
 * friendly error — the UI always supplies every variable from variables().
 */
export function evaluate(ast: BooleanAst, values: Record<string, Bit>): Bit {
  switch (ast.kind) {
    case "const":
      return ast.value;
    case "var": {
      const value = values[ast.name];
      if (value !== 0 && value !== 1) {
        throw new BooleanParseError(
          "unknown-variable",
          -1,
          `No value supplied for variable ${ast.name}. Give it 0 or 1 before evaluating.`,
        );
      }
      return value;
    }
    case "not":
      return evaluate(ast.operand, values) === 1 ? 0 : 1;
    case "and":
      return evaluate(ast.left, values) === 1 && evaluate(ast.right, values) === 1 ? 1 : 0;
    case "or":
      return evaluate(ast.left, values) === 1 || evaluate(ast.right, values) === 1 ? 1 : 0;
    case "xor":
      return evaluate(ast.left, values) !== evaluate(ast.right, values) ? 1 : 0;
  }
}

/** Sorted unique variable names used by an AST (or the whole expr). */
export function variables(input: BooleanAst | string): string[] {
  const ast = typeof input === "string" ? parse(input) : input;
  const found = new Set<string>();
  function walk(node: BooleanAst): void {
    switch (node.kind) {
      case "var":
        found.add(node.name);
        break;
      case "not":
        walk(node.operand);
        break;
      case "and":
      case "or":
      case "xor":
        walk(node.left);
        walk(node.right);
        break;
      case "const":
        break;
    }
  }
  walk(ast);
  const sorted = [...found].sort();
  if (sorted.length > MAX_VARIABLES) {
    throw new BooleanParseError(
      "too-many-variables",
      -1,
      `This lab supports up to ${MAX_VARIABLES} variables — your expression uses ${sorted.length} (${sorted.join(", ")}). Remove a variable and try again.`,
    );
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Truth tables
// ---------------------------------------------------------------------------

export interface BooleanTruthRow {
  /** Variable assignment for this combination, in `vars` order. */
  input: Record<string, Bit>;
  /** Output of the expression. */
  output: Bit;
}

export interface BooleanTruthTable {
  /** Variable names in alphabetical order (A is the most significant bit). */
  vars: string[];
  rows: BooleanTruthRow[];
  /** Minterm numbers (row indices) where the output is 1. */
  minterms: number[];
}

/** Full truth table for an expression string, in counting order. */
export function truthTable(expr: string): BooleanTruthTable {
  const ast = parse(expr);
  const vars = variables(ast);
  const rows: BooleanTruthRow[] = [];
  const minterms: number[] = [];

  const total = 2 ** vars.length;
  for (let index = 0; index < total; index += 1) {
    const input: Record<string, Bit> = {};
    // First variable = most significant bit.
    vars.forEach((name, depth) => {
      const shift = vars.length - 1 - depth;
      input[name] = ((index >> shift) & 1) as Bit;
    });
    const output = evaluate(ast, input);
    rows.push({ input, output });
    if (output === 1) minterms.push(index);
  }

  return { vars, rows, minterms };
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

/**
 * Canonical, re-parseable string for an AST: every binary operation prints
 * with its own parentheses, "." for AND, "+" for OR, "^" for XOR, and "!"
 * prefix for NOT (binary children already carry parentheses, so "!(A.B)"
 * never doubles them). Useful for before/after forms in the simplifier.
 */
export function toNormalizedString(ast: BooleanAst): string {
  switch (ast.kind) {
    case "const":
      return String(ast.value);
    case "var":
      return ast.name;
    case "not":
      return `!${toNormalizedString(ast.operand)}`;
    case "and":
      return `(${toNormalizedString(ast.left)}.${toNormalizedString(ast.right)})`;
    case "or":
      return `(${toNormalizedString(ast.left)}+${toNormalizedString(ast.right)})`;
    case "xor":
      return `(${toNormalizedString(ast.left)}^${toNormalizedString(ast.right)})`;
  }
}

/** Structural equality of two ASTs (used by tests and the simplifier). */
export function astEqual(a: BooleanAst, b: BooleanAst): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "const":
      return a.value === (b as { kind: "const"; value: 0 | 1 }).value;
    case "var":
      return a.name === (b as { kind: "var"; name: string }).name;
    case "not":
      return astEqual(a.operand, (b as { kind: "not"; operand: BooleanAst }).operand);
    case "and":
    case "or":
    case "xor": {
      const bb = b as { kind: string; left: BooleanAst; right: BooleanAst };
      return astEqual(a.left, bb.left) && astEqual(a.right, bb.right);
    }
  }
}
