"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices, Grid3x3, RotateCcw } from "lucide-react";
import {
  findGroups,
  kmapGrid,
  resultSop,
  type KMapGrid,
  type KMapGroup,
} from "@/engines/kmap";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  ProgressBar,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { generateKmapPuzzle, type KmapVarCount } from "@/lib/kmap-puzzle";
import {
  assessStudentGroup,
  rectangleBetween,
  type SelectionFeedback,
  type StudentGroup,
} from "@/lib/kmap-selection";
import {
  KMapGridView,
  toneForIndex,
  type KMapOverlayGroup,
  type KmapGroupTone,
} from "./KMapGridView";
import { ExprField } from "./ExpressionUi";

const TONE_BG: Record<KmapGroupTone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

const DEFAULT_EXPRESSION = "A'.B + A.B'.C";

/**
 * Boolean lab, tab 4: the K-map exercise. The grid comes from the kmap
 * engine (a real truth table), every student selection is validated by
 * validateGroup, and the minimal answer is the engine's own minimal cover.
 */
export function KMapExercise() {
  const [mode, setMode] = useState<"expression" | "random">("expression");
  const [varCount, setVarCount] = useState<KmapVarCount>(3);
  const [exprInput, setExprInput] = useState(DEFAULT_EXPRESSION);
  const [puzzleExpression, setPuzzleExpression] = useState<string | null>(null);

  const activeExpression = puzzleExpression ?? exprInput;

  const { grid, gridError } = useMemo<{ grid: KMapGrid | null; gridError: string | null }>(() => {
    try {
      return { grid: kmapGrid(activeExpression), gridError: null };
    } catch (error) {
      return {
        grid: null,
        gridError: error instanceof Error ? error.message : "Could not build the map.",
      };
    }
  }, [activeExpression]);

  const newPuzzle = () => {
    setPuzzleExpression(generateKmapPuzzle(varCount).expression);
    setMode("random");
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="size-4 text-accent" aria-hidden="true" />
            K-map exercise
          </CardTitle>
          <p className="text-xs text-muted">
            Select rectangles of 1-cells (1, 2, 4, 8… cells — edges wrap around).
            Cover every 1 with the fewest, biggest groups to find the minimal SOP.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div role="group" aria-label="Map source" className="flex gap-2">
              {(["expression", "random"] as const).map((option) => {
                const active = mode === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setMode(option);
                      if (option === "expression") setPuzzleExpression(null);
                    }}
                    className={cn(
                      "h-10 rounded-lg border px-4 text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-2 text-muted hover:text-fg",
                    )}
                  >
                    {option === "expression" ? "From my expression" : "Random puzzle"}
                  </button>
                );
              })}
            </div>

            <div className="w-44">
              <Field label="Random puzzle size" name="kmap-varcount">
                {(ids) => (
                  <Select
                    id={ids.id}
                    value={String(varCount)}
                    onChange={(event) => setVarCount(Number(event.target.value) as KmapVarCount)}
                  >
                    <option value="2">2 variables</option>
                    <option value="3">3 variables</option>
                    <option value="4">4 variables</option>
                  </Select>
                )}
              </Field>
            </div>

            <Button variant="primary" onClick={newPuzzle}>
              <Dices className="size-4" aria-hidden="true" />
              New puzzle
            </Button>
          </div>

          {mode === "expression" && (
            <ExprField
              name="kmap-expression"
              label="Expression to map"
              value={exprInput}
              onChange={(value) => setExprInput(value)}
              error={gridError}
              hint="Needs 2–4 variables, e.g. A'.B + A.B'.C — or press New puzzle."
            />
          )}
          {mode === "random" && puzzleExpression && (
            <p className="text-xs text-muted">
              Puzzle generated from the real expression{" "}
              <span className="font-mono text-fg">{puzzleExpression}</span> — the map
              is its truth table.
            </p>
          )}
        </CardContent>
      </Card>

      {grid && <KmapBoard key={activeExpression} grid={grid} />}
    </div>
  );
}

type Feedback = SelectionFeedback;

/** A student group plus the overlay tone it was drawn with. */
interface TonedGroup extends StudentGroup {
  tone: KmapGroupTone;
}

/**
 * The board half of the exercise — selection state lives here so a new
 * expression/puzzle (new key) remounts it with a clean board.
 */
