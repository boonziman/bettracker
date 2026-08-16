import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountDots, Diamond } from "@/components/diamond";
import { PulseNum } from "@/components/pulse";
import { evaluateLeg, trackingLabel } from "@/lib/bets/evaluate";
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
        "rounded-xl bg-surface p-1",
        live ? "shadow-[var(--shadow-live)]" : "shadow-[var(--shadow-border)]",
      )}
    >
      <div className={cn("grid gap-0", legs.length ? "lg:grid-cols-[1fr_13.5rem]" : "")}>
        <div className={cn("p-4", compact && "p-3.5")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wide text-subtle">
              <span>
                {game.format === "fight"
                  ? `${game.away.shortName} vs ${game.home.shortName}`
                  : game.format === "field"
                    ? game.shortName
                    : `${game.away.abbr} @ ${game.home.abbr}`}
              </span>
              {game.weightClass ? <span className="normal-case tracking-normal text-faint">{game.weightClass}</span> : null}
              {live ? (
                <Badge tone="live" className="gap-1.5 normal-case">
                  <span className="live-dot size-1.5 rounded-pill bg-live" />
                  Live
                </Badge>
              ) : game.state === "post" ? (
                <span>Final</span>
              ) : null}
            </div>
            <span className="text-xs tabular text-muted">{game.shortDetail}</span>
          </div>

          {game.format === "field" ? (
            <FieldBoard game={game} />
          ) : baseballLive ? (
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
                <TeamLine team={game.away} show />
                <TeamLine team={game.home} show />
              </div>
              <Diamond
                className="size-14"
                onFirst={sit.onFirst}
                onSecond={sit.onSecond}
                onThird={sit.onThird}
              />
              <div className="space-y-1">
                <CountDots label="B" filled={sit.balls ?? 0} total={4} tone="b" />
                <CountDots label="S" filled={sit.strikes ?? 0} total={3} tone="s" />
                <CountDots label="O" filled={sit.outs ?? 0} total={3} tone="o" />
              </div>
            </div>
          ) : game.format === "fight" ? (
            <FightBoard game={game} live={live} />
          ) : (
            <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
              <TeamLine team={game.away} show={live || game.completed} mark={game.sport === "tennis"} />
              <TeamLine team={game.home} show={live || game.completed} mark={game.sport === "tennis"} />
            </div>
          )}

          {baseballLive && (sit.batter || sit.pitcher) && !compact ? (
            <p className="mt-3 text-2xs text-subtle">
              {sit.pitcher ? <span>P {sit.pitcher}</span> : null}
              {sit.pitcher && sit.batter ? <span className="mx-2 text-faint">·</span> : null}
              {sit.batter ? <span>AB {sit.batter}</span> : null}
            </p>
          ) : null}

          {live && game.sport === "football" && sit?.downDistanceText ? (
            <p className="mt-3 text-sm text-muted">
              {sit.possessionAbbr ? <span className="mr-2 font-medium text-fg">{sit.possessionAbbr}</span> : null}
              {sit.downDistanceText}
            </p>
          ) : null}

          {game.format !== "field" && game.home.linescores.length > 0 ? <LineScore game={game} /> : null}

          {game.lastPlay ? (
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
                className="inline-flex items-center gap-1 text-2xs text-subtle hover:text-muted"
              >
                ESPN <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        </div>

        {legs.length > 0 ? <TrackingRail game={game} detail={detail} legs={legs} /> : null}
      </div>
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
      <div className="flex min-w-0 items-center gap-3">
        {team.logo ? (
          <img src={team.logo} alt="" className="size-7 object-contain" crossOrigin="anonymous" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-base font-medium leading-tight">{team.shortName || team.abbr}</p>
          {team.record ? <p className="text-2xs text-subtle">{team.record}</p> : null}
        </div>
      </div>
      <p className={cn("type-display text-3xl tabular leading-none", show ? "text-fg" : "text-subtle")}>
        {show ? <PulseNum value={team.mark && mark ? team.mark : team.score} /> : "–"}
      </p>
    </>
  );
}

function FightBoard({ game, live }: { game: Game; live: boolean }) {
  return (
    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3">
      <Fighter team={game.away} />
      <p className={cn("type-display text-2xl tabular leading-none", game.away.winner ? "text-win" : live || game.completed ? "text-fg" : "text-subtle")}>
        {game.away.winner ? "W" : game.home.winner ? "L" : live || game.completed ? (game.away.score || "–") : "–"}
      </p>
      <Fighter team={game.home} />
      <p className={cn("type-display text-2xl tabular leading-none", game.home.winner ? "text-win" : live || game.completed ? "text-fg" : "text-subtle")}>
        {game.home.winner ? "W" : game.away.winner ? "L" : live || game.completed ? (game.home.score || "–") : "–"}
      </p>
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
    <ol className="mt-4 divide-y divide-line">
      {rows.slice(0, 10).map((p) => (
        <li key={p.id + p.position} className="flex items-center gap-3 py-1.5 text-sm">
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
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-64 text-2xs tabular text-muted">
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
    <aside className="border-t border-line p-4 lg:border-t-0 lg:border-l">
      <p className="text-2xs font-medium uppercase tracking-widest text-subtle">Tracking</p>
      <ul className="mt-3 space-y-3">
        {legs.map((leg) => {
          const ev = evaluateLeg(leg, game, detail);
          return (
            <li key={leg.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-muted">{trackingLabel(leg)}</span>
                <PulseNum value={ev.readout ?? "—"} className={cn("text-sm font-medium", toneText(ev.status))} />
              </div>
              {ev.line != null && ev.current != null ? (
                <StatBar current={ev.current} line={ev.line} status={ev.status} needed={ev.needed} extra={ev.extra} />
              ) : (
                <p className="mt-0.5 text-2xs text-subtle">{ev.note}</p>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
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
    <div className="mt-1.5">
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
