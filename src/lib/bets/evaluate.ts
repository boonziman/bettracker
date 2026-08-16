import { derivedStat, parseStatNumber } from "@/lib/espn/parse";
import type { Game, GameDetail, PlayerLine } from "@/lib/espn/types";
import { fuzzyIncludes } from "@/lib/utils";
import type { BetLeg, EvalStatus, LegEval, Ticket, TicketStatus } from "./types";

function teamOf(game: Game, abbr?: string) {
  if (!abbr) return null;
  const a = abbr.toUpperCase();
  const match = (name: string, short: string, ab: string) => {
    const n = name.toUpperCase();
    const s = short.toUpperCase();
    const b = ab.toUpperCase();
    return b === a || s === a || n === a || n.includes(a) || s.includes(a) || a.includes(b);
  };
  if (game.field?.length) {
    const hit = game.field.find((p) => match(p.name, p.shortName, p.abbr));
    if (hit) {
      const me: Game["home"] = {
        id: hit.id,
        abbr: hit.abbr,
        name: hit.name,
        shortName: hit.shortName,
        logo: hit.logo,
        score: hit.position,
        homeAway: "home",
        winner: hit.winner || hit.position === 1,
        linescores: [],
        mark: hit.mark,
      };
      const opp = game.home.id === hit.id ? game.away : game.home;
      return { me, opp };
    }
  }
  if (match(game.home.name, game.home.shortName, game.home.abbr)) {
    return { me: game.home, opp: game.away };
  }
  if (match(game.away.name, game.away.shortName, game.away.abbr)) {
    return { me: game.away, opp: game.home };
  }
  return null;
}

function sumLines(lines: number[], n: number) {
  return lines.slice(0, n).reduce((a, b) => a + (Number(b) || 0), 0);
}

