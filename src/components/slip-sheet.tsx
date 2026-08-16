import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { payout } from "@/lib/bets/odds";
import { useBook } from "@/lib/bets/store";
import type { BetKind, BetLeg } from "@/lib/bets/types";
import { LEAGUES, leagueById, propCatalog } from "@/lib/espn/leagues";
import { useGameDetail, useSlate } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";
import { cn, formatAmerican, formatMoney, fuzzyIncludes } from "@/lib/utils";
import { toast } from "sonner";

const KINDS: { id: BetKind; label: string }[] = [
  { id: "moneyline", label: "Moneyline" },
  { id: "spread", label: "Spread" },
  { id: "total", label: "Total" },
  { id: "team_total", label: "Team total" },
  { id: "prop", label: "Player prop" },
  { id: "period_winner", label: "Period" },
  { id: "first_inning_draw", label: "1st inning 0-0" },
];

export function SlipSheet() {
  const { draft, closeDraft, setDraft, removeDraftLeg, bookDraft, addDraftLeg } = useBook();
  const open = Boolean(draft);
  const toWin = draft ? payout(draft.stake, draft.odds) : 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeDraft()}>
      <SheetContent side="bottom" className="sm:left-auto sm:right-0 sm:h-full sm:max-w-md sm:rounded-l-xl">
        <SheetHeader className="flex flex-row items-center justify-between">
          <div>
            <SheetTitle>The slip</SheetTitle>
            <p className="mt-1 text-xs text-subtle">Straight or parlay. Lines update against live ESPN.</p>
          </div>
          <button type="button" onClick={closeDraft} className="grid size-11 place-items-center text-muted">
            <X className="size-4" />
          </button>
        </SheetHeader>

        {draft ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="slip-label">Ticket name</Label>
                <Input
                  id="slip-label"
                  className="mt-1.5"
                  value={draft.label}
                  placeholder="Sunday card"
                  onChange={(e) => setDraft({ label: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slip-stake">Stake</Label>
                <Input
                  id="slip-stake"
                  className="mt-1.5"
                  type="number"
                  min={1}
                  value={draft.stake}
                  onChange={(e) => setDraft({ stake: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="slip-odds">American odds</Label>
                <Input
                  id="slip-odds"
                  className="mt-1.5"
                  type="number"
                  value={draft.odds}
                  onChange={(e) => setDraft({ odds: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              To win <span className="tabular text-fg">{formatMoney(toWin)}</span>
              <span className="text-subtle"> · payout {formatMoney(toWin + draft.stake)}</span>
            </p>

            <ul className="mt-5 space-y-2">
              {draft.legs.map((leg) => (
                <li
                  key={leg.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-elevated px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm">{leg.selection}</p>
                    <p className="text-xs text-subtle">{leg.eventLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraftLeg(leg.id)}
                    className="text-xs text-subtle hover:text-lose"
                  >
                    Drop
                  </button>
                </li>
              ))}
            </ul>

            <AddLegForm
              onAdd={(leg) => {
                addDraftLeg(leg);
              }}
            />
          </div>
        ) : null}

        <div className="border-t border-line p-4">
          <Button
            className="w-full"
            disabled={!draft?.legs.length}
            onClick={() => {
              const id = bookDraft();
              if (id) toast.success("Ticket is on the book");
            }}
          >
            Book it
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AddLegForm({ onAdd }: { onAdd: (leg: Omit<BetLeg, "id">) => void }) {
  const enabled = useBook((s) => s.enabledLeagues);
  const { data: games = [] } = useSlate(enabled);
  const [q, setQ] = useState("");
  const [gameId, setGameId] = useState<string>("");
  const [kind, setKind] = useState<BetKind>("moneyline");
  const [team, setTeam] = useState<"home" | "away">("away");
  const [side, setSide] = useState<"over" | "under">("over");
  const [line, setLine] = useState("8.5");
  const [period, setPeriod] = useState("F5");
  const [player, setPlayer] = useState("");
  const [statKey, setStatKey] = useState("");

  const game = games.find((g) => g.id === gameId);
  const filtered = useMemo(() => {
    const list = q
      ? games.filter((g) => fuzzyIncludes(`${g.shortName} ${g.name} ${g.leagueShort}`, q))
      : games.filter((g) => g.state !== "post").slice(0, 40);
    return list.slice(0, 24);
  }, [games, q]);

  const { data: detail } = useGameDetail(game?.leagueId, game?.id, game);
  const catalog = game ? propCatalog(game.sport) : [];
  const players = detail?.players ?? [];

  const submit = () => {
    if (!game) return;
    const ev = `${game.away.abbr} @ ${game.home.abbr}`;
    const sideTeam = team === "home" ? game.home : game.away;
    const lineN = Number(line);
    let leg: Omit<BetLeg, "id"> | null = null;
    if (kind === "moneyline") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.abbr} to win`,
        teamAbbr: sideTeam.abbr,
      };
    } else if (kind === "spread") {
      const spr = team === "home" ? (game.odds?.homeSpread ?? lineN) : (game.odds?.awaySpread ?? lineN);
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.abbr} ${spr > 0 ? "+" : ""}${spr}`,
        teamAbbr: sideTeam.abbr,
        line: spr,
      };
    } else if (kind === "total") {
      const ou = game.odds?.overUnder ?? lineN;
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${side === "over" ? "Over" : "Under"} ${ou}`,
        line: ou,
        side,
      };
    } else if (kind === "team_total") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.abbr} ${side} ${lineN}`,
        teamAbbr: sideTeam.abbr,
        line: lineN,
        side,
      };
    } else if (kind === "first_inning_draw") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: "1st inning draw",
      };
    } else if (kind === "period_winner") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.abbr} ${period}`,
        teamAbbr: sideTeam.abbr,
        period,
      };
    } else if (kind === "prop") {
      const cat = catalog.find((c) => c.key === statKey) ?? catalog[0];
      if (!player || !cat) return;
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${player} ${side} ${lineN} ${cat.label}`,
        playerName: player,
        statKey: cat.key,
        statLabel: cat.stat,
        line: lineN,
        side,
      };
    }
    if (leg) {
      onAdd(leg);
      setPlayer("");
    }
  };

  return (
    <div className="mt-6 rounded-lg bg-inset p-3">
      <p className="text-2xs font-medium uppercase tracking-wide text-subtle">Add a leg</p>
      <Input
        className="mt-2"
        placeholder="Search games"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
        {filtered.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGameId(g.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs",
              gameId === g.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg",
            )}
          >
            <span>
              <span className="mr-2 text-subtle">{g.leagueShort}</span>
              {g.away.abbr} @ {g.home.abbr}
            </span>
            <span className="tabular text-subtle">{g.shortDetail}</span>
          </button>
        ))}
      </div>

      {game ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {KINDS.filter((k) => {
              if (k.id === "first_inning_draw") return game.sport === "baseball";
              return true;
            }).map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={cn(
                  "h-8 rounded-md px-2 text-2xs",
                  kind === k.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          {kind === "moneyline" || kind === "spread" || kind === "team_total" || kind === "period_winner" ? (
            <TeamPick game={game} team={team} onChange={setTeam} />
          ) : null}

          {kind === "spread" || kind === "total" || kind === "team_total" || kind === "prop" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(kind === "total" || kind === "team_total" || kind === "prop") && (
                <div className="flex gap-1">
                  {(["over", "under"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={cn(
                        "h-10 flex-1 rounded-md text-xs capitalize",
                        side === s ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Line" />
            </div>
          ) : null}

          {kind === "period_winner" ? (
            <Input className="mt-2" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="F5 / 1H / 1Q" />
          ) : null}

          {kind === "prop" ? (
            <div className="mt-2 space-y-2">
              <select
                className="h-11 w-full rounded-md bg-elevated px-3 text-sm text-fg shadow-[var(--shadow-border)]"
                value={statKey}
                onChange={(e) => setStatKey(e.target.value)}
              >
                <option value="">Stat</option>
                {catalog.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input
                list="prop-players"
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                placeholder="Player name"
              />
              <datalist id="prop-players">
                {[...new Map(players.map((p) => [p.name, p])).values()].slice(0, 40).map((p) => (
                  <option key={p.id + p.group} value={p.name} />
                ))}
              </datalist>
            </div>
          ) : null}

          <Button variant="secondary" className="mt-3 w-full" size="sm" onClick={submit} disabled={!game}>
            Add leg
          </Button>
        </>
      ) : (
        <p className="mt-3 text-xs text-subtle">Pick a game to attach a line.</p>
      )}
    </div>
  );
}

function TeamPick({
  game,
  team,
  onChange,
}: {
  game: Game;
  team: "home" | "away";
  onChange: (t: "home" | "away") => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5">
      {(["away", "home"] as const).map((t) => {
        const c = t === "home" ? game.home : game.away;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "h-10 rounded-md text-xs",
              team === t ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
            )}
          >
            {c.abbr}
          </button>
        );
      })}
    </div>
  );
}

void LEAGUES;
void leagueById;
void formatAmerican;
void formatMoney;
