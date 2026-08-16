import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, History, LayoutGrid, Plus } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { useBook } from "@/lib/bets/store";
import type { Game, GameDetail } from "@/lib/espn/types";
import { cn, formatMoney } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Slate", icon: LayoutGrid },
  { to: "/book", label: "Book", icon: BookOpen },
  { to: "/history", label: "Ledger", icon: History },
] as const;

export function Shell({
  children,
  games,
  details,
}: {
  children: React.ReactNode;
  games: Map<string, Game>;
  details: Map<string, GameDetail | null>;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tickets = useBook((s) => s.tickets);
  const draft = useBook((s) => s.draft);
  const openDraft = useBook((s) => s.openDraft);
  const { user, isPending } = useCurrentUserState();

  const open = tickets.filter((t) => !t.settled);
  let risked = 0;
  let toWin = 0;
  let secured = 0;
  let liveHits = 0;
  let liveLegs = 0;
  for (const t of tickets) {
    const ev = evaluateTicket(t, games, details);
    if (ev.status === "open") {
      risked += t.stake;
      toWin += t.toWin;
      liveHits += ev.hits;
      liveLegs += t.legs.length;
    } else if (ev.status === "won" || t.settled === "won") {
      secured += t.toWin;
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="type-display text-2xl italic">Slate</span>
            <span className="hidden text-2xs uppercase tracking-widest text-subtle sm:inline">The desk</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  path === n.to ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-2xs uppercase tracking-wide text-subtle">Secured</p>
              <p className="text-sm font-medium tabular text-win">{formatMoney(secured)}</p>
            </div>
            <div className="hidden text-right md:block">
              <p className="text-2xs uppercase tracking-wide text-subtle">Live risk</p>
              <p className="text-sm font-medium tabular">{formatMoney(risked)}</p>
            </div>
            <button
              type="button"
              onClick={() => openDraft()}
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New ticket</span>
            </button>
            {authEnabled ? (
              isPending ? (
                <div className="size-8 animate-pulse rounded-full bg-elevated" />
              ) : user ? (
                <SignedIn>
                  <UserButton />
                </SignedIn>
              ) : (
                <SignedOut>
                  <Link to="/login" className="text-sm text-muted hover:text-fg">
                    Sign in
                  </Link>
                </SignedOut>
              )
            ) : null}
          </div>
        </div>
        {open.length > 0 ? (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-2 text-2xs text-subtle">
            <span>
              {open.length} open · {liveHits}/{liveLegs || 0} legs covering
            </span>
            <span className="tabular">
              To win {formatMoney(toWin)}
              {draft ? ` · ${draft.legs.length} on the slip` : ""}
            </span>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs",
                  active ? "text-fg" : "text-subtle",
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