function periodCount(period: string | undefined, sport?: string): number {
  if (!period) return 1;
  const p = period.toUpperCase().replace(/\s+/g, "");
  if (p === "F5" || p === "5INN" || p === "1ST5" || p.includes("5INN")) return 5;
  if (p === "1H" || p === "1STHALF" || p === "1STH") {
    if (sport === "soccer" || sport === "hockey") return 1;
    return 2;
  }
  if (p === "2H" || p === "2NDHALF") {
    if (sport === "soccer" || sport === "hockey") return 2;
    return 4;
  }
  if (p === "1Q" || p === "1STQ" || p === "1P" || p === "1STP") return 1;
  if (p === "2Q" || p === "2P") return 2;
  if (p === "3Q" || p === "3P") return 3;
  const n = Number(p.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function periodDone(game: Game, n: number) {
  if (game.completed) return true;
  const period = game.period ?? 0;
  return period > n;
}

const STAT_ALIASES: Record<string, string[]> = {
  K: ["K", "SO", "KS", "STRIKEOUTS"],
  H: ["H", "HITS"],
  R: ["R", "RUNS"],
  RBI: ["RBI", "RBIS"],
  HR: ["HR", "HRS"],
  BB: ["BB", "WALKS"],
  ER: ["ER"],
  IP: ["IP"],
  TB: ["TB"],
  PTS: ["PTS", "POINTS"],
  REB: ["REB", "REBOUNDS"],
  AST: ["AST", "ASSISTS"],
  "3PT": ["3PT", "3PM", "3P", "FG3"],
  STL: ["STL", "STEALS"],
  BLK: ["BLK", "BLOCKS"],
  TO: ["TO", "TOV"],
  YDS: ["YDS", "YD", "YARDS"],
  TD: ["TD", "TDS"],
  REC: ["REC", "RECEPTIONS"],
  INT: ["INT"],
  "C/ATT": ["C/ATT", "C-A", "COMP"],
  G: ["G", "GLS", "GOALS"],
  A: ["A", "ASSISTS"],
  SOG: ["SOG", "S"],
  SV: ["SV", "SAVES"],
  SOT: ["SOT", "SHOTS ON TARGET"],
  S: ["S", "SH", "SHOTS"],
};

function findPlayer(players: PlayerLine[] | undefined, name?: string, id?: string, groupHint?: string) {
  if (!players?.length) return null;
  const hint = (groupHint || "").toLowerCase();
  const rank = (p: PlayerLine) => {
    if (hint && p.group.includes(hint)) return 0;
    return 1;
  };
  const sorted = [...players].sort((a, b) => rank(a) - rank(b));
  if (id) {
    const byId = sorted.find((p) => p.id === id);
    if (byId) return byId;
  }
  if (!name) return null;
  const exact = sorted.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  const last = name.trim().split(/\s+/).pop()?.toLowerCase();
  if (last && last.length > 2) {
    const byLast = sorted.find((p) => p.name.toLowerCase().endsWith(last) || p.shortName.toLowerCase().includes(last));
    if (byLast) return byLast;
  }
  const fuzzy = sorted.find((p) => fuzzyIncludes(p.name, name) || fuzzyIncludes(p.shortName, name));
  return fuzzy ?? null;
}

function readStat(player: PlayerLine, key: string): number | null {
  const aliases = STAT_ALIASES[key] ?? [key];
  for (const alias of aliases) {
    const hit = Object.entries(player.stats).find(([k]) => k.toUpperCase() === alias.toUpperCase());
    if (hit) {
      const n = parseStatNumber(hit[1], alias);
      if (n != null) return n;
    }
  }
  return parseStatNumber(player.stats[key], key);
}

function readProp(player: PlayerLine, statKey?: string, statLabel?: string): number | null {
  if (!statKey && !statLabel) return null;
  const derived = statKey ? derivedStat(player, statKey) : null;
  if (derived != null) return derived;
  const key = (statLabel || statKey || "").split(".").pop() || "";
  return readStat(player, key);
}

function groupHintFromKey(statKey?: string) {
  if (!statKey?.includes(".")) return "";
  const g = statKey.split(".")[0] ?? "";
  const map: Record<string, string> = {
    pitch: "pitch",
    bat: "batt",
    pass: "pass",
    rush: "rush",
    rec: "receiv",
  };
  return map[g] ?? g;
}

function ouStatus(current: number, line: number, side: "over" | "under", final: boolean): EvalStatus {
  if (side === "over") {
    if (current > line) return final ? "won" : "leaning";
    if (final) return current === line ? "push" : "lost";
    const ratio = line <= 0 ? 0 : current / line;
    if (ratio >= 0.85) return "leaning";
    return "pending";
  }
  if (current > line) return "lost";
  if (final) return current === line ? "push" : "won";
  if (current >= line - 0.5 && line >= 1) return "threat";
  if (current / Math.max(line, 0.5) >= 0.75) return "threat";
  return "leaning";
}

function scoreReadout(my: number, opp: number) {
  return `${my}–${opp}`;
}

const FIGHT_ROUND_SEC = 300;

export function elapsedRounds(game: Game): number {
  const period = game.period ?? 0;
  if (period <= 0 && !game.completed) return 0;
  const sec = fightClockSeconds(game);
  const p = Math.max(period, game.completed ? 1 : 0);
  if (p <= 0) return 0;
  return p - 1 + Math.min(Math.max(sec, 0), FIGHT_ROUND_SEC) / FIGHT_ROUND_SEC;
}

function fightClockSeconds(game: Game): number {
  if (game.clockSeconds != null && Number.isFinite(game.clockSeconds)) return Math.max(0, game.clockSeconds);
  const clock = game.clock || "";
  const m = clock.match(/^(\d+):(\d+)/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return 0;
}

export function formatRounds(n: number) {
  return n.toFixed(1);
}

export function evaluateLeg(leg: BetLeg, game?: Game, detail?: GameDetail | null): LegEval {
  if (leg.checked) {
    return { status: "won", note: "Marked hit", readout: "Hit" };
  }
  if (!game) {
    return { status: "pending", note: "Waiting on the game" };
  }

  const pair = teamOf(game, leg.teamAbbr);
  const final = game.completed;
  const my = pair?.me.score ?? 0;
  const opp = pair?.opp.score ?? 0;
  const lead = my - opp;

  if (leg.kind === "moneyline") {
    if (!pair) return { status: "pending", note: game.shortDetail };
    if (game.format === "field") {
      const pos = pair.me.score || 0;
      const readout = pos ? `P${pos}` : "—";
      if (final) {
        return pair.me.winner || pos === 1
          ? { status: "won", note: `Wins it · ${pair.me.mark ?? ""}`.trim(), readout }
          : { status: "lost", note: readout, readout };
      }
      if (pos === 1) return { status: "leaning", note: pair.me.mark ?? "Leading", readout };
      if (pos > 0 && pos <= 5) return { status: "pending", note: pair.me.mark ?? `P${pos}`, readout };
      return { status: "threat", note: pair.me.mark ?? readout, readout };
    }
    if (game.format === "fight") {
      const readout = pair.me.winner ? "W" : pair.opp.winner ? "L" : "—";
      if (final) {
        if (pair.me.winner) return { status: "won", note: `${pair.me.shortName} wins`, readout: "W" };
        if (pair.opp.winner) return { status: "lost", note: `${pair.opp.shortName} wins`, readout: "L" };
        return { status: "push", note: "No contest", readout };
      }
      return { status: "pending", note: game.shortDetail, readout };
    }
    const readout = `${lead >= 0 ? "+" : ""}${lead}`;
    if (final) {
      if (my === opp) return { status: "push", note: "Final tie", readout };
      return my > opp
        ? { status: "won", note: `Final ${my}–${opp}`, readout }
        : { status: "lost", note: `Final ${my}–${opp}`, readout };
    }
    if (my > opp) return { status: "leaning", note: `Up ${my}–${opp}`, readout };
    if (my < opp) return { status: "threat", note: `Down ${my}–${opp}`, readout };
    return { status: "pending", note: `Tied ${my}–${opp}`, readout };
  }

  if (leg.kind === "spread" && pair && leg.line != null) {
    const margin = my + leg.line - opp;
    const readout = `${margin >= 0 ? "+" : ""}${margin.toFixed(1).replace(/\.0$/, "")}`;
    if (final) {
      if (margin > 0) return { status: "won", note: `${my}–${opp} · covered`, readout };
      if (margin === 0) return { status: "push", note: `${my}–${opp} · push`, readout };
      return { status: "lost", note: `${my}–${opp} · missed`, readout };
    }
    if (margin > 0) return { status: "leaning", note: `Covering by ${Math.abs(margin).toFixed(1)}`, readout };
    if (margin === 0) return { status: "pending", note: "On the number", readout };
    return { status: "threat", note: `${Math.abs(margin).toFixed(1)} off`, readout };
  }

  if (leg.kind === "total" && leg.line != null && leg.side) {
    if (game.format === "fight") {
      const current = elapsedRounds(game);
      const started = game.completed || game.state === "in" || (game.period ?? 0) > 0;
      const readout = `${formatRounds(current)} / ${leg.line}`;
      if (!started && game.state === "pre") {
        return { status: "pending", note: "Waiting on the bell", readout: `0.0 / ${leg.line}`, current: 0, line: leg.line };
      }
      const lockedOver = current > leg.line;
      if (leg.side === "over") {
        if (lockedOver) return { status: "won", note: `${readout} rds`, current, line: leg.line, progress: current / leg.line, readout };
        if (final) {
          return current === leg.line
            ? { status: "push", note: readout, current, line: leg.line, progress: 1, readout }
            : { status: "lost", note: readout, current, line: leg.line, progress: current / Math.max(leg.line, 0.1), readout };
        }
        return { status: "pending", note: readout, current, line: leg.line, progress: current / Math.max(leg.line, 0.1), readout };
      }
      if (lockedOver) return { status: "lost", note: `${readout} rds`, current, line: leg.line, progress: current / leg.line, readout };
      if (final) {
        return current === leg.line
          ? { status: "push", note: readout, current, line: leg.line, progress: 1, readout }
          : { status: "won", note: readout, current, line: leg.line, progress: current / Math.max(leg.line, 0.1), readout };
      }
      return { status: current >= leg.line - 0.5 ? "threat" : "leaning", note: readout, current, line: leg.line, progress: current / Math.max(leg.line, 0.1), readout };
    }
    const total = game.home.score + game.away.score;
    const status = ouStatus(total, leg.line, leg.side, final);
    const needed = leg.side === "over" ? Math.max(0, Math.floor(leg.line - total) + 1) : undefined;
    return {
      status,
      note: `${total} / ${leg.line}`,
      current: total,
      line: leg.line,
      progress: leg.line ? Math.min(1.2, total / leg.line) : 0,
      readout: `${total} / ${leg.line}`,
      needed,
    };
  }

  if (leg.kind === "team_total" && pair && leg.line != null && leg.side) {
    const status = ouStatus(my, leg.line, leg.side, final);
    const needed = leg.side === "over" ? Math.max(0, Math.floor(leg.line - my) + 1) : undefined;
    return {
      status,
      note: `${pair.me.abbr} ${my} / ${leg.line}`,
      current: my,
      line: leg.line,
      progress: leg.line ? Math.min(1.2, my / leg.line) : 0,
      readout: `${my} / ${leg.line}`,
      needed,
    };
  }

  if (leg.kind === "first_inning_draw") {
    const a = game.away.linescores[0];
    const h = game.home.linescores[0];
    const inningStarted = a != null || h != null || (game.period ?? 0) >= 1;
    const inningDone = Boolean(final || (game.period ?? 0) > 1);
    if (!inningStarted || (a == null && h == null && (game.period ?? 0) < 1)) {
      return { status: "pending", note: "Waiting on the first", readout: "—" };
    }
    const av = a ?? 0;
    const hv = h ?? 0;
    const readout = scoreReadout(av, hv);
    if (av === 0 && hv === 0 && inningDone) return { status: "won", note: "0–0 first", readout };
    if (av > 0 || hv > 0) return { status: "lost", note: `${readout} first`, readout };
    return { status: "pending", note: "Still the first", readout };
  }

  if (leg.kind === "method") {
    const pick = leg.method || (leg.period as BetLeg["method"]);
    const label = pick === "ko" ? "KO/TKO" : pick === "submission" ? "Submission" : pick === "decision" ? "Decision" : "Method";
    if (!final) {
      const rds = formatRounds(elapsedRounds(game));
      return { status: "pending", note: game.shortDetail || "In progress", readout: rds };
    }
    if (!game.fightMethod) return { status: "pending", note: "Waiting on the call", readout: "—" };
    const hit = game.fightMethod === pick;
    return {
      status: hit ? "won" : "lost",
      note: hit ? `By ${label}` : `By ${game.fightMethod === "ko" ? "KO/TKO" : game.fightMethod}`,
      readout: game.fightMethod === "ko" ? "KO" : game.fightMethod === "submission" ? "SUB" : "DEC",
    };
  }

  if (leg.kind === "period_winner" && pair && leg.period) {
    if (game.format === "fight") {
      const n = periodCount(leg.period, game.sport);
      const mine = pair.me.linescores[n - 1];
      const theirs = pair.opp.linescores[n - 1];
      const reached = (game.period ?? 0) >= n || (final && (game.period ?? 0) >= n);
      if (mine == null && theirs == null) {
        if (final && (game.period ?? 0) < n) return { status: "push", note: "Didn't reach", readout: "—" };
        if (final) return { status: "pending", note: "No cards", readout: "—" };
        return { status: "pending", note: reached ? "Waiting on cards" : `Thru R${game.period || 0}`, readout: "—" };
      }
      const readout = scoreReadout(mine ?? 0, theirs ?? 0);
      if ((mine ?? 0) > (theirs ?? 0)) return { status: final || reached ? "won" : "leaning", note: `Rd ${n} ${readout}`, readout };
      if ((mine ?? 0) < (theirs ?? 0)) return { status: final || reached ? "lost" : "threat", note: `Rd ${n} ${readout}`, readout };
      return { status: "push", note: `Rd ${n} even`, readout };
    }
    const n = periodCount(leg.period, game.sport);
    const isSecondHalf = /^(2H|2NDHALF)$/i.test(leg.period.replace(/\s+/g, ""));
    const mine = isSecondHalf
      ? sumLines(pair.me.linescores, n) - sumLines(pair.me.linescores, periodCount("1H", game.sport))
      : sumLines(pair.me.linescores, n);
    const theirs = isSecondHalf
      ? sumLines(pair.opp.linescores, n) - sumLines(pair.opp.linescores, periodCount("1H", game.sport))
      : sumLines(pair.opp.linescores, n);
    const done = periodDone(game, n);
    const readout = scoreReadout(mine, theirs);
    if (done) {
      if (mine > theirs) return { status: "won", note: `${trackingLabel(leg)} ${readout}`, readout };
      if (mine < theirs) return { status: "lost", note: `${trackingLabel(leg)} ${readout}`, readout };
      return { status: "push", note: `${trackingLabel(leg)} tied`, readout };
    }
    if (mine > theirs) return { status: "leaning", note: `Ahead ${readout}`, readout };
    if (mine < theirs) return { status: "threat", note: `Behind ${readout}`, readout };
    return { status: "pending", note: `Tied ${readout}`, readout };
  }

  if (leg.kind === "period_total" && leg.line != null && leg.side && leg.period) {
    const n = periodCount(leg.period, game.sport);
    const isSecondHalf = /^(2H|2NDHALF)$/i.test(leg.period.replace(/\s+/g, ""));
    const firstN = isSecondHalf ? periodCount("1H", game.sport) : 0;
    const total = isSecondHalf
      ? sumLines(game.home.linescores, n) +
        sumLines(game.away.linescores, n) -
        sumLines(game.home.linescores, firstN) -
        sumLines(game.away.linescores, firstN)
      : sumLines(game.home.linescores, n) + sumLines(game.away.linescores, n);
    const done = periodDone(game, n);
    const status = ouStatus(total, leg.line, leg.side, done);
    return {
      status,
      note: `${total} / ${leg.line}`,
      current: total,
      line: leg.line,
      progress: Math.min(1.2, total / leg.line),
      readout: `${total} / ${leg.line}`,
    };
  }

  if (leg.kind === "prop") {
    const players = detail?.players;
    const player = findPlayer(players, leg.playerName, leg.playerId, groupHintFromKey(leg.statKey));
    if (!player) {
      return {
        status: "pending",
        note: game.state === "pre" ? "Not started" : "Looking up the line",
        readout: "—",
      };
    }
    const current = readProp(player, leg.statKey, leg.statLabel);
    if (current == null || leg.line == null || !leg.side) {
      return { status: "pending", note: player.name, readout: player.shortName };
    }
    const status = ouStatus(current, leg.line, leg.side, final);
    const needed = leg.side === "over" ? Math.max(0, Math.floor(leg.line - current) + 1) : undefined;
    const extraKeys = (leg.statKey || "").includes("pitch")
      ? ["IP", "H", "ER", "BB", "K", "SO"]
      : ["H", "R", "RBI", "HR", "K", "SO", "PTS", "REB", "AST", "YDS", "TD", "REC"];
    const extraBits = Object.entries(player.stats)
      .filter(([k, v]) => v && v !== "-" && extraKeys.includes(k))
      .slice(0, 5)
      .map(([k, v]) => `${v} ${k}`)
      .join(" · ");
    return {
      status,
      note: `${player.shortName} ${current} / ${leg.line}`,
      current,
      line: leg.line,
      progress: leg.line ? Math.min(1.2, current / leg.line) : 0,
      readout: `${current} / ${leg.line}`,
      needed,
      extra: extraBits || undefined,
    };
  }

  if (leg.kind === "double_result" && pair) {
    const readout = `${lead >= 0 ? "+" : ""}${lead}`;
    if (final) {
      return my > opp
        ? { status: "won", note: `Won ${my}–${opp}`, readout }
        : { status: "lost", note: `Lost ${my}–${opp}`, readout };
    }
    if (my > opp) return { status: "leaning", note: `Leading ${my}–${opp}`, readout };
    if (my < opp) return { status: "threat", note: `Trailing ${my}–${opp}`, readout };
    return { status: "pending", note: "Level", readout };
  }

  return { status: "pending", note: game.shortDetail };
}

export function evaluateTicket(
  ticket: Ticket,
  games: Map<string, Game>,
  details: Map<string, GameDetail | null>,
): { status: TicketStatus; legs: LegEval[]; hits: number } {
  const legs = ticket.legs.map((leg) =>
    evaluateLeg(leg, details.get(leg.eventId) ?? games.get(leg.eventId), details.get(leg.eventId)),
  );
  const hits = legs.filter((l, i) => l.status === "won" || ticket.legs[i]?.checked).length;
  if (ticket.settled) return { status: ticket.settled, legs, hits };
  if (legs.some((l) => l.status === "lost")) return { status: "lost", legs, hits };
  if (legs.length && legs.every((l) => l.status === "won" || l.status === "push")) {
    const allPush = legs.every((l) => l.status === "push");
    return { status: allPush ? "push" : "won", legs, hits };
  }
  return { status: "open", legs, hits };
}

export function trackingLabel(leg: BetLeg) {
  if (leg.kind === "moneyline") return `${leg.teamAbbr ?? ""} lead`.trim();
  if (leg.kind === "spread") return `${leg.teamAbbr ?? ""} ${leg.line != null && leg.line > 0 ? "+" : ""}${leg.line ?? ""}`.trim();
  if (leg.kind === "total") return `${leg.side === "under" ? "U" : "O"} ${leg.line ?? ""}`.trim();
  if (leg.kind === "method") {
    if (leg.method === "ko") return "KO/TKO";
    if (leg.method === "submission") return "Sub";
    if (leg.method === "decision") return "Dec";
    return "Method";
  }
  if (leg.kind === "team_total") return `${leg.teamAbbr ?? ""} ${leg.side ?? ""}`.trim();
  if (leg.kind === "first_inning_draw") return "1st Inn";
  if (leg.kind === "period_winner") {
    const p = (leg.period ?? "").toUpperCase().replace(/\s+/g, "");
    if (p === "F5") return "F5";
    if (p === "1" || p === "1ST") return "Thru 1";
    return `Thru ${leg.period ?? ""}`.replace("Thru F5", "F5");
  }
  if (leg.kind === "period_total") return `${leg.period ?? ""} ${leg.side ?? ""}`.trim();
  if (leg.kind === "prop") {
    const name = leg.playerName?.split(" ").pop() ?? "";
    const stat = leg.statLabel || leg.statKey?.split(".").pop() || "";
    return `${name} ${stat}`.trim() || leg.selection;
  }
  return leg.selection;
}
