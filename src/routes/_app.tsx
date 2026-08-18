import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { SlipSheet } from "@/components/slip-sheet";
import { seedFromSlate, ensureNewLeagues, ensureTonightTickets, useBook, useBookHydrated } from "@/lib/bets/store";
import { useCloudSync } from "@/lib/bets/use-cloud-sync";
import { useSlate, useTicketDetails } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const enabled = useBook((s) => s.enabledLeagues);
  const tickets = useBook((s) => s.tickets);
  const hydrated = useBookHydrated();
  const { data: games = [] } = useSlate(enabled);
  const details = useTicketDetails(
    games,
    tickets.flatMap((t) => t.legs.map((l) => ({ eventId: l.eventId, leagueId: l.leagueId }))),
  );
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  useCloudSync();
  useEffect(() => {
    if (hydrated) {
      ensureNewLeagues();
      void import("@/lib/accounts/vault").then(({ ensureLocalMaster }) => ensureLocalMaster());
      if (import.meta.env.VITE_SPA !== "1") {
        void import("@/lib/bets/desk")
          .then(({ ensureMasterAccount }) => ensureMasterAccount())
          .catch(() => {});
      }
    }
  }, [hydrated]);
  useEffect(() => {
    if (hydrated && games.length) {
      seedFromSlate(games);
      ensureTonightTickets(games);
    }
  }, [games, hydrated]);

  return (
    <Shell games={gameMap} details={details}>
      <Outlet />
      <SlipSheet />
    </Shell>
  );
}
