import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { loadGameDetailClient, loadSlateClient } from "./api";
import type { Game, GameDetail } from "./types";

export function useSlate(leagueIds: string[]) {
  const key = [...leagueIds].sort().join(",");
  return useQuery({
    queryKey: ["slate", key],
    queryFn: () => loadSlateClient(leagueIds),
    refetchInterval: (q) => {
      const games = q.state.data;
      if (!games?.length) return 4000;
      return games.some((g) => g.state === "in") ? 1200 : 12000;
    },
    staleTime: 250,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

export function useGameDetail(leagueId?: string, eventId?: string, fallback?: Game) {
  return useQuery({
    queryKey: ["game", leagueId, eventId],
    queryFn: () => loadGameDetailClient(leagueId!, eventId!, fallback),
    enabled: Boolean(leagueId && eventId),
    refetchInterval: (q) => {
      const g = q.state.data ?? fallback;
      return g?.state === "in" ? 600 : 12000;
    },
    staleTime: 200,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

export type TicketEventRef = { eventId: string; leagueId: string };

export function useTicketDetails(games: Game[], events: Array<string | TicketEventRef>) {
  const byId = new Map(games.map((g) => [g.id, g]));
  const refs: TicketEventRef[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const eventId = typeof ev === "string" ? ev : ev.eventId;
    if (seen.has(eventId)) continue;
    seen.add(eventId);
    const g = byId.get(eventId);
    const leagueId = typeof ev === "string" ? (g?.leagueId ?? "") : ev.leagueId || g?.leagueId || "";
    refs.push({ eventId, leagueId });
  }

  const queries = useQueries({
    queries: refs.map((ref) => {
      const g = byId.get(ref.eventId);
      const leagueId = g?.leagueId || ref.leagueId;
      return {
        queryKey: ["game", leagueId || "?", ref.eventId],
        queryFn: () => loadGameDetailClient(leagueId, ref.eventId, g),
        enabled: Boolean(leagueId),
        refetchInterval: g?.state === "in" ? 600 : g?.state === "post" ? 20000 : 4000,
        staleTime: 200,
        retry: 1,
        placeholderData: keepPreviousData,
      };
    }),
  });
  const map = new Map<string, GameDetail | null>();
  refs.forEach((ref, i) => {
    map.set(ref.eventId, queries[i]?.data ?? null);
  });
  return map;
}
