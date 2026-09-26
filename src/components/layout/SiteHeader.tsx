"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircuitBoard } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

export const NAV_LINKS = [
  { href: "/logic", label: "Logic Lab" },
  { href: "/number-system", label: "Number Systems" },
  { href: "/boolean", label: "Boolean" },
  { href: "/physics", label: "Physics" },
  { href: "/classroom", label: "Classroom" },
  { href: "/journal", label: "Journal" },
] as const;

/** A link is active when the pathname is the route or nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Site header. Client component so nav links can highlight the active
 * module via usePathname. This app has no auth — the header is pure
 * navigation.
 */
export function SiteHeader() {
  const pathname = usePathname();

  // Classroom mode is a distraction-free presentation view (spec §16.8):
  // no site navigation there.
  if (pathname.startsWith("/classroom")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNav links={NAV_LINKS} activePathname={pathname} />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
              <CircuitBoard className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-fg">
              Logic and Science Lab
            </span>
          </Link>
          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "bg-surface-2 font-medium text-fg"
                      : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
