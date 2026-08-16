import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { WatchBoard } from "@/components/watch-board";
import { useBook } from "@/lib/bets/store";
import { eventLabel } from "@/lib/espn/leagues";
import { useGameDetail, useSlate } from "@/lib/espn/hooks";

export const Route = createFileRoute("/_app/watch/$leagueId/$eventId")({
  component: WatchPage,
});

function WatchPage() {
  const { leagueId, eventId } = Route.useParams();
  const enabled = useBook((s) => s.enabledLeagues);
  const tickets = useBook((s) => s.tickets);
  const openDraft = useBook((s) => s.openDraft);
  const { data: games = [] } = useSlate(enabled);
  const fallback = games.find((g) => g.id === eventId);
  const { data, isLoading, isError } = useGameDetail(leagueId, eventId, fallback);

  return (
    <div>
      <div className="mb-5 flex w-full items-center justify-between gap-3">
        <Link to="/" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" />
          Back
        </Link>
        {data ? (
          <button
            type="button"
            onClick={() =>
              openDraft({
                label: eventLabel(data),
                stake: 10,
                odds: -110,
                legs: [],
                focusEventId: data.id,
              })
            }
            className="inline-flex h-11 items-center text-sm text-muted hover:text-fg"
          >
            Add a bet
          </button>
        ) : null}
      </div>

      {isLoading && !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      ) : isError && !data ? (
        <p className="text-sm text-lose">Could not load this Gamecast.</p>
      ) : data ? (
        <WatchBoard game={data} tickets={tickets} />
      ) : (
        <p className="text-sm text-muted">Game not found on the current slate.</p>
      )}
    </div>
  );
}
