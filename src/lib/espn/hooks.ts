import { useQueries, useQuery } from "@tanstack/react-query";
import { loadGameDetailClient, loadSlateClient } from "./api";
import type { Game, GameDetail } from "./types";

export function useSlate(leagueIds: string[]) {
  const key = [...leagueIds].sort().join(",");
  return useQuery({
    queryKey: ["slate", key],
    queryFn: () => loadSlateClient(leagueIds),
    refetchInterval: (q) => {
      const games = q.state.data;
      if (!games?.length) return 20000;
      return games.some((g) => g.state === "in") ? 5000 : 20000;
    },
    staleTime: 3000,
  });
}

export function useGameDetail(leagueId?: string, eventId?: string, fallback?: Game) {
  return useQuery({
    queryKey: ["game", leagueId, eventId],
    queryFn: () => loadGameDetailClient(leagueId!, eventId!, fallback),
    enabled: Boolean(leagueId && eventId),
    refetchInterval: (q) => {
      const g = q.state.data;
      return g?.state === "in" ? 4000 : 20000;
    },
    staleTime: 2000,
  });
}

export function useTicketDetails(games: Game[], eventIds: string[]) {
  const unique = [...new Set(eventIds)];
  const byId = new Map(games.map((g) => [g.id, g]));
  const queries = useQueries({
    queries: unique.map((id) => {
      const g = byId.get(id);
      return {
        queryKey: ["game", g?.leagueId ?? "?", id],
        queryFn: () => loadGameDetailClient(g!.leagueId, id, g),
        enabled: Boolean(g),
        refetchInterval: g?.state === "in" ? 5000 : 30000,
        staleTime: 2500,
      };
    }),
  });
  const map = new Map<string, GameDetail | null>();
  unique.forEach((id, i) => {
    map.set(id, queries[i]?.data ?? null);
  });
  return map;
}
