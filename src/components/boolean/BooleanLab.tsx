"use client";

import { Lightbulb } from "lucide-react";
import { Tabs } from "@/components/ui";
import { TruthTablePanel } from "./TruthTablePanel";
import { SimplifyPanel } from "./SimplifyPanel";
import { DeMorganPanel } from "./DeMorganPanel";
import { KMapExercise } from "./KMapExercise";

/** Boolean Algebra Lab: four accessible tabs over the boolean engines. */
export function BooleanLab() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Lightbulb className="size-3.5" aria-hidden="true" />
          Module 4 — Boolean Algebra
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Boolean Algebra Lab
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Type any Boolean expression and watch it become a truth table, a
          simplification walkthrough, a De Morgan transformation, or a Karnaugh
          map you solve yourself. Everything parses live as you type.
        </p>
      </header>

      <Tabs
        className="mt-8"
        items={[
          { id: "truth-table", label: "Truth Table", content: <TruthTablePanel /> },
          { id: "simplify", label: "Simplify", content: <SimplifyPanel /> },
          { id: "de-morgan", label: "De Morgan", content: <DeMorganPanel /> },
          { id: "kmap", label: "K-map Exercise", content: <KMapExercise /> },
        ]}
      />
    </div>
  );
}
