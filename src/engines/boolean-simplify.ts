/**
 * Boolean simplification DEMO engine (pure TypeScript, no React).
 *
 * HONESTY NOTE (spec 16.5): this module demonstrates the most common
 * Boolean identities on a documented subset of expressions. It is a
 * teaching demonstration, NOT a complete or industrial theorem prover —
 * expressions outside the supported rule set are returned unchanged once
 * no rule applies.
 *
 * DOCUMENTED RULE SUBSET (applied until fixpoint, max 20 steps):
 *   - Double negation   !!X        -> X
 *   - Identity          X.1 = X    X+0 = X
 *   - Domination        X.0 = 0    X+1 = 1
 *   - Idempotent        X.X = X    X+X = X
 *   - Complement        X.!X = 0   X+!X = 1
 *   - De Morgan         !(X.Y) -> !X + !Y    !(X+Y) -> !X.!Y
 *
 * NOT handled (and not claimed): absorption (X+X.Y), consensus,
 * factoring, XOR identities, and multi-level restructuring.
 */

import {
  parse,
  toNormalizedString,
  type BooleanAst,
} from "./boolean";

/** Safety cap so a pathological expression can never loop forever. */
export const MAX_SIMPLIFY_STEPS = 20;

export const SUPPORTED_RULES = [
  {
    rule: "double-negation",
    title: "Double negation",
    law: "!!X = X",
  },
  {
    rule: "de-morgan",
    title: "De Morgan's laws",
    law: "!(X.Y) = !X + !Y   |   !(X+Y) = !X.!Y",
  },
  {
    rule: "identity",
    title: "Identity",
    law: "X.1 = X   |   X+0 = X",
  },
  {
    rule: "domination",
    title: "Domination",
    law: "X.0 = 0   |   X+1 = 1",
  },
  {
    rule: "idempotent",
    title: "Idempotent",
    law: "X.X = X   |   X+X = X",
  },
  {
    rule: "complement",
    title: "Complement",
    law: "X.!X = 0   |   X+!X = 1",
  },
] as const;

export type SimplifyRule = (typeof SUPPORTED_RULES)[number]["rule"];

export interface SimplifyStep {
  /** Step number + rule name, e.g. "Step 1 — De Morgan's laws". */
  title: string;
  /** Whole expression before the rewrite (normalized string). */
  before: string;
  /** Whole expression after the rewrite (normalized string). */
  after: string;
  /** Machine-readable rule key (one of SUPPORTED_RULES). */
  rule: SimplifyRule;
  /** Teacher-voice explanation of the law just applied. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Single-node rewrites
// ---------------------------------------------------------------------------

interface Rewrite {
  node: BooleanAst;
  rule: SimplifyRule;
  /** Short human name of the specific application, used in the title. */
  detail: string;
  explanation: string;
}

const isConst = (node: BooleanAst, value: 0 | 1): boolean =>
  node.kind === "const" && node.value === value;

const not = (operand: BooleanAst): BooleanAst => ({ kind: "not", operand });
const and = (left: BooleanAst, right: BooleanAst): BooleanAst => ({ kind: "and", left, right });
const or = (left: BooleanAst, right: BooleanAst): BooleanAst => ({ kind: "or", left, right });

function structuralEqual(a: BooleanAst, b: BooleanAst): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "const":
      return a.value === (b as { value: 0 | 1 }).value;
    case "var":
      return a.name === (b as { name: string }).name;
    case "not":
      return structuralEqual(a.operand, (b as { operand: BooleanAst }).operand);
    default: {
      const bb = b as { left: BooleanAst; right: BooleanAst };
      return structuralEqual(a.left, bb.left) && structuralEqual(a.right, bb.right);
    }
  }
}