function KmapBoard({ grid }: { grid: KMapGrid }) {
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [preview, setPreview] = useState<number[]>([]);
  const [groups, setGroups] = useState<TonedGroup[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Escape cancels a selection in progress.
  useEffect(() => {
    if (!anchor) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAnchor(null);
        setPreview([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anchor]);

  const attemptGroup = (rows: number[], cols: number[], minterms: number[]) => {
    const assessment = assessStudentGroup(grid, groups, { rows, cols, minterms });
    if (assessment.status === "accepted") {
      setGroups((current) => [
        ...current,
        { ...assessment.group, tone: toneForIndex(current.length) },
      ]);
    }
    setFeedback(assessment.feedback);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!anchor) {
      setAnchor({ row, col });
      setPreview([grid.cells[row][col].minterm]);
      setFeedback({
        tone: "info",
        text: "Start cell chosen — now click (or arrow to and press Enter on) the opposite corner of the rectangle. Escape cancels.",
      });
      return;
    }
    const { rows, cols, minterms } = rectangleBetween(grid, anchor, { row, col });
    attemptGroup(rows, cols, minterms);
    setAnchor(null);
    setPreview([]);
  };

  const handleCellMove = (cell: { row: number; col: number } | null) => {
    if (!anchor) return;
    if (!cell) {
      setPreview([grid.cells[anchor.row][anchor.col].minterm]);
      return;
    }
    setPreview(rectangleBetween(grid, anchor, cell).minterms);
  };

  const covered = useMemo(() => {
    const set = new Set<number>();
    groups.forEach((group) => group.minterms.forEach((minterm) => set.add(minterm)));
    return set;
  }, [groups]);

  const ones = grid.minterms;
  const coveredOnes = ones.filter((minterm) => covered.has(minterm));
  const complete = ones.length > 0 && coveredOnes.length === ones.length;

  const minimal = useMemo(() => (complete ? findGroups(grid) : []), [complete, grid]);
  const studentLiterals = groups.reduce((sum, group) => sum + group.literals, 0);
  const minimalLiterals = minimal.reduce((sum, group) => sum + group.literals, 0);
  const isMinimal =
    complete && groups.length === minimal.length && studentLiterals === minimalLiterals;

  /** Engine-shaped view of the student's groups (for resultSop). */
  const studentEngineGroups: KMapGroup[] = groups.map((group) => ({
    rows: group.rows,
    cols: group.cols,
    minterms: group.minterms,
    size: group.minterms.length,
    term: group.term,
    literals: group.literals,
  }));

  const overlayGroups: KMapOverlayGroup[] = groups.map((group) => ({
    rows: group.rows,
    cols: group.cols,
    minterms: group.minterms,
    tone: group.tone,
  }));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <Card>
        <CardHeader>
          <CardTitle>The map</CardTitle>
          <p className="text-xs text-muted">
            Click a start cell, then the opposite corner — or focus a cell, move
            with the arrow keys, and press Enter to start/finish a selection.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <KMapGridView
            grid={grid}
            groups={overlayGroups}
            interactive
            anchorCell={anchor}
            previewMinterms={preview}
            onCellClick={handleCellClick}
            onCellFocus={(row, col) => handleCellMove({ row, col })}
            onCellHover={(cell) => handleCellMove(cell)}
          />
          {feedback && (
            <div aria-live="polite">
              <Alert tone={feedback.tone} className={cn(feedback.tone === "info" && "border-border")}>
                {feedback.text}
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your groups</CardTitle>
            <p className="text-xs text-muted">
              Each group becomes one product term — constants stay, changing
              variables drop out.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProgressBar
              value={ones.length > 0 ? (coveredOnes.length / ones.length) * 100 : 0}
              label="Share of 1-cells covered"
              showValue={false}
            />
            <p className="text-sm text-muted">
              {coveredOnes.length} of {ones.length} one-cells covered
              {groups.length > 0 && ` · ${groups.length} group${groups.length > 1 ? "s" : ""}`}
            </p>
            {groups.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">
                No groups yet — click the first 1-cell to begin.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {groups.map((group, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2"
                  >
                    <span
                      className={cn("size-3 shrink-0 rounded-full", TONE_BG[group.tone])}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm font-semibold text-fg">{group.term}</span>
                    <span className="text-xs text-muted">
                      {group.minterms.length} cell{group.minterms.length > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {groups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  setGroups([]);
                  setAnchor(null);
                  setPreview([]);
                  setFeedback({ tone: "info", text: "Groups cleared — the 1s are still on the map." });
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset groups
              </Button>
            )}
          </CardContent>
        </Card>

        {complete && (
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle>Cover complete</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isMinimal ? (
                <>
                  <Alert tone="success" title="Minimal cover found">
                    Every 1 is covered with the fewest groups and literals the
                    engine can find. Well grouped — nothing left to squeeze.
                  </Alert>
                  <p className="break-all rounded-xl border border-accent/40 bg-accent/5 p-4 font-mono text-lg font-semibold text-accent">
                    Y = {resultSop(studentEngineGroups)}
                  </p>
                  <p className="text-sm text-muted">
                    The engine&apos;s own minimal cover agrees:{" "}
                    <span className="font-mono text-fg">{resultSop(minimal)}</span>
                  </p>
                </>
              ) : (
                <>
                  <Alert tone="warning" title="Covered — but not minimal yet">
                    Your {groups.length} groups use {studentLiterals} literals; the
                    textbook cover uses {minimal.length} group
                    {minimal.length > 1 ? "s" : ""} and {minimalLiterals} literals.
                    Reset the groups and try fewer, bigger rectangles — remember the
                    edges wrap.
                  </Alert>
                  <p className="text-sm text-muted">
                    Minimal SOP (revealed because the cover is complete):{" "}
                    <span className="font-mono text-fg">{resultSop(minimal)}</span>
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{ones.length} one-cells</Badge>
                <Badge tone="neutral">
                  {groups.length} of {minimal.length} needed
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGroups([]);
                    setFeedback(null);
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
