import type { LeagueDef } from "./leagues";
import type {
  Competitor,
  EventFormat,
  FieldEntry,
  Game,
  GameDetail,
  GameOdds,
  GameState,
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

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || name).slice(0, 12);
}

function flattenLines(raw: unknown): number[] {
  const lines = asArr(raw);
  if (!lines.length) return [];
  const first = asObj(lines[0]);
  const nested = asArr(first.linescores);
  if (nested.length) return nested.map((ls) => num(asObj(ls).displayValue ?? asObj(ls).value));
  return lines.map((ls) => num(asObj(ls).displayValue ?? asObj(ls).value ?? asObj(ls).tiebreak));
}

function competitor(raw: unknown, sport?: LeagueDef["sport"]): Competitor {
  const c = asObj(raw);
  const team = asObj(c.team);
  const ath = asObj(c.athlete);
  const src = Object.keys(team).length ? team : ath;
  const name = str(src.displayName || src.fullName || src.name || src.shortDisplayName, "Competitor");
  const short = str(src.shortName || src.shortDisplayName || src.abbreviation || name, name);
  const id = str(c.id || src.id);
  const photo = str(src.logo) || str(asObj(src.headshot).href) || str(asObj(src.flag).href);
  const records = asArr(c.records);
  const overall = records.find((r) => asObj(r).type === "total") ?? records[0];
  const lines = flattenLines(c.linescores);
  const tennisSets = sport === "tennis" ? asArr(c.linescores).filter((ls) => asObj(ls).winner).length : 0;
  const scoreRaw = c.score;
  const score =
    sport === "tennis" ? tennisSets : sport === "racing" ? num(c.order, 0) : num(scoreRaw);
  const mark =
    sport === "golf" && scoreRaw != null
      ? String(scoreRaw)
      : sport === "racing" && c.order != null
        ? `P${c.order}`
        : undefined;
  return {
    id,
    abbr: str(src.abbreviation) || lastName(name).toUpperCase(),
    name,
    shortName: short,
    logo: photo || undefined,
    homeAway: c.homeAway === "home" ? "home" : "away",
    record: overall ? str(asObj(overall).summary) : undefined,
    winner: Boolean(c.winner),
    linescores: lines,
    mark,
    score,
  };
}

function pairCompetitors(rawList: unknown[], sport?: LeagueDef["sport"]): { home: Competitor; away: Competitor } | null {
  const list = rawList.map((r) => competitor(r, sport));
  if (list.length < 2) return null;
  let home = list.find((c) => c.homeAway === "home");
  let away = list.find((c) => c.homeAway === "away");
  if (!home || !away || home === away) {
    const sorted = [...rawList]
      .map((r, i) => ({ r, order: num(asObj(r).order, i + 1) }))
      .sort((a, b) => a.order - b.order);
    away = competitor(sorted[0]!.r, sport);
    home = competitor(sorted[1]!.r, sport);
    away.homeAway = "away";
    home.homeAway = "home";
  }
  return { home, away };
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
      typeof o.overUnder === "number" ? o.overUnder : Number.isFinite(ouFromLine) ? ouFromLine : undefined,
    homeMl,
    awayMl,
    homeSpread: Number.isFinite(homeSpread) ? homeSpread : undefined,
    awaySpread: Number.isFinite(awaySpread) ? awaySpread : undefined,
    homeSpreadOdds: parseAmerican(asObj(asObj(ps.home).close).odds),
    awaySpreadOdds: parseAmerican(asObj(asObj(ps.away).close).odds),
    overOdds: parseAmerican(asObj(asObj(tot.over).close).odds),
    underOdds: parseAmerican(asObj(asObj(tot.under).close).odds),
  };
  if (result.spread == null && result.overUnder == null && result.homeMl == null && !result.details) {
    return undefined;
  }
  return result;
}

function parseSituation(comp: Json, sport: LeagueDef["sport"]): Situation | undefined {
  const sit = asObj(comp.situation);
  if (!Object.keys(sit).length) return undefined;
  const last = asObj(sit.lastPlay);
  const batter = asObj(sit.batter);
  const pitcher = asObj(sit.pitcher);
  const batterAth = asObj(batter.athlete ?? batter);
  const pitcherAth = asObj(pitcher.athlete ?? pitcher);
  const base: Situation = {
    lastPlay: str(last.text) || undefined,
    downDistanceText: str(sit.downDistanceText) || undefined,
    down: typeof sit.down === "number" ? sit.down : undefined,
    distance: typeof sit.distance === "number" ? sit.distance : undefined,
    possessionAbbr: str(asObj(sit.possession).abbreviation) || undefined,
    batter: str(batterAth.shortName || batterAth.displayName) || undefined,
    pitcher: str(pitcherAth.shortName || pitcherAth.displayName) || undefined,
  };
  if (sport === "baseball" || sport === "softball") {
    base.balls = num(sit.balls);
    base.strikes = num(sit.strikes);
    base.outs = num(sit.outs);
    base.onFirst = Boolean(sit.onFirst);
    base.onSecond = Boolean(sit.onSecond);
    base.onThird = Boolean(sit.onThird);
  }
  return base;
}