/** Try every documented rule at this single node, in teaching order. */
function rewriteAtNode(node: BooleanAst): Rewrite | null {
  // Double negation: !!X -> X
  if (node.kind === "not" && node.operand.kind === "not") {
    return {
      node: node.operand.operand,
      rule: "double-negation",
      detail: "!!X = X",
      explanation:
        "A double inversion cancels itself: !!X is simply X. Two NOTs in a row undo each other — like switching a light off and immediately back on.",
    };
  }

  // De Morgan: !(X.Y) -> !X + !Y  and  !(X+Y) -> !X.!Y
  if (node.kind === "not") {
    const inner = node.operand;
    if (inner.kind === "and") {
      return {
        node: or(not(inner.left), not(inner.right)),
        rule: "de-morgan",
        detail: "!(X.Y) = !X + !Y",
        explanation:
          "De Morgan's first law: break the bar and change the sign. NOT of an AND becomes an OR of the NOTs — !(X.Y) equals !X + !Y.",
      };
    }
    if (inner.kind === "or") {
      return {
        node: and(not(inner.left), not(inner.right)),
        rule: "de-morgan",
        detail: "!(X+Y) = !X.!Y",
        explanation:
          "De Morgan's second law: break the bar and change the sign. NOT of an OR becomes an AND of the NOTs — !(X+Y) equals !X.!Y.",
      };
    }
  }

  if (node.kind === "and" || node.kind === "or") {
    const { left, right } = node;
    const isAnd = node.kind === "and";

    // Identity: X.1 = X, 1.X = X, X+0 = X, 0+X = X
    if (isAnd && isConst(right, 1)) {
      return {
        node: left,
        rule: "identity",
        detail: "X.1 = X",
        explanation:
          "Identity law: ANDing with 1 never changes a value, so the 1 is dropped and X remains.",
      };
    }
    if (isAnd && isConst(left, 1)) {
      return {
        node: right,
        rule: "identity",
        detail: "1.X = X",
        explanation:
          "Identity law: ANDing with 1 never changes a value, so the 1 is dropped and X remains.",
      };
    }
    if (!isAnd && isConst(right, 0)) {
      return {
        node: left,
        rule: "identity",
        detail: "X+0 = X",
        explanation:
          "Identity law: ORing with 0 never changes a value, so the 0 is dropped and X remains.",
      };
    }
    if (!isAnd && isConst(left, 0)) {
      return {
        node: right,
        rule: "identity",
        detail: "0+X = X",
        explanation:
          "Identity law: ORing with 0 never changes a value, so the 0 is dropped and X remains.",
      };
    }

    // Domination: X.0 = 0, 0.X = 0, X+1 = 1, 1+X = 1
    if (isAnd && (isConst(right, 0) || isConst(left, 0))) {
      return {
        node: { kind: "const", value: 0 },
        rule: "domination",
        detail: "X.0 = 0",
        explanation:
          "Domination law: one 0 input is enough — the AND term is 0 whatever X is, so the whole term collapses to 0.",
      };
    }
    if (!isAnd && (isConst(right, 1) || isConst(left, 1))) {
      return {
        node: { kind: "const", value: 1 },
        rule: "domination",
        detail: "X+1 = 1",
        explanation:
          "Domination law: one 1 input forces the OR to 1 whatever X is, so the whole term collapses to 1.",
      };
    }

    // Idempotent: X.X = X, X+X = X
    if (structuralEqual(left, right)) {
      return {
        node: left,
        rule: "idempotent",
        detail: isAnd ? "X.X = X" : "X+X = X",
        explanation: isAnd
          ? "Idempotent law: a variable ANDed with itself keeps the same value — X.X is just X."
          : "Idempotent law: a variable ORed with itself keeps the same value — X+X is just X.",
      };
    }

    // Complement: X.!X = 0, X+!X = 1 (either side may hold the NOT)
    const complementary = (p: BooleanAst, q: BooleanAst): boolean =>
      (p.kind === "not" && structuralEqual(p.operand, q)) ||
      (q.kind === "not" && structuralEqual(q.operand, p));
    if (isAnd && complementary(left, right)) {
      return {
        node: { kind: "const", value: 0 },
        rule: "complement",
        detail: "X.!X = 0",
        explanation:
          "Complement law: a value and its opposite can never both be true, so X.!X is always 0.",
      };
    }
    if (!isAnd && complementary(left, right)) {
      return {
        node: { kind: "const", value: 1 },
        rule: "complement",
        detail: "X+!X = 1",
        explanation:
          "Complement law: either X is true or its opposite is — one of them always fires, so X+!X is always 1.",
      };
    }
  }

  return null;
}

