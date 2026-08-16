import { createFileRoute } from "@tanstack/react-router";
import { TicketRow } from "@/components/ticket-desk";
import { evaluateTicket } from "@/lib/bets/evaluate";
import { useBook } from "@/lib/bets/store";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const tickets = useBook((s) => s.tickets);
  const enabled = useBook((s) => s.enabledLeagues);
  const { data: games = [] } = useSlate(enabled);
  const details = useTicketDetails(
    games,
    tickets.flatMap((t) => t.legs.map((l) => ({ eventId: l.eventId, leagueId: l.leagueId }))),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  const graded = tickets
    .map((t) => ({ t, ev: evaluateTicket(t, gameMap, details) }))
    .filter((x) => x.ev.status !== "open");

  const won = graded.filter((x) => x.ev.status === "won");
  const lost = graded.filter((x) => x.ev.status === "lost");
  const profit = won.reduce((a, x) => a + x.t.toWin, 0) - lost.reduce((a, x) => a + x.t.stake, 0);
  const staked = graded.reduce((a, x) => a + x.t.stake, 0);

  return (
    <div>
      <div className="mb-6">
        <p className="text-2xs font-medium uppercase tracking-widest text-subtle">Closed book</p>
        <h1 className="type-display mt-1 text-3xl italic">Ledger</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Record" value={`${won.length}–${lost.length}`} />
        <Stat label="Graded" value={String(graded.length)} />
        <Stat label="Staked" value={formatMoney(staked)} />
        <Stat label="Net" value={formatMoney(profit)} hot={profit >= 0} />
      </div>

      {graded.length === 0 ? (
        <p className="text-sm text-muted">Settled tickets land here once the games go final.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {graded.map(({ t }) => (
            <TicketRow key={t.id} ticket={t} games={gameMap} details={details} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-2xs uppercase tracking-wide text-subtle">{label}</p>
      <p className={`mt-1 text-xl font-medium tabular ${hot ? "text-win" : ""}`}>{value}</p>
    </div>
  );
}
