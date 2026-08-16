import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GameCard, MiniGame } from "@/components/game-card";
import { SportRail } from "@/components/sport-rail";
import { TicketRow } from "@/components/ticket-desk";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { useBook } from "@/lib/bets/store";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";

export const Route = createFileRoute("/_app/")({
  component: SlatePage,
});

function SlatePage() {
  const enabled = useBook((s) => s.enabledLeagues);
  const setEnabled = useBook((s) => s.setEnabledLeagues);
  const tickets = useBook((s) => s.tickets);
  const { data: games = [], isLoading, isError, refetch, dataUpdatedAt } = useSlate(enabled);
  const [filter, setFilter] = useState("all");
  const details = useTicketDetails(
    games,
    tickets.flatMap((t) => t.legs.map((l) => ({ eventId: l.eventId, leagueId: l.leagueId }))),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  const visible = useMemo(() => {
    let list = games;
    if (filter === "live") list = games.filter((g) => g.state === "in");
    else if (filter !== "all") list = games.filter((g) => g.leagueId === filter);
    return list;
  }, [games, filter]);

  const live = visible.filter((g) => g.state === "in");
  const upcoming = visible.filter((g) => g.state === "pre");
  const final = visible.filter((g) => g.state === "post");
  const openTickets = tickets.filter((t) => evaluateTicket(t, gameMap, details).status === "open").slice(0, 4);

  const toggleLeague = (id: string) => {
    setEnabled(enabled.includes(id) ? enabled.filter((x) => x !== id) : [...enabled, id]);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-widest text-subtle">Today's card</p>
          <h1 className="type-display mt-1 text-3xl italic">The slate</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="tabular">{live.length} live</span>
          <span>·</span>
          <span className="tabular">{upcoming.length} upcoming</span>
          {dataUpdatedAt ? (
            <>
              <span>·</span>
              <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
            </>
          ) : null}
          <button type="button" onClick={() => void refetch()} className="text-muted hover:text-fg">
            Refresh
          </button>
        </div>
      </div>

      <SportRail
        enabled={enabled}
        onToggle={toggleLeague}
        games={games}
        filter={filter}
        onFilter={setFilter}
      />

      {openTickets.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Working tickets</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {openTickets.map((t) => (
              <TicketRow key={t.id} ticket={t} games={gameMap} details={details} />
            ))}
          </div>
        </section>
      ) : null}

      {isError && !games.length ? (
        <p className="mt-8 text-sm text-lose">Could not reach live scores. Check the connection and refresh.</p>
      ) : null}

      {isLoading && !games.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : null}

      {live.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Live now</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {final.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Final</h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {final.map((g) => (
              <MiniGame key={g.id} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && !visible.length ? (
        <p className="mt-10 text-sm text-muted">No games on this filter. Try another league or come back later.</p>
      ) : null}
    </div>
  );
}
