import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { payout } from "@/lib/bets/odds";
import { useBook } from "@/lib/bets/store";
import type { BetKind, BetLeg, FightMethod } from "@/lib/bets/types";
import { eventLabel, leagueById, propCatalog } from "@/lib/espn/leagues";
import { useGameDetail, useSlate } from "@/lib/espn/hooks";
import type { Game } from "@/lib/espn/types";
import { cn, formatMoney, fuzzyIncludes } from "@/lib/utils";
import { toast } from "sonner";

type Step = "event" | "market" | "pick";

type Market = {
  id: BetKind;
  label: string;
  hint: string;
};

const METHODS: { id: FightMethod; label: string; hint: string }[] = [
  { id: "ko", label: "KO / TKO", hint: "Finish on strikes" },
  { id: "submission", label: "Submission", hint: "Tap or choke" },
  { id: "decision", label: "Decision", hint: "Goes the cards" },
];

const FIGHT_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];

function marketsFor(game: Game): Market[] {
  if (game.format === "fight") {
    return [
      { id: "moneyline", label: "Winner", hint: "Who walks out" },
      { id: "total", label: "Rounds", hint: "Over / under the distance" },
      { id: "method", label: "Method", hint: "KO, submission, or cards" },
      { id: "period_winner", label: "Round", hint: "Who takes a scored round" },
    ];
  }
  if (game.format === "field") {
    return [{ id: "moneyline", label: "Winner", hint: "Who finishes first" }];
  }
  if (game.sport === "tennis") {
    return [
      { id: "moneyline", label: "Winner", hint: "Match winner" },
      { id: "spread", label: "Games", hint: "Game handicap" },
      { id: "total", label: "Total games", hint: "Over / under games" },
    ];
  }
  const list: Market[] = [
    { id: "moneyline", label: "Moneyline", hint: "Pick the winner" },
    { id: "spread", label: game.sport === "baseball" ? "Run line" : game.sport === "hockey" ? "Puck line" : "Spread", hint: "Cover the number" },
    { id: "total", label: "Total", hint: "Over / under combined" },
    { id: "team_total", label: "Team total", hint: "One side's score" },
    { id: "prop", label: "Player prop", hint: "A name and a stat" },
    { id: "period_winner", label: "Period", hint: "F5, first half, a quarter" },
    { id: "period_total", label: "Period total", hint: "Runs or points through a window" },
  ];
  if (game.sport === "baseball" || game.sport === "softball") {
    list.push({ id: "first_inning_draw", label: "1st inning 0–0", hint: "No runs in the first" });
  }
  return list;
}

function periodPresets(game: Game) {
  if (game.sport === "mma" || game.format === "fight") {
    const n = game.scheduledRounds && game.scheduledRounds > 0 ? game.scheduledRounds : 5;
    return Array.from({ length: n }, (_, i) => `R${i + 1}`);
  }
  if (game.sport === "baseball" || game.sport === "softball") return ["F5", "1"];
  if (game.sport === "basketball" || game.sport === "football" || game.sport === "afl" || game.sport === "lacrosse") {
    return ["1Q", "1H", "2H"];
  }
  if (game.sport === "hockey") return ["1P", "2P", "1"];
  if (game.sport === "soccer" || game.sport === "rugby") return ["1H", "2H"];
  return ["1H", "F5"];
}

