"use client";

import { useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import {
  CURRENT_WARN_AMPS,
  POWER_WARN_WATTS,
  PhysicsError,
  ohm,
  power,
  type OhmResult,
  type PowerResult,
  type Quantity,
} from "@/engines/physics";
import { Badge, Card, CardContent, CardHeader, CardTitle, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface OhmInitial {
  solveFor: Quantity;
  v: number;
  i: number;
  r: number;
}

interface QuantityMeta {
  name: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const QUANTITIES: Record<Quantity, QuantityMeta> = {
  v: { name: "Voltage", symbol: "V", unit: "V", min: 0, max: 24, step: 0.5 },
  i: { name: "Current", symbol: "I", unit: "A", min: 0, max: 10, step: 0.1 },
  r: { name: "Resistance", symbol: "R", unit: "Ω", min: 0, max: 1000, step: 1 },
};

const QUANTITY_ORDER: readonly Quantity[] = ["v", "i", "r"];

/** Trim display floats without lying about the engine's value (only zeros go). */
function formatDisplay(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Ohm's Law bench — shared by the Physics lab (md) and classroom mode (lg).
 * All values come from the physics engine; the sliders are just a friendly
 * way to type numbers.
 */
export function OhmSolver({
  size = "md",
  initial = { solveFor: "i", v: 12, i: 2, r: 10 },
}: {
  size?: "md" | "lg";
  initial?: OhmInitial;
}) {
  const lg = size === "lg";
  const [solveFor, setSolveFor] = useState<Quantity>(initial.solveFor);
  const [fields, setFields] = useState<Record<Quantity, string>>({
    v: String(initial.v),
    i: String(initial.i),
    r: String(initial.r),
  });

  const givens = QUANTITY_ORDER.filter((q) => q !== solveFor);

  const numeric: Partial<Record<Quantity, number>> = {};
  const fieldErrors: Partial<Record<Quantity, string>> = {};
  for (const q of givens) {
    const text = fields[q].trim();
    if (text === "") {
      fieldErrors[q] = `Enter a value for ${QUANTITIES[q].name.toLowerCase()} first.`;
    } else {
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) {
        fieldErrors[q] = "That is not a number — use digits, e.g. 12 or 4.5.";
      } else {
        numeric[q] = parsed;
      }
    }
  }

  let result: OhmResult | null = null;
  let powerResult: PowerResult | null = null;
  let engineError: string | null = null;
  if (Object.keys(fieldErrors).length === 0) {
    try {
      result = ohm(numeric, solveFor);
    } catch (error) {
      engineError =
        error instanceof PhysicsError ? error.message : "Something went wrong solving Ohm's law.";
    }
    try {
      powerResult = power(numeric);
    } catch {
      powerResult = null; // shown only when the law itself solved cleanly
    }
  }

  const solvedCurrent = result?.unit === "A" ? result.value : numeric.i;
  const warnings: string[] = [];
  if (solvedCurrent !== undefined && solvedCurrent > CURRENT_WARN_AMPS) {
    warnings.push(
      `Current is ${formatDisplay(solvedCurrent)} A — above ${CURRENT_WARN_AMPS} A is extreme for a classroom experiment.`,
    );
  }
  if (powerResult && powerResult.p > POWER_WARN_WATTS) {
    warnings.push(
      `Power is ${formatDisplay(powerResult.p)} W — above ${POWER_WARN_WATTS} W would cook a real resistor.`,
    );
  }

  return (
    <div className={cn("grid gap-6", lg ? "lg:grid-cols-2" : "md:grid-cols-2")}>
      {/* Inputs */}
      <Card>
        <CardHeader className={lg ? "py-5" : undefined}>
          <CardTitle className={lg ? "text-xl" : undefined}>Set the two known values</CardTitle>
          <div className="max-w-xs pt-1">
            <Field label="Solve for" name={`ohm-solve-${size}`}>
              {(ids) => (
                <Select
                  id={ids.id}
                  value={solveFor}
                  onChange={(event) => setSolveFor(event.target.value as Quantity)}
                  className={lg ? "h-12 text-base" : undefined}
                >
                  <option value="v">Voltage V (given I and R)</option>
                  <option value="i">Current I (given V and R)</option>
                  <option value="r">Resistance R (given V and I)</option>
                </Select>
              )}
            </Field>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {QUANTITY_ORDER.map((q) => {
            const meta = QUANTITIES[q];
            const solved = q === solveFor;
            const fieldError = fieldErrors[q];
            const sliderValue = solved
              ? result
                ? clamp(result.value, meta.min, meta.max)
                : 0
              : numeric[q] !== undefined
                ? clamp(numeric[q] as number, meta.min, meta.max)
                : 0;

            return (
              <div
                key={q}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  solved ? "border-accent/50 bg-accent/5" : "border-border",
                  lg && "p-5",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className={cn("font-semibold text-fg", lg ? "text-xl" : "text-sm")}>
                    {meta.name} ({meta.symbol})
                    <span className="ml-2 font-normal text-muted">in {meta.unit}</span>
                  </p>
                  {solved && <Badge tone="accent">solved</Badge>}
                </div>
                <div className="flex flex-col gap-3">
                  <input
                    type="range"
                    aria-label={`${meta.name} in ${meta.unit}`}
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={sliderValue}
                    disabled={solved}
                    onChange={(event) =>
                      setFields((current) => ({ ...current, [q]: event.target.value }))
                    }
                    className={cn("w-full accent-accent disabled:opacity-50", lg && "h-3")}
                  />
                  <Field
                    label={`Value of ${meta.name}`}
                    name={`ohm-${q}-${size}`}
                    hideLabel
                    error={fieldError}
                    className="max-w-[180px]"
                  >
                    {(ids) => (
                      <Input
                        id={ids.id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={solved ? "—" : `e.g. ${meta.max / 2}`}
                        disabled={solved}
                        invalid={Boolean(fieldError)}
                        aria-describedby={ids["aria-describedby"]}
                        aria-invalid={ids["aria-invalid"]}
                        className={cn(
                          "font-mono",
                          lg && "h-12 text-lg",
                          solved && "border-accent/50 text-accent",
                        )}
                        value={solved ? (result ? formatDisplay(result.value) : "") : fields[q]}
                        onChange={(event) =>
                          setFields((current) => ({ ...current, [q]: event.target.value }))
                        }
                      />
                    )}
                  </Field>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Live readout */}
      <Card className="self-start">
        <CardHeader className={lg ? "py-5" : undefined}>
          <CardTitle className={lg ? "text-xl" : undefined}>Live readout</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {engineError && (
            <p role="alert" className={cn("font-medium text-danger", lg ? "text-lg" : "text-sm")}>
              {engineError}
            </p>
          )}
          {result && (
            <>
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-5 text-center">
                <p className={cn("font-mono text-muted", lg ? "text-lg" : "text-xs uppercase tracking-wide")}>
                  {QUANTITIES[solveFor].name}
                </p>
                <p className={cn("font-mono font-bold text-accent", lg ? "text-7xl" : "text-5xl")}>
                  {formatDisplay(result.value)}
                  <span className={lg ? "text-4xl" : "text-2xl"}> {result.unit}</span>
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-4">
                <p className={cn("font-mono text-fg", lg ? "text-2xl" : "text-base")}>
                  {result.substitution}
                </p>
                {powerResult && (
                  <p className={cn("font-mono text-fg", lg ? "text-2xl" : "text-base")}>
                    {powerResult.substitution}
                  </p>
                )}
              </div>
              <p className={cn("text-muted", lg ? "text-lg" : "text-sm")}>{result.note}</p>
              <p className={cn("flex items-start gap-2 text-muted", lg ? "text-base" : "text-xs")}>
                <Zap className={cn("mt-0.5 shrink-0 text-accent", lg ? "size-5" : "size-3.5")} aria-hidden="true" />
                Sliders cover classroom-friendly ranges; the number box accepts any value the
                engine can handle.
              </p>
            </>
          )}
          {warnings.length > 0 && (
            <div className="flex flex-col gap-2" role="status">
              {warnings.map((warning) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
