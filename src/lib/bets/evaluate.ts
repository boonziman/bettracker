import { derivedStat, parseStatNumber } from "@/lib/espn/parse";
import type { Game, GameDetail, PlayerLine } from "@/lib/espn/types";
import { fuzzyIncludes } from "@/lib/utils";
import type { BetLeg, EvalStatus, LegEval, Ticket, TicketStatus } from "./types";

function teamOf(game: Game, abbr?: string) {
  if (!abbr) return null;
  const a = abbr.toUpperCase();
  if (game.home.abbr.toUpperCase() === a) return { me: game.home, opp: game.away };
  if (game.away.abbr.toUpperCase() === a) return { me: game.away, opp: game.home };
  if (game.home.shortName.toUpperCase() === a || game.home.name.toUpperCase().includes(a)) {
    return { me: game.home, opp: game.away };
  }
  if (game.away.shortName.toUpperCase() === a || game.away.name.toUpperCase().includes(a)) {
    return { me: game.away, opp: game.home };
  }
  return null;
}

function periodSlice(game: Game, period: string | undefined): { me?: number; opp?: number; done: boolean } | null {
  if (!period) return null;
  const p = period.toUpperCase();
  const take = (n: number) => n;
  if (p === "F5" || p === "5INN" || p === "1ST 5") {
    return {
      me: undefined,
      opp: undefined,
      done: Boolean(game.completed || (game.period ?? 0) > 5),
    };
  }
  return { done: false };
}

function sumLines(lines: number[], n: number) {
  return lines.slice(0, n).reduce((a, b) => a + (Number(b) || 0), 0);
}

function findPlayer(players: PlayerLine[] | undefined, name?: string, id?: string) {
  if (!players?.length) return null;
  if (id) {
    const byId = players.find((p) => p.id === id);
    if (byId) return byId;
  }
  if (!name) return null;
  const exact = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  const fuzzy = players.find((p) => fuzzyIncludes(p.name, name) || fuzzyIncludes(p.shortName, name));
  return fuzzy ?? null;
}

