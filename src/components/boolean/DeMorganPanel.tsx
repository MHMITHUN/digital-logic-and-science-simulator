"use client";

import { useMemo, useState } from "react";
import { SplitSquareHorizontal } from "lucide-react";
import { truthTable, toNormalizedString, parse, type BooleanTruthTable } from "@/engines/boolean";
import { deMorganSteps } from "@/engines/boolean-simplify";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { ExprField, ExpressionSteps } from "./ExpressionUi";
import { TruthTableCompare } from "./TruthTableCompare";

/**
 * Boolean lab, tab 3: De Morgan's laws as a step-by-step transformation.
 * Every NOT sitting above an AND/OR is pushed inward; the proof-by-table
 * underneath verifies the original and the result agree on every row.
 */
export function DeMorganPanel() {
  const [expr, setExpr] = useState("!(A.B) + !(C+D)");

  const walkthrough = useMemo<{
    steps: ReturnType<typeof deMorganSteps>;
    original: string | null;
    final: string | null;
    error: string | null;
  }>(() => {
    try {
      const steps = deMorganSteps(expr);
      const original = toNormalizedString(parse(expr));
      const final = steps.length > 0 ? steps[steps.length - 1].after : original;
      return { steps, original, final, error: null };
    } catch (error) {
      return {
        steps: [],
        original: null,
        final: null,
        error: error instanceof Error ? error.message : "Could not read that expression.",
      };
    }
  }, [expr]);

  const compare = useMemo<{
    columns: Array<{ label: string; table: BooleanTruthTable }>;
  }>(() => {
    if (!walkthrough.original || !walkthrough.final) return { columns: [] };
    try {
      return {
        columns: [
          { label: walkthrough.original, table: truthTable(walkthrough.original) },
          { label: walkthrough.final, table: truthTable(walkthrough.final) },
        ],
      };
    } catch {
      return { columns: [] };
    }
  }, [walkthrough]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Break the bar, change the sign</CardTitle>
          <p className="text-xs text-muted">
            The two laws: <span className="font-mono">!(X.Y) = !X + !Y</span> and{" "}
            <span className="font-mono">!(X+Y) = !X.!Y</span>. Give any expression
            with a NOT over an AND/OR — try{" "}
            <span className="font-mono">!(A.B) + !(C+D)</span> or{" "}
            <span className="font-mono">!(A + B.C)&apos;</span>.
          </p>
        </CardHeader>
        <CardContent>
          <ExprField
            name="bool-demorgan-expr"
            label="Expression with a negated sub-expression"
            value={expr}
            onChange={setExpr}
            error={walkthrough.error}
            hint="Only De Morgan and double negation are applied here — no other simplification."
          />
        </CardContent>
      </Card>

      {walkthrough.error === null && walkthrough.original !== null && (
        <>
          {walkthrough.steps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>The push inward, one move at a time</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpressionSteps
                  steps={walkthrough.steps}
                  finalLabel="Same function, every bar broken"
                  finalExpression={walkthrough.final ?? undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-muted">
                  No NOT sits above an AND/OR here — De Morgan has nothing to
                  push. Wrap a sub-expression in parentheses and negate it, like{" "}
                  <span className="font-mono">!(A.B)</span>.
                </p>
              </CardContent>
            </Card>
          )}

          {compare.columns.length === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SplitSquareHorizontal className="size-4 text-accent" aria-hidden="true" />
                  Proof by table — original vs result
                </CardTitle>
                <p className="text-xs text-muted">
                  Both columns are computed live from the boolean engine. Equal
                  on every row means the transformation kept the function.
                </p>
              </CardHeader>
              <CardContent>
                <TruthTableCompare columns={compare.columns} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
