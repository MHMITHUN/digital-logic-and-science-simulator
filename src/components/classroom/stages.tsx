"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { GATES, truthTable, type Bit, type GateKey } from "@/engines/logic";
import { truthTable as booleanTruthTable } from "@/engines/boolean";
import { findGroups, kmapGrid, resultSop } from "@/engines/kmap";
import { convert, type Base } from "@/engines/numbers";
import { GateSymbol } from "@/components/logic/GateSymbol";
import { ConversionSteps } from "@/components/numbers/ConversionSteps";
import { TruthTableCompare } from "@/components/boolean/TruthTableCompare";
import { KMapGridView, toneForIndex } from "@/components/boolean/KMapGridView";
import { cn } from "@/lib/utils";

/**
 * Classroom stage components — the same engines as the labs, rendered at
 * presentation size. Minimal chrome, giant typography, high contrast.
 */

// ---------------------------------------------------------------------------
// Gate demo (AND / XOR / …)
// ---------------------------------------------------------------------------

function BigSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Bit;
  onChange: (value: Bit) => void;
}) {
  const on = value === 1;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Input ${label}`}
      onClick={() => onChange(on ? 0 : 1)}
      className={cn(
        "flex h-24 w-64 items-center justify-between rounded-2xl border-2 px-8 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        on ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-muted",
      )}
    >
      <span className="text-3xl font-bold">Switch {label}</span>
      <span className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "relative h-10 w-20 rounded-full border-2 transition-colors",
            on ? "border-accent bg-accent/30" : "border-border bg-bg",
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-7 rounded-full transition-all",
              on ? "left-10 bg-accent" : "left-1 bg-muted",
            )}
          />
        </span>
        <span className="w-8 font-mono text-4xl font-bold">{value}</span>
      </span>
    </button>
  );
}

export function GateStage({ gate: gateKey }: { gate: GateKey }) {
  const [a, setA] = useState<Bit>(1);
  const [b, setB] = useState<Bit>(0);
  const gate = GATES[gateKey];
  const twoInputs = gate.inputs === 2;
  const output = gate.evaluate(a, b);
  const rows = useMemo(() => truthTable(gateKey), [gateKey]);
  const currentIndex = twoInputs ? a * 2 + b : a;

  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-2">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-wrap justify-center gap-6">
          <BigSwitch label="A" value={a} onChange={setA} />
          {twoInputs && <BigSwitch label="B" value={b} onChange={setB} />}
        </div>
        <GateSymbol
          gateKey={gateKey}
          a={a}
          b={twoInputs ? b : undefined}
          y={output}
          className="max-w-2xl"
        />
        <p className="text-center font-mono text-3xl" aria-live="polite">
          {gate.booleanExpr("A", "B")} &nbsp;→&nbsp; {gate.booleanExpr(String(a), twoInputs ? String(b) : undefined)}{" "}
          ={" "}
          <span className={cn("font-bold", output === 1 ? "text-accent" : "text-muted")}>
            {output}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th scope="col" className="px-6 py-4 font-mono text-xl">A</th>
              {twoInputs && (
                <th scope="col" className="px-6 py-4 font-mono text-xl">B</th>
              )}
              <th scope="col" className="px-6 py-4 font-mono text-xl">Y</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => {
              const current = index === currentIndex;
              return (
                <tr
                  key={index}
                  aria-current={current ? "true" : undefined}
                  className={cn(current && "bg-accent/10")}
                >
                  <td className={cn("px-6 py-3 font-mono text-3xl", current ? "text-accent" : "text-muted")}>
                    {row.a}
                  </td>
                  {twoInputs && (
                    <td className={cn("px-6 py-3 font-mono text-3xl", current ? "text-accent" : "text-muted")}>
                      {row.b}
                    </td>
                  )}
                  <td
                    className={cn(
                      "px-6 py-3 font-mono text-3xl font-bold",
                      row.y === 1 ? "text-fg" : "text-muted",
                      current && "text-accent",
                    )}
                  >
                    {row.y}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number conversion demo
// ---------------------------------------------------------------------------

export function NumberStage({
  from,
  to,
  value: initialValue,
  revealCount,
}: {
  from: Base;
  to: Base;
  value: string;
  revealCount: number;
}) {
  const [value, setValue] = useState(initialValue);

  const state = useMemo<{ result: ReturnType<typeof convert> | null; error: string | null }>(() => {
    try {
      return { result: convert(value, from, to), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Cannot convert." };
    }
  }, [value, from, to]);

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-8">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-8 py-5">
          <span className="text-sm uppercase tracking-wide text-muted">{from}</span>
          <input
            aria-label={`Value in ${from}`}
            className="w-56 bg-transparent text-center font-mono text-5xl font-bold text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            value={value}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <ArrowRight className="size-10 shrink-0 text-accent" aria-hidden="true" />
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent/40 bg-accent/5 px-8 py-5">
          <span className="text-sm uppercase tracking-wide text-muted">{to}</span>
          <span className="min-h-[3.75rem] font-mono text-5xl font-bold text-accent" aria-live="polite">
            {state.result ? state.result.result : "—"}
          </span>
        </div>
      </div>

      {state.error && <p role="alert" className="text-lg font-medium text-danger">{state.error}</p>}

      {state.result && (
        <div className="w-full">
          <ConversionSteps result={state.result} size="lg" revealCount={revealCount} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// De Morgan proof by table
// ---------------------------------------------------------------------------

export function DeMorganStage({ revealRows }: { revealRows: number }) {
  const columns = useMemo(
    () => [
      { label: "!(A.B)", table: booleanTruthTable("!(A.B)") },
      { label: "!A + !B", table: booleanTruthTable("!A + !B") },
    ],
    [],
  );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <p className="text-center font-mono text-4xl font-semibold text-fg">
        <span className="text-accent">!(A.B)</span> &nbsp;=&nbsp;{" "}
        <span className="text-accent">!A + !B</span>
      </p>
      <p className="text-center text-xl text-muted">
        Break the bar, change the sign — then check every row agrees.
      </p>
      <TruthTableCompare
        columns={columns}
        revealRows={revealRows}
        size="lg"
        matchNote="All rows match: NOT of an AND equals the OR of the NOTs."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// K-map walk-through
// ---------------------------------------------------------------------------

export function KMapStage({
  expression,
  revealGroups,
}: {
  expression: string;
  revealGroups: number;
}) {
  const grid = useMemo(() => kmapGrid(expression), [expression]);
  const groups = useMemo(() => findGroups(grid), [grid]);
  const shown = groups.slice(0, Math.max(0, revealGroups));
  const complete = shown.length >= groups.length;

  const overlays = shown.map((group, index) => ({
    rows: group.rows,
    cols: group.cols,
    minterms: group.minterms,
    tone: toneForIndex(index),
  }));

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="text-center text-xl text-muted">
        Map of <span className="font-mono text-2xl text-fg">Y = {expression}</span> — groups
        appear as we find them.
      </p>
      <KMapGridView grid={grid} size="lg" groups={overlays} />
      {complete ? (
        <p className="break-all rounded-2xl border border-accent/40 bg-accent/5 px-8 py-5 text-center font-mono text-4xl font-bold text-accent">
          Y = {resultSop(groups)}
        </p>
      ) : (
        <p className="text-lg italic text-muted">
          {groups.length - shown.length} more group{groups.length - shown.length === 1 ? "" : "s"} to
          reveal — press Next.
        </p>
      )}
    </div>
  );
}
