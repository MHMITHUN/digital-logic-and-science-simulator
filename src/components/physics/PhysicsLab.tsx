"use client";

import { Zap } from "lucide-react";
import { Tabs } from "@/components/ui";
import { OhmSolver } from "./OhmSolver";
import { SeriesParallelBench } from "./SeriesParallelBench";

/** Physics Circuits Lab: Ohm's law and series/parallel networks. */
export function PhysicsLab() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Zap className="size-3.5" aria-hidden="true" />
          Module 5 — Physics Circuits
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Physics Circuits Lab
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          The ICT syllabus meets the physics lab: solve V = I × R with sliders,
          then build series and parallel networks and watch voltage, current,
          and power divide themselves — every number from the physics engine.
        </p>
      </header>

      <Tabs
        className="mt-8"
        items={[
          {
            id: "ohm",
            label: "Ohm's Law",
            content: <OhmSolver size="md" />,
          },
          {
            id: "series-parallel",
            label: "Series and Parallel",
            content: <SeriesParallelBench size="md" />,
          },
        ]}
      />
    </div>
  );
}