function readProp(player: PlayerLine, statKey?: string, statLabel?: string): number | null {
  if (!statKey && !statLabel) return null;
  const derived = statKey ? derivedStat(player, statKey) : null;
  if (derived != null) return derived;
  const key = (statLabel || statKey || "").split(".").pop() || "";
  const groupHint = (statKey || "").includes(".") ? (statKey || "").split(".")[0] : "";
  const groupMap: Record<string, string> = {
    pitch: "pitch",
    bat: "batt",
    pass: "pass",
    rush: "rush",
    rec: "receiv",
  };
  const wantedGroup = groupMap[groupHint] ?? groupHint;
  const candidates = [player];
  if (wantedGroup && !player.group.includes(wantedGroup)) {
    return parseStatNumber(player.stats[key], key);
  }
  for (const p of candidates) {
    if (wantedGroup && p.group && !p.group.includes(wantedGroup) && wantedGroup.length > 1) {
      continue;
    }
    const direct = parseStatNumber(p.stats[key], key);
    if (direct != null) return direct;
  }
  return parseStatNumber(player.stats[key], key);
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

export function evaluateLeg(leg: BetLeg, game?: Game, detail?: GameDetail | null): LegEval {
  if (leg.checked) {
    return { status: "won", note: "Marked hit" };
  }
  if (!game) {
    return { status: "pending", note: "Waiting on the game" };
  }

  const pair = teamOf(game, leg.teamAbbr);
  const final = game.completed;
  const my = pair?.me.score ?? 0;
  const opp = pair?.opp.score ?? 0;

  if (leg.kind === "moneyline") {
    if (!pair) return { status: "pending", note: game.shortDetail };
    if (final) {
      if (my === opp) return { status: "push", note: "Final tie" };
      return my > opp
        ? { status: "won", note: `Final ${my}–${opp}` }
        : { status: "lost", note: `Final ${my}–${opp}` };
    }
    if (my > opp) return { status: "leaning", note: `Up ${my}–${opp}` };
    if (my < opp) return { status: "threat", note: `Down ${my}–${opp}` };
    return { status: "pending", note: `Tied ${my}–${opp}` };
  }

  if (leg.kind === "spread" && pair && leg.line != null) {
    const margin = my + leg.line - opp;
    if (final) {
      if (margin > 0) return { status: "won", note: `${my}–${opp} · covered` };
      if (margin === 0) return { status: "push", note: `${my}–${opp} · push` };
      return { status: "lost", note: `${my}–${opp} · missed` };
    }
    if (margin > 0) return { status: "leaning", note: `Covering by ${margin.toFixed(1)}` };
    if (margin === 0) return { status: "pending", note: "On the number" };
    return { status: "threat", note: `${Math.abs(margin).toFixed(1)} off` };
  }

  if (leg.kind === "total" && leg.line != null && leg.side) {
    const total = game.home.score + game.away.score;
    const status = ouStatus(total, leg.line, leg.side, final);
    return {
      status,
      note: `${total} / ${leg.line}`,
      current: total,
      line: leg.line,
      progress: leg.line ? Math.min(1, total / leg.line) : 0,
    };
  }

  if (leg.kind === "team_total" && pair && leg.line != null && leg.side) {
    const status = ouStatus(my, leg.line, leg.side, final);
    return {
      status,
      note: `${pair.me.abbr} ${my} / ${leg.line}`,
      current: my,
      line: leg.line,
      progress: leg.line ? Math.min(1, my / leg.line) : 0,
    };
  }

  if (leg.kind === "first_inning_draw") {
    const a = game.away.linescores[0];
    const h = game.home.linescores[0];
    const inningDone = Boolean(final || (game.period ?? 1) > 1 || (a != null && h != null && (game.period ?? 1) >= 2));
    if (a == null || h == null) {
      return { status: "pending", note: game.period === 1 ? "Still the first" : "Waiting on the first" };
    }
    if (a === 0 && h === 0 && inningDone) return { status: "won", note: "0–0 first" };
    if (a > 0 || h > 0) return { status: "lost", note: `${a}–${h} first` };
    return { status: "pending", note: "Still the first" };
  }

  if (leg.kind === "period_winner" && pair && leg.period) {
    const p = leg.period.toUpperCase();
    const n = p === "F5" || p === "5INN" ? 5 : p === "1H" || p === "1ST HALF" ? 2 : Number(p.replace(/\D/g, "")) || 1;
    const mine = sumLines(pair.me.linescores, n);
    const theirs = sumLines(pair.opp.linescores, n);
    const have = pair.me.linescores.length >= n && pair.opp.linescores.length >= n;
    const done = final || have || (game.period ?? 0) > n;
    if (done && have) {
      if (mine > theirs) return { status: "won", note: `${p} ${mine}–${theirs}` };
      if (mine < theirs) return { status: "lost", note: `${p} ${mine}–${theirs}` };
      return { status: "push", note: `${p} tied` };
    }
    if (mine > theirs) return { status: "leaning", note: `Ahead ${mine}–${theirs}` };
    if (mine < theirs) return { status: "threat", note: `Behind ${mine}–${theirs}` };
    return { status: "pending", note: `Tied ${mine}–${theirs}` };
  }

  if (leg.kind === "period_total" && leg.line != null && leg.side && leg.period) {
    const p = leg.period.toUpperCase();
    const n = p === "F5" ? 5 : p === "1H" ? 2 : 1;
    const total = sumLines(game.home.linescores, n) + sumLines(game.away.linescores, n);
    const have = Math.min(game.home.linescores.length, game.away.linescores.length) >= n;
    const done = final || have;
    const status = ouStatus(total, leg.line, leg.side, done);
    return { status, note: `${total} / ${leg.line}`, current: total, line: leg.line, progress: Math.min(1, total / leg.line) };
  }

  if (leg.kind === "prop") {
    const players = detail?.players;
    const player = findPlayer(players, leg.playerName, leg.playerId);
    if (!player) {
      return { status: "pending", note: game.state === "pre" ? "Not started" : "Looking up the line" };
    }
    const current = readProp(player, leg.statKey, leg.statLabel);
    if (current == null || leg.line == null || !leg.side) {
      return { status: "pending", note: player.name };
    }
    const status = ouStatus(current, leg.line, leg.side, final);
    return {
      status,
      note: `${current} / ${leg.line}`,
      current,
      line: leg.line,
      progress: leg.line ? Math.min(1.15, current / leg.line) : 0,
    };
  }

  if (leg.kind === "double_result" && pair) {
    if (final) {
      return my > opp
        ? { status: "won", note: `Won ${my}–${opp}` }
        : { status: "lost", note: `Lost ${my}–${opp}` };
    }
    if (my > opp) return { status: "leaning", note: `Leading ${my}–${opp}` };
    if (my < opp) return { status: "threat", note: `Trailing ${my}–${opp}` };
    return { status: "pending", note: "Level" };
  }

  void periodSlice;
  return { status: "pending", note: game.shortDetail };
}

export function evaluateTicket(
  ticket: Ticket,
  games: Map<string, Game>,
  details: Map<string, GameDetail | null>,
): { status: TicketStatus; legs: LegEval[]; hits: number } {
  const legs = ticket.legs.map((leg) =>
    evaluateLeg(leg, games.get(leg.eventId), details.get(leg.eventId)),
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
