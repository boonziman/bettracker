import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LEAGUE_IDS, SHIPPED_V1, LEAGUES, eventLabel } from "@/lib/espn/leagues";
import type { Game } from "@/lib/espn/types";
import { uid } from "@/lib/utils";
import { payout } from "./odds";
import type { BetLeg, Ticket } from "./types";

const STORAGE_KEY = "slate-book-v1";

export type Draft = {
  label: string;
  stake: number;
  odds: number;
  legs: BetLeg[];
  focusEventId?: string;
};

type BookState = {
  tickets: Ticket[];
  draft: Draft | null;
  enabledLeagues: string[];
  seeded: boolean;
  addTicket: (ticket: Omit<Ticket, "id" | "createdAt" | "toWin"> & { id?: string }) => string;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  removeTicket: (id: string) => void;
  toggleLeg: (ticketId: string, legId: string) => void;
  replaceAll: (tickets: Ticket[]) => void;
  openDraft: (partial?: Partial<Draft>) => void;
  closeDraft: () => void;
  setDraft: (patch: Partial<Draft>) => void;
  addDraftLeg: (leg: Omit<BetLeg, "id">) => void;
  removeDraftLeg: (legId: string) => void;
  bookDraft: () => string | null;
  setEnabledLeagues: (ids: string[]) => void;
  markSeeded: () => void;
};

const emptyDraft = (): Draft => ({
  label: "",
  stake: 10,
  odds: -110,
  legs: [],
});

export const useBook = create<BookState>()(
  persist(
    (set, get) => ({
      tickets: [],
      draft: null,
      enabledLeagues: DEFAULT_LEAGUE_IDS,
      seeded: false,
      addTicket: (ticket) => {
        const id = ticket.id ?? uid("tix");
        const toWin = payout(ticket.stake, ticket.odds);
        const next: Ticket = {
          ...ticket,
          id,
          createdAt: Date.now(),
          toWin,
        };
        set({ tickets: [next, ...get().tickets] });
        return id;
      },
      updateTicket: (id, patch) => {
        set({
          tickets: get().tickets.map((t) => {
            if (t.id !== id) return t;
            const merged = { ...t, ...patch };
            merged.toWin = payout(merged.stake, merged.odds);
            return merged;
          }),
        });
      },
      removeTicket: (id) => set({ tickets: get().tickets.filter((t) => t.id !== id) }),
      toggleLeg: (ticketId, legId) => {
        set({
          tickets: get().tickets.map((t) =>
            t.id !== ticketId
              ? t
              : {
                  ...t,
                  legs: t.legs.map((l) => (l.id === legId ? { ...l, checked: !l.checked } : l)),
                },
          ),
        });
      },
      replaceAll: (tickets) => set({ tickets, seeded: true }),
      openDraft: (partial) =>
        set({
          draft: { ...emptyDraft(), ...partial, legs: partial?.legs ? [...partial.legs] : [] },
        }),
      closeDraft: () => set({ draft: null }),
      setDraft: (patch) => {
        const draft = get().draft;
        if (!draft) return;
        set({ draft: { ...draft, ...patch } });
      },
      addDraftLeg: (leg) => {
        const draft = get().draft ?? emptyDraft();
        const next = { ...leg, id: uid("leg") };
        const label =
          draft.label ||
          (draft.legs.length === 0 ? next.selection : `${draft.legs.length + 1}-leg parlay`);
        set({
          draft: {
            ...draft,
            label,
            focusEventId: next.eventId,
            legs: [...draft.legs, next],
          },
        });
      },
      removeDraftLeg: (legId) => {
        const draft = get().draft;
        if (!draft) return;
        set({ draft: { ...draft, legs: draft.legs.filter((l) => l.id !== legId) } });
      },
      bookDraft: () => {
        const draft = get().draft;
        if (!draft || !draft.legs.length) return null;
        const id = get().addTicket({
          label: draft.label || (draft.legs.length > 1 ? `${draft.legs.length}-leg parlay` : draft.legs[0]!.selection),
          legs: draft.legs,
          stake: draft.stake,
          odds: draft.odds,
        });
        set({ draft: null });
        return id;
      },
      setEnabledLeagues: (ids) => set({ enabledLeagues: ids.length ? ids : DEFAULT_LEAGUE_IDS }),
      markSeeded: () => set({ seeded: true }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        tickets: s.tickets,
        enabledLeagues: s.enabledLeagues,
        seeded: s.seeded,
      }),
    },
  ),
);

export function useBookHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useBook.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useBook.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

/** Turn on sports added after the user's book was first saved. */
export function ensureNewLeagues() {
  const { enabledLeagues, setEnabledLeagues } = useBook.getState();
  const extras = LEAGUES.map((l) => l.id).filter((id) => !SHIPPED_V1.has(id) && !enabledLeagues.includes(id));
  if (extras.length) setEnabledLeagues([...enabledLeagues, ...extras]);
}

