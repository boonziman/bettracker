import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, History, LayoutGrid, Plus, Shield } from "lucide-react";
import { BugReportButton } from "@/components/bug-report";
import { signOutAccount } from "@/lib/accounts/actions";
import { useAccount } from "@/lib/accounts/session";
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
  children: ReactNode;
  games: Map<string, Game>;
  details: Map<string, GameDetail | null>;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tickets = useBook((s) => s.tickets);
  const draft = useBook((s) => s.draft);
  const openDraft = useBook((s) => s.openDraft);
  const { user, isPending, username, isMaster } = useAccount();

  const isActive = (to: string) => {
    if (to === "/") return path === "/" || path === "";
    return path === to || path.startsWith(`${to}/`);
  };

  let risked = 0;
  let toWin = 0;
  let secured = 0;
  let liveHits = 0;
  let liveLegs = 0;
  let openCount = 0;
  for (const t of tickets) {
    const ev = evaluateTicket(t, games, details);
    if (ev.status === "open") {
      openCount += 1;
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
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
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
                  isActive(n.to) ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            ))}
            {isMaster ? (
              <Link
                to="/desk"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm",
                  isActive("/desk") ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Shield className="size-3.5" />
                Desk
              </Link>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-2xs uppercase tracking-wide text-subtle">Secured</p>
              <p className="text-sm font-medium tabular text-win">{formatMoney(secured)}</p>
            </div>
            <div className="hidden text-right md:block">
              <p className="text-2xs uppercase tracking-wide text-subtle">Live risk</p>
              <p className="text-sm font-medium tabular">{formatMoney(risked)}</p>
            </div>
            <BugReportButton />
            <button
              type="button"
              onClick={() => openDraft()}
              aria-label="New ticket"
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New ticket</span>
            </button>
            {isPending ? (
              <div className="size-8 animate-pulse rounded-full bg-elevated" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-elevated text-xs font-medium">
                  {(username || "U").charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate text-sm font-medium sm:inline">{username || "Account"}</span>
                <button
                  type="button"
                  onClick={() => void signOutAccount()}
                  className="text-xs text-subtle hover:text-fg"
                >
                  Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-muted hover:text-fg">
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-9 items-center rounded-md bg-elevated px-2.5 text-xs text-fg"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
        {openCount > 0 ? (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-2 text-2xs text-subtle">
            <span>
              {openCount} open · {liveHits}/{liveLegs || 0} legs covering
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
        <div className={cn("grid", isMaster ? "grid-cols-4" : "grid-cols-3")}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
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
          {isMaster ? (
            <Link
              to="/desk"
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs",
                isActive("/desk") ? "text-fg" : "text-subtle",
              )}
            >
              <Shield className="size-4" />
              Desk
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
