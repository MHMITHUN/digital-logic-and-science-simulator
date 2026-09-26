"use client";

import { useState } from "react";
import { AlertTriangle, Minus, Plus, RotateCcw } from "lucide-react";
import {
  PhysicsError,
  circuit,
  parallelR,
  seriesR,
  type CircuitResult,
  type ResistanceResult,
} from "@/engines/physics";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export interface SeriesParallelInitial {
  mode: "series" | "parallel";
  sourceV: number;
  resistors: number[];
}

const MIN_RESISTORS = 2;
const MAX_RESISTORS = 8;

function formatDisplay(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

/**
 * Series/parallel resistor bench — shared by the Physics lab (md) and
 * classroom mode (lg). Equivalent resistance, total current, per-resistor
 * voltage drops (as proportional bars), power, and warnings all come from
 * the physics engine.
 */
export function SeriesParallelBench({
  size = "md",
  initial = { mode: "series", sourceV: 12, resistors: [10, 20] },
}: {
  size?: "md" | "lg";
  initial?: SeriesParallelInitial;
}) {
  const lg = size === "lg";
  const [mode, setMode] = useState<"series" | "parallel">(initial.mode);
  const [sourceV, setSourceV] = useState(String(initial.sourceV));
  const [resistors, setResistors] = useState<string[]>(
    initial.resistors.map((value) => String(value)),
  );

  const sourceText = sourceV.trim();
  const sourceValue = Number(sourceText);
  const sourceError =
    sourceText === ""
      ? "Enter the source voltage."
      : !Number.isFinite(sourceValue)
        ? "That is not a number — use digits, e.g. 12."
        : null;

  const resistorValues: number[] = [];
  const resistorErrors: Array<string | null> = [];
  for (const text of resistors) {
    const trimmed = text.trim();
    if (trimmed === "") {
      resistorErrors.push("Enter a value.");
      resistorValues.push(Number.NaN);
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        resistorErrors.push("Not a number.");
        resistorValues.push(Number.NaN);
      } else {
        resistorErrors.push(null);
        resistorValues.push(parsed);
      }
    }
  }

  let analysis: CircuitResult | null = null;
  let combined: ResistanceResult | null = null;
  let engineError: string | null = null;
  if (!sourceError && resistorErrors.every((error) => error === null)) {
    try {
      combined = mode === "series" ? seriesR(resistorValues) : parallelR(resistorValues);
      analysis = circuit({ sourceV: sourceValue, resistors: resistorValues, mode });
    } catch (error) {
      engineError =
        error instanceof PhysicsError ? error.message : "Something went wrong analysing the circuit.";
    }
  }

  const reset = () => {
    setMode(initial.mode);
    setSourceV(String(initial.sourceV));
    setResistors(initial.resistors.map((value) => String(value)));
  };

  const addResistor = () =>
    setResistors((current) =>
      current.length < MAX_RESISTORS ? [...current, "10"] : current,
    );
  const removeResistor = () =>
    setResistors((current) =>
      current.length > MIN_RESISTORS ? current.slice(0, -1) : current,
    );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Controls */}
      <Card>
        <CardHeader className={lg ? "py-5" : undefined}>
          <CardTitle className={lg ? "text-xl" : undefined}>Build the network</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div
            role="group"
            aria-label="Circuit mode"
            className="flex gap-2"
          >
            {(["series", "parallel"] as const).map((option) => {
              const active = mode === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(option)}
                  className={cn(
                    "flex-1 rounded-lg border font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    lg ? "h-12 text-lg" : "h-10 text-sm",
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface-2 text-muted hover:text-fg",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2" role="group" aria-label="Number of resistors">
              <Button
                variant="outline"
                size={lg ? "lg" : "md"}
                onClick={removeResistor}
                disabled={resistors.length <= MIN_RESISTORS}
                aria-label="Remove one resistor"
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <p className={cn("min-w-24 text-center font-mono font-semibold text-fg", lg ? "text-xl" : "text-sm")}>
                {resistors.length} resistors
              </p>
              <Button
                variant="outline"
                size={lg ? "lg" : "md"}
                onClick={addResistor}
                disabled={resistors.length >= MAX_RESISTORS}
                aria-label="Add one resistor"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <Button variant="ghost" size={lg ? "lg" : "md"} onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
          </div>

          <Field
            label="Source voltage (V)"
            name={`bench-source-${size}`}
            error={sourceError ?? undefined}
            hint="The DC supply driving the whole network."
          >
            {(ids) => (
              <Input
                id={ids.id}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="e.g. 12"
                invalid={Boolean(sourceError)}
                aria-describedby={ids["aria-describedby"]}
                aria-invalid={ids["aria-invalid"]}
                className={cn("max-w-[180px] font-mono", lg && "h-12 text-lg")}
                value={sourceV}
                onChange={(event) => setSourceV(event.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-col gap-3">
            <p className={cn("font-medium text-fg", lg ? "text-lg" : "text-sm")}>
              Resistor values (Ω)
            </p>
            <div
              className={cn(
                "grid gap-3",
                resistors.length > 4 ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              {resistors.map((value, index) => (
                <Field
                  key={index}
                  label={`Resistor R${index + 1} in ohms`}
                  name={`bench-r${index + 1}-${size}`}
                  hideLabel
                  error={resistorErrors[index] ?? undefined}
                >
                  {(ids) => (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-md bg-surface-2 px-2 py-1.5 font-mono text-sm text-muted",
                        )}
                      >
                        R{index + 1}
                      </span>
                      <Input
                        id={ids.id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder="e.g. 10"
                        invalid={Boolean(resistorErrors[index])}
                        aria-describedby={ids["aria-describedby"]}
                        aria-invalid={ids["aria-invalid"]}
                        className={cn("font-mono", lg && "h-12 text-lg")}
                        value={value}
                        onChange={(event) =>
                          setResistors((current) =>
                            current.map((old, i) => (i === index ? event.target.value : old)),
                          )
                        }
                      />
                    </div>
                  )}
                </Field>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className={lg ? "py-5" : undefined}>
          <CardTitle className={lg ? "text-xl" : undefined}>
            {mode === "series" ? "Series" : "Parallel"} analysis
          </CardTitle>
          <p className="text-xs text-muted">
            Computed live from V = I × R and the {mode} resistance laws.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {engineError && <Alert tone="danger" title="The engine objects">{engineError}</Alert>}

          {analysis && combined && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-bg p-4">
                  <p className={cn("font-mono text-muted", lg ? "text-base" : "text-xs uppercase tracking-wide")}>
                    Equivalent resistance
                  </p>
                  <p className={cn("font-mono font-bold text-accent", lg ? "text-4xl" : "text-3xl")}>
                    {formatDisplay(analysis.equivalentR)} Ω
                  </p>
                  <p className={cn("mt-2 font-mono text-muted", lg ? "text-base" : "text-xs")}>
                    {combined.substitution}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-bg p-4">
                  <p className={cn("font-mono text-muted", lg ? "text-base" : "text-xs uppercase tracking-wide")}>
                    Total current
                  </p>
                  <p className={cn("font-mono font-bold text-accent", lg ? "text-4xl" : "text-3xl")}>
                    {formatDisplay(analysis.totalCurrent)} A
                  </p>
                  <p className={cn("mt-2 font-mono text-muted", lg ? "text-base" : "text-xs")}>
                    I = {formatDisplay(sourceValue)} V ÷ {formatDisplay(analysis.equivalentR)} Ω ={" "}
                    {formatDisplay(analysis.totalCurrent)} A
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <p className={cn("font-medium text-fg", lg ? "text-lg" : "text-sm")}>
                  Voltage drop per resistor
                  {mode === "parallel" && (
                    <span className="ml-2 font-normal text-muted">
                      (in parallel every resistor sees the full source voltage)
                    </span>
                  )}
                </p>
                {analysis.drops.map((drop) => {
                  const share =
                    sourceValue > 0 ? (drop.voltage / sourceValue) * 100 : 0;
                  return (
                    <div key={drop.index} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={cn("font-mono text-fg", lg ? "text-xl" : "text-sm")}>
                          R{drop.index} · {formatDisplay(drop.resistance)} Ω
                        </p>
                        <p className={cn("font-mono text-muted", lg ? "text-lg" : "text-xs")}>
                          {formatDisplay(drop.voltage)} V · {formatDisplay(drop.power)} W
                        </p>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(share)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`R${drop.index} share of the source voltage`}
                        className={cn("overflow-hidden rounded-full bg-surface-2", lg ? "h-4" : "h-2.5")}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            drop.power > 100 ? "bg-warning" : "bg-accent",
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {mode === "series" && (
                  <p className={cn("text-muted", lg ? "text-base" : "text-xs")}>
                    The drops always add up to the source:{" "}
                    <span className="font-mono text-fg">
                      {analysis.drops.map((drop) => formatDisplay(drop.voltage)).join(" + ")} ={" "}
                      {formatDisplay(sourceValue)} V
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg p-4">
                <p className={cn("font-mono text-fg", lg ? "text-2xl" : "text-base")}>
                  Total power: {formatDisplay(analysis.totalPower)} W
                </p>
                <p className={cn("font-mono text-muted", lg ? "text-base" : "text-xs")}>
                  P = V × I = {formatDisplay(sourceValue)} V ×{" "}
                  {formatDisplay(analysis.totalCurrent)} A
                </p>
              </div>

              {analysis.warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {analysis.warnings.map((warning) => (
                    <p
                      key={warning}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 font-medium text-warning",
                        lg ? "text-base" : "text-sm",
                      )}
                    >
                      <AlertTriangle className={cn("mt-0.5 shrink-0", lg ? "size-5" : "size-4")} aria-hidden="true" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              {analysis.warnings.length === 0 && (
                <Badge tone="success">All values are inside classroom-safe limits</Badge>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
