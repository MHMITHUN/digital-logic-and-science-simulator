"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Binary, Check, Copy } from "lucide-react";
import {
  binOctHexTable,
  convert,
  validate,
  type Base,
  type ConversionResult,
} from "@/engines/numbers";
import { ConversionSteps } from "./ConversionSteps";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TD,
  TH,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const BASE_OPTIONS: Array<{ base: Base; label: string; radix: number }> = [
  { base: "decimal", label: "Decimal", radix: 10 },
  { base: "binary", label: "Binary", radix: 2 },
  { base: "octal", label: "Octal", radix: 8 },
  { base: "hexadecimal", label: "Hexadecimal", radix: 16 },
];

const labelFor = (base: Base): string =>
  BASE_OPTIONS.find((option) => option.base === base)?.label ?? base;

const radixFor = (base: Base): number =>
  BASE_OPTIONS.find((option) => option.base === base)?.radix ?? 10;

/** Number System Lab: convert between decimal, binary, octal, and hexadecimal
 *  with the full working shown. Everything is computed by the numbers engine. */
export function NumberSystemLab() {
  const [value, setValue] = useState("25");
  const [from, setFrom] = useState<Base>("decimal");
  const [to, setTo] = useState<Base>("binary");
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => validate(value, from), [value, from]);
  const conversion = useMemo<{ result: ConversionResult | null; error: string | null }>(() => {
    if (!validation.ok) return { result: null, error: validation.error ?? null };
    try {
      return { result: convert(value, from, to), error: null };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Conversion failed." };
    }
  }, [value, from, to, validation]);

  const reference = useMemo(() => binOctHexTable(16), []);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const copyResult = async () => {
    if (!conversion.result) return;
    const text = conversion.result.result;
    let succeeded = false;
    try {
      await navigator.clipboard.writeText(text);
      succeeded = true;
    } catch {
      // Fallback for non-secure contexts: select a hidden textarea and copy.
      try {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        succeeded = document.execCommand("copy");
        helper.remove();
      } catch {
        succeeded = false;
      }
    }
    setCopied(succeeded);
    if (succeeded) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Binary className="size-3.5" aria-hidden="true" />
          Module 3 — Number Systems
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Number System Lab
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Computers speak in bases. Convert between decimal, binary, octal, and
          hexadecimal and see the <em>method</em> — division-remainder,
          positional expansion, or bit grouping — not just the answer.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Converter */}
        <Card>
          <CardHeader>
            <CardTitle>Converter</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Field
              label="Value to convert"
              name="ns-value"
              hint="Whole numbers only — up to 16 digits."
              error={validation.ok ? undefined : (validation.error ?? undefined)}
            >
              {(ids) => (
                <Input
                  id={ids.id}
                  placeholder={from === "hexadecimal" ? "e.g. 2F" : "e.g. 25"}
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    "font-mono text-lg tracking-wider",
                    from === "binary" && "tracking-[0.3em]",
                  )}
                  aria-describedby={ids["aria-describedby"]}
                  aria-invalid={ids["aria-invalid"]}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              )}
            </Field>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <Field label="From base" name="ns-from">
                {(ids) => (
                  <Select
                    id={ids.id}
                    value={from}
                    onChange={(event) => setFrom(event.target.value as Base)}
                  >
                    {BASE_OPTIONS.map((option) => (
                      <option key={option.base} value={option.base}>
                        {option.label} ({option.radix})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                variant="outline"
                size="md"
                onClick={swap}
                aria-label={`Swap: convert from ${labelFor(to)} to ${labelFor(from)} instead`}
                className="mb-0.5"
              >
                <ArrowLeftRight className="size-4" aria-hidden="true" />
              </Button>
              <Field label="To base" name="ns-to">
                {(ids) => (
                  <Select
                    id={ids.id}
                    value={to}
                    onChange={(event) => setTo(event.target.value as Base)}
                  >
                    {BASE_OPTIONS.map((option) => (
                      <option key={option.base} value={option.base}>
                        {option.label} ({option.radix})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Quick target
              </p>
              <div role="group" aria-label="Quick target base" className="flex flex-wrap gap-2">
                {BASE_OPTIONS.map((option) => {
                  const active = to === option.base;
                  return (
                    <button
                      key={option.base}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTo(option.base)}
                      className={cn(
                        "h-9 rounded-lg border px-3 font-mono text-sm font-medium transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-2 text-muted hover:text-fg",
                      )}
                    >
                      base {option.radix}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-5 text-center",
                conversion.result
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-bg opacity-80",
              )}
              aria-live="polite"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {conversion.result
                  ? `${labelFor(from)} → ${labelFor(to)}`
                  : "Result appears here"}
              </p>
              <p className="min-h-[3.5rem] font-mono text-4xl font-bold break-all text-accent">
                {conversion.result ? conversion.result.result : "—"}
              </p>
              {conversion.result && (
                <p className="text-xs text-muted">
                  {labelFor(to)} (base {radixFor(to)})
                </p>
              )}
              {conversion.result && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyResult}
                  className="self-center"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" aria-hidden="true" />
                      Copy result
                    </>
                  )}
                </Button>
              )}
            </div>

            {conversion.error && !validation.error && (
              <Alert tone="danger" title="Cannot convert">
                {conversion.error}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Working + reference */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How the engine got there</CardTitle>
              <p className="text-xs text-muted">
                The method is picked from the two bases — every row is real
                arithmetic from the conversion engine.
              </p>
            </CardHeader>
            <CardContent>
              {conversion.result ? (
                <ConversionSteps result={conversion.result} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">
                  Fix the value above and the full step-by-step working appears
                  here — for example {labelFor(from)} → {labelToSuggestion(from)}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reference table — 0 to 16</CardTitle>
              <p className="text-xs text-muted">
                The four number systems side by side. Hex digits past 9 are the
                letters A–F.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TH>Dec</TH>
                    <TH>Bin</TH>
                    <TH>Oct</TH>
                    <TH>Hex</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reference.map((row) => (
                    <TableRow key={row.decimal}>
                      <TD className="font-mono text-muted">{row.decimal}</TD>
                      <TD className="font-mono">{row.binary}</TD>
                      <TD className="font-mono">{row.octal}</TD>
                      <TD className="font-mono font-semibold text-accent">{row.hexadecimal}</TD>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Small teaching suggestion used only in the empty-working placeholder. */
function labelToSuggestion(from: Base): string {
  switch (from) {
    case "decimal":
      return "binary";
    case "binary":
      return "hexadecimal";
    default:
      return "decimal";
  }
}
