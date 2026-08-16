import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LEAGUE_IDS } from "@/lib/espn/leagues";
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
  const ev = `${first.away.abbr} @ ${first.home.abbr}`;

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
          eventLabel: `${second.away.abbr} @ ${second.home.abbr}`,
          selection: `${second.home.abbr} ${second.odds?.homeSpread ?? -1.5}`,
          teamAbbr: second.home.abbr,
          line: second.odds?.homeSpread ?? -1.5,
        },
      ],
    });
  }

  markSeeded();
}
