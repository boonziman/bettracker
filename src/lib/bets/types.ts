export type BetKind =
  | "moneyline"
  | "spread"
  | "total"
  | "team_total"
  | "prop"
  | "period_winner"
  | "period_total"
  | "first_inning_draw"
  | "double_result"
  | "method";

export type FightMethod = "ko" | "submission" | "decision";

export type BetSide = "over" | "under";

export type EvalStatus = "pending" | "leaning" | "threat" | "won" | "lost" | "push";

export type BetLeg = {
  id: string;
  kind: BetKind;
  leagueId: string;
  eventId: string;
  eventLabel: string;
  selection: string;
  teamAbbr?: string;
  playerName?: string;
  playerId?: string;
  statKey?: string;
  statLabel?: string;
  line?: number;
  side?: BetSide;
  period?: string;
  method?: FightMethod;
  odds?: number;
  checked?: boolean;
};

export type TicketStatus = "open" | "won" | "lost" | "push" | "void";

export type Ticket = {
  id: string;
  label: string;
  legs: BetLeg[];
  stake: number;
  odds: number;
  toWin: number;
  createdAt: number;
  notes?: string;
  sample?: boolean;
  settled?: Exclude<TicketStatus, "open">;
};

export type LegEval = {
  status: EvalStatus;
  note: string;
  current?: number;
  line?: number;
  progress?: number;
  /** Compact live value for the tracking rail: "+3", "0–0", "2 / 1.5" */
  readout?: string;
  needed?: number;
  extra?: string;
};
