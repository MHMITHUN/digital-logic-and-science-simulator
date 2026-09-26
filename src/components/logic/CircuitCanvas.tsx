"use client";

import { X } from "lucide-react";
import { GATES, type Bit } from "@/engines/logic";
import type { CircuitGraph, CircuitNode } from "@/engines/circuit";
import { cn } from "@/lib/utils";

/**
 * The circuit canvas. Nodes render as keyboard-accessible HTML cards laid
 * out on a depth grid; wires draw on an SVG layer beneath them. Click a
 * node's OUT button, then a gate's input slot, to wire them together —
 * every action is a real <button>, so touch and keyboard work the same way.
 */

const CARD_W = 188;
const CARD_H = 178;
const GAP_X = 88;
const GAP_Y = 24;
const PAD = 16;

export interface CanvasPosition {
  x: number;
  y: number;
}

/** Longest-path column layout: inputs in column 0, each gate after its sources. */
export function layoutGraph(graph: CircuitGraph): Map<string, CanvasPosition> {
  const depth = new Map<string, number>();
  graph.nodes.forEach((node) => depth.set(node.id, node.kind === "input" ? 0 : 1));

  // Fixed-point depth resolution (graphs are acyclic; capped for safety).
  for (let pass = 0; pass < 100; pass += 1) {
    let changed = false;
    graph.nodes.forEach((node) => {
      if (node.kind !== "gate") return;
      let level = 1;
      node.inputs.forEach((source) => {
        if (source !== null) {
          level = Math.max(level, (depth.get(source) ?? 0) + 1);
        }
      });
      if (level !== depth.get(node.id)) {
        depth.set(node.id, level);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const columns = new Map<number, CircuitNode[]>();
  graph.nodes.forEach((node) => {
    const level = depth.get(node.id) ?? 0;
    const column = columns.get(level) ?? [];
    column.push(node);
    columns.set(level, column);
  });

  const positions = new Map<string, CanvasPosition>();
  const maxRows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  columns.forEach((column, level) => {
    column.forEach((node, row) => {
      // Centre single-node columns vertically.
      const offset = (maxRows - column.length) * (CARD_H + GAP_Y) / 2;
      positions.set(node.id, {
        x: PAD + level * (CARD_W + GAP_X),
        y: PAD + row * (CARD_H + GAP_Y) + offset,
      });
    });
  });
  return positions;
}

export function canvasSize(graph: CircuitGraph, positions: Map<string, CanvasPosition>) {
  let width = PAD * 2 + CARD_W;
  let height = PAD * 2 + CARD_H;
  positions.forEach((position) => {
    width = Math.max(width, position.x + CARD_W + PAD);
    height = Math.max(height, position.y + CARD_H + PAD);
  });
  return { width, height };
}

/** Output connector point on a card (right edge, aligned with the OUT button). */
function outPoint(position: CanvasPosition) {
  return { x: position.x + CARD_W, y: position.y + 136 };
}

/** Input slot point on a gate card (left edge, slot row). */
function slotPoint(position: CanvasPosition, slot: number) {
  return { x: position.x, y: position.y + 60 + slot * 42 };
}

export interface CircuitCanvasProps {
  graph: CircuitGraph;
  positions: Map<string, CanvasPosition>;
  values: Record<string, Bit>;
  selectedSource: string | null;
  inputValues: Record<string, Bit>;
  onToggleInput: (id: string) => void;
  onSelectSource: (id: string | null) => void;
  onWireSlot: (toId: string, slot: number) => void;
  onUnwireSlot: (toId: string, slot: number) => void;
  onRemoveNode: (id: string) => void;
}

export function CircuitCanvas({
  graph,
  positions,
  values,
  selectedSource,
  inputValues,
  onToggleInput,
  onSelectSource,
  onWireSlot,
  onUnwireSlot,
  onRemoveNode,
}: CircuitCanvasProps) {
  const size = canvasSize(graph, positions);

  const wires = graph.nodes.flatMap((node) =>
    node.kind === "gate"
      ? node.inputs.map((source, slot) => ({ source, slot, target: node.id }))
      : [],
  ).filter((wire) => wire.source !== null);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg">
      <div className="relative" style={{ width: size.width, height: size.height, minWidth: "100%" }}>
        {/* Wires */}
        <svg
          className="absolute inset-0"
          width={size.width}
          height={size.height}
          aria-hidden="true"
        >
          {wires.map(({ source, slot, target }) => {
            const from = positions.get(source as string);
            const to = positions.get(target);
            if (!from || !to) return null;
            const start = outPoint(from);
            const end = slotPoint(to, slot);
            const on = (values[source as string] ?? 0) === 1;
            const midX = (start.x + end.x) / 2;
            return (
              <g key={`${source}-${target}-${slot}`}>
                <path
                  d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
                  fill="none"
                  strokeWidth={2.5}
                  className={cn(on ? "stroke-accent" : "stroke-muted", "transition-colors")}
                  strokeDasharray={source === selectedSource ? "6 4" : undefined}
                />
                {/* Arrowhead pointing into the slot (wires approach horizontally). */}
                <path
                  d={`M ${end.x} ${end.y} l 10 -5 l 0 10 z`}
                  className={cn(on ? "fill-accent" : "fill-muted", "transition-colors")}
                />
              </g>
            );
          })}
        </svg>

        {/* Node cards */}
        {graph.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          return (
            <div
              key={node.id}
              className={cn(
                "absolute z-10 rounded-xl border bg-surface p-3",
                selectedSource === node.id ? "border-accent ring-2 ring-accent/40" : "border-border",
              )}
              style={{ left: position.x, top: position.y, width: CARD_W }}
            >
              {node.kind === "input" ? (
                <InputCard
                  node={node}
                  value={inputValues[node.id] === 1 ? 1 : 0}
                  selected={selectedSource === node.id}
                  onToggleInput={onToggleInput}
                  onSelectSource={onSelectSource}
                  onRemoveNode={onRemoveNode}
                />
              ) : (
                <GateCard
                  node={node}
                  value={values[node.id] ?? 0}
                  wiringActive={selectedSource !== null}
                  selected={selectedSource === node.id}
                  onWireSlot={onWireSlot}
                  onUnwireSlot={onUnwireSlot}
                  onSelectSource={onSelectSource}
                  onRemoveNode={onRemoveNode}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RemoveButton({ id, onRemoveNode }: { id: string; onRemoveNode: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onRemoveNode(id)}
      aria-label={`Remove ${id}`}
      className="rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

function OutputButton({
  id,
  value,
  selected,
  onSelectSource,
  label,
}: {
  id: string;
  value: Bit;
  selected: boolean;
  onSelectSource: (id: string | null) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Use ${label} as wiring source`}
      onClick={() => onSelectSource(selected ? null : id)}
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-surface-2 text-muted hover:text-fg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full border font-mono text-[11px] font-bold",
          value === 1 ? "border-accent bg-accent/25 text-accent" : "border-border text-muted",
        )}
      >
        {value}
      </span>
      out
    </button>
  );
}

function InputCard({
  node,
  value,
  selected,
  onToggleInput,
  onSelectSource,
  onRemoveNode,
}: {
  node: CircuitNode;
  value: Bit;
  selected: boolean;
  onToggleInput: (id: string) => void;
  onSelectSource: (id: string | null) => void;
  onRemoveNode: (id: string) => void;
}) {
  const on = value === 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg">Input {node.id}</span>
        <RemoveButton id={node.id} onRemoveNode={onRemoveNode} />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Input ${node.id} value`}
        onClick={() => onToggleInput(node.id)}
        className={cn(
          "flex h-14 items-center justify-between rounded-lg border px-3 transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          on ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-muted",
        )}
      >
        <span className="text-xs">Set value</span>
        <span className="font-mono text-lg font-bold">{value}</span>
      </button>
      <OutputButton
        id={node.id}
        value={value}
        selected={selected}
        onSelectSource={onSelectSource}
        label={`input ${node.id}`}
      />
    </div>
  );
}

function GateCard({
  node,
  value,
  wiringActive,
  selected,
  onWireSlot,
  onUnwireSlot,
  onSelectSource,
  onRemoveNode,
}: {
  node: CircuitNode;
  value: Bit;
  wiringActive: boolean;
  selected: boolean;
  onWireSlot: (toId: string, slot: number) => void;
  onUnwireSlot: (toId: string, slot: number) => void;
  onSelectSource: (id: string | null) => void;
  onRemoveNode: (id: string) => void;
}) {
  const gate = GATES[node.gate ?? "AND"];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg">
          {gate.label}
          <span className="ml-1.5 font-mono text-xs font-normal text-muted">{node.id}</span>
        </span>
        <RemoveButton id={node.id} onRemoveNode={onRemoveNode} />
      </div>
      <div className="flex flex-col gap-1.5">
        {node.inputs.map((source, slot) => {
          const wired = source !== null;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => (wired && !wiringActive ? onUnwireSlot(node.id, slot) : onWireSlot(node.id, slot))}
              aria-label={
                wired
                  ? `Input ${slot + 1} wired to ${source}. ${wiringActive ? "Click to rewire" : "Click to unwire"}`
                  : `Input ${slot + 1} not wired. Click to wire the selected output here`
              }
              className={cn(
                "flex h-9 items-center justify-between rounded-lg border px-2.5 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                wired
                  ? "border-border bg-surface-2 text-fg"
                  : wiringActive
                    ? "border-dashed border-accent/60 bg-accent/5 text-accent"
                    : "border-dashed border-border bg-surface-2 text-muted",
              )}
            >
              <span>in {slot + 1}</span>
              <span className="font-mono">{wired ? source : "empty"}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted">{gate.booleanExpr("A", "B").replace("Y = ", "")}</span>
        <OutputButton
          id={node.id}
          value={value}
          selected={selected}
          onSelectSource={onSelectSource}
          label={`gate ${node.id}`}
        />
      </div>
    </div>
  );
}
