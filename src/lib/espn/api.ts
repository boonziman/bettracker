import { LEAGUES, leagueById, scoreboardUrl, summaryUrl, type LeagueDef } from "./leagues";
import { parseScoreboard, parseSummary } from "./parse";
import type { Game, GameDetail } from "./types";

const SCORE_TTL = 3000;
const SUM_TTL = 2500;

type CacheEntry<T> = { at: number; data: T; inflight?: Promise<T> };
const scoreCache = new Map<string, CacheEntry<Game[]>>();
const sumCache = new Map<string, CacheEntry<GameDetail | null>>();

async function getJson(url: string) {
  const headers: Record<string, string> = {};
  if (typeof window === "undefined") {
    headers.accept = "application/json";
    headers["user-agent"] = "SlateDesk/1.0 (+https://github.com/boonziman/bettracker)";
  }
  const res = await fetch(url, Object.keys(headers).length ? { headers } : undefined);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return res.json();
}

async function cached<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  if (hit?.inflight) return hit.inflight;
  const inflight = load()
    .then((data) => {
      map.set(key, { at: Date.now(), data });
      return data;
    })
    .catch((err) => {
      map.delete(key);
      throw err;
    });
  map.set(key, { at: 0, data: (hit?.data as T) ?? (undefined as T), inflight });
  return inflight;
}

function usesDateParam(league: LeagueDef) {
  return league.id === "mlb" || league.id === "wnba" || league.id === "nba";
}

export async function loadLeagueScoreboard(league: LeagueDef): Promise<Game[]> {
  const key = league.id;
  return cached(scoreCache, key, SCORE_TTL, async () => {
    const { todayKey } = await import("@/lib/utils");
    const url = scoreboardUrl(league, usesDateParam(league) ? todayKey() : undefined);
    const json = await getJson(url);
    return parseScoreboard(json, league);
  });
}

export async function loadSlate(leagueIds: string[]): Promise<Game[]> {
  const defs = leagueIds
    .map((id) => leagueById(id))
    .filter((l): l is LeagueDef => Boolean(l));
  const results = await Promise.allSettled(defs.map((l) => loadLeagueScoreboard(l)));
  const games: Game[] = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") games.push(...r.value);
  });
  games.sort((a, b) => {
    const rank = (g: Game) => (g.state === "in" ? 0 : g.state === "pre" ? 1 : 2);
    const d = rank(a) - rank(b);
    if (d) return d;
    return a.date.localeCompare(b.date);
  });
  return games;
}

export async function loadGameDetail(leagueId: string, eventId: string, fallback?: Game): Promise<GameDetail | null> {
  const league = leagueById(leagueId);
  if (!league) return null;
  const key = `${leagueId}:${eventId}`;
  return cached(sumCache, key, SUM_TTL, async () => {
    const json = await getJson(summaryUrl(league, eventId));
    return parseSummary(json, league, fallback);
  });
}

export function allLeagueIds() {
  return LEAGUES.map((l) => l.id);
}

/** Browser talks to ESPN's web API (CORS open). Preview can use the local proxy. */
export async function loadSlateClient(leagueIds: string[]): Promise<Game[]> {
  if (typeof window !== "undefined" && import.meta.env.VITE_SPA !== "1") {
    try {
      const res = await fetch(`/api/espn/slate?leagues=${encodeURIComponent(leagueIds.join(","))}`);
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("json")) return (await res.json()) as Game[];
    } catch {
      /* fall through to ESPN */
    }
  }
  return loadSlate(leagueIds);
}

export async function loadGameDetailClient(
  leagueId: string,
  eventId: string,
  fallback?: Game,
): Promise<GameDetail | null> {
  if (typeof window !== "undefined" && import.meta.env.VITE_SPA !== "1") {
    try {
      const res = await fetch(
        `/api/espn/game?league=${encodeURIComponent(leagueId)}&event=${encodeURIComponent(eventId)}`,
      );
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("json")) return (await res.json()) as GameDetail | null;
    } catch {
      /* fall through */
    }
  }
  return loadGameDetail(leagueId, eventId, fallback);
}
