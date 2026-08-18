import { Link } from "@tanstack/react-router";
import { CourtStage, PitchStage } from "@/components/live-stage";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PulseNum } from "@/components/pulse";
import { evaluateLeg, trackingLabel, elapsedRounds, formatRounds } from "@/lib/bets/evaluate";
import { statusLabel, statusTone } from "@/lib/bets/status";
import type { BetLeg, EvalStatus } from "@/lib/bets/types";
import { gamecastHref, leagueById } from "@/lib/espn/leagues";
import type { Game, GameDetail } from "@/lib/espn/types";
import { cn } from "@/lib/utils";

export function GamecastBoard({
  game,
  legs = [],
  compact = false,
  hideWatchLink = false,
}: {
  game: Game | GameDetail;
  legs?: BetLeg[];
  compact?: boolean;
  hideWatchLink?: boolean;
}) {
  const live = game.state === "in";
  const league = leagueById(game.leagueId);
  const detail = "players" in game ? (game as GameDetail) : null;
  const sit = game.situation;
  const baseballLive = live && (game.sport === "baseball" || game.sport === "softball") && sit;

  return (
    <section
      className={cn(
        "rounded-md bg-surface",
        live ? "shadow-[var(--shadow-live)]" : "shadow-[var(--shadow-border)]",
      )}
    >
      <div className={cn(compact ? "px-3 py-2.5" : "px-4 py-3")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-subtle">
            <span className="truncate">
              {game.format === "fight"
                ? `${game.away.shortName} vs ${game.home.shortName}`
                : game.format === "field"
                  ? game.shortName
                  : `${game.away.abbr} @ ${game.home.abbr}`}
            </span>
            {game.weightClass ? <span className="normal-case tracking-normal text-faint">{game.weightClass}</span> : null}
            {live ? (
              <Badge tone="live" className="gap-1 normal-case">
                <span className="live-dot size-1.5 rounded-pill bg-live" />
                Live
              </Badge>
            ) : game.state === "post" ? (
              <span>Final</span>
            ) : null}
          </div>
          <span className="shrink-0 text-2xs tabular text-muted">{game.shortDetail}</span>
        </div>

        {game.format === "field" ? (
          <FieldBoard game={game} />
        ) : baseballLive ? (
          <div className="mt-3 grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
            <TeamLine team={game.away} show />
            <TeamLine team={game.home} show />
          </div>
        ) : game.format === "fight" ? (
          <FightBoard game={game} live={live} />
        ) : (
          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
            <TeamLine team={game.away} show={live || game.completed} mark={game.sport === "tennis"} />
            <TeamLine team={game.home} show={live || game.completed} mark={game.sport === "tennis"} />
          </div>
        )}

        {baseballLive ? <PitchStage sit={sit} pitches={detail?.pitches ?? []} game={game} compact={compact} /> : null}

        {live && game.sport === "basketball" ? (
          <CourtStage
            marks={detail?.courtMarks ?? []}
            lastPlay={game.lastPlay}
            plays={detail?.plays}
            game={game}
            compact
          />
        ) : null}

        {live && game.sport === "football" && sit?.downDistanceText ? (
          <p className="mt-3 text-xs text-muted">
            {sit.possessionAbbr ? <span className="mr-1.5 font-medium text-fg">{sit.possessionAbbr}</span> : null}
            {sit.downDistanceText}
          </p>
        ) : null}

        {game.format !== "field" && game.home.linescores.length > 0 && !baseballLive && game.sport !== "basketball" ? (
          <LineScore game={game} />
        ) : null}

        {game.lastPlay && game.sport !== "basketball" && !baseballLive ? (
          <p key={game.lastPlay} className="play-fade mt-3 line-clamp-2 text-xs text-subtle">
            {game.lastPlay}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!hideWatchLink ? (
            <Link
              to="/watch/$leagueId/$eventId"
              params={{ leagueId: game.leagueId, eventId: game.id }}
              className="text-xs text-lean hover:text-fg"
            >
              Gamecast →
            </Link>
          ) : null}
          {league ? (
            <a
              href={gamecastHref(league, game.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-subtle hover:text-muted"
            >
              ESPN <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>

      {legs.length > 0 ? <TrackingRail game={game} detail={detail} legs={legs} /> : null}
    </section>
  );
}

function TeamLine({
  team,
  show,
  mark,
}: {
  team: Game["home"];
  show: boolean;
  mark?: boolean;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {team.logo ? (
          <img src={team.logo} alt="" className="size-5 object-contain" crossOrigin="anonymous" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{team.shortName || team.abbr}</p>
          {team.record ? <p className="text-2xs text-subtle">{team.record}</p> : null}
        </div>
      </div>
      <p className={cn("type-display text-2xl tabular leading-none", show ? "text-fg" : "text-subtle")}>
        {show ? <PulseNum value={team.mark && mark ? team.mark : team.score} /> : "–"}
      </p>
    </>
  );
}

function FightBoard({ game, live }: { game: Game; live: boolean }) {
  const rds = elapsedRounds(game);
  const method =
    game.fightMethod === "ko"
      ? "KO/TKO"
      : game.fightMethod === "submission"
        ? "Submission"
        : game.fightMethod === "decision"
          ? "Decision"
          : "";
  const clock = game.clock && game.clock !== "-" ? game.clock : "";
  const roundLabel = game.completed
    ? `${formatRounds(rds)} rds${method ? ` · ${method}` : ""}`
    : live && (game.period ?? 0) > 0
      ? `R${game.period}${clock ? ` ${clock}` : ""} · ${formatRounds(rds)}`
      : game.scheduledRounds
        ? `${game.scheduledRounds} rounds`
        : "";
  return (
    <div className="mt-2">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2">
        <Fighter team={game.away} />
        <p className={cn("type-display text-2xl tabular leading-none", game.away.winner ? "text-win" : live || game.completed ? "text-fg" : "text-subtle")}>
          {game.away.winner ? "W" : game.home.winner ? "L" : live || game.completed ? (game.away.score || "–") : "–"}
        </p>
        <Fighter team={game.home} />
        <p className={cn("type-display text-2xl tabular leading-none", game.home.winner ? "W" : game.away.winner ? "L" : live || game.completed ? "text-fg" : "text-subtle")}>
          {game.home.winner ? "W" : game.away.winner ? "L" : live || game.completed ? (game.home.score || "–") : "–"}
        </p>
      </div>
      {roundLabel ? <p className="mt-2 text-2xs tabular text-muted">{roundLabel}</p> : null}
    </div>
  );
}

function Fighter({ team }: { team: Game["home"] }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {team.logo ? (
        <img src={team.logo} alt="" className="size-9 rounded-sm object-cover" crossOrigin="anonymous" />
      ) : (
        <span className="grid size-9 place-items-center rounded-sm bg-elevated text-2xs text-muted">
          {team.abbr.slice(0, 2)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-medium leading-tight">{team.name}</p>
        {team.record ? <p className="text-2xs text-subtle">{team.record}</p> : null}
      </div>
    </div>
  );
}

function FieldBoard({ game }: { game: Game }) {
  const rows = game.field ?? [];
  if (!rows.length) {
    return <p className="mt-4 text-sm text-muted">{game.shortDetail || "Field not out yet."}</p>;
  }
  return (
    <ol className="mt-2 divide-y divide-line">
      {rows.slice(0, 8).map((p) => (
        <li key={p.id + p.position} className="flex items-center gap-2 py-1 text-xs">
          <span className="w-6 tabular text-2xs text-subtle">{p.position}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{p.shortName}</span>
          <span className="tabular text-muted">{p.mark ?? p.score}</span>
        </li>
      ))}
    </ol>
  );
}

function LineScore({ game }: { game: Game }) {
  const sportMin =
    game.sport === "baseball" || game.sport === "softball"
      ? 9
      : game.sport === "hockey"
        ? 3
        : game.sport === "soccer" || game.sport === "rugby"
          ? 2
          : game.sport === "tennis" || game.sport === "mma"
            ? Math.max(game.home.linescores.length, game.away.linescores.length, 1)
            : 4;
  const max = Math.min(12, Math.max(game.home.linescores.length, game.away.linescores.length, sportMin));
  if (!max) return null;
  const totalLabel = game.sport === "tennis" ? "S" : game.sport === "mma" ? "Σ" : "R";
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-56 text-2xs tabular text-muted">
        <thead>
          <tr>
            <th className="w-16 text-left font-medium" />
            {Array.from({ length: max }, (_, i) => (
              <th key={i} className="px-1 font-medium">
                {i + 1}
              </th>
            ))}
            <th className="px-1 text-fg">{totalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {[game.away, game.home].map((t) => (
            <tr key={t.abbr + t.id}>
              <td className="py-0.5 font-medium text-fg">{t.abbr}</td>
              {Array.from({ length: max }, (_, i) => (
                <td key={i} className="px-1 text-center">
                  {t.linescores[i] ?? ""}
                </td>
              ))}
              <td className="px-1 text-center font-medium text-fg">
                <PulseNum value={t.score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrackingRail({
  game,
  detail,
  legs,
}: {
  game: Game;
  detail: GameDetail | null;
  legs: BetLeg[];
}) {
  return (
    <aside className="border-t border-line px-3 py-2.5">
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {legs.map((leg) => {
          const ev = evaluateLeg(leg, game, detail);
          return (
            <li key={leg.id} className="flex items-center gap-2 rounded-sm bg-inset/80 px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-2xs text-muted">{trackingLabel(leg)}</span>
              <PulseNum value={ev.readout ?? "—"} className={cn("shrink-0 text-2xs font-medium tabular", toneText(ev.status))} />
              {ev.line != null && ev.current != null ? (
                <span className="hidden w-16 shrink-0 sm:block">
                  <MiniBar current={ev.current} line={ev.line} status={ev.status} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function MiniBar({ current, line, status }: { current: number; line: number; status: string }) {
  const pct = Math.max(4, Math.min(100, (current / Math.max(line, 0.01)) * 100));
  const bar =
    status === "lost" ? "bg-lose" : status === "won" ? "bg-win" : status === "threat" ? "bg-threat" : "bg-lean";
  return (
    <div className="h-1 overflow-hidden rounded-pill bg-elevated">
      <div className={cn("h-full rounded-pill", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatBar({
  current,
  line,
  status,
  needed,
  extra,
}: {
  current: number;
  line: number;
  status: EvalStatus | string;
  needed?: number;
  extra?: string;
}) {
  const pct = Math.max(4, Math.min(100, (current / Math.max(line, 0.01)) * 100));
  const bar =
    status === "lost"
      ? "bg-lose"
      : status === "won"
        ? "bg-win"
        : status === "threat"
          ? "bg-threat"
          : "bg-lean";
  return (
    <div className="mt-1">
      <div className="h-1 overflow-hidden rounded-pill bg-inset">
        <div
          className={cn("h-full rounded-pill transition-[width] duration-300 ease-[var(--ease-out)]", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-2xs tabular text-subtle">
        <span>
          <PulseNum value={current} />
          <span> / {line}</span>
        </span>
        <span>
          {needed != null && needed > 0 && status !== "won" && status !== "lost"
            ? `${needed} to cover`
            : statusLabel(status as EvalStatus)}
        </span>
      </div>
      {extra ? <p className="mt-0.5 text-2xs text-faint">{extra}</p> : null}
    </div>
  );
}

function toneText(status: string) {
  if (status === "won" || status === "leaning") return "text-win";
  if (status === "lost") return "text-lose";
  if (status === "threat") return "text-threat";
  return "text-fg";
}

export function statusToneClass(status: string) {
  return toneText(status);
}

void statusTone;
