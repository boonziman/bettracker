import type { SportFamily } from "./leagues";

export type GameState = "pre" | "in" | "post";
export type EventFormat = "match" | "fight" | "field";

export type Competitor = {
  id: string;
  abbr: string;
  name: string;
  shortName: string;
  logo?: string;
  score: number;
  homeAway: "home" | "away";
  record?: string;
  winner?: boolean;
  linescores: number[];
  mark?: string;
};

export type FieldEntry = {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  logo?: string;
  position: number;
  score: number;
  mark?: string;
  winner?: boolean;
};

export type GameOdds = {
  details?: string;
  spread?: number;
  overUnder?: number;
  homeMl?: number;
  awayMl?: number;
  homeSpread?: number;
  awaySpread?: number;
  homeSpreadOdds?: number;
  awaySpreadOdds?: number;
  overOdds?: number;
  underOdds?: number;
};

export type PitchOutcome = "ball" | "strike" | "foul" | "inplay";

export type Pitch = {
  id: string;
  n: number;
  result: string;
  type?: string;
  mph?: number;
  x?: number;
  y?: number;
  outcome: PitchOutcome;
};

export type CourtMark = {
  id: string;
  x: number;
  y: number;
  made?: boolean;
  home?: boolean;
  text?: string;
  scoring?: boolean;
};

export type Situation = {
  down?: number;
  distance?: number;
  downDistanceText?: string;
  possessionAbbr?: string;
  lastPlay?: string;
  balls?: number;
  strikes?: number;
  outs?: number;
  onFirst?: boolean;
  onSecond?: boolean;
  onThird?: boolean;
  runnerFirst?: string;
  runnerSecond?: string;
  runnerThird?: string;
  batter?: string;
  pitcher?: string;
  batterId?: string;
  pitcherId?: string;
  batterHeadshot?: string;
  pitcherHeadshot?: string;
  batterLine?: string;
  pitcherLine?: string;
  batterHand?: string;
  pitcherHand?: string;
  batterPos?: string;
  onDeck?: string;
  pitchCount?: number;
  batterTeamId?: string;
  pitcherTeamId?: string;
};

export type PlayerLine = {
  id: string;
  name: string;
  shortName: string;
  teamAbbr?: string;
  group: string;
  stats: Record<string, string>;
  headshot?: string;
};

export type GamePlay = {
  id: string;
  text: string;
  period?: string;
  clock?: string;
  x?: number;
  y?: number;
  shooting?: boolean;
  scoring?: boolean;
  home?: boolean;
};

export type Game = {
  id: string;
  leagueId: string;
  leagueShort: string;
  sport: SportFamily;
  format: EventFormat;
  name: string;
  shortName: string;
  date: string;
  state: GameState;
  detail: string;
  shortDetail: string;
  period?: number;
  clock?: string;
  completed: boolean;
  venue?: string;
  broadcast?: string;
  home: Competitor;
  away: Competitor;
  odds?: GameOdds;
  situation?: Situation;
  lastPlay?: string;
  headline?: string;
  weightClass?: string;
  field?: FieldEntry[];
  scheduledRounds?: number;
  clockSeconds?: number;
  fightMethod?: "ko" | "submission" | "decision";
};

export type GameDetail = Game & {
  plays: GamePlay[];
  players: PlayerLine[];
  pitches?: Pitch[];
  courtMarks?: CourtMark[];
  notes?: string;
};
