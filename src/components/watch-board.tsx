import { GamecastBoard } from "@/components/gamecast";
import type { Ticket } from "@/lib/bets/types";
import type { GameDetail } from "@/lib/espn/types";

export function WatchBoard({
  game,
  tickets,
}: {
  game: GameDetail;
  tickets: Ticket[];
}) {
  const legs = tickets.flatMap((t) => t.legs.filter((l) => l.eventId === game.id));

  return (
    <div className="space-y-4">
      <GamecastBoard game={game} legs={legs} hideWatchLink />

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

function Boxscore({ game }: { game: GameDetail }) {
  const names = [...new Map(game.players.map((p) => [p.id + p.group, p])).values()].slice(0, 20);
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-subtle">Box</h2>
      <ul className="mt-3 divide-y divide-line">
        {names.map((p) => {
          const bits = Object.entries(p.stats)
            .filter(([k, v]) => v && v !== "-" && ["PTS", "REB", "AST", "K", "SO", "IP", "YDS", "TD", "REC", "H", "RBI", "HR", "ER"].includes(k))
            .slice(0, 5);
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
