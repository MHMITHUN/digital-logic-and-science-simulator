"use client";

import { useMemo, useState } from "react";
import { Scale, Wand2 } from "lucide-react";
import { truthTable } from "@/engines/boolean";
import {
  SUPPORTED_RULES,
  simplifyDemo,
  type SimplifyResult,
} from "@/engines/boolean-simplify";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { ExprField, ExpressionSteps } from "./ExpressionUi";

/**
 * Boolean lab, tab 2: the simplification DEMO. Each applied rule becomes a
 * card; the honest subset note shows when nothing applies (spec §16.5 —
 * never claim a full theorem prover).
 */
export function SimplifyPanel() {
  const [expr, setExpr] = useState("!(A.B).1 + B.0");

  const demo = useMemo<{ result: SimplifyResult | null; error: string | null }>(() => {
    try {
      return { result: simplifyDemo(expr), error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Could not read that expression.",
      };
    }
  }, [expr]);

  const equivalence = useMemo<"match" | "differ" | "unknown">(() => {
    if (!demo.result) return "unknown";
    try {
      const before = truthTable(expr).minterms;
      const after = truthTable(demo.result.result).minterms;
      return before.join(",") === after.join(",") ? "match" : "differ";
    } catch {
      return "unknown";
    }
  }, [expr, demo]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Simplify step by step</CardTitle>
          <p className="text-xs text-muted">
            One rule per step, applied until no documented rule fits. Try{" "}
            <span className="font-mono">!(A.B).1 + B.0</span> or{" "}
            <span className="font-mono">!!A + A + A&apos;</span>.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ExprField
            name="bool-simplify-expr"
            label="Expression to simplify"
            value={expr}
            onChange={setExpr}
            error={demo.error}
            hint="The demo works on a documented subset of identities — see the list below."
          />
          {demo.result && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{demo.result.steps.length} step{demo.result.steps.length === 1 ? "" : "s"}</Badge>
              {equivalence === "match" && (
                <Badge tone="success">Equivalent to the original — verified row by row</Badge>
              )}
              {equivalence === "differ" && (
                <Badge tone="danger">Differs from the original — should not happen, please report</Badge>
              )}
              {equivalence === "unknown" && (
                <Badge tone="warning">Could not verify equivalence for this input</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {demo.result && (
        <>
          {demo.result.capped && (
            <Alert tone="warning" title="Step limit reached">
              The demo stopped after {demo.result.steps.length} steps without reaching a
              fixed point. For classroom expressions this never happens — simplify the
              input a little.
            </Alert>
          )}

          {demo.result.steps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Each move, explained</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpressionSteps
                  steps={demo.result.steps}
                  finalLabel="Simplest form the demo reaches"
                  finalExpression={demo.result.result}
                />
              </CardContent>
            </Card>
          ) : (
            <Alert tone="info" title="No documented rule applies" className="w-fit">
              Either this expression is already minimal for the rules this lab
              demonstrates, or it needs a move outside the subset below (for
              example absorption, <span className="font-mono">X + X.Y</span>).
              Honesty note: this is a teaching demonstration, not an industrial
              theorem prover.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="size-4 text-accent" aria-hidden="true" />
                Rules this demo knows
              </CardTitle>
              <p className="text-xs text-muted">
                Applied in this order until nothing changes — nothing else runs
                under the hood.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {SUPPORTED_RULES.map((rule) => (
                <span
                  key={rule.rule}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-fg"
                >
                  <span className="mr-2 font-sans font-medium text-accent">{rule.title}:</span>
                  {rule.law}
                </span>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {demo.error && (
        <Alert tone="danger" title="Cannot simplify yet" className="w-fit">
          Fix the expression above and the steps appear here.
        </Alert>
      )}

      <p className="flex items-center gap-2 text-xs text-muted">
        <Wand2 className="size-3.5" aria-hidden="true" />
        Need a stronger reduction? Build the K-map in tab 4 — its grouping finds
        the true minimal SOP for 2–4 variables.
      </p>
    </div>
  );
}
