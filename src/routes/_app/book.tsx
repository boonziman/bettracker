import { Outlet, createFileRoute, useChildMatches } from "@tanstack/react-router";
import { TicketDesk } from "@/components/ticket-desk";
import { Button } from "@/components/ui/button";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { useBook } from "@/lib/bets/store";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/_app/book")({
  component: BookLayout,
});

function BookLayout() {
  const child = useChildMatches();
  if (child.length) return <Outlet />;
  return <BookPage />;
}

function BookPage() {
  const tickets = useBook((s) => s.tickets);
  const enabled = useBook((s) => s.enabledLeagues);
  const openDraft = useBook((s) => s.openDraft);
  const { data: games = [] } = useSlate(enabled);
  const details = useTicketDetails(
    games,
    tickets.flatMap((t) => t.legs.map((l) => ({ eventId: l.eventId, leagueId: l.leagueId }))),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  const open = tickets.filter((t) => evaluateTicket(t, gameMap, details).status === "open");
  const closed = tickets.filter((t) => evaluateTicket(t, gameMap, details).status !== "open");

  const risked = open.reduce((a, t) => a + t.stake, 0);
  const potential = open.reduce((a, t) => a + t.toWin, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-widest text-subtle">Your book</p>
          <h1 className="type-display mt-1 text-3xl italic">Tickets</h1>
        </div>
        <Button onClick={() => openDraft()}>New ticket</Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Open" value={String(open.length)} />
        <Stat label="Risked" value={formatMoney(risked)} />
        <Stat label="To win" value={formatMoney(potential)} />
      </div>

      {open.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
          <p className="type-display text-2xl italic">Nothing on the board</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Pull a line off the slate, or write a parlay from scratch. Props tick live once the game starts.
          </p>
          <Button className="mt-5" onClick={() => openDraft()}>
            Write a ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {open.map((t) => (
            <TicketDesk key={t.id} ticket={t} games={gameMap} details={details} size="card" />
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-2xs font-medium uppercase tracking-wide text-subtle">Recently settled</h2>
          <div className="space-y-10">
            {closed.slice(0, 6).map((t) => (
              <TicketDesk key={t.id} ticket={t} games={gameMap} details={details} size="card" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-2xs uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-1 text-xl font-medium tabular">{value}</p>
    </div>
  );
}
