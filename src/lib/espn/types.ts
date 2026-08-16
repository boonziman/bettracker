import type { SportFamily } from "./leagues";

export type GameState = "pre" | "in" | "post";

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
};

export type GameDetail = Game & {
  plays: { id: string; text: string; period?: string; clock?: string }[];
  players: PlayerLine[];
  notes?: string;
};
