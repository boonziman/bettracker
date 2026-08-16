import type { LeagueDef } from "./leagues";
import type {
  Competitor,
  Game,
  GameDetail,
  GameOdds,
  PlayerLine,
  Situation,
} from "./types";

type Json = Record<string, unknown>;

function asObj(v: unknown): Json {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseAmerican(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).replace(/[^\d+-]/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function competitor(raw: unknown): Competitor {
  const c = asObj(raw);
  const team = asObj(c.team);
  const lines = asArr(c.linescores).map((ls) => num(asObj(ls).displayValue ?? asObj(ls).value));
  const records = asArr(c.records);
  const overall = records.find((r) => asObj(r).type === "total") ?? records[0];
  return {
    id: str(c.id || team.id),
    abbr: str(team.abbreviation || team.shortDisplayName, "?"),
    name: str(team.displayName || team.name, "Team"),
    shortName: str(team.shortDisplayName || team.name || team.abbreviation, "Team"),
    logo: str(team.logo) || undefined,
    score: num(c.score),
    homeAway: c.homeAway === "home" ? "home" : "away",
    record: overall ? str(asObj(overall).summary) : undefined,
    winner: Boolean(c.winner),
    linescores: lines,
  };
}

function parseOdds(raw: unknown): GameOdds | undefined {
  const first = asArr(raw)[0];
  if (!first) return undefined;
  const o = asObj(first);
  const ml = asObj(o.moneyline);
  const ps = asObj(o.pointSpread);
  const tot = asObj(o.total);
  const homeMl = parseAmerican(asObj(asObj(ml.home).close).odds);
  const awayMl = parseAmerican(asObj(asObj(ml.away).close).odds);
  const homeSpread = Number(asObj(asObj(ps.home).close).line);
  const awaySpread = Number(asObj(asObj(ps.away).close).line);
  const overLine = String(asObj(asObj(tot.over).close).line ?? "");
  const ouFromLine = Number(overLine.replace(/[^\d.]/g, ""));
  const result: GameOdds = {
    details: str(o.details) || undefined,
    spread: typeof o.spread === "number" ? o.spread : Number.isFinite(homeSpread) ? homeSpread : undefined,
    overUnder:
      typeof o.overUnder === "number"
        ? o.overUnder
        : Number.isFinite(ouFromLine)
          ? ouFromLine
          : undefined,
    homeMl,
    awayMl,
    homeSpread: Number.isFinite(homeSpread) ? homeSpread : undefined,
    awaySpread: Number.isFinite(awaySpread) ? awaySpread : undefined,
    homeSpreadOdds: parseAmerican(asObj(asObj(ps.home).close).odds),
    awaySpreadOdds: parseAmerican(asObj(asObj(ps.away).close).odds),
    overOdds: parseAmerican(asObj(asObj(tot.over).close).odds),
    underOdds: parseAmerican(asObj(asObj(tot.under).close).odds),
  };
  if (
    result.spread == null &&
    result.overUnder == null &&
    result.homeMl == null &&
    !result.details
  ) {
    return undefined;
  }
  return result;
}

function parseSituation(comp: Json, sport: LeagueDef["sport"]): Situation | undefined {
  const sit = asObj(comp.situation);
  if (!Object.keys(sit).length) return undefined;
  const last = asObj(sit.lastPlay);
  const base: Situation = {
    lastPlay: str(last.text) || undefined,
    downDistanceText: str(sit.downDistanceText) || undefined,
    down: typeof sit.down === "number" ? sit.down : undefined,
    distance: typeof sit.distance === "number" ? sit.distance : undefined,
  };
  if (sport === "baseball") {
    base.balls = num(sit.balls);
    base.strikes = num(sit.strikes);
    base.outs = num(sit.outs);
    base.onFirst = Boolean(sit.onFirst);
    base.onSecond = Boolean(sit.onSecond);
    base.onThird = Boolean(sit.onThird);
  }
  return base;
}

export function parseEvent(raw: unknown, league: LeagueDef): Game | null {
  const e = asObj(raw);
  const comps = asArr(e.competitions);
  const comp = asObj(comps[0] ?? e);
  const status = asObj(asObj(comp.status).type);
  const competitors = asArr(comp.competitors).map(competitor);
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;
  const stateRaw = str(status.state, "pre");
  const state = stateRaw === "in" || stateRaw === "post" ? stateRaw : "pre";
  const broadcasts = asArr(comp.broadcasts);
  const national = broadcasts.find((b) => asObj(b).market === "national") ?? broadcasts[0];
  const sit = parseSituation(comp, league.sport);
  return {
    id: str(e.id || comp.id),
    leagueId: league.id,
    leagueShort: league.short,
    sport: league.sport,
    name: str(e.name || e.shortName, `${away.abbr} at ${home.abbr}`),
    shortName: str(e.shortName, `${away.abbr} @ ${home.abbr}`),
    date: str(e.date || comp.date),
    state,
    detail: str(status.detail || status.description),
    shortDetail: str(status.shortDetail || status.detail || status.description),
    period: num(asObj(comp.status).period, 0) || undefined,
    clock: str(asObj(comp.status).displayClock) || undefined,
    completed: Boolean(status.completed) || state === "post",
    venue: str(asObj(asObj(comp.venue).fullName || asObj(comp.venue).displayName)) || undefined,
    broadcast: national ? str(asArr(asObj(national).names)[0]) : undefined,
    home,
    away,
    odds: parseOdds(comp.odds),
    situation: sit,
    lastPlay: sit?.lastPlay,
  };
}

export function parseScoreboard(raw: unknown, league: LeagueDef): Game[] {
  const data = asObj(raw);
  return asArr(data.events)
    .map((ev) => parseEvent(ev, league))
    .filter((g): g is Game => Boolean(g));
}

function parsePlayers(boxscore: unknown): PlayerLine[] {
  const out: PlayerLine[] = [];
  for (const team of asArr(asObj(boxscore).players)) {
    const t = asObj(team);
    const abbr = str(asObj(t.team).abbreviation);
    for (const group of asArr(t.statistics)) {
      const g = asObj(group);
      const groupName = str(g.name || g.type || g.displayName).toLowerCase();
      const labels = asArr(g.labels ?? g.names).map((x) => String(x));
      for (const row of asArr(g.athletes)) {
        const a = asObj(row);
        const athlete = asObj(a.athlete);
        const statsArr = asArr(a.stats).map((x) => String(x));
        const stats: Record<string, string> = {};
        labels.forEach((lab, i) => {
          if (lab) stats[lab] = statsArr[i] ?? "";
        });
        out.push({
          id: str(athlete.id || a.id),
          name: str(athlete.displayName || athlete.fullName, "Player"),
          shortName: str(athlete.shortName || athlete.displayName, "Player"),
          teamAbbr: abbr || undefined,
          group: groupName,
          stats,
        });
      }
    }
  }
  return out;
}

export function parseSummary(raw: unknown, league: LeagueDef, fallback?: Game): GameDetail | null {
  const data = asObj(raw);
  const header = asObj(data.header);
  const ev = {
    ...header,
    id: str(header.id) || fallback?.id,
    competitions: asArr(header.competitions).length
      ? header.competitions
      : fallback
        ? [
            {
              status: { type: { state: fallback.state, shortDetail: fallback.shortDetail, detail: fallback.detail, completed: fallback.completed } },
              competitors: [],
            },
          ]
        : [],
  };
  const parsed = parseEvent({ ...ev, name: fallback?.name, shortName: fallback?.shortName, date: fallback?.date }, league);
  const game = parsed ?? fallback;
  if (!game) return null;

  const headerComp = asObj(asArr(header.competitions)[0]);
  const headerCompetitors = asArr(headerComp.competitors).map(competitor);
  if (headerCompetitors.length >= 2) {
    const home = headerCompetitors.find((c) => c.homeAway === "home") ?? game.home;
    const away = headerCompetitors.find((c) => c.homeAway === "away") ?? game.away;
    game.home = { ...game.home, ...home, logo: home.logo || game.home.logo };
    game.away = { ...game.away, ...away, logo: away.logo || game.away.logo };
  }

  const sitRaw = asObj(data.situation);
  if (Object.keys(sitRaw).length) {
    game.situation = {
      ...game.situation,
      balls: num(sitRaw.balls),
      strikes: num(sitRaw.strikes),
      outs: num(sitRaw.outs),
      onFirst: Boolean(sitRaw.onFirst),
      onSecond: Boolean(sitRaw.onSecond),
      onThird: Boolean(sitRaw.onThird),
      lastPlay: str(asObj(sitRaw.lastPlay).text) || game.situation?.lastPlay,
    };
  }

  const plays = asArr(data.plays)
    .map((p) => {
      const o = asObj(p);
      const period = asObj(o.period);
      return {
        id: str(o.id),
        text: str(o.text),
        period: str(period.displayValue || period.number),
        clock: str(o.clock ? asObj(o.clock).displayValue : ""),
      };
    })
    .filter((p) => p.text);

  return {
    ...game,
    plays,
    players: parsePlayers(data.boxscore),
    lastPlay: plays.length ? plays[plays.length - 1]?.text : game.lastPlay,
    notes: str(asObj(asArr(data.notes)[0]).headline) || undefined,
  };
}

export function parseStatNumber(raw: string | undefined, stat: string): number | null {
  if (raw == null || raw === "" || raw === "-" || raw === "--") return null;
  if (stat === "C/ATT" || stat === "FG" || stat === "3PT" || stat === "FT") {
    const left = raw.split(/[-/]/)[0];
    const n = Number(left);
    return Number.isFinite(n) ? n : null;
  }
  if (stat === "IP") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function derivedStat(player: PlayerLine, catalogKey: string): number | null {
  if (catalogKey === "pra" || catalogKey === "pts+reb+ast") {
    const pts = parseStatNumber(player.stats.PTS, "PTS") ?? 0;
    const reb = parseStatNumber(player.stats.REB, "REB") ?? 0;
    const ast = parseStatNumber(player.stats.AST, "AST") ?? 0;
    if (player.stats.PTS == null && player.stats.REB == null) return null;
    return pts + reb + ast;
  }
  if (catalogKey === "tb") {
    const h = parseStatNumber(player.stats.H, "H");
    const hr = parseStatNumber(player.stats.HR, "HR") ?? 0;
    if (h == null) return null;
    return h + hr;
  }
  return null;
}
