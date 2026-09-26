"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize,
  Minimize,
  Presentation,
} from "lucide-react";
import {
  CLASSROOM_EXPERIMENTS,
  findExperiment,
  parseStepParam,
  type ClassroomExperiment,
} from "@/lib/classroom-experiments";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DeMorganStage, GateStage, KMapStage, NumberStage } from "./stages";
import { OhmSolver } from "@/components/physics/OhmSolver";
import { SeriesParallelBench } from "@/components/physics/SeriesParallelBench";

/**
 * Classroom Mode — a projector-first presentation view (spec §16.8).
 * One experiment at a time, giant controls, learning objective on top,
 * guided steps and prev/next navigation at the bottom. The URL
 * (?e=<id>&step=N) is the whole state, so any moment is shareable.
 */
export function ClassroomMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isFullscreen, setFullscreen] = useState(false);

  const experiment = findExperiment(searchParams.get("e"));
  const rawStep = parseStepParam(searchParams.get("step"));
  const step = experiment ? Math.min(rawStep, experiment.steps.length) : 1;
  const index = experiment ? CLASSROOM_EXPERIMENTS.indexOf(experiment) : -1;
  const total = CLASSROOM_EXPERIMENTS.length;

  const navigate = useCallback(
    (id: string, stepNumber: number, mode: "push" | "replace") => {
      const url = `${pathname}?e=${id}&step=${stepNumber}`;
      if (mode === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [pathname, router],
  );

  const goToIndex = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const nextExperiment = CLASSROOM_EXPERIMENTS[(index + 1) % total];
  const prevExperiment = CLASSROOM_EXPERIMENTS[(index - 1 + total) % total];

  const nextStep = () => {
    if (!experiment) return;
    if (step < experiment.steps.length) {
      navigate(experiment.id, step + 1, "replace");
    } else {
      navigate(nextExperiment.id, 1, "push");
    }
  };

  const prevStep = () => {
    if (!experiment) return;
    if (step > 1) {
      navigate(experiment.id, step - 1, "replace");
    } else {
      navigate(prevExperiment.id, prevExperiment.steps.length, "push");
    }
  };

  // Fullscreen: button or the F key (never while typing in a field).
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "f" && event.key !== "F") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  const stage = useMemo(() => {
    if (!experiment) return null;
    return <Stage experiment={experiment} step={step} />;
  }, [experiment, step]);

  if (!experiment) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-16 sm:px-6">
        <header className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Presentation className="size-3.5" aria-hidden="true" />
            For teachers
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Classroom Mode
          </h1>
          <p className="max-w-2xl text-base text-muted">
            Eight curated experiments with learning objectives and guided steps,
            sized for a projector. Press <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-sm">F</kbd>{" "}
            for fullscreen, share any moment as a link.
          </p>
        </header>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Experiments">
          {CLASSROOM_EXPERIMENTS.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.id, 1, "push")}
                className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-surface p-6 text-left transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-muted">
                    {String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <Badge tone="neutral">{item.moduleLabel}</Badge>
                </div>
                <p className="text-lg font-semibold text-fg">{item.title}</p>
                <p className="text-sm text-muted">{item.objective}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-accent">
                  Start
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-muted">
          Prefer the full bench?{" "}
          <Link href="/" className="font-medium text-accent hover:text-accent-hover">
            Back to the lab home
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar: objective + title + counters */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-col">
            <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
              <span>
                Experiment {index + 1} of {total}
              </span>
              <Badge tone="accent">{experiment.moduleLabel}</Badge>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">
              {experiment.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted sm:text-base">
              <span className="font-semibold text-fg">Objective: </span>
              {experiment.objective}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-fg"
              aria-live="polite"
            >
              Step {step} / {experiment.steps.length}
            </span>
            <Button variant="outline" size="md" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize className="size-4" aria-hidden="true" />
              ) : (
                <Maximize className="size-4" aria-hidden="true" />
              )}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              <kbd className="ml-1 rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-xs text-muted">
                F
              </kbd>
            </Button>
            <Button variant="ghost" size="md" onClick={goToIndex}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              All experiments
            </Button>
          </div>
        </div>
      </header>

      {/* The stage */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        {stage}
      </main>

      {/* Bottom bar: guided step + navigation (in flow — it never covers the stage) */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:items-center">
          <button
            type="button"
            onClick={() => navigate(prevExperiment.id, 1, "push")}
            className="hidden items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:flex"
          >
            <ChevronsLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              <span className="block text-xs uppercase tracking-wide">Previous</span>
              {prevExperiment.title}
            </span>
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="max-w-2xl text-lg font-medium leading-snug text-fg sm:text-xl">
              <span className="mr-2 font-mono text-sm text-accent">{step}</span>
              {experiment.steps[step - 1]}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="lg" onClick={prevStep}>
                <ChevronLeft className="size-5" aria-hidden="true" />
                Back
              </Button>
              <Button variant="primary" size="lg" onClick={nextStep}>
                {step < experiment.steps.length ? "Next step" : "Next experiment"}
                <ChevronRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(nextExperiment.id, 1, "push")}
            className={cn(
              "hidden items-center justify-end gap-2 rounded-lg px-2 py-2 text-right text-sm text-muted transition-colors hover:text-fg",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:flex",
            )}
          >
            <span className="truncate">
              <span className="block text-xs uppercase tracking-wide">Next</span>
              {nextExperiment.title}
            </span>
            <ChevronsRight className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}

/** The interactive part — one experiment at presentation size. */
function Stage({ experiment, step }: { experiment: ClassroomExperiment; step: number }) {
  switch (experiment.stage) {
    case "gate":
      return <GateStage gate={experiment.gate} />;
    case "number-conversion":
      return (
        <NumberStage
          from={experiment.from}
          to={experiment.to}
          value={experiment.value}
          revealCount={step}
        />
      );
    case "de-morgan-table":
      return <DeMorganStage revealRows={step} />;
    case "ohm":
      return (
        <div className="w-full max-w-6xl">
          <OhmSolver size="lg" initial={{ solveFor: "v", v: 12, i: 2, r: 10 }} />
        </div>
      );
    case "series-parallel":
      return (
        <div className="w-full max-w-6xl">
          <SeriesParallelBench
            size="lg"
            initial={{ mode: "series", sourceV: 12, resistors: [10, 20] }}
          />
        </div>
      );
    case "kmap":
      return <KMapStage expression={experiment.expression} revealGroups={step - 1} />;
  }
}
