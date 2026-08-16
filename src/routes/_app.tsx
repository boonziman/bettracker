import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { SlipSheet } from "@/components/slip-sheet";
import { seedFromSlate, useBook, useBookHydrated } from "@/lib/bets/store";
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
  const eventIds = tickets.flatMap((t) => t.legs.map((l) => l.eventId));
  const details = useTicketDetails(games, eventIds);
  const gameMap = new Map<string, Game>(games.map((g) => [g.id, g]));

  useCloudSync();
  useEffect(() => {
    if (hydrated && games.length) seedFromSlate(games);
  }, [games, hydrated]);

  return (
    <Shell games={gameMap} details={details}>
      <Outlet />
      <SlipSheet />
    </Shell>
  );
}
