"use client";

import { useRef } from "react";
import type { KMapGrid } from "@/engines/kmap";
import { cn } from "@/lib/utils";

/** Overlay tones cycle through token colours; index decides which is used. */
export type KmapGroupTone = "accent" | "warning" | "success" | "danger";

export const KMAP_TONES: readonly KmapGroupTone[] = ["accent", "warning", "success", "danger"];

export const toneForIndex = (index: number): KmapGroupTone =>
  KMAP_TONES[index % KMAP_TONES.length];

const TINT: Record<KmapGroupTone, string> = {
  accent: "bg-accent/15",
  warning: "bg-warning/15",
  success: "bg-success/15",
  danger: "bg-danger/15",
};

const DOT: Record<KmapGroupTone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

export interface KMapOverlayGroup {
  rows: number[];
  cols: number[];
  minterms: number[];
  tone: KmapGroupTone;
}

export interface KMapGridViewProps {
  grid: KMapGrid;
  size?: "md" | "lg";
  /** Accepted/answer groups drawn as cell tints + membership dots. */
  groups?: KMapOverlayGroup[];
  interactive?: boolean;
  /** First cell of a selection in progress. */
  anchorCell?: { row: number; col: number } | null;
  /** Cells currently previewed as part of the selection rectangle. */
  previewMinterms?: number[];
  onCellClick?: (row: number, col: number) => void;
  /** Fires when a cell gains focus (drives the keyboard selection preview). */
  onCellFocus?: (row: number, col: number) => void;
  /** Pointer hover preview; null when the pointer leaves the map. */
  onCellHover?: (cell: { row: number; col: number } | null) => void;
  /** Show the small minterm index in each cell. Default true. */
  showMinterms?: boolean;
}

/**
 * Gray-coded Karnaugh map renderer. Pure presentation over the kmap
 * engine's grid; the lab exercise and classroom mode both use it. When
 * `interactive`, cells are buttons with arrow-key focus movement so a
 * selection can be made entirely from the keyboard (Enter/Space clicks).
 */
