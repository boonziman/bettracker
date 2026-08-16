import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { CountDots, Diamond } from "@/components/diamond";
import type { Game } from "@/lib/espn/types";
import { formatAmerican, formatClock } from "@/lib/utils";
import { useBook } from "@/lib/bets/store";
import { uid } from "@/lib/utils";
import type { BetLeg } from "@/lib/bets/types";

export function GameCard({ game }: { game: Game }) {
  const live = game.state === "in";
  return (
    <article className="group flex flex-col rounded-xl bg-surface p-1 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
      <Link
        to="/watch/$leagueId/$eventId"
        params={{ leagueId: game.leagueId, eventId: game.id }}
        className="flex flex-1 flex-col rounded-lg px-3.5 pt-3 pb-2"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wide text-subtle">
            <span>{game.leagueShort}</span>
            {live ? (
              <Badge tone="live" className="gap-1 normal-case">
                <span className="live-dot size-1.5 rounded-pill bg-live" />
                Live
              </Badge>
            ) : game.state === "post" ? (
              <span>Final</span>
            ) : (
              <span className="normal-case tracking-normal text-muted">{formatClock(game.date)}</span>
            )}
          </div>
          <span className="text-2xs text-muted tabular">{game.shortDetail}</span>
        </header>

        <TeamRow team={game.away} emphasize={live || game.completed} />
        <TeamRow team={game.home} emphasize={live || game.completed} />

        {live && game.sport === "baseball" && game.situation ? (
          <div className="mt-3 flex items-center justify-between">
            <Diamond
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

        {live && game.sport === "football" && game.situation?.downDistanceText ? (
          <p className="mt-3 text-xs text-muted">{game.situation.downDistanceText}</p>
        ) : null}

        {game.lastPlay && live ? (
          <p className="mt-2 line-clamp-2 text-xs text-subtle">{game.lastPlay}</p>
        ) : null}
      </Link>

      {game.odds ? <OddsRow game={game} /> : <div className="px-3.5 pb-3" />}
    </article>
  );
}

function TeamRow({
  team,
  emphasize,
}: {
  team: Game["home"];
  emphasize: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      {team.logo ? (
        <img
          src={team.logo}
          alt=""
          className="size-6 object-contain"
          crossOrigin="anonymous"
        />
      ) : (
        <span className="grid size-6 place-items-center rounded-sm bg-elevated text-2xs text-muted">
          {team.abbr.slice(0, 2)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{team.shortName}</span>
      {team.record ? <span className="text-2xs text-subtle">{team.record}</span> : null}
      <span className={`w-8 text-right text-xl font-medium tabular ${emphasize ? "text-fg" : "text-subtle"}`}>
        {emphasize ? team.score : "–"}
      </span>
    </div>
  );
}

function OddsRow({ game }: { game: Game }) {
  const { openDraft, addDraftLeg, draft } = useBook();
  const add = (leg: Omit<BetLeg, "id">) => {
    if (!draft) openDraft({ label: "", stake: 10, odds: leg.odds ?? -110, legs: [] });
    addDraftLeg(leg);
  };
  const ev = `${game.away.abbr} @ ${game.home.abbr}`;
  const chips: { label: string; odds?: number; onClick: () => void }[] = [];
  if (game.odds?.awayMl != null) {
    chips.push({
      label: `${game.away.abbr} ${formatAmerican(game.odds.awayMl)}`,
      odds: game.odds.awayMl,
      onClick: () =>
        add({
          kind: "moneyline",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `${game.away.abbr} ML`,
          teamAbbr: game.away.abbr,
          odds: game.odds?.awayMl,
        }),
    });
  }
  if (game.odds?.homeMl != null) {
    chips.push({
      label: `${game.home.abbr} ${formatAmerican(game.odds.homeMl)}`,
      odds: game.odds.homeMl,
      onClick: () =>
        add({
          kind: "moneyline",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `${game.home.abbr} ML`,
          teamAbbr: game.home.abbr,
          odds: game.odds?.homeMl,
        }),
    });
  }
  if (game.odds?.overUnder != null) {
    chips.push({
      label: `O ${game.odds.overUnder}`,
      odds: game.odds.overOdds,
      onClick: () =>
        add({
          kind: "total",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `Over ${game.odds?.overUnder}`,
          line: game.odds?.overUnder,
          side: "over",
          odds: game.odds?.overOdds,
        }),
    });
    chips.push({
      label: `U ${game.odds.overUnder}`,
      odds: game.odds.underOdds,
      onClick: () =>
        add({
          kind: "total",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `Under ${game.odds?.overUnder}`,
          line: game.odds?.overUnder,
          side: "under",
          odds: game.odds?.underOdds,
        }),
    });
  }
  if (!chips.length) return <div className="px-3.5 pb-3" />;
  return (
    <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            c.onClick();
          }}
          className="h-8 rounded-md bg-inset px-2 text-2xs font-medium text-muted tabular transition-colors hover:bg-elevated hover:text-fg"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function MiniGame({ game }: { game: Game }) {
  const live = game.state === "in";
  return (
    <Link
      to="/watch/$leagueId/$eventId"
      params={{ leagueId: game.leagueId, eventId: game.id }}
      className="flex min-w-52 flex-col rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-border)]"
    >
      <div className="mb-1.5 flex items-center justify-between text-2xs uppercase tracking-wide text-subtle">
        <span>{game.leagueShort}</span>
        <span className="tabular text-muted">{live ? game.shortDetail : formatClock(game.date)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{game.away.abbr}</span>
        <span className="tabular font-medium">{live || game.completed ? game.away.score : ""}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{game.home.abbr}</span>
        <span className="tabular font-medium">{live || game.completed ? game.home.score : ""}</span>
      </div>
    </Link>
  );
}

void uid;
