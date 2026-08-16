export type SportFamily =
  | "football"
  | "basketball"
  | "baseball"
  | "hockey"
  | "soccer"
  | "mma"
  | "golf"
  | "racing"
  | "tennis";

export type LeagueDef = {
  id: string;
  label: string;
  short: string;
  sport: SportFamily;
  espnSport: string;
  espnLeague: string;
  path: string;
  periodLabel: string;
  spreadLabel: string;
  totalLabel: string;
};

export const LEAGUES: LeagueDef[] = [
  { id: "nfl", label: "NFL", short: "NFL", sport: "football", espnSport: "football", espnLeague: "nfl", path: "nfl", periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "cfb", label: "College Football", short: "CFB", sport: "football", espnSport: "football", espnLeague: "college-football", path: "college-football", periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "nba", label: "NBA", short: "NBA", sport: "basketball", espnSport: "basketball", espnLeague: "nba", path: "nba", periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "wnba", label: "WNBA", short: "WNBA", sport: "basketball", espnSport: "basketball", espnLeague: "wnba", path: "wnba", periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "ncaam", label: "Men's College Hoops", short: "NCAAM", sport: "basketball", espnSport: "basketball", espnLeague: "mens-college-basketball", path: "mens-college-basketball", periodLabel: "H", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "ncaaw", label: "Women's College Hoops", short: "NCAAW", sport: "basketball", espnSport: "basketball", espnLeague: "womens-college-basketball", path: "womens-college-basketball", periodLabel: "H", spreadLabel: "Spread", totalLabel: "Total" },
  { id: "mlb", label: "MLB", short: "MLB", sport: "baseball", espnSport: "baseball", espnLeague: "mlb", path: "mlb", periodLabel: "Inn", spreadLabel: "Run line", totalLabel: "Total" },
  { id: "nhl", label: "NHL", short: "NHL", sport: "hockey", espnSport: "hockey", espnLeague: "nhl", path: "nhl", periodLabel: "P", spreadLabel: "Puck line", totalLabel: "Total" },
  { id: "epl", label: "Premier League", short: "EPL", sport: "soccer", espnSport: "soccer", espnLeague: "eng.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "laliga", label: "La Liga", short: "LALIGA", sport: "soccer", espnSport: "soccer", espnLeague: "esp.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "seriea", label: "Serie A", short: "SERIE A", sport: "soccer", espnSport: "soccer", espnLeague: "ita.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "bundesliga", label: "Bundesliga", short: "BUND", sport: "soccer", espnSport: "soccer", espnLeague: "ger.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "ligue1", label: "Ligue 1", short: "L1", sport: "soccer", espnSport: "soccer", espnLeague: "fra.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "mls", label: "MLS", short: "MLS", sport: "soccer", espnSport: "soccer", espnLeague: "usa.1", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "ucl", label: "Champions League", short: "UCL", sport: "soccer", espnSport: "soccer", espnLeague: "uefa.champions", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "nwsl", label: "NWSL", short: "NWSL", sport: "soccer", espnSport: "soccer", espnLeague: "usa.nwsl", path: "soccer", periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
  { id: "ufc", label: "UFC", short: "UFC", sport: "mma", espnSport: "mma", espnLeague: "ufc", path: "mma", periodLabel: "Rd", spreadLabel: "Spread", totalLabel: "Rounds" },
  { id: "pga", label: "PGA Tour", short: "PGA", sport: "golf", espnSport: "golf", espnLeague: "pga", path: "golf", periodLabel: "Rd", spreadLabel: "—", totalLabel: "—" },
  { id: "f1", label: "Formula 1", short: "F1", sport: "racing", espnSport: "racing", espnLeague: "f1", path: "f1", periodLabel: "Lap", spreadLabel: "—", totalLabel: "—" },
];

export const DEFAULT_LEAGUE_IDS = [
  "nfl",
  "cfb",
  "nba",
  "wnba",
  "mlb",
  "nhl",
  "epl",
  "laliga",
  "seriea",
  "mls",
  "ufc",
];

export function leagueById(id: string) {
  return LEAGUES.find((l) => l.id === id);
}

export function scoreboardUrl(league: LeagueDef, dates?: string) {
  const base = `https://site.api.espn.com/apis/site/v2/sports/${league.espnSport}/${league.espnLeague}/scoreboard`;
  const params = new URLSearchParams();
  if (dates) params.set("dates", dates);
  if (league.sport === "football" && league.id === "cfb") params.set("limit", "80");
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function summaryUrl(league: LeagueDef, eventId: string) {
  return `https://site.api.espn.com/apis/site/v2/sports/${league.espnSport}/${league.espnLeague}/summary?event=${encodeURIComponent(eventId)}`;
}

export function gamecastHref(league: LeagueDef, eventId: string) {
  if (league.sport === "soccer") {
    return `https://www.espn.com/soccer/match/_/gameId/${eventId}`;
  }
  if (league.sport === "mma") {
    return `https://www.espn.com/mma/fightcenter/_/id/${eventId}/league/ufc`;
  }
  return `https://www.espn.com/${league.path}/game/_/gameId/${eventId}`;
}

export type PropCatalog = {
  key: string;
  label: string;
  group: string;
  stat: string;
};

export function propCatalog(sport: SportFamily): PropCatalog[] {
  switch (sport) {
    case "baseball":
      return [
        { key: "pitch.K", label: "Strikeouts", group: "pitching", stat: "K" },
        { key: "pitch.IP", label: "Innings pitched", group: "pitching", stat: "IP" },
        { key: "pitch.H", label: "Hits allowed", group: "pitching", stat: "H" },
        { key: "pitch.ER", label: "Earned runs", group: "pitching", stat: "ER" },
        { key: "pitch.BB", label: "Walks allowed", group: "pitching", stat: "BB" },
        { key: "bat.H", label: "Hits", group: "batting", stat: "H" },
        { key: "bat.R", label: "Runs", group: "batting", stat: "R" },
        { key: "bat.RBI", label: "RBIs", group: "batting", stat: "RBI" },
        { key: "bat.HR", label: "Home runs", group: "batting", stat: "HR" },
        { key: "bat.TB", label: "Total bases", group: "batting", stat: "TB" },
        { key: "bat.K", label: "Batter Ks", group: "batting", stat: "K" },
      ];
    case "basketball":
      return [
        { key: "pts", label: "Points", group: "", stat: "PTS" },
        { key: "reb", label: "Rebounds", group: "", stat: "REB" },
        { key: "ast", label: "Assists", group: "", stat: "AST" },
        { key: "three", label: "Threes", group: "", stat: "3PT" },
        { key: "stl", label: "Steals", group: "", stat: "STL" },
        { key: "blk", label: "Blocks", group: "", stat: "BLK" },
        { key: "to", label: "Turnovers", group: "", stat: "TO" },
        { key: "pra", label: "Pts+Reb+Ast", group: "", stat: "PRA" },
      ];
    case "football":
      return [
        { key: "pass.yds", label: "Pass yards", group: "passing", stat: "YDS" },
        { key: "pass.td", label: "Pass TDs", group: "passing", stat: "TD" },
        { key: "pass.int", label: "Interceptions", group: "passing", stat: "INT" },
        { key: "pass.cmp", label: "Completions", group: "passing", stat: "C/ATT" },
        { key: "rush.yds", label: "Rush yards", group: "rushing", stat: "YDS" },
        { key: "rush.td", label: "Rush TDs", group: "rushing", stat: "TD" },
        { key: "rec.yds", label: "Rec yards", group: "receiving", stat: "YDS" },
        { key: "rec.rec", label: "Receptions", group: "receiving", stat: "REC" },
        { key: "rec.td", label: "Rec TDs", group: "receiving", stat: "TD" },
      ];
    case "hockey":
      return [
        { key: "g", label: "Goals", group: "", stat: "G" },
        { key: "a", label: "Assists", group: "", stat: "A" },
        { key: "sog", label: "Shots", group: "", stat: "SOG" },
        { key: "sv", label: "Saves", group: "", stat: "SV" },
      ];
    case "soccer":
      return [
        { key: "g", label: "Goals", group: "", stat: "G" },
        { key: "a", label: "Assists", group: "", stat: "A" },
        { key: "sot", label: "Shots on target", group: "", stat: "SOT" },
        { key: "s", label: "Shots", group: "", stat: "S" },
      ];
    default:
      return [];
  }
}