function readStatus(comp: Json) {
  const status = asObj(asObj(comp.status).type);
  const stateRaw = str(status.state, "pre");
  const state: GameState = stateRaw === "in" || stateRaw === "post" ? stateRaw : "pre";
  return {
    state,
    detail: str(status.detail || status.description),
    shortDetail: str(status.shortDetail || status.detail || status.description),
    completed: Boolean(status.completed) || state === "post",
    period: num(asObj(comp.status).period, 0) || undefined,
    clock: str(asObj(comp.status).displayClock) || undefined,
  };
}

export function parseEvent(raw: unknown, league: LeagueDef, format: EventFormat = "match"): Game | null {
  const e = asObj(raw);
  const comps = asArr(e.competitions);
  const comp = asObj(comps[0] ?? e);
  const pair = pairCompetitors(asArr(comp.competitors), league.sport);
  if (!pair) return null;
  const { home, away } = pair;
  const st = readStatus(comp);
  const broadcasts = asArr(comp.broadcasts);
  const national = broadcasts.find((b) => asObj(b).market === "national") ?? broadcasts[0];
  const sit = parseSituation(comp, league.sport);
  return {
    id: str(e.id || comp.id),
    leagueId: league.id,
    leagueShort: league.short,
    sport: league.sport,
    format,
    name: str(e.name || e.shortName, `${away.abbr} at ${home.abbr}`),
    shortName: str(e.shortName, `${away.abbr} @ ${home.abbr}`),
    date: str(e.date || comp.date),
    ...st,
    venue: str(asObj(asObj(comp.venue).fullName || asObj(comp.venue).displayName)) || undefined,
    broadcast: national ? str(asArr(asObj(national).names)[0]) : undefined,
    home,
    away,
    odds: parseOdds(comp.odds),
    situation: sit,
    lastPlay: sit?.lastPlay,
  };
}

function parseFightMethod(details: unknown): Game["fightMethod"] | undefined {
  for (const raw of asArr(details)) {
    const text = str(asObj(asObj(raw).type).text).toLowerCase();
    if (!text.includes("winner") && !text.includes("result")) continue;
    if (text.includes("kotko") || text.includes("ko/tko") || /\bko\b/.test(text) || text.includes("tko")) return "ko";
    if (text.includes("submission")) return "submission";
    if (text.includes("decision")) return "decision";
  }
  return undefined;
}

function parseFight(event: Json, compRaw: unknown, league: LeagueDef): Game | null {
  const comp = asObj(compRaw);
  const pair = pairCompetitors(asArr(comp.competitors), "mma");
  if (!pair) return null;
  const st = readStatus(comp);
  const weight = str(asObj(comp.type).abbreviation || asObj(comp.type).text);
  const card = str(event.shortName || event.name, league.short);
  const status = asObj(comp.status);
  const clockSeconds = num(status.clock, -1);
  const scheduledRounds = num(asObj(asObj(comp.format).regulation).periods) || undefined;
  const fightMethod = parseFightMethod(comp.details);
  const methodLabel = fightMethod === "ko" ? "KO/TKO" : fightMethod === "submission" ? "submission" : fightMethod === "decision" ? "decision" : "";
  const winnerName = pair.home.winner ? pair.home.shortName : pair.away.winner ? pair.away.shortName : "";
  return {
    id: str(comp.id || event.id),
    leagueId: league.id,
    leagueShort: league.short,
    sport: league.sport,
    format: "fight",
    name: `${pair.away.name} vs ${pair.home.name}`,
    shortName: `${pair.away.shortName} vs ${pair.home.shortName}`,
    date: str(comp.date || event.date),
    ...st,
    venue: str(asObj(asObj(event.venues ? asArr(event.venues)[0] : event.venue).fullName)) || undefined,
    home: pair.home,
    away: pair.away,
    odds: parseOdds(comp.odds),
    lastPlay:
      st.completed && winnerName
        ? `${winnerName} wins${methodLabel ? ` by ${methodLabel}` : ""}`
        : st.completed && pair.home.winner
          ? `${pair.home.shortName} wins`
          : st.completed && pair.away.winner
            ? `${pair.away.shortName} wins`
            : card,
    headline: card,
    weightClass: weight || undefined,
    scheduledRounds,
    clockSeconds: clockSeconds >= 0 ? clockSeconds : undefined,
    fightMethod,
  };
}

