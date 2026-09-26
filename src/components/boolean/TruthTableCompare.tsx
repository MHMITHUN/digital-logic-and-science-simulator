import { CheckCircle2 } from "lucide-react";
import type { BooleanTruthTable } from "@/engines/boolean";
import { cn } from "@/lib/utils";

export interface TruthTableCompareProps {
  /** Precomputed truth tables — one result column per expression. */
  columns: Array<{ label: string; table: BooleanTruthTable }>;
  /** Reveal only the first N data rows (classroom mode); undefined = all. */
  revealRows?: number;
  size?: "md" | "lg";
  /** Footer sentence shown when every row matches. */
  matchNote?: string;
}

/**
 * Truth table that compares several expressions over the same variables,
 * row by row, and states whether the columns agree — the "proof by table"
 * used for De Morgan's law in the lab and in classroom mode.
 */
export function TruthTableCompare({
  columns,
  revealRows,
  size = "md",
  matchNote = "Every row matches — these expressions are equivalent.",
}: TruthTableCompareProps) {
  const lg = size === "lg";
  const first = columns[0];
  if (!first) return null;
  const vars = first.table.vars;
  const rowCount = first.table.rows.length;
  const shown =
    revealRows === undefined ? rowCount : Math.min(Math.max(revealRows, 0), rowCount);

  const rowsMatch = (index: number) =>
    columns.every(
      (column) => column.table.rows[index].output === first.table.rows[index].output,
    );
  const allShownMatch = Array.from({ length: shown }, (_, i) => rowsMatch(i)).every(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left">
          <thead className="bg-surface-2 text-muted">
            <tr>
              {vars.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-mono font-semibold uppercase tracking-wide",
                    lg ? "text-lg" : "text-xs",
                  )}
                >
                  {name}
                </th>
              ))}
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-mono font-semibold",
                    lg ? "text-lg" : "text-xs",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {first.table.rows.slice(0, shown).map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-surface-2/60">
                {vars.map((name) => (
                  <td
                    key={name}
                    className={cn("px-4 py-3 font-mono text-fg", lg ? "text-2xl" : "text-sm")}
                  >
                    {row.input[name]}
                  </td>
                ))}
                {columns.map((column) => (
                  <td
                    key={column.label}
                    className={cn(
                      "px-4 py-3 font-mono font-semibold",
                      lg ? "text-2xl" : "text-sm",
                      column.table.rows[index].output === 1 ? "text-fg" : "text-muted",
                    )}
                  >
                    {column.table.rows[index].output}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown < rowCount ? (
        <p className={cn("text-muted italic", lg ? "text-base" : "text-sm")}>
          Press Next to reveal the next row…
        </p>
      ) : (
        <p
          className={cn(
            "flex items-center gap-2 font-medium",
            lg ? "text-lg" : "text-sm",
            allShownMatch ? "text-success" : "text-danger",
          )}
        >
          <CheckCircle2 className={lg ? "size-5" : "size-4"} aria-hidden="true" />
          {allShownMatch
            ? matchNote
            : "The columns disagree — these expressions are NOT equivalent."}
        </p>
      )}
    </div>
  );
}
