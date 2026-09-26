"use client";

import { ArrowRight } from "lucide-react";
import type { SimplifyStep } from "@/engines/boolean-simplify";
import { Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Shared pieces of the Boolean lab: the expression input (live parse errors
 * in a teaching voice) and the before → after step cards used by both the
 * simplifier and the De Morgan walkthrough.
 */

export function ExprField({
  label,
  value,
  onChange,
  error,
  hint,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  /** Unique name so Field ids do not collide between tabs. */
  name: string;
}) {
  return (
    <Field
      label={label}
      name={name}
      hint={error ? undefined : hint}
      error={error ?? undefined}
    >
      {(ids) => (
        <Input
          id={ids.id}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. A.B + !A.C"
          className={cn("font-mono text-base", error && "font-mono")}
          aria-describedby={ids["aria-describedby"]}
          aria-invalid={ids["aria-invalid"]}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

export function ExpressionSteps({
  steps,
  finalLabel,
  finalExpression,
}: {
  steps: SimplifyStep[];
  /** Heading above the final-result card; omitted when there are no steps. */
  finalLabel?: string;
  finalExpression?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-surface-2 p-4"
        >
          <p className="text-sm font-semibold text-accent">{step.title}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 break-all font-mono text-base">
            <span className="text-muted">{step.before}</span>
            <ArrowRight className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="font-semibold text-fg">{step.after}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.explanation}</p>
        </div>
      ))}
      {finalExpression !== undefined && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          {finalLabel && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {finalLabel}
            </p>
          )}
          <p className="mt-1 break-all font-mono text-xl font-semibold text-accent">
            {finalExpression}
          </p>
        </div>
      )}
    </div>
  );
}