function parseTennisMatch(event: Json, groupingName: string, compRaw: unknown, league: LeagueDef): Game | null {
  const comp = asObj(compRaw);
  const pair = pairCompetitors(asArr(comp.competitors), "tennis");
  if (!pair) return null;
  const st = readStatus(comp);
  const rnd = str(asObj(comp.round).displayName || asObj(comp.round).name);
  return {
    id: str(comp.id),
    leagueId: league.id,
    leagueShort: league.short,
    sport: "tennis",
    format: "match",
    name: `${pair.away.name} vs ${pair.home.name}`,
    shortName: `${pair.away.shortName} vs ${pair.home.shortName}`,
    date: str(comp.date || comp.startDate || event.date),
    ...st,
    venue: str(asObj(event.venue).fullName || asObj(comp.venue).fullName) || undefined,
    home: pair.home,
    away: pair.away,
    lastPlay: [str(event.shortName || event.name), groupingName, rnd].filter(Boolean).join(" · "),
    headline: str(event.shortName || event.name),
    weightClass: groupingName || undefined,
  };
}

function toFieldEntry(raw: unknown, sport: LeagueDef["sport"], index: number): FieldEntry {
  const c = competitor(raw, sport);
  const order = num(asObj(raw).order, index + 1);
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    abbr: c.abbr,
    logo: c.logo,
    position: order || index + 1,
    score: c.score,
    mark: c.mark,
    winner: c.winner,
  };
}

function pickFieldCompetition(event: Json): Json {
  const comps = asArr(event.competitions);
  if (!comps.length) return event;
  const scored = comps.map((c) => {
    const o = asObj(c);
    const n = asArr(o.competitors).length;
    const st = str(asObj(asObj(o.status).type).state, "pre");
    const type = str(asObj(o.type).abbreviation || asObj(o.type).text || o.description).toLowerCase();
    return { o, n, st, type };
  });
  return (
    scored.find((s) => s.st === "in" && s.n > 0)?.o ??
    scored.find((s) => s.type.includes("race") && s.n > 0)?.o ??
    scored.find((s) => s.n > 0)?.o ??
    scored.find((s) => s.type.includes("race"))?.o ??
    scored[0]!.o
  );
}

function parseFieldEvent(event: Json, league: LeagueDef): Game | null {
  const comp = pickFieldCompetition(event);
  const st = readStatus(Object.keys(asObj(comp.status)).length ? comp : event);
  const rows = asArr(comp.competitors)
    .map((r, i) => toFieldEntry(r, league.sport, i))
    .sort((a, b) => a.position - b.position);
  const leader = rows[0];
  const chase = rows[1];
  const empty = (name: string): Competitor => ({
    id: "field",
    abbr: league.short,
    name,
    shortName: name,
    score: 0,
    homeAway: "home",
    linescores: [],
  });
  const asComp = (row: FieldEntry | undefined, side: "home" | "away"): Competitor =>
    row
      ? {
          id: row.id,
          abbr: row.abbr,
          name: row.name,
          shortName: row.shortName,
          logo: row.logo,
          score: row.score,
          homeAway: side,
          winner: row.winner,
          linescores: [],
          mark: row.mark,
        }
      : empty(side === "home" ? "Leader" : "Field");
  return {
    id: str(event.id || comp.id),
    leagueId: league.id,
    leagueShort: league.short,
    sport: league.sport,
    format: "field",
    name: str(event.name || event.shortName, league.label),
    shortName: str(event.shortName || event.name, league.short),
    date: str(event.date || comp.date || comp.startDate),
    ...st,
    venue: str(asObj(event.venue).fullName) || undefined,
    home: asComp(leader, "home"),
    away: asComp(chase, "away"),
    field: rows.slice(0, 24),
    lastPlay: leader ? `${leader.shortName} ${leader.mark ?? leader.score} · P${leader.position}` : undefined,
    headline: str(event.shortName || event.name),
  };
}

function pickTennisMatches(matches: unknown[]) {
  const live: unknown[] = [];
  const pre: unknown[] = [];
  const post: unknown[] = [];
  for (const m of matches) {
    const state = str(asObj(asObj(asObj(m).status).type).state, "pre");
    if (state === "in") live.push(m);
    else if (state === "post") post.push(m);
    else pre.push(m);
  }
  return [...live, ...pre.slice(0, 16), ...post.slice(-10)];
}

