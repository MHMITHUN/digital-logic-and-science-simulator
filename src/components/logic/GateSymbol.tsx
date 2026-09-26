"use client";

import { GATES, type Bit, type GateKey } from "@/engines/logic";
import { cn } from "@/lib/utils";

/**
 * Live SVG symbol for a logic gate. Wires light up in the accent colour
 * when they carry 1 and stay muted when they carry 0. Geometry follows the
 * engine's symbol hints (shape kind + inversion bubble + XOR back arc).
 *
 * `propagating` renders a small dot travelling along the output wire while
 * the playground delays the output — a subtle, honest signal-flow cue.
 */
export function GateSymbol({
  gateKey,
  a,
  b,
  y,
  propagating = false,
  className,
}: {
  gateKey: GateKey;
  a: Bit;
  b?: Bit;
  y: Bit;
  propagating?: boolean;
  className?: string;
}) {
  const gate = GATES[gateKey];
  const twoInputs = gate.inputs === 2;

  const bodyLeft = 70;
  const inputY1 = twoInputs ? 40 : 60;
  const inputY2 = 80;

  const shapeRight =
    gate.shape === "and" ? 152 : gate.shape === "or" ? 160 : 156;
  const bubbleX = shapeRight + 7;
  const wireStart = gate.bubble ? bubbleX + 7 : shapeRight;
  const lampX = 224;

  const wireOn = "stroke-accent";
  const wireOff = "stroke-muted";
  const aOn = a === 1;
  const bOn = b === 1;
  const yOn = y === 1;

  return (
    <svg
      viewBox="0 0 260 120"
      role="img"
      aria-label={`${gate.label} gate with inputs ${twoInputs ? `A=${a}, B=${b}` : `A=${a}`} and output Y=${y}`}
      className={cn("w-full max-w-md", className)}
    >
      {/* Input wires */}
      <line
        x1="10"
        y1={inputY1}
        x2={bodyLeft}
        y2={inputY1}
        strokeWidth="3"
        className={cn(aOn ? wireOn : wireOff, "transition-colors")}
      />
      {twoInputs && (
        <line
          x1="10"
          y1={inputY2}
          x2={bodyLeft}
          y2={inputY2}
          strokeWidth="3"
          className={cn(bOn ? wireOn : wireOff, "transition-colors")}
        />
      )}

      {/* Gate body */}
      {gate.shape === "and" && (
        <path
          d={`M ${bodyLeft} 28 H 120 A 32 32 0 0 1 120 92 H ${bodyLeft} Z`}
          className="fill-surface-2 stroke-fg"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {gate.shape === "or" && (
        <path
          d={`M ${bodyLeft} 28 Q 115 26 160 60 Q 115 94 ${bodyLeft} 92 Q 88 60 ${bodyLeft} 28 Z`}
          className="fill-surface-2 stroke-fg"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {gate.shape === "triangle" && (
        <path
          d={`M ${bodyLeft} 26 L 156 60 L ${bodyLeft} 94 Z`}
          className="fill-surface-2 stroke-fg"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {gate.backArc && (
        <path
          d="M 60 28 Q 78 60 60 92"
          fill="none"
          className="stroke-fg"
          strokeWidth="3"
        />
      )}
      {gate.bubble && (
        <circle
          cx={bubbleX}
          cy="60"
          r="7"
          className="fill-bg stroke-fg"
          strokeWidth="3"
        />
      )}

      {/* Output wire */}
      <line
        x1={wireStart}
        y1="60"
        x2={lampX - 12}
        y2="60"
        strokeWidth="3"
        className={cn(yOn ? wireOn : wireOff, "transition-colors")}
      />
      {propagating && (
        <circle
          key={`${a}-${b ?? 0}`}
          cx={wireStart + 2}
          cy="60"
          r="4"
          className="signal-dot fill-accent"
        />
      )}

      {/* Output lamp */}
      <circle
        cx={lampX}
        cy="60"
        r="12"
        strokeWidth="3"
        className={cn(
          "transition-colors",
          yOn ? "fill-accent stroke-accent-hover" : "fill-surface-2 stroke-muted",
        )}
      />
      <text x={lampX} y="96" textAnchor="middle" className="fill-muted text-[11px]">
        Y = {y}
      </text>

      {/* Input labels with live values */}
      <text x="10" y={inputY1 - 10} className="fill-muted text-[11px]">
        A = {a}
      </text>
      {twoInputs && (
        <text x="10" y={inputY2 + 22} className="fill-muted text-[11px]">
          B = {b}
        </text>
      )}
      <text
        x={bodyLeft + 24}
        y="64"
        textAnchor="middle"
        className="fill-fg text-[13px] font-semibold"
      >
        {gate.label}
      </text>
    </svg>
  );
}
