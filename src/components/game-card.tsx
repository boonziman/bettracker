import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { CountDots, Diamond } from "@/components/diamond";
import { PulseNum } from "@/components/pulse";
import { eventLabel } from "@/lib/espn/leagues";
import type { Game } from "@/lib/espn/types";
import { formatAmerican, formatClock } from "@/lib/utils";
import { useBook } from "@/lib/bets/store";
import type { BetLeg } from "@/lib/bets/types";

export function GameCard({ game }: { game: Game }) {
  const live = game.state === "in";
  const showScore = live || game.completed;
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
            {game.weightClass ? <span className="normal-case tracking-normal text-faint">{game.weightClass}</span> : null}
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

        {game.format === "field" ? (
          <FieldPreview game={game} />
        ) : (
          <>
            <TeamRow team={game.away} emphasize={showScore} fight={game.format === "fight"} />
            <TeamRow team={game.home} emphasize={showScore} fight={game.format === "fight"} />
          </>
        )}

        {live && (game.sport === "baseball" || game.sport === "softball") && game.situation ? (
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
          <p className="mt-3 text-xs text-muted">
            {game.situation.possessionAbbr ? (
              <span className="mr-1.5 font-medium text-fg">{game.situation.possessionAbbr}</span>
            ) : null}
            {game.situation.downDistanceText}
          </p>
        ) : null}

        {game.lastPlay && live ? (
          <p className="mt-2 line-clamp-2 text-xs text-subtle">{game.lastPlay}</p>
        ) : null}
      </Link>

      <OddsRow game={game} />
    </article>
  );
}

function FieldPreview({ game }: { game: Game }) {
  const rows = (game.field ?? []).slice(0, 3);
  if (!rows.length) return <p className="text-sm text-muted">{game.shortName}</p>;
  return (
    <ul className="space-y-1">
      {rows.map((p) => (
        <li key={p.id} className="flex items-center gap-2 text-sm">
          <span className="w-5 tabular text-2xs text-subtle">{p.position}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{p.shortName}</span>
          <span className="tabular text-muted">{p.mark ?? p.score}</span>
        </li>
      ))}
    </ul>
  );
}

function TeamRow({
  team,
  emphasize,
  fight,
}: {
  team: Game["home"];
  emphasize: boolean;
  fight?: boolean;
}) {
  const shown = fight ? (team.winner ? "W" : emphasize && team.score ? team.score : "–") : emphasize ? team.score : "–";
  return (
    <div className="flex items-center gap-3 py-0.5">
      {team.logo ? (
        <img
          src={team.logo}
          alt=""
          className={cnLogo(fight)}
          crossOrigin="anonymous"
        />
      ) : (
        <span className="grid size-6 place-items-center rounded-sm bg-elevated text-2xs text-muted">
          {team.abbr.slice(0, 2)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{fight ? team.name : team.shortName}</span>
      {team.record ? <span className="text-2xs text-subtle">{team.record}</span> : null}
      <span className={`w-8 text-right text-xl font-medium tabular ${emphasize || team.winner ? "text-fg" : "text-subtle"}`}>
        {shown === "–" ? "–" : <PulseNum value={shown} />}
      </span>
    </div>
  );
}

function cnLogo(fight?: boolean) {
  return fight ? "size-7 rounded-sm object-cover" : "size-6 object-contain";
}

function OddsRow({ game }: { game: Game }) {
  const { openDraft, addDraftLeg, draft } = useBook();
  const add = (leg: Omit<BetLeg, "id">) => {
    if (!draft)
      openDraft({
        label: eventLabel(game),
        stake: 10,
        odds: leg.odds ?? -110,
        legs: [],
        focusEventId: game.id,
      });
    addDraftLeg(leg);
  };
  const ev = eventLabel(game);
  const chips: { label: string; onClick: () => void }[] = [];
  const pushMl = (side: "home" | "away", odds?: number) => {
    const team = side === "home" ? game.home : game.away;
    chips.push({
      label: odds != null ? `${team.abbr} ${formatAmerican(odds)}` : `${team.abbr} ML`,
      onClick: () =>
        add({
          kind: "moneyline",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `${team.shortName} to win`,
          teamAbbr: team.abbr,
          odds,
        }),
    });
  };
  if (game.odds?.awayMl != null) pushMl("away", game.odds.awayMl);
  if (game.odds?.homeMl != null) pushMl("home", game.odds.homeMl);
  if (!game.odds && (game.format === "fight" || game.format === "match")) {
    pushMl("away");
    pushMl("home");
  }
  if (game.format === "field") {
    for (const p of (game.field ?? []).slice(0, 4)) {
      chips.push({
        label: `${p.abbr} win`,
        onClick: () =>
          add({
            kind: "moneyline",
            leagueId: game.leagueId,
            eventId: game.id,
            eventLabel: ev,
            selection: `${p.shortName} to win`,
            teamAbbr: p.abbr,
          }),
      });
    }
  }
  if (game.odds?.awaySpread != null) {
    chips.push({
      label: `${game.away.abbr} ${game.odds.awaySpread > 0 ? "+" : ""}${game.odds.awaySpread}`,
      onClick: () =>
        add({
          kind: "spread",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `${game.away.abbr} ${game.odds!.awaySpread! > 0 ? "+" : ""}${game.odds!.awaySpread}`,
          teamAbbr: game.away.abbr,
          line: game.odds?.awaySpread,
          odds: game.odds?.awaySpreadOdds,
        }),
    });
  }
  if (game.odds?.homeSpread != null) {
    chips.push({
      label: `${game.home.abbr} ${game.odds.homeSpread > 0 ? "+" : ""}${game.odds.homeSpread}`,
      onClick: () =>
        add({
          kind: "spread",
          leagueId: game.leagueId,
          eventId: game.id,
          eventLabel: ev,
          selection: `${game.home.abbr} ${game.odds!.homeSpread! > 0 ? "+" : ""}${game.odds!.homeSpread}`,
          teamAbbr: game.home.abbr,
          line: game.odds?.homeSpread,
          odds: game.odds?.homeSpreadOdds,
        }),
    });
  }
  if (game.odds?.overUnder != null) {
    chips.push({
      label: `O ${game.odds.overUnder}`,
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
      {game.format === "field" ? (
        <p className="truncate text-sm">{game.shortName}</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span>{game.format === "fight" ? game.away.shortName : game.away.abbr}</span>
            <span className="tabular font-medium">
              {live || game.completed ? (game.away.winner ? "W" : game.away.score) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{game.format === "fight" ? game.home.shortName : game.home.abbr}</span>
            <span className="tabular font-medium">
              {live || game.completed ? (game.home.winner ? "W" : game.home.score) : ""}
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
