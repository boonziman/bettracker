import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TicketDesk } from "@/components/ticket-desk";
import { useBook } from "@/lib/bets/store";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";

export const Route = createFileRoute("/_app/book/$ticketId")({
  component: TicketPage,
});

function TicketPage() {
  const { ticketId } = Route.useParams();
  const navigate = useNavigate();
  const tickets = useBook((s) => s.tickets);
  const enabled = useBook((s) => s.enabledLeagues);
  const ticket = tickets.find((t) => t.id === ticketId);
  const { data: games = [] } = useSlate(enabled);
  const details = useTicketDetails(
    games,
    (ticket?.legs ?? []).map((l) => ({ eventId: l.eventId, leagueId: l.leagueId })),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  return (
    <div>
      <div className="mb-5 flex w-full items-center justify-between gap-3">
        <Link to="/book" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" />
          Book
        </Link>
      </div>

      {ticket ? (
        <TicketDesk
          ticket={ticket}
          games={gameMap}
          details={details}
          onRemoved={() => navigate({ to: "/book" })}
        />
      ) : (
        <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
          <p className="type-display text-2xl italic">Ticket not on the book</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">It may have been removed from this device.</p>
          <Link to="/book" className="mt-5 inline-flex h-11 items-center text-sm text-muted hover:text-fg">
            Back to the book
          </Link>
        </div>
      )}
    </div>
  );
}