export function SlipSheet() {
  const navigate = useNavigate();
  const { draft, closeDraft, setDraft, removeDraftLeg, bookDraft, addDraftLeg } = useBook();
  const open = Boolean(draft);
  const toWin = draft ? payout(draft.stake, draft.odds) : 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeDraft()}>
      <SheetContent side="bottom" className="sm:left-auto sm:right-0 sm:h-full sm:max-w-md sm:rounded-l-xl">
        <SheetHeader className="flex flex-row items-center justify-between">
          <div>
            <SheetTitle>Write a ticket</SheetTitle>
            <p className="mt-1 text-xs text-subtle">Search a game, pick a market, then the side.</p>
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
                <li key={leg.id} className="flex items-start justify-between gap-3 rounded-lg bg-elevated px-3 py-2.5">
                  <div>
                    <p className="text-sm">{leg.selection}</p>
                    <p className="text-xs text-subtle">{leg.eventLabel}</p>
                  </div>
                  <button type="button" onClick={() => removeDraftLeg(leg.id)} className="text-xs text-subtle hover:text-lose">
                    Drop
                  </button>
                </li>
              ))}
            </ul>

            <AddLegForm onAdd={(leg) => addDraftLeg(leg)} />
          </div>
        ) : null}

        <div className="border-t border-line p-4">
          <Button
            className="w-full"
            disabled={!draft?.legs.length}
            onClick={() => {
              const id = bookDraft();
              if (id) {
                toast.success("Ticket is on the book");
                void navigate({ to: "/book/$ticketId", params: { ticketId: id } });
              }
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
  const focusEventId = useBook((s) => s.draft?.focusEventId);
  const lastLegEvent = useBook((s) => s.draft?.legs.at(-1)?.eventId);
  const { data: games = [] } = useSlate(enabled);
  const [q, setQ] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [gameId, setGameId] = useState<string>(focusEventId || lastLegEvent || "");
  const [kind, setKind] = useState<BetKind>("moneyline");
  const [step, setStep] = useState<Step>(focusEventId ? "market" : "event");
  const [team, setTeam] = useState<"home" | "away">("away");
  const [fieldAbbr, setFieldAbbr] = useState("");
  const [side, setSide] = useState<"over" | "under">("over");
  const [line, setLine] = useState("8.5");
  const [period, setPeriod] = useState("F5");
  const [player, setPlayer] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [statKey, setStatKey] = useState("");
  const [method, setMethod] = useState<FightMethod>("ko");

  useEffect(() => {
    if (focusEventId) {
      setGameId(focusEventId);
      setStep("market");
      return;
    }
    if (!lastLegEvent) {
      setStep("event");
    }
  }, [focusEventId, lastLegEvent]);

  const game = games.find((g) => g.id === gameId);
  const markets = game ? marketsFor(game) : [];

  const filtered = useMemo(() => {
    let list = games;
    if (leagueFilter === "live") list = list.filter((g) => g.state === "in");
    else if (leagueFilter !== "all") list = list.filter((g) => g.leagueId === leagueFilter || leagueById(g.leagueId)?.family === leagueFilter);
    if (q) {
      list = list.filter((g) =>
        fuzzyIncludes(`${g.shortName} ${g.name} ${g.leagueShort} ${g.away.name} ${g.home.name} ${g.weightClass ?? ""}`, q),
      );
    } else {
      const live = list.filter((g) => g.state === "in");
      const pre = list.filter((g) => g.state === "pre");
      const post = list.filter((g) => g.state === "post").slice(-8);
      list = [...live, ...pre, ...post];
    }
    return list.slice(0, 36);
  }, [games, q, leagueFilter]);

  const { data: detail } = useGameDetail(game?.leagueId, game?.id, game);
  const catalog = game ? propCatalog(game.sport) : [];
  const players = detail?.players ?? [];
  const uniquePlayers = [...new Map(players.map((p) => [p.id + p.group, p])).values()];
  const selectedCat = catalog.find((c) => c.key === statKey);
  const groupNeedle = (selectedCat?.group || "").slice(0, 4).toLowerCase();
  const shownPlayers = groupNeedle
    ? uniquePlayers.filter((p) => p.group.toLowerCase().includes(groupNeedle))
    : uniquePlayers;

  useEffect(() => {
    if (!game) return;
    if (kind === "spread") {
      const spr = team === "home" ? game.odds?.homeSpread : game.odds?.awaySpread;
      if (spr != null) setLine(String(spr));
    }
    if ((kind === "total" || kind === "period_total") && game.odds?.overUnder != null) {
      setLine(String(game.odds.overUnder));
    } else if (kind === "total" && game.format === "fight") {
      setLine(game.scheduledRounds === 5 ? "2.5" : "2.5");
    }
    if ((game.sport === "baseball" || game.sport === "softball") && (kind === "period_winner" || kind === "period_total")) {
      setPeriod("F5");
    }
    if (game.format === "fight" && kind === "period_winner") setPeriod("R1");
  }, [game?.id, kind, team, game]);

  const pickGame = (g: Game) => {
    setGameId(g.id);
    setKind("moneyline");
    setStep("market");
    setQ("");
  };

  const pickMarket = (id: BetKind) => {
    setKind(id);
    setStep("pick");
  };

  const submit = () => {
    if (!game) return;
    const ev = eventLabel(game);
    const fieldPick = game.format === "field" ? game.field?.find((p) => p.abbr === fieldAbbr) : undefined;
    const sideTeam = fieldPick
      ? { abbr: fieldPick.abbr, shortName: fieldPick.shortName, name: fieldPick.name }
      : team === "home"
        ? game.home
        : game.away;
    const lineN = Number(line);
    let leg: Omit<BetLeg, "id"> | null = null;
    if (kind === "moneyline") {
      if (game.format === "field" && !fieldPick) return;
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.shortName ?? sideTeam.abbr} to win`,
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
      const rounds = game.format === "fight";
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${side === "over" ? "Over" : "Under"} ${ou}${rounds ? " rounds" : ""}`,
        line: ou,
        side,
      };
    } else if (kind === "method") {
      const label = METHODS.find((m) => m.id === method)?.label ?? "Method";
      leg = { kind, leagueId: game.leagueId, eventId: game.id, eventLabel: ev, selection: label, method };
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
      leg = { kind, leagueId: game.leagueId, eventId: game.id, eventLabel: ev, selection: "1st inning draw" };
    } else if (kind === "period_winner") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${sideTeam.shortName} ${period}`,
        teamAbbr: sideTeam.abbr,
        period,
      };
    } else if (kind === "period_total") {
      leg = {
        kind,
        leagueId: game.leagueId,
        eventId: game.id,
        eventLabel: ev,
        selection: `${period} ${side} ${lineN}`,
        line: lineN,
        side,
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
        playerId: playerId || undefined,
        statKey: cat.key,
        statLabel: cat.stat,
        line: lineN,
        side,
      };
    }
    if (leg) {
      onAdd(leg);
      setPlayer("");
      setPlayerId("");
      setStep("event");
      toast.success("Leg on the slip");
    }
  };

  const chips = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "ufc", label: "UFC" },
    { id: "mlb", label: "MLB" },
    { id: "nfl", label: "NFL" },
    { id: "nba", label: "NBA" },
    { id: "fight", label: "Fight" },
    { id: "soccer", label: "Soccer" },
  ];

  return (
    <div className="mt-6 rounded-lg bg-inset p-3">
      <div className="flex items-center justify-between">
        <p className="text-2xs font-medium uppercase tracking-wide text-subtle">
          {step === "event" ? "1 · Find a game" : step === "market" ? "2 · Choose a market" : "3 · Make the pick"}
        </p>
        {step !== "event" ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-2xs text-muted hover:text-fg"
            onClick={() => setStep(step === "pick" ? "market" : "event")}
          >
            <ChevronLeft className="size-3" />
            Back
          </button>
        ) : null}
      </div>

      {step === "event" ? (
        <>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              className="pl-9"
              placeholder="Fighter, team, league…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setLeagueFilter(c.id)}
                className={cn(
                  "h-8 rounded-md px-2 text-2xs",
                  leagueFilter === c.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-xs text-subtle">Nothing matches. Try another name or Live.</p>
            ) : null}
            {filtered.map((g) => (
              <button
                key={`${g.leagueId}-${g.id}`}
                type="button"
                onClick={() => pickGame(g)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left",
                  gameId === g.id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg",
                )}
              >
                <span className="min-w-0">
                  <span className="mr-2 text-2xs text-subtle">{g.leagueShort}</span>
                  <span className="text-sm">{eventLabel(g)}</span>
                  {g.weightClass ? <span className="ml-1.5 text-2xs text-faint">{g.weightClass}</span> : null}
                </span>
                <span className="shrink-0 text-2xs tabular text-subtle">
                  {g.state === "in" ? g.shortDetail : g.state === "post" ? "Final" : g.shortDetail}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "market" && game ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted">
            <span className="text-subtle">{game.leagueShort}</span> · {eventLabel(game)}
          </p>
          <div className="grid gap-1.5">
            {markets.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMarket(m.id)}
                className="flex items-baseline justify-between rounded-md bg-elevated px-3 py-2.5 text-left hover:bg-surface"
              >
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-2xs text-subtle">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === "pick" && game ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted">
            {eventLabel(game)} · {markets.find((m) => m.id === kind)?.label}
          </p>

          {kind === "moneyline" && game.format === "field" ? (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {(game.field ?? []).slice(0, 16).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFieldAbbr(p.abbr)}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md px-3 text-sm",
                    fieldAbbr === p.abbr ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                  )}
                >
                  <span>
                    <span className="mr-2 tabular text-subtle">{p.position}</span>
                    {p.shortName}
                  </span>
                  <span className="tabular">{p.mark ?? p.score}</span>
                </button>
              ))}
            </div>
          ) : null}

          {kind === "moneyline" && game.format !== "field" ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(["away", "home"] as const).map((t) => {
                const c = t === "home" ? game.home : game.away;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeam(t)}
                    className={cn(
                      "min-h-14 rounded-md px-3 py-2 text-sm",
                      team === t ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                    )}
                  >
                    <span className="block font-medium">{c.shortName}</span>
                    {c.record ? <span className="text-2xs opacity-70">{c.record}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {kind === "spread" || kind === "team_total" || kind === "period_winner" ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(["away", "home"] as const).map((t) => {
                const c = t === "home" ? game.home : game.away;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeam(t)}
                    className={cn(
                      "h-11 rounded-md text-sm",
                      team === t ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                    )}
                  >
                    {c.shortName}
                  </button>
                );
              })}
            </div>
          ) : null}

          {kind === "total" || kind === "team_total" || kind === "period_total" || kind === "prop" ? (
            <div className="grid grid-cols-2 gap-1.5">
              {(["over", "under"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "h-11 rounded-md text-sm capitalize",
                    side === s ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {kind === "spread" || kind === "total" || kind === "team_total" || kind === "period_total" || kind === "prop" ? (
            <div>
              <Label>Line</Label>
              <Input className="mt-1.5" value={line} onChange={(e) => setLine(e.target.value)} />
              {kind === "total" && game.format === "fight" ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FIGHT_LINES.filter((n) => n < (game.scheduledRounds ?? 5)).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLine(String(n))}
                      className={cn(
                        "h-8 rounded-md px-2 text-2xs tabular",
                        line === String(n) ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {kind === "method" ? (
            <div className="grid gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "flex items-baseline justify-between rounded-md px-3 py-2.5 text-left",
                    method === m.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                  )}
                >
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-2xs opacity-70">{m.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {kind === "period_winner" || kind === "period_total" ? (
            <div className="flex flex-wrap gap-1.5">
              {periodPresets(game).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "h-8 rounded-md px-2 text-2xs",
                    period === p ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                  )}
                >
                  {p}
                </button>
              ))}
              <Input className="h-8 w-20" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
          ) : null}

          {kind === "prop" ? (
            <div className="space-y-2">
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
                value={player}
                onChange={(e) => {
                  setPlayer(e.target.value);
                  setPlayerId("");
                }}
                placeholder="Player name"
              />
              {shownPlayers.length > 0 ? (
                <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                  {shownPlayers.slice(0, 20).map((p) => (
                    <button
                      key={p.id + p.group}
                      type="button"
                      onClick={() => {
                        setPlayer(p.name);
                        setPlayerId(p.id);
                      }}
                      className={cn(
                        "h-8 rounded-md px-2 text-2xs",
                        player === p.name ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
                      )}
                    >
                      {p.shortName}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-subtle">Type a name — live box fills in once the game is on.</p>
              )}
            </div>
          ) : null}

          <Button variant="secondary" className="w-full" size="sm" onClick={submit}>
            Add this leg
          </Button>
        </div>
      ) : null}
    </div>
  );
}
