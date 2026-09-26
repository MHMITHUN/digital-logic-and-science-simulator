"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Table2 } from "lucide-react";
import { truthTable, type BooleanTruthTable } from "@/engines/boolean";
import { sopExpression } from "@/engines/kmap";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TD,
  TH,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ExprField } from "./ExpressionUi";

/**
 * Boolean lab, tab 1: type an expression, get its variables, its full truth
 * table, and the canonical sum-of-products built from its minterms — all
 * from the boolean + kmap engines.
 */
export function TruthTablePanel() {
  const [expr, setExpr] = useState("A.B + !A.C");

  const parsed = useMemo<{
    table: BooleanTruthTable | null;
    sop: string | null;
    error: string | null;
  }>(() => {
    try {
      return { table: truthTable(expr), sop: sopExpression(expr), error: null };
    } catch (error) {
      return {
        table: null,
        sop: null,
        error: error instanceof Error ? error.message : "Could not read that expression.",
      };
    }
  }, [expr]);

  const empty = expr.trim() === "";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Expression → truth table</CardTitle>
          <p className="text-xs text-muted">
            AND with <code>.</code> or <code>*</code>, OR with <code>+</code>, XOR with{" "}
            <code>^</code>, NOT with <code>!</code> or a trailing apostrophe (<code>A&apos;</code>).
            Up to 4 variables.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ExprField
            name="bool-table-expr"
            label="Boolean expression"
            value={expr}
            onChange={setExpr}
            error={parsed.error}
            hint="Live: the table rebuilds on every keystroke."
          />
          {parsed.table && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Variables detected
              </span>
              {parsed.table.vars.map((name) => (
                <Badge key={name} tone="accent">
                  {name}
                </Badge>
              ))}
              <span className="text-xs text-muted">
                {parsed.table.minterms.length} of {parsed.table.rows.length} rows output 1
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {empty ? (
        <EmptyState
          icon={Lightbulb}
          title="Start typing a Boolean expression"
          description="For example A.B + !A.C — the truth table appears the moment the expression parses."
        />
      ) : parsed.table ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="size-4 text-accent" aria-hidden="true" />
                Truth table
              </CardTitle>
              <p className="text-xs text-muted">
                Rows where the output is 1 are highlighted — their numbers are the minterms.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TH>Row</TH>
                    {parsed.table.vars.map((name) => (
                      <TH key={name}>{name}</TH>
                    ))}
                    <TH>Y</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.table.rows.map((row, index) => {
                    const isOne = row.output === 1;
                    return (
                      <TableRow
                        key={index}
                        className={cn(isOne && "bg-accent/10 hover:bg-accent/10")}
                      >
                        <TD className="font-mono text-muted">
                          m<sub>{index}</sub>
                        </TD>
                        {parsed.table?.vars.map((name) => (
                          <TD key={name} className="font-mono">
                            {row.input[name]}
                          </TD>
                        ))}
                        <TD
                          className={cn(
                            "font-mono font-bold",
                            isOne ? "text-accent" : "text-muted",
                          )}
                        >
                          {row.output}
                        </TD>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sum-of-products from the minterms</CardTitle>
              <p className="text-xs text-muted">
                One product term per 1-row — the canonical form exam questions ask for.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="break-all rounded-xl border border-accent/40 bg-accent/5 p-4 font-mono text-lg font-semibold text-accent">
                Y = {parsed.sop}
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Each term names its row: uncomplemented variables are 1 in that row,
                complemented ones (<span className="font-mono">A&apos;</span>) are 0. This
                is the textbook dotless style — to reuse it in the other tabs, put a{" "}
                <span className="font-mono">.</span> between the literals (
                <span className="font-mono">A&apos;.B</span>).
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={Table2}
          title="The table will appear once the expression parses"
          description="Read the message above — it points at the exact character that broke the parse."
        />
      )}
    </div>
  );
}
