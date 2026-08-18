import { LEAGUES, leagueById, playbyplayUrl, scoreboardUrl, summaryUrl, type LeagueDef } from "./leagues";
import { parseScoreboard, parseSummary } from "./parse";
import type { Game, GameDetail, GamePlay, Situation } from "./types";

const LIVE_TTL = 700;
const IDLE_TTL = 8000;
const SUM_TTL = 400;

type CacheEntry<T> = { at: number; data: T; inflight?: Promise<T> };
const scoreCache = new Map<string, CacheEntry<Game[]>>();
const sumCache = new Map<string, CacheEntry<GameDetail | null>>();

type Playish = { id?: string };

async function getJson(url: string) {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (typeof window === "undefined") {
    headers["user-agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
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
      if (hit?.data !== undefined) {
        map.set(key, { at: Date.now(), data: hit.data });
        return hit.data;
      }
      map.delete(key);
      throw err;
    });
  map.set(key, { at: 0, data: (hit?.data as T) ?? (undefined as T), inflight });
  return inflight;
}

function usesDateParam(league: LeagueDef) {
  return league.id === "mlb" || league.id === "wnba" || league.id === "nba" || league.id === "ncaab";
}

export async function loadLeagueScoreboard(league: LeagueDef): Promise<Game[]> {
  const key = league.id;
  const prev = scoreCache.get(key)?.data;
  const ttl = prev?.some((g) => g.state === "in") ? LIVE_TTL : IDLE_TTL;
  return cached(scoreCache, key, ttl, async () => {
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

function boardGame(leagueId: string, eventId: string): Game | undefined {
  return scoreCache.get(leagueId)?.data?.find((g) => g.id === eventId);
}

function firstText(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && v.trim()) return v;
  }
  return undefined;
}

function mergeLive(detail: GameDetail, board?: Game, fallback?: Game): GameDetail {
  const src = board ?? fallback;
  if (!src) return detail;
  const a = src.situation;
  const b = detail.situation;
  const situation: Situation | undefined =
    a || b
      ? {
          ...a,
          ...b,
          balls: a?.balls ?? b?.balls,
          strikes: a?.strikes ?? b?.strikes,
          outs: a?.outs ?? b?.outs,
          onFirst: a?.onFirst ?? b?.onFirst,
          onSecond: a?.onSecond ?? b?.onSecond,
          onThird: a?.onThird ?? b?.onThird,
          runnerFirst: firstText(b?.runnerFirst, a?.runnerFirst),
          runnerSecond: firstText(b?.runnerSecond, a?.runnerSecond),
          runnerThird: firstText(b?.runnerThird, a?.runnerThird),
          batter: firstText(a?.batter, b?.batter),
          pitcher: firstText(a?.pitcher, b?.pitcher),
          batterId: firstText(a?.batterId, b?.batterId),
          pitcherId: firstText(a?.pitcherId, b?.pitcherId),
          batterHeadshot: firstText(a?.batterHeadshot, b?.batterHeadshot),
          pitcherHeadshot: firstText(a?.pitcherHeadshot, b?.pitcherHeadshot),
          batterLine: firstText(a?.batterLine, b?.batterLine),
          pitcherLine: firstText(a?.pitcherLine, b?.pitcherLine),
          batterPos: firstText(a?.batterPos, b?.batterPos),
          pitcherHand: firstText(a?.pitcherHand, b?.pitcherHand),
          batterHand: firstText(a?.batterHand, b?.batterHand),
          batterTeamId: firstText(a?.batterTeamId, b?.batterTeamId),
          pitcherTeamId: firstText(a?.pitcherTeamId, b?.pitcherTeamId),
          onDeck: firstText(a?.onDeck, b?.onDeck),
          pitchCount: b?.pitchCount || a?.pitchCount,
          lastPlay: firstText(a?.lastPlay, b?.lastPlay),
          downDistanceText: firstText(a?.downDistanceText, b?.downDistanceText),
          possessionAbbr: firstText(a?.possessionAbbr, b?.possessionAbbr),
        }
      : undefined;
  return {
    ...detail,
    state: src.state || detail.state,
    shortDetail: src.shortDetail || detail.shortDetail,
    detail: src.detail || detail.detail,
    period: src.period ?? detail.period,
    clock: src.clock ?? detail.clock,
    completed: src.completed,
    home: {
      ...detail.home,
      score: src.home.score,
      linescores: src.home.linescores.length ? src.home.linescores : detail.home.linescores,
      winner: src.home.winner,
      logo: detail.home.logo || src.home.logo,
    },
    away: {
      ...detail.away,
      score: src.away.score,
      linescores: src.away.linescores.length ? src.away.linescores : detail.away.linescores,
      winner: src.away.winner,
      logo: detail.away.logo || src.away.logo,
    },
    situation,
    lastPlay: src.lastPlay || detail.lastPlay,
  };
}

export async function loadGameDetail(leagueId: string, eventId: string, fallback?: Game): Promise<GameDetail | null> {
  const league = leagueById(leagueId);
  if (!league) return null;
  if (league.sport === "mma" || league.sport === "golf" || league.sport === "racing" || league.sport === "tennis") {
    if (fallback) return { ...fallback, plays: [], players: [] };
  }
  const key = `${leagueId}:${eventId}`;
  return cached(sumCache, key, SUM_TTL, async () => {
    let board = boardGame(leagueId, eventId);
    if (!board) {
      try {
        const slate = await loadLeagueScoreboard(league);
        board = slate.find((g) => g.id === eventId);
      } catch {
        /* summary still works */
      }
    }
    try {
      const wantsPbp = league.sport === "baseball" || league.sport === "softball" || league.sport === "basketball";
      const [sumRes, pbpRes] = await Promise.allSettled([
        getJson(summaryUrl(league, eventId)),
        wantsPbp ? getJson(playbyplayUrl(league, eventId)) : Promise.resolve(null),
      ]);
      const json = sumRes.status === "fulfilled" ? sumRes.value : {};
      if (pbpRes.status === "fulfilled" && pbpRes.value) {
        const extra = extractPlays(pbpRes.value);
        if (extra.length) {
          const existing: Playish[] = Array.isArray(json.plays) ? (json.plays as Playish[]) : [];
          const seen = new Set(existing.map((p) => p?.id).filter((id): id is string => Boolean(id)));
          const fresh = extra.filter((p): p is Playish => {
            const id = (p as Playish)?.id;
            return typeof id === "string" && id.length > 0 && !seen.has(id);
          });
          json.plays = [...existing, ...fresh];
        }
      }
      if (!json.header && !json.boxscore && fallback) {
        return mergeLive({ ...fallback, plays: [], players: [] }, boardGame(leagueId, eventId), fallback);
      }
      const parsed = parseSummary(json, league, fallback);
      if (!parsed) return fallback ? { ...fallback, plays: [], players: [] } : null;
      return mergeLive(parsed, boardGame(leagueId, eventId), fallback);
    } catch {
      const board = boardGame(leagueId, eventId);
      if (board) return mergeLive({ ...board, plays: [], players: [] }, board, fallback);
      return fallback ? { ...fallback, plays: [], players: [] } : null;
    }
  });
}

function extractPlays(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.plays)) return o.plays;
  if (Array.isArray(o.items)) return o.items;
  const page = o.page as Record<string, unknown> | undefined;
  if (page && Array.isArray(page.items)) return page.items;
  return [];
}

export function allLeagueIds() {
  return LEAGUES.map((l) => l.id);
}

/** Browser talks to ESPN directly (CORS open) so live ticks skip our server hop. */
export async function loadSlateClient(leagueIds: string[]): Promise<Game[]> {
  return loadSlate(leagueIds);
}

export async function loadGameDetailClient(
  leagueId: string,
  eventId: string,
  fallback?: Game,
): Promise<GameDetail | null> {
  return loadGameDetail(leagueId, eventId, fallback);
}

export type { GamePlay };
