import { ArrowRight } from "lucide-react";
import type {
  ConversionResult,
  DivisionStep,
  GroupStep,
  PositionalStep,
} from "@/engines/numbers";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<ConversionResult["method"], string> = {
  positional: "Positional method — expand each digit by its place value",
  "division-remainder": "Division-remainder method — divide, keep the remainders",
  grouping: "Grouping shortcut — split the bits into equal groups",
};

const isDivisionStep = (step: PositionalStep | DivisionStep | GroupStep): step is DivisionStep =>
  "dividend" in step;
const isGroupStep = (step: PositionalStep | DivisionStep | GroupStep): step is GroupStep =>
  "group" in step;

/**
 * Step-by-step working for one conversion, rendered from the numbers
 * engine's own step records (nothing here recomputes a value). `revealCount`
 * lets classroom mode uncover the working one row at a time.
 */
export function ConversionSteps({
  result,
  size = "md",
  revealCount,
}: {
  result: ConversionResult;
  size?: "md" | "lg";
  /** Show only the first N steps (classroom reveal); undefined shows all. */
  revealCount?: number;
}) {
  const lg = size === "lg";
  const showAll = revealCount === undefined || revealCount >= result.steps.length;
  const steps = showAll ? result.steps : result.steps.slice(0, Math.max(0, revealCount));

  return (
    <div className="flex flex-col gap-3">
      <p className={cn("font-medium text-accent", lg ? "text-lg" : "text-sm")}>
        {METHOD_LABELS[result.method]}
      </p>

      {result.steps.length === 0 ? (
        <p className={cn("text-muted", lg ? "text-base" : "text-sm")}>{result.note}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4",
                lg ? "py-3.5 text-xl" : "py-2.5 text-base",
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md bg-surface font-mono font-semibold text-accent",
                  lg ? "size-8 text-base" : "size-6 text-xs",
                )}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {isDivisionStep(step) ? (
                <span className="font-mono text-fg">
                  {step.dividend} ÷ {step.divisor} = {step.quotient}{" "}
                  <span className="text-muted">remainder</span>{" "}
                  <span className="font-semibold text-accent">{step.remainder}</span>
                </span>
              ) : isGroupStep(step) ? (
                <span className="flex flex-wrap items-center gap-2 font-mono text-fg">
                  <span className="rounded bg-bg px-2 py-0.5">{step.group}</span>
                  <ArrowRight className={cn("text-muted", lg ? "size-5" : "size-4")} aria-hidden="true" />
                  <span className="font-semibold text-accent">{step.digit}</span>
                </span>
              ) : (
                <span className="flex flex-wrap items-baseline gap-x-3 font-mono text-fg">
                  <span>{step.term}</span>
                  <span className="text-muted">
                    running total {step.runningTotal}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {result.note && result.steps.length > 0 && (
        <p className={cn("text-muted", lg ? "text-base" : "text-sm")}>{result.note}</p>
      )}

      {!showAll && (
        <p className={cn("text-muted italic", lg ? "text-base" : "text-sm")}>
          Press Next to reveal the next row of working…
        </p>
      )}
    </div>
  );
}
