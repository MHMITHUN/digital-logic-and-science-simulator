"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircuitBoard, Info } from "lucide-react";
import { GATES, GATE_KEYS, truthTable, type Bit, type GateKey } from "@/engines/logic";
import { GateSymbol } from "@/components/logic/GateSymbol";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TD,
  TH,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/** Signal travel time across the gate, in ms. Reduced-motion skips it. */
const PROPAGATION_MS = 260;

export default function LogicGatePage() {
  const [gateKey, setGateKeyState] = useState<GateKey>("AND");
  const [a, setAState] = useState<Bit>(1);
  const [b, setBState] = useState<Bit>(0);

  const gate = GATES[gateKey];
  const twoInputs = gate.inputs === 2;
  const liveOutput = gate.evaluate(a, b);
  const [shownOutput, setShownOutput] = useState<Bit>(liveOutput);
  const [propagating, setPropagating] = useState(false);

  // Every user change marks the bench as "propagating"; the effect below
  // commits the new output after the signal travel time. Reduced-motion
  // users get the value immediately.
  const changeGate = (key: GateKey) => {
    setGateKeyState(key);
    setPropagating(true);
  };
  const changeA = (value: Bit) => {
    setAState(value);
    setPropagating(true);
  };
  const changeB = (value: Bit) => {
    setBState(value);
    setPropagating(true);
  };

  useEffect(() => {
    if (!propagating) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        setShownOutput(liveOutput);
        setPropagating(false);
      },
      reduced ? 0 : PROPAGATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [propagating, liveOutput]);

  const rows = useMemo(() => truthTable(gateKey), [gateKey]);
  const currentIndex = twoInputs ? a * 2 + b : a;

  // Scroll the highlighted truth-table row into view as the inputs change.
  useEffect(() => {
    document
      .getElementById("current-truth-row")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex, gateKey]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <CircuitBoard className="size-3.5" aria-hidden="true" />
          Module 1 — Logic Gates
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Logic Gate Playground
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          A logic gate is a tiny decision-maker: it looks at its inputs and
          follows one fixed rule to produce an output. Toggle the switches
          below, watch the signal travel, and read the truth table the way
          you will in your SSC/HSC ICT exam.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Experiment bench */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Experiment bench</CardTitle>
            <Badge tone="accent">IC {gate.icName}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                1. Choose a gate
              </p>
              <div
                role="group"
                aria-label="Choose a logic gate"
                className="flex flex-wrap gap-2"
              >
                {GATE_KEYS.map((key) => {
                  const active = key === gateKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeGate(key)}
                      className={cn(
                        "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-2 text-muted hover:border-border hover:text-fg",
                      )}
                    >
                      {GATES[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                2. Toggle the inputs
              </p>
              <div className="flex flex-wrap gap-3">
                <InputToggle label="A" value={a} onChange={changeA} />
                {twoInputs && <InputToggle label="B" value={b} onChange={changeB} />}
                {!twoInputs && (
                  <p className="self-center text-xs text-muted">
                    The NOT gate has a single input.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                3. Watch the signal propagate
              </p>
              <div className="rounded-xl border border-border bg-bg p-4">
                <GateSymbol
                  gateKey={gateKey}
                  a={a}
                  b={twoInputs ? b : undefined}
                  y={shownOutput}
                  propagating={propagating}
                />
                <p className="mt-2 text-center font-mono text-sm text-fg" aria-live="polite">
                  {gate.booleanExpr("A", "B")}
                  {"  →  "}
                  {gate.booleanExpr(String(a), twoInputs ? String(b) : undefined)}
                  {" = "}
                  <span className={cn("font-semibold", shownOutput === 1 ? "text-accent" : "text-muted")}>
                    {shownOutput}
                  </span>
                </p>
              </div>
            </div>

            <Link
              href={`/logic/builder?gate=${gateKey}`}
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Build a circuit with {gate.label} in the Circuit Builder
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Truth table + explanation */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{gate.label} truth table</CardTitle>
              <p className="text-xs text-muted">
                Your current input combination is highlighted.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow className="hover:bg-transparent">
                    <TH>A</TH>
                    {twoInputs && <TH>B</TH>}
                    <TH>Y</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => {
                    const current = index === currentIndex;
                    return (
                      <TableRow
                        key={index}
                        id={current ? "current-truth-row" : undefined}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          current && "bg-accent/10 hover:bg-accent/10",
                        )}
                      >
                        <TD className={cn("font-mono", current && "text-accent")}>
                          {row.a}
                        </TD>
                        {twoInputs && (
                          <TD className={cn("font-mono", current && "text-accent")}>
                            {row.b}
                          </TD>
                        )}
                        <TD
                          className={cn(
                            "font-mono font-semibold",
                            row.y === 1 ? "text-fg" : "text-muted",
                            current && "text-accent",
                          )}
                        >
                          {row.y}
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
              <CardTitle>What is happening?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-fg">{gate.explanation}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">IC {gate.icName}</Badge>
                <Badge tone="neutral">{gate.inputs} input{gate.inputs > 1 ? "s" : ""}</Badge>
                <Badge tone="neutral">{gate.syllabusRef}</Badge>
              </div>
              <Alert tone="info" title="Teacher's tip">
                Cover the Y column with your hand, toggle the inputs, and
                predict the output before the signal arrives. If your
                prediction matches every row of the truth table, you have
                learned the gate.
              </Alert>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Info className="size-3.5" aria-hidden="true" />
                Every value above is computed live from the gate definitions — nothing is pre-recorded.
              </p>
            </CardContent>
          </Card>

          <Link
            href="/boolean"
            className={cn(
              "inline-flex h-8 items-center justify-center self-start rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            Next: Boolean Algebra Lab
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Big accessible switch for one gate input. */
function InputToggle({
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
        "flex h-14 w-32 items-center justify-between rounded-xl border px-4 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        on
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-surface-2 text-muted",
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-11 rounded-full border transition-colors",
            on ? "border-accent bg-accent/30" : "border-border bg-bg",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full transition-all",
              on ? "left-[22px] bg-accent" : "left-0.5 bg-muted",
            )}
          />
        </span>
        <span className="font-mono text-base font-bold">{value}</span>
      </span>
    </button>
  );
}
