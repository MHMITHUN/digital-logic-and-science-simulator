import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Binary,
  CircuitBoard,
  Eye,
  Lightbulb,
  NotebookPen,
  Presentation,
  Workflow,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

export const metadata: Metadata = {
  title: {
    absolute: "Digital Logic and Science Simulator | SSC & HSC ICT Virtual Lab",
  },
  description:
    "Stop memorizing diagrams. Flip the switches: interactive logic gates, circuit building, Boolean algebra, K-maps, number systems, and physics circuits — computed live in your browser.",
  openGraph: {
    title: "Digital Logic and Science Simulator",
    description:
      "An interactive ICT laboratory: logic gates, circuits, Boolean algebra, number systems, and physics — with classroom mode and an experiment journal.",
    type: "website",
    siteName: "Logic and Science Lab",
  },
  twitter: {
    card: "summary",
    title: "Digital Logic and Science Simulator",
    description:
      "Flip the switches: interactive logic, Boolean algebra, number systems, and physics circuits for SSC/HSC ICT.",
  },
};

interface ModuleCard {
  href: string;
  title: string;
  icon: LucideIcon;
  learns: string;
  description: string;
}

const MODULES: ModuleCard[] = [
  {
    href: "/logic",
    title: "Logic Lab",
    icon: CircuitBoard,
    learns: "AND to XNOR — every gate as switches, symbols, and truth tables",
    description:
      "Toggle inputs, watch the signal propagate, and predict the output before the lamp answers.",
  },
  {
    href: "/logic/builder",
    title: "Circuit Builder",
    icon: Workflow,
    learns: "Combining gates into real circuits that compute",
    description:
      "Wire gates together, validate the circuit, and read the truth table of what you built.",
  },
  {
    href: "/number-system",
    title: "Number Systems",
    icon: Binary,
    learns: "Decimal, binary, octal, hex — and the method behind every conversion",
    description:
      "See the division-remainder ladder, positional expansion, and 4-bit grouping as real steps.",
  },
  {
    href: "/boolean",
    title: "Boolean and K-map",
    icon: Lightbulb,
    learns: "Expressions, truth tables, De Morgan's laws, and minimal SOP by grouping",
    description:
      "Type an expression, simplify it step by step, then solve Karnaugh map exercises yourself.",
  },
  {
    href: "/physics",
    title: "Physics Circuits",
    icon: Zap,
    learns: "V = I × R, power, and how series and parallel networks divide voltage",
    description:
      "Solve Ohm's law with live substitution and watch voltage drops share themselves as bars.",
  },
];

const PEDAGOGY = [
  {
    icon: Lightbulb,
    title: "Predict",
    text: "Write what you think will happen before touching a switch — a real, checkable guess.",
  },
  {
    icon: Eye,
    title: "Observe",
    text: "Flip the switch and watch the engine answer — every value computed live, nothing recorded.",
  },
  {
    icon: NotebookPen,
    title: "Record",
    text: "Save inputs, prediction, and result in the journal, then export it as CSV for your teacher.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <section className="flex flex-col items-center gap-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <CircuitBoard className="size-3.5" aria-hidden="true" />
          SSC / HSC ICT Virtual Laboratory
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-fg sm:text-6xl">
          Stop memorizing diagrams. Flip the switches.
        </h1>
        <p className="max-w-2xl text-base text-muted sm:text-lg">
          A calm, precise lab where logic gates, Boolean algebra, number
          systems, and simple circuits respond the moment you touch them.
          Predict first, then check — every value is computed live in your
          browser, nothing pre-recorded, nothing sent anywhere.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/logic"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open the Logic Lab
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/journal"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <NotebookPen className="size-4" aria-hidden="true" />
            Keep an experiment journal
          </Link>
        </div>
      </section>

      {/* Module cards */}
      <section aria-labelledby="modules-heading" className="mt-16">
        <h2 id="modules-heading" className="text-2xl font-semibold tracking-tight text-fg">
          Five labs, one workbench
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Each module runs entirely in this page — click one and start
          experimenting, no setup, no account.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Card className="h-full transition-colors group-hover:border-accent/40">
                <CardContent className="flex h-full flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                    <module.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold text-fg">{module.title}</h3>
                    <p className="text-sm text-fg/90">Students learn: {module.learns}</p>
                    <p className="text-sm text-muted">{module.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-accent">
                    Open
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Classroom highlight fills the grid's sixth cell */}
          <Link
            href="/classroom"
            className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Card className="h-full border-accent/40 bg-accent/5 transition-colors group-hover:border-accent/60">
              <CardContent className="flex h-full flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-fg">
                  <Presentation className="size-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-fg">Classroom Mode</h3>
                  <p className="text-sm text-fg/90">
                    Eight projector-ready experiments with objectives and guided
                    steps.
                  </p>
                  <p className="text-sm text-muted">
                    Giant controls, fullscreen at the press of F, and shareable
                    deep links to any step of any experiment.
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-accent">
                  Teach with it
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Teacher highlight */}
      <section
        aria-labelledby="classroom-heading"
        className="mt-16 rounded-2xl border border-border bg-surface p-8 sm:p-10"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Presentation className="size-3.5" aria-hidden="true" />
              For teachers
            </span>
            <h2 id="classroom-heading" className="text-2xl font-semibold tracking-tight text-fg">
              A lesson, not just a simulator
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Classroom Mode strips the navigation, enlarges every control, and
              walks a class through curated experiments — AND switches in
              series, De Morgan proven row by row, 25 to 11001, Ohm&apos;s law live,
              a 3-variable K-map. The objective stays on screen; Next carries
              the story; the address bar is a deep link you can share before
              class.
            </p>
            <Link
              href="/classroom"
              className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try Classroom Mode
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-fg">
            {[
              "Fullscreen at the press of F",
              "Learning objective always on screen",
              "Guided teacher steps, one at a time",
              "Deep-link any moment as ?e=…&step=…",
              "The same engines as the student labs",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 rounded-lg border border-border bg-bg px-4 py-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pedagogy strip */}
      <section aria-labelledby="pedagogy-heading" className="mt-16">
        <h2 id="pedagogy-heading" className="text-2xl font-semibold tracking-tight text-fg">
          Predict → Observe → Record
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The method the journal is built around — the difference between
          playing with switches and doing an experiment.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {PEDAGOGY.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm text-muted">0{index + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-fg">{step.title}</h3>
                  <p className="text-sm text-muted">{step.text}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted">
          Ready to start the habit?{" "}
          <Link href="/journal" className="font-medium text-accent hover:text-accent-hover">
            Open the Experiment Journal
          </Link>{" "}
          — it lives in this browser only, and exports to CSV.
        </p>
      </section>
    </div>
  );
}
