import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountDots, Diamond } from "@/components/diamond";
import { Ticker } from "@/components/ticket-card";
import { evaluateLeg } from "@/lib/bets/evaluate";
import { statusLabel, statusTone } from "@/lib/bets/status";
import type { Ticket } from "@/lib/bets/types";
import { gamecastHref, leagueById } from "@/lib/espn/leagues";
import type { GameDetail } from "@/lib/espn/types";
import { cn } from "@/lib/utils";

export function WatchBoard({
  game,
  tickets,
}: {
  game: GameDetail;
  tickets: Ticket[];
}) {
  const live = game.state === "in";
  const league = leagueById(game.leagueId);
  const legs = tickets.flatMap((t) =>
    t.legs.filter((l) => l.eventId === game.id).map((leg) => ({ ticket: t, leg })),
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs font-medium uppercase tracking-wide text-subtle">{game.leagueShort}</p>
          <div className="flex items-center gap-2">
            {live ? (
              <Badge tone="live" className="gap-1 normal-case">
                <span className="live-dot size-1.5 rounded-pill bg-live" />
                Live
              </Badge>
            ) : (
              <span className="text-xs text-muted">{game.shortDetail}</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">{game.shortDetail}</p>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3">
          <TeamBlock team={game.away} live={live || game.completed} />
          <TeamBlock team={game.home} live={live || game.completed} />
        </div>

        {game.sport === "baseball" && live && game.situation ? (
          <div className="mt-5 flex items-center justify-between rounded-lg bg-inset px-4 py-3">
            <Diamond
              className="size-14"
              onFirst={game.situation.onFirst}
              onSecond={game.situation.onSecond}
              onThird={game.situation.onThird}
            />
            <div>
              <CountDots label="B" filled={game.situation.balls ?? 0} total={4} tone="b" />
              <CountDots label="S" filled={game.situation.strikes ?? 0} total={3} tone="s" />
              <CountDots label="O" filled={game.situation.outs ?? 0} total={3} tone="o" />
            </div>
          </div>
        ) : null}

        {game.sport === "football" && game.situation?.downDistanceText ? (
          <p className="mt-4 text-sm text-muted">{game.situation.downDistanceText}</p>
        ) : null}

        {game.home.linescores.length > 0 ? <LineScore game={game} /> : null}

        {league ? (
          <a
            href={gamecastHref(league, game.id)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
          >
            ESPN Gamecast <ExternalLink className="size-3" />
          </a>
        ) : null}
      </section>

      {legs.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="text-2xs font-medium uppercase tracking-wide text-subtle">On this game</h2>
          <ul className="mt-3 space-y-3">
            {legs.map(({ ticket, leg }) => {
              const ev = evaluateLeg(leg, game, game);
              return (
                <li key={leg.id} className="rounded-lg bg-inset px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{leg.selection}</p>
                    <Badge tone={statusTone(ev.status)}>{statusLabel(ev.status)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {ticket.label} · {ev.note}
                  </p>
                  {ev.line != null && ev.current != null ? (
                    <Ticker current={ev.current} line={ev.line} status={ev.status} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {game.plays.length > 0 ? (
        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <h2 className="text-2xs font-medium uppercase tracking-wide text-subtle">Play by play</h2>
          <ol className="mt-3 space-y-2">
            {[...game.plays].reverse().slice(0, 24).map((p) => (
              <li key={p.id} className="border-t border-line pt-2 text-sm text-muted first:border-0 first:pt-0">
                {p.clock || p.period ? (
                  <span className="mr-2 text-2xs tabular text-subtle">
                    {[p.period, p.clock].filter(Boolean).join(" ")}
                  </span>
                ) : null}
                {p.text}
              </li>
            ))}
          </ol>
        </section>
      ) : game.lastPlay ? (
        <p className="text-sm text-muted">{game.lastPlay}</p>
      ) : null}

      {game.players.length > 0 ? <Boxscore game={game} /> : null}
    </div>
  );
}

function TeamBlock({ team, live }: { team: GameDetail["home"]; live: boolean }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {team.logo ? (
          <img src={team.logo} alt="" className="size-8 object-contain" crossOrigin="anonymous" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-lg font-medium leading-tight">{team.shortName}</p>
          {team.record ? <p className="text-2xs text-subtle">{team.record}</p> : null}
        </div>
      </div>
      <p className={cn("type-display text-4xl tabular leading-none", live ? "text-fg" : "text-subtle")}>
        {live ? team.score : "–"}
      </p>
    </>
  );
}

function LineScore({ game }: { game: GameDetail }) {
  const max = Math.min(9, Math.max(game.home.linescores.length, game.away.linescores.length));
  if (!max) return null;
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-2xs tabular text-muted">
        <thead>
          <tr>
            <th className="w-10 text-left font-medium" />
            {Array.from({ length: max }, (_, i) => (
              <th key={i} className="px-1 font-medium">
                {i + 1}
              </th>
            ))}
            <th className="px-1 text-fg">R</th>
          </tr>
        </thead>
        <tbody>
          {[game.away, game.home].map((t) => (
            <tr key={t.abbr}>
              <td className="py-0.5 font-medium text-fg">{t.abbr}</td>
              {Array.from({ length: max }, (_, i) => (
                <td key={i} className="px-1 text-center">
                  {t.linescores[i] ?? ""}
                </td>
              ))}
              <td className="px-1 text-center font-medium text-fg">{t.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Boxscore({ game }: { game: GameDetail }) {
  const names = [...new Map(game.players.map((p) => [p.name, p])).values()].slice(0, 16);
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-subtle">Box</h2>
      <ul className="mt-3 divide-y divide-line">
        {names.map((p) => {
          const bits = Object.entries(p.stats)
            .filter(([k]) => ["PTS", "REB", "AST", "K", "IP", "YDS", "TD", "REC", "H", "RBI"].includes(k))
            .slice(0, 4);
          if (!bits.length) return null;
          return (
            <li key={p.id + p.group} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="text-subtle">{p.teamAbbr} · </span>
                {p.shortName}
              </span>
              <span className="text-xs tabular text-muted">
                {bits.map(([k, v]) => `${k} ${v}`).join("  ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
