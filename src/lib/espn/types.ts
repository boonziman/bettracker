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
  /** Golf to-par, racing laps, tennis games in a set — shown instead of raw score when set. */
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
  batter?: string;
  pitcher?: string;
};

export type PlayerLine = {
  id: string;
  name: string;
  shortName: string;
  teamAbbr?: string;
  group: string;
  stats: Record<string, string>;
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
};

export type GameDetail = Game & {
  plays: { id: string; text: string; period?: string; clock?: string }[];
  players: PlayerLine[];
  notes?: string;
};
