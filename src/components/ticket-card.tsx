import { Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { statusLabel, statusTone } from "@/lib/bets/status";
import { useBook } from "@/lib/bets/store";
import type { Ticket } from "@/lib/bets/types";
import type { Game, GameDetail } from "@/lib/espn/types";
import { cn, formatAmerican, formatMoney } from "@/lib/utils";

export function TicketCard({
  ticket,
  games,
  details,
}: {
  ticket: Ticket;
  games: Map<string, Game>;
  details: Map<string, GameDetail | null>;
}) {
  const { toggleLeg, removeTicket } = useBook();
  const ev = evaluateTicket(ticket, games, details);
  const tone = statusTone(ev.status);

  return (
    <article
      className={cn(
        "rounded-xl bg-surface p-1 shadow-[var(--shadow-border)]",
        ev.status === "won" && "shadow-[0_0_0_1px_rgb(142_174_144_/_0.35)]",
        ev.status === "lost" && "opacity-80",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-3.5 pt-3 pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{ticket.label}</h3>
            <Badge tone={tone}>{statusLabel(ev.status)}</Badge>
            {ticket.sample ? <Badge>Sample</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-subtle">
            {ticket.legs.length === 1 ? "Straight" : `${ticket.legs.length}-leg parlay`} ·{" "}
            {ev.hits}/{ticket.legs.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium tabular text-fg">
            {formatMoney(ticket.stake)} → {formatMoney(ticket.toWin + ticket.stake)}
          </p>
          <p className="text-2xs text-subtle tabular">{formatAmerican(ticket.odds)}</p>
        </div>
      </header>

      <ul>
        {ticket.legs.map((leg, i) => {
          const evaled = ev.legs[i]!;
          const game = games.get(leg.eventId);
          return (
            <li key={leg.id} className="border-t border-line px-3.5 py-2.5">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleLeg(ticket.id, leg.id)}
                  aria-pressed={leg.checked}
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border transition-colors",
                    leg.checked || evaled.status === "won"
                      ? "border-win bg-win text-accent-fg"
                      : "border-line-strong text-transparent",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm", (leg.checked || evaled.status === "won") && "text-win")}>
                      {leg.selection}
                    </p>
                    <Badge tone={statusTone(evaled.status)}>{statusLabel(evaled.status)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {leg.eventLabel}
                    {evaled.note ? ` · ${evaled.note}` : ""}
                  </p>
                  {evaled.line != null && evaled.current != null ? (
                    <Ticker current={evaled.current} line={evaled.line} status={evaled.status} />
                  ) : null}
                </div>
                {game ? (
                  <Link
                    to="/watch/$leagueId/$eventId"
                    params={{ leagueId: game.leagueId, eventId: game.id }}
                    className="shrink-0 text-2xs text-muted underline-offset-2 hover:text-fg hover:underline"
                  >
                    Watch
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex justify-end px-2 pb-2">
        <button
          type="button"
          onClick={() => removeTicket(ticket.id)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs text-subtle hover:text-lose"
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      </footer>
    </article>
  );
}

export function Ticker({
  current,
  line,
  status,
}: {
  current: number;
  line: number;
  status: string;
}) {
  const pct = Math.max(4, Math.min(100, (current / Math.max(line, 0.01)) * 100));
  const bar =
    status === "lost"
      ? "bg-lose"
      : status === "won"
        ? "bg-win"
        : status === "threat"
          ? "bg-threat"
          : "bg-lean";
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-2xs tabular text-muted">
        <span>
          {current}
          <span className="text-subtle"> / {line}</span>
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-pill bg-inset">
        <div className={cn("h-full origin-left rounded-pill", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