export function seedFromSlate(games: Game[]) {
  const { tickets, seeded, addTicket, markSeeded } = useBook.getState();
  if (seeded || tickets.length) {
    if (!seeded) markSeeded();
    return;
  }
  const live = games.filter((g) => g.state === "in");
  const upcoming = games.filter((g) => g.state === "pre");
  const pool = [...live, ...upcoming].slice(0, 6);
  if (!pool.length) {
    markSeeded();
    return;
  }

  const first =
    games.find((g) => g.sport === "baseball" && g.state === "in") ??
    games.find((g) => g.sport === "baseball") ??
    pool[0]!;
  const ev = eventLabel(first);

  if (first.sport === "baseball") {
    addTicket({
      label: ev,
      stake: 25,
      odds: first.odds?.homeMl ?? -120,
      sample: true,
      legs: [
        {
          id: uid("leg"),
          kind: "moneyline",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: `${first.home.abbr} to win`,
          teamAbbr: first.home.abbr,
        },
        {
          id: uid("leg"),
          kind: "first_inning_draw",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: "1st inning draw",
        },
        {
          id: uid("leg"),
          kind: "period_winner",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: `${first.home.abbr} Thru 1`,
          teamAbbr: first.home.abbr,
          period: "1",
        },
      ],
    });
  } else {
    addTicket({
      label: ev,
      stake: 25,
      odds: first.odds?.homeMl ?? -120,
      sample: true,
      legs: [
        {
          id: uid("leg"),
          kind: "moneyline",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: `${first.home.abbr} to win`,
          teamAbbr: first.home.abbr,
        },
      ],
    });
  }

  if (first.odds?.overUnder) {
    addTicket({
      label: `${first.shortName} total`,
      stake: 15,
      odds: first.odds.underOdds ?? -110,
      sample: true,
      legs: [
        {
          id: uid("leg"),
          kind: "total",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: `Under ${first.odds.overUnder}`,
          line: first.odds.overUnder,
          side: "under",
        },
      ],
    });
  }

  const second = pool.find((g) => g.id !== first.id);
  if (second) {
    addTicket({
      label: "Two-leg sampler",
      stake: 20,
      odds: 260,
      sample: true,
      legs: [
        {
          id: uid("leg"),
          kind: "moneyline",
          leagueId: first.leagueId,
          eventId: first.id,
          eventLabel: ev,
          selection: `${first.away.abbr} ML`,
          teamAbbr: first.away.abbr,
        },
        {
          id: uid("leg"),
          kind: "spread",
          leagueId: second.leagueId,
          eventId: second.id,
          eventLabel: eventLabel(second),
          selection: `${second.home.abbr} ${second.odds?.homeSpread ?? -1.5}`,
          teamAbbr: second.home.abbr,
          line: second.odds?.homeSpread ?? -1.5,
        },
      ],
    });
  }

  markSeeded();
}

const UFC330 = {
  islam: {
    eventId: "401869336",
    eventLabel: "Makhachev vs Machado Garry",
  },
  dern: {
    eventId: "401878072",
    eventLabel: "Dern vs Robertson",
  },
  turner: {
    eventId: "401886764",
    eventLabel: "Turner vs Fernandes",
  },
  brewers: {
    eventId: "401816545",
    eventLabel: "MIL @ LAD",
  },
} as const;

function u45Islam(): BetLeg {
  return {
    id: "leg-islam-u45",
    kind: "total",
    leagueId: "ufc",
    eventId: UFC330.islam.eventId,
    eventLabel: UFC330.islam.eventLabel,
    selection: "Under 4.5 rounds",
    line: 4.5,
    side: "under",
    odds: 130,
  };
}

/** Tonight's live card — upserted so the book matches the written tickets. */
export function ensureTonightTickets() {
  const { tickets, addTicket, updateTicket } = useBook.getState();
  const wanted: Array<Omit<Ticket, "createdAt" | "toWin"> & { id: string }> = [
    {
      id: "tix-ufc330-brewers-u45",
      label: "Brewers + U 4.5",
      stake: 25,
      odds: 320,
      legs: [
        {
          id: "leg-mil-ml",
          kind: "moneyline",
          leagueId: "mlb",
          eventId: UFC330.brewers.eventId,
          eventLabel: UFC330.brewers.eventLabel,
          selection: "MIL Brewers ML",
          teamAbbr: "MIL",
          odds: -120,
        },
        { ...u45Islam(), id: "leg-islam-u45-a" },
      ],
    },
    {
      id: "tix-ufc330-3leg",
      label: "UFC 330 3-leg",
      stake: 25,
      odds: 524,
      legs: [
        { ...u45Islam(), id: "leg-islam-u45-b" },
        {
          id: "leg-dern-ml",
          kind: "moneyline",
          leagueId: "ufc",
          eventId: UFC330.dern.eventId,
          eventLabel: UFC330.dern.eventLabel,
          selection: "Mackenzie Dern to win",
          teamAbbr: "DERN",
          odds: -215,
        },
        {
          id: "leg-turner-ml",
          kind: "moneyline",
          leagueId: "ufc",
          eventId: UFC330.turner.eventId,
          eventLabel: UFC330.turner.eventLabel,
          selection: "Jalin Turner to win",
          teamAbbr: "TURNER",
          odds: -117,
        },
      ],
    },
    {
      id: "tix-ufc330-u45",
      label: "Makhachev vs Garry U 4.5",
      stake: 79,
      odds: 130,
      legs: [{ ...u45Islam(), id: "leg-islam-u45-c" }],
    },
  ];
  for (const t of wanted) {
    const existing = tickets.find((x) => x.id === t.id);
    if (existing) {
      const same =
        existing.stake === t.stake &&
        existing.odds === t.odds &&
        existing.legs.length === t.legs.length &&
        existing.legs.every((l, i) => l.eventId === t.legs[i]?.eventId && l.kind === t.legs[i]?.kind && l.side === t.legs[i]?.side && l.line === t.legs[i]?.line);
      if (!same) updateTicket(t.id, { label: t.label, stake: t.stake, odds: t.odds, legs: t.legs });
    } else {
      addTicket(t);
    }
  }
}
