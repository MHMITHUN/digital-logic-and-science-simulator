"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  // Classroom mode keeps its own minimal chrome — no footer on the projector.
  if (pathname.startsWith("/classroom")) return null;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-fg">Logic and Science Lab</p>
          <p className="mt-1 text-sm text-muted">
            An interactive Digital Logic and Science Simulator for SSC and HSC
            ICT students — logic gates, Boolean algebra, number systems, and
            introductory physics circuits.
          </p>
          <p className="mt-3 text-xs text-muted">
            All simulations run locally in your browser - no data leaves this
            device.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Link
            href="/logic"
            className="text-muted transition-colors hover:text-fg"
          >
            Logic Lab
          </Link>
          <Link
            href="/number-system"
            className="text-muted transition-colors hover:text-fg"
          >
            Number Systems
          </Link>
          <Link
            href="/boolean"
            className="text-muted transition-colors hover:text-fg"
          >
            Boolean
          </Link>
          <Link
            href="/physics"
            className="text-muted transition-colors hover:text-fg"
          >
            Physics
          </Link>
          <Link
            href="/classroom"
            className="text-muted transition-colors hover:text-fg"
          >
            Classroom
          </Link>
          <Link
            href="/journal"
            className="text-muted transition-colors hover:text-fg"
          >
            Journal
          </Link>
        </nav>
      </div>
      <div className="border-t border-border py-4">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted sm:px-6">
          © 2026 Logic and Science Lab. Built for classroom use.
        </p>
      </div>
    </footer>
  );
}