export function KMapGridView({
  grid,
  size = "md",
  groups = [],
  interactive = false,
  anchorCell = null,
  previewMinterms = [],
  onCellClick,
  onCellFocus,
  onCellHover,
  showMinterms = true,
}: KMapGridViewProps) {
  const lg = size === "lg";
  const cellRefs = useRef<Array<Array<HTMLButtonElement | null>>>([]);

  const groupsByMinterm = new Map<number, KMapOverlayGroup[]>();
  groups.forEach((group) => {
    group.minterms.forEach((minterm) => {
      const list = groupsByMinterm.get(minterm) ?? [];
      list.push(group);
      groupsByMinterm.set(minterm, list);
    });
  });
  const previewSet = new Set(previewMinterms);
  const anchorMinterm = anchorCell
    ? grid.cells[anchorCell.row]?.[anchorCell.col]?.minterm
    : undefined;

  /** Arrow keys move focus between cells (clamped at the edges). */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    row: number,
    col: number,
  ) => {
    const rowCount = grid.cells.length;
    const colCount = grid.cells[0]?.length ?? 0;
    let next: { row: number; col: number } | null = null;
    if (event.key === "ArrowUp" && row > 0) next = { row: row - 1, col };
    else if (event.key === "ArrowDown" && row < rowCount - 1) next = { row: row + 1, col };
    else if (event.key === "ArrowLeft" && col > 0) next = { row, col: col - 1 };
    else if (event.key === "ArrowRight" && col < colCount - 1) next = { row, col: col + 1 };
    if (!next) return; // Let Tab/other keys behave natively.
    event.preventDefault();
    cellRefs.current[next.row]?.[next.col]?.focus();
  };

  return (
    <div className="overflow-x-auto" onMouseLeave={() => onCellHover?.(null)}>
      <table className="border-collapse">
        <thead>
          <tr>
            <th scope="col" className="p-1">
              <span
                className={cn(
                  "flex flex-col items-center justify-center rounded-md bg-surface-2 font-mono text-muted",
                  lg ? "size-20 text-sm" : "size-14 text-[10px]",
                )}
              >
                <span>{grid.rowVars.join("")}</span>
                <span aria-hidden="true">↓ ←</span>
                <span>{grid.colVars.join("")}</span>
              </span>
            </th>
            {grid.colLabels.map((label, colIndex) => (
              <th key={label} scope="col" className="p-1">
                <span
                  className={cn(
                    "flex items-center justify-center rounded-md bg-surface-2 font-mono font-semibold text-fg",
                    lg ? "size-20 text-2xl" : "size-14 text-sm",
                  )}
                >
                  {label}
                  <span className="sr-only">
                    {" "}
                    column {colIndex + 1} of {grid.colLabels.length}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.cells.map((rowCells, row) => (
            <tr key={grid.rowLabels[row]}>
              <th scope="row" className="p-1">
                <span
                  className={cn(
                    "flex items-center justify-center rounded-md bg-surface-2 font-mono font-semibold text-fg",
                    lg ? "size-20 text-2xl" : "size-14 text-sm",
                  )}
                >
                  {grid.rowLabels[row]}
                </span>
              </th>
              {rowCells.map((cell, col) => {
                const owning = groupsByMinterm.get(cell.minterm) ?? [];
                const isPreview = previewSet.has(cell.minterm);
                const isAnchor = cell.minterm === anchorMinterm;
                const cellClasses = cn(
                  "relative m-1 flex flex-col items-center justify-center rounded-lg border font-mono transition-colors",
                  lg ? "size-20 text-3xl" : "size-14 text-xl",
                  cell.value === 1 ? "text-fg" : "text-muted",
                  "border-border",
                  owning.length > 0 ? TINT[owning[0].tone] : "bg-bg",
                  isAnchor && "border-accent ring-2 ring-accent",
                  isPreview && !isAnchor && "border-accent/60 bg-accent/10",
                );

                const inner = (
                  <>
                    <span className={cn("font-bold leading-none", cell.value === 0 && "opacity-70")}>
                      {cell.value}
                    </span>
                    {showMinterms && (
                      <span
                        className={cn(
                          "absolute right-1 top-0.5 font-sans text-muted",
                          lg ? "text-[10px]" : "text-[9px]",
                        )}
                        aria-hidden="true"
                      >
                        {cell.minterm}
                      </span>
                    )}
                    {owning.length > 0 && (
                      <span className="absolute bottom-1 flex gap-1" aria-hidden="true">
                        {owning.map((group, index) => (
                          <span
                            key={`${group.tone}-${index}`}
                            className={cn("rounded-full", DOT[group.tone], lg ? "size-2" : "size-1.5")}
                          />
                        ))}
                      </span>
                    )}
                  </>
                );

                if (!interactive) {
                  return (
                    <td key={cell.minterm} className="p-0">
                      <div className={cellClasses} aria-hidden="true">
                        {inner}
                      </div>
                      <span className="sr-only">
                        Cell row {grid.rowLabels[row]} column {grid.colLabels[col]}: value{" "}
                        {cell.value}, minterm {cell.minterm}
                      </span>
                    </td>
                  );
                }

                return (
                  <td key={cell.minterm} className="p-0">
                    <button
                      type="button"
                      ref={(el) => {
                        if (!cellRefs.current[row]) cellRefs.current[row] = [];
                        cellRefs.current[row][col] = el;
                      }}
                      onClick={() => onCellClick?.(row, col)}
                      onFocus={() => onCellFocus?.(row, col)}
                      onMouseEnter={() => onCellHover?.({ row, col })}
                      onKeyDown={(event) => handleKeyDown(event, row, col)}
                      aria-label={`Cell row ${grid.rowLabels[row]}, column ${grid.colLabels[col]}: value ${cell.value}, minterm ${cell.minterm}`}
                      className={cn(cellClasses, "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")}
                    >
                      {inner}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