function parseTennisBoard(data: Json, league: LeagueDef): Game[] {
  const out: Game[] = [];
  const women = league.id === "wta";
  for (const ev of asArr(data.events)) {
    const event = asObj(ev);
    for (const g of asArr(event.groupings)) {
      const grouping = asObj(g);
      const groupingName = str(asObj(grouping.grouping).displayName);
      const name = groupingName.toLowerCase();
      const isWomen = name.includes("women");
      const isMen = name.includes("men") && !isWomen;
      if (name && ((women && !isWomen) || (!women && !isMen))) continue;
      const comps = asArr(grouping.competitions);
      const singles = !name || name.includes("singles");
      const picked = singles
        ? pickTennisMatches(comps)
        : comps.filter((m) => str(asObj(asObj(asObj(m).status).type).state) === "in");
      for (const m of picked) {
        const game = parseTennisMatch(event, groupingName, m, league);
        if (game) out.push(game);
      }
    }
  }
  return out;
}

function parseFightCard(data: Json, league: LeagueDef): Game[] {
  const out: Game[] = [];
  for (const ev of asArr(data.events)) {
    const event = asObj(ev);
    const fights = asArr(event.competitions);
    if (!fights.length) {
      const one = parseEvent(event, league, "fight");
      if (one) out.push({ ...one, format: "fight" });
      continue;
    }
    for (const fight of fights) {
      const game = parseFight(event, fight, league);
      if (game) out.push(game);
    }
  }
  return out;
}

export function parseScoreboard(raw: unknown, league: LeagueDef): Game[] {
  const data = asObj(raw);
  if (league.sport === "mma") return parseFightCard(data, league);
  if (league.sport === "tennis") return parseTennisBoard(data, league);
  if (league.sport === "golf" || league.sport === "racing") {
    return asArr(data.events)
      .map((ev) => parseFieldEvent(asObj(ev), league))
      .filter((g): g is Game => Boolean(g));
  }
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
              status: {
                type: {
                  state: fallback.state,
                  shortDetail: fallback.shortDetail,
                  detail: fallback.detail,
                  completed: fallback.completed,
                },
              },
              competitors: [],
            },
          ]
        : [],
  };
  const parsed =
    league.sport === "mma"
      ? parseFight(
          { ...ev, name: fallback?.name, shortName: fallback?.shortName, date: fallback?.date },
          asArr(ev.competitions)[0] ?? ev,
          league,
        )
      : parseEvent(
          { ...ev, name: fallback?.name, shortName: fallback?.shortName, date: fallback?.date },
          league,
          fallback?.format ?? "match",
        );
  const game = parsed ?? fallback;
  if (!game) return null;

  const headerComp = asObj(asArr(header.competitions)[0]);
  const headerPair = pairCompetitors(asArr(headerComp.competitors), league.sport);
  if (headerPair) {
    game.home = { ...game.home, ...headerPair.home, logo: headerPair.home.logo || game.home.logo };
    game.away = { ...game.away, ...headerPair.away, logo: headerPair.away.logo || game.away.logo };
  }

  const sitRaw = asObj(data.situation);
  if (Object.keys(sitRaw).length) {
    const batter = asObj(sitRaw.batter);
    const pitcher = asObj(sitRaw.pitcher);
    const batterAth = asObj(batter.athlete ?? batter);
    const pitcherAth = asObj(pitcher.athlete ?? pitcher);
    game.situation = {
      ...game.situation,
      balls: num(sitRaw.balls),
      strikes: num(sitRaw.strikes),
      outs: num(sitRaw.outs),
      onFirst: Boolean(sitRaw.onFirst),
      onSecond: Boolean(sitRaw.onSecond),
      onThird: Boolean(sitRaw.onThird),
      lastPlay: str(asObj(sitRaw.lastPlay).text) || game.situation?.lastPlay,
      batter: str(batterAth.shortName || batterAth.displayName) || game.situation?.batter,
      pitcher: str(pitcherAth.shortName || pitcherAth.displayName) || game.situation?.pitcher,
      downDistanceText: str(sitRaw.downDistanceText) || game.situation?.downDistanceText,
      possessionAbbr: str(asObj(sitRaw.possession).abbreviation) || game.situation?.possessionAbbr,
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
  if (catalogKey === "tb" || catalogKey === "bat.TB") {
    if (player.stats.TB != null) return parseStatNumber(player.stats.TB, "TB");
    const h = parseStatNumber(player.stats.H, "H");
    if (h == null) return null;
    const doubles = parseStatNumber(player.stats["2B"], "2B") ?? 0;
    const triples = parseStatNumber(player.stats["3B"], "3B") ?? 0;
    const hr = parseStatNumber(player.stats.HR, "HR") ?? 0;
    return h + doubles + 2 * triples + 2 * hr;
  }
  return null;
}