/** Find the first applicable rewrite in a pre-order walk (root first). */
function rewriteFirst(node: BooleanAst): Rewrite | null {
  const here = rewriteAtNode(node);
  if (here) return here;

  if (node.kind === "not") {
    const child = rewriteFirst(node.operand);
    if (child) {
      return { ...child, node: not(child.node) };
    }
    return null;
  }

  if (node.kind === "and" || node.kind === "or" || node.kind === "xor") {
    const left = rewriteFirst(node.left);
    if (left) {
      return { ...left, node: { ...node, left: left.node } };
    }
    const right = rewriteFirst(node.right);
    if (right) {
      return { ...right, node: { ...node, right: right.node } };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SimplifyResult {
  /** Ordered teaching steps (possibly empty when already simplest). */
  steps: SimplifyStep[];
  /** Normalized original expression. */
  original: string;
  /** Normalized final expression (equals `original` when no rule applied). */
  result: string;
  /** True when the step cap was reached before a fixpoint. */
  capped: boolean;
}

/**
 * Simplify an expression by applying the documented rule subset until a
 * fixpoint (or MAX_SIMPLIFY_STEPS). One rewrite per step so students can
 * follow every change. Uses only the rules above — nothing else.
 */
export function simplifyDemo(expr: string): SimplifyResult {
  let current = parse(expr);
  const original = toNormalizedString(current);
  const steps: SimplifyStep[] = [];

  for (let index = 0; index < MAX_SIMPLIFY_STEPS; index += 1) {
    const rewrite = rewriteFirst(current);
    if (!rewrite) {
      return { steps, original, result: toNormalizedString(current), capped: false };
    }
    const before = toNormalizedString(current);
    current = rewrite.node;
    steps.push({
      title: `Step ${steps.length + 1} — ${SUPPORTED_RULES.find((r) => r.rule === rewrite.rule)?.title ?? rewrite.rule} (${rewrite.detail})`,
      before,
      after: toNormalizedString(current),
      rule: rewrite.rule,
      explanation: rewrite.explanation,
    });
  }

  return { steps, original, result: toNormalizedString(current), capped: true };
}

/**
 * Explicit De Morgan walkthrough: push every outer NOT inward using ONLY
 * De Morgan's laws and double-negation, stopping when no NOT sits above an
 * AND/OR anymore. Other laws are deliberately NOT applied here.
 */
export function deMorganSteps(expr: string): SimplifyStep[] {
  let current = parse(expr);
  const steps: SimplifyStep[] = [];

  for (let index = 0; index < MAX_SIMPLIFY_STEPS; index += 1) {
    const rewrite = demorganOnlyRewrite(current);
    if (!rewrite) break;
    const before = toNormalizedString(current);
    current = rewrite.node;
    steps.push({
      title: `Step ${steps.length + 1} — ${rewrite.rule === "de-morgan" ? "De Morgan's laws" : "Double negation"} (${rewrite.detail})`,
      before,
      after: toNormalizedString(current),
      rule: rewrite.rule,
      explanation: rewrite.explanation,
    });
  }

  return steps;
}

function demorganOnlyRewrite(node: BooleanAst): Rewrite | null {
  const here =
    node.kind === "not" &&
    (node.operand.kind === "and" ||
      node.operand.kind === "or" ||
      node.operand.kind === "not")
      ? rewriteAtNode(node)
      : null;
  if (here) return here;

  if (node.kind === "not") {
    const child = demorganOnlyRewrite(node.operand);
    if (child) return { ...child, node: not(child.node) };
    return null;
  }

  if (node.kind === "and" || node.kind === "or" || node.kind === "xor") {
    const left = demorganOnlyRewrite(node.left);
    if (left) return { ...left, node: { ...node, left: left.node } };
    const right = demorganOnlyRewrite(node.right);
    if (right) return { ...right, node: { ...node, right: right.node } };
  }

  return null;
}
