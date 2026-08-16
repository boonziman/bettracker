import { Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { GamecastBoard, StatBar } from "@/components/gamecast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateTicket, trackingLabel } from "@/lib/bets/evaluate";
import { statusLabel, statusTone } from "@/lib/bets/status";
import { useBook } from "@/lib/bets/store";
import type { Ticket } from "@/lib/bets/types";
import { eventLabel } from "@/lib/espn/leagues";
import type { Game, GameDetail } from "@/lib/espn/types";
import { cn, formatAmerican, formatMoney } from "@/lib/utils";

export function TicketDesk({
  ticket,
  games,
  details,
  size = "page",
  onRemoved,
}: {
  ticket: Ticket;
  games: Map<string, Game>;
  details: Map<string, GameDetail | null>;
  size?: "page" | "card";
  onRemoved?: () => void;
}) {
  const { toggleLeg, removeTicket } = useBook();
  const ev = evaluateTicket(ticket, games, details);
  const groups = groupLegs(ticket, games, details);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {size === "page" ? (
              <h1 className="type-display text-3xl italic">{ticket.label}</h1>
            ) : (
              <Link
                to="/book/$ticketId"
                params={{ ticketId: ticket.id }}
                className="type-display text-2xl italic hover:text-muted"
              >
                {ticket.label}
              </Link>
            )}
            <Badge tone={statusTone(ev.status)}>{statusLabel(ev.status)}</Badge>
            {ticket.sample ? <Badge>Sample</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {ticket.legs.length === 1 ? "Straight" : `${ticket.legs.length}-leg parlay`} · {ev.hits}/
            {ticket.legs.length} covering
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-medium tabular">
            {formatMoney(ticket.stake)} → {formatMoney(ticket.stake + ticket.toWin)}
          </p>
          <p className="text-xs tabular text-subtle">{formatAmerican(ticket.odds)}</p>
        </div>
      </header>

      {groups.map(({ eventId, game, detail, legs }) => (
        <div key={eventId} className="space-y-2">
          {game ? (
            <GamecastBoard game={detail ?? game} legs={legs} compact={size === "card"} />
          ) : (
            <p className="rounded-xl bg-surface px-4 py-6 text-sm text-muted shadow-[var(--shadow-border)]">
              Game not on today's slate yet.
            </p>
          )}

          <ul className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {legs.map((leg) => {
              const evaled = ev.legs[ticket.legs.indexOf(leg)]!;
              return (
                <li key={leg.id} className="flex items-start gap-3 border-t border-line px-4 py-3 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => toggleLeg(ticket.id, leg.id)}
                    aria-pressed={leg.checked}
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-xs border transition-colors",
                      leg.checked || evaled.status === "won"
                        ? "border-win bg-win text-accent-fg"
                        : "border-line-strong text-transparent",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm", (leg.checked || evaled.status === "won") && "text-win")}>
                        {leg.selection}
                      </p>
                      <Badge tone={statusTone(evaled.status)}>{statusLabel(evaled.status)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-subtle">
                      {trackingLabel(leg)}
                      {evaled.note ? ` · ${evaled.note}` : ""}
                    </p>
                    {evaled.line != null && evaled.current != null ? (
                      <StatBar
                        current={evaled.current}
                        line={evaled.line}
                        status={evaled.status}
                        needed={evaled.needed}
                        extra={evaled.extra}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-subtle hover:text-lose"
          onClick={() => {
            removeTicket(ticket.id);
            onRemoved?.();
          }}
        >
          <Trash2 className="size-3.5" />
          Remove ticket
        </Button>
      </div>
    </div>
  );
}

export function TicketRow({
  ticket,
  games,
  details,
}: {
  ticket: Ticket;
  games: Map<string, Game>;
  details: Map<string, GameDetail | null>;
}) {
  const ev = evaluateTicket(ticket, games, details);
  const firstId = ticket.legs[0]?.eventId;
  const firstDetail = firstId ? details.get(firstId) : null;
  const firstGame = firstId ? (firstDetail ?? games.get(firstId)) : undefined;
  const liveGame = firstGame && firstGame.state === "in";

  return (
    <article className="rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <Link
        to="/book/$ticketId"
        params={{ ticketId: ticket.id }}
        className="block p-4 transition-colors hover:bg-elevated/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-medium">{ticket.label}</h3>
              <Badge tone={statusTone(ev.status)}>{statusLabel(ev.status)}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {ticket.legs.length === 1 ? "Straight" : `${ticket.legs.length}-leg`} · {ev.hits}/{ticket.legs.length}
            </p>
          </div>
          <p className="text-sm font-medium tabular">
            {formatMoney(ticket.stake)} → {formatMoney(ticket.stake + ticket.toWin)}
          </p>
        </div>

        {firstGame && !liveGame ? (
          <p className="mt-3 text-xs text-muted">
            <span className="tabular font-medium text-fg">
              {eventLabel(firstGame)}
              {firstGame.state === "pre" || firstGame.format === "field"
                ? ""
                : ` ${firstGame.away.score}–${firstGame.home.score}`}
            </span>
            <span className="text-subtle"> · {firstGame.shortDetail}</span>
          </p>
        ) : null}

        <ul className="mt-3 space-y-1.5">
          {ticket.legs.map((leg, i) => {
            const evaled = ev.legs[i]!;
            return (
              <li key={leg.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted">{leg.selection}</span>
                <span
                  className={cn(
                    "shrink-0 tabular text-xs font-medium",
                    evaled.status === "won" || evaled.status === "leaning"
                      ? "text-win"
                      : evaled.status === "lost"
                        ? "text-lose"
                        : evaled.status === "threat"
                          ? "text-threat"
                          : "text-subtle",
                  )}
                >
                  {evaled.readout ?? statusLabel(evaled.status)}
                </span>
              </li>
            );
          })}
        </ul>
      </Link>
    </article>
  );
}

function groupLegs(ticket: Ticket, games: Map<string, Game>, details: Map<string, GameDetail | null>) {
  const order: string[] = [];
  const map = new Map<string, Ticket["legs"]>();
  for (const leg of ticket.legs) {
    if (!map.has(leg.eventId)) {
      order.push(leg.eventId);
      map.set(leg.eventId, []);
    }
    map.get(leg.eventId)!.push(leg);
  }
  return order.map((eventId) => {
    const legs = map.get(eventId)!;
    const detail = details.get(eventId) ?? null;
    const game = detail ?? games.get(eventId);
    return { eventId, game, detail, legs };
  });
}
