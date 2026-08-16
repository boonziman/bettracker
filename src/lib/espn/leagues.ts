export type SportFamily =
  | "football"
  | "basketball"
  | "baseball"
  | "hockey"
  | "soccer"
  | "mma"
  | "golf"
  | "racing"
  | "tennis"
  | "rugby"
  | "lacrosse"
  | "softball"
  | "afl";

export type LeagueFamily = "us" | "soccer" | "fight" | "racket" | "motors" | "world";

export type LeagueDef = {
  id: string;
  label: string;
  short: string;
  sport: SportFamily;
  family: LeagueFamily;
  espnSport: string;
  espnLeague: string;
  path: string;
  periodLabel: string;
  spreadLabel: string;
  totalLabel: string;
};

function L(
  id: string,
  label: string,
  short: string,
  sport: SportFamily,
  family: LeagueFamily,
  espnSport: string,
  espnLeague: string,
  path: string,
  extra: Partial<Pick<LeagueDef, "periodLabel" | "spreadLabel" | "totalLabel">> = {},
): LeagueDef {
  const defaults: Record<SportFamily, Pick<LeagueDef, "periodLabel" | "spreadLabel" | "totalLabel">> = {
    football: { periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
    basketball: { periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
    baseball: { periodLabel: "Inn", spreadLabel: "Run line", totalLabel: "Total" },
    softball: { periodLabel: "Inn", spreadLabel: "Run line", totalLabel: "Total" },
    hockey: { periodLabel: "P", spreadLabel: "Puck line", totalLabel: "Total" },
    soccer: { periodLabel: "'", spreadLabel: "AH", totalLabel: "Total" },
    mma: { periodLabel: "Rd", spreadLabel: "Spread", totalLabel: "Rounds" },
    golf: { periodLabel: "Rd", spreadLabel: "—", totalLabel: "—" },
    racing: { periodLabel: "Lap", spreadLabel: "—", totalLabel: "—" },
    tennis: { periodLabel: "Set", spreadLabel: "Games", totalLabel: "Games" },
    rugby: { periodLabel: "H", spreadLabel: "Spread", totalLabel: "Total" },
    lacrosse: { periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
    afl: { periodLabel: "Q", spreadLabel: "Spread", totalLabel: "Total" },
  };
  return { id, label, short, sport, family, espnSport, espnLeague, path, ...defaults[sport], ...extra };
}

export const LEAGUES: LeagueDef[] = [
  L("nfl", "NFL", "NFL", "football", "us", "football", "nfl", "nfl"),
  L("cfb", "College Football", "CFB", "football", "us", "football", "college-football", "college-football"),
  L("ufl", "UFL", "UFL", "football", "us", "football", "ufl", "ufl"),
  L("cfl", "CFL", "CFL", "football", "world", "football", "cfl", "cfl"),
  L("nba", "NBA", "NBA", "basketball", "us", "basketball", "nba", "nba"),
  L("wnba", "WNBA", "WNBA", "basketball", "us", "basketball", "wnba", "wnba"),
  L("gleague", "NBA G League", "G", "basketball", "us", "basketball", "nba-development", "nba-g-league"),
  L("ncaam", "Men's College Hoops", "NCAAM", "basketball", "us", "basketball", "mens-college-basketball", "mens-college-basketball", { periodLabel: "H" }),
  L("ncaaw", "Women's College Hoops", "NCAAW", "basketball", "us", "basketball", "womens-college-basketball", "womens-college-basketball", { periodLabel: "H" }),
  L("mlb", "MLB", "MLB", "baseball", "us", "baseball", "mlb", "mlb"),
  L("ncaab", "College Baseball", "NCAAB", "baseball", "us", "baseball", "college-baseball", "college-baseball"),
  L("ncaasb", "College Softball", "SOFT", "softball", "us", "baseball", "college-softball", "college-softball"),
  L("nhl", "NHL", "NHL", "hockey", "us", "hockey", "nhl", "nhl"),
  L("ncaah", "College Hockey", "NCAAH", "hockey", "us", "hockey", "mens-college-hockey", "mens-college-hockey"),
  L("pll", "Premier Lacrosse", "PLL", "lacrosse", "us", "lacrosse", "pll", "lacrosse"),

  L("ufc", "UFC", "UFC", "mma", "fight", "mma", "ufc", "mma"),
  L("pfl", "PFL", "PFL", "mma", "fight", "mma", "pfl", "mma"),
  L("bellator", "Bellator", "BELL", "mma", "fight", "mma", "bellator", "mma"),

  L("atp", "ATP Tennis", "ATP", "tennis", "racket", "tennis", "atp", "tennis"),
  L("wta", "WTA Tennis", "WTA", "tennis", "racket", "tennis", "wta", "tennis"),

  L("pga", "PGA Tour", "PGA", "golf", "motors", "golf", "pga", "golf"),
  L("lpga", "LPGA", "LPGA", "golf", "motors", "golf", "lpga", "golf"),
  L("liv", "LIV Golf", "LIV", "golf", "motors", "golf", "liv", "golf"),
  L("dpworld", "DP World Tour", "DP", "golf", "motors", "golf", "eur", "golf"),

  L("f1", "Formula 1", "F1", "racing", "motors", "racing", "f1", "f1"),
  L("nascar", "NASCAR Cup", "CUP", "racing", "motors", "racing", "nascar-premier", "racing"),
  L("xfinity", "NASCAR Xfinity", "XFN", "racing", "motors", "racing", "nascar-secondary", "racing"),
  L("trucks", "NASCAR Trucks", "TRK", "racing", "motors", "racing", "nascar-truck", "racing"),
  L("indycar", "IndyCar", "INDY", "racing", "motors", "racing", "irl", "racing"),

  L("epl", "Premier League", "EPL", "soccer", "soccer", "soccer", "eng.1", "soccer"),
  L("championship", "EFL Championship", "EFL", "soccer", "soccer", "soccer", "eng.2", "soccer"),
  L("laliga", "La Liga", "LALIGA", "soccer", "soccer", "soccer", "esp.1", "soccer"),
  L("seriea", "Serie A", "SERIE A", "soccer", "soccer", "soccer", "ita.1", "soccer"),
  L("bundesliga", "Bundesliga", "BUND", "soccer", "soccer", "soccer", "ger.1", "soccer"),
  L("ligue1", "Ligue 1", "L1", "soccer", "soccer", "soccer", "fra.1", "soccer"),
  L("ere", "Eredivisie", "ERE", "soccer", "soccer", "soccer", "ned.1", "soccer"),
  L("por", "Primeira Liga", "POR", "soccer", "soccer", "soccer", "por.1", "soccer"),
  L("spl", "Scottish Premiership", "SPL", "soccer", "soccer", "soccer", "sco.1", "soccer"),
  L("bel", "Belgian Pro League", "BEL", "soccer", "soccer", "soccer", "bel.1", "soccer"),
  L("tur", "Süper Lig", "TUR", "soccer", "soccer", "soccer", "tur.1", "soccer"),
  L("ksa", "Saudi Pro League", "KSA", "soccer", "soccer", "soccer", "ksa.1", "soccer"),
  L("mls", "MLS", "MLS", "soccer", "us", "soccer", "usa.1", "soccer"),
  L("ligamx", "Liga MX", "MX", "soccer", "soccer", "soccer", "mex.1", "soccer"),
  L("bra", "Brasileirão", "BRA", "soccer", "soccer", "soccer", "bra.1", "soccer"),
  L("arg", "Liga Profesional", "ARG", "soccer", "soccer", "soccer", "arg.1", "soccer"),
  L("jpn", "J1 League", "J1", "soccer", "soccer", "soccer", "jpn.1", "soccer"),
  L("aus", "A-League", "A-LG", "soccer", "soccer", "soccer", "aus.1", "soccer"),
  L("usl", "USL Championship", "USL", "soccer", "us", "soccer", "usa.usl.1", "soccer"),
  L("nwsl", "NWSL", "NWSL", "soccer", "us", "soccer", "usa.nwsl", "soccer"),
  L("ucl", "Champions League", "UCL", "soccer", "soccer", "soccer", "uefa.champions", "soccer"),
  L("uel", "Europa League", "UEL", "soccer", "soccer", "soccer", "uefa.europa", "soccer"),
  L("uecl", "Conference League", "UECL", "soccer", "soccer", "soccer", "uefa.europa.conf", "soccer"),
  L("lib", "Libertadores", "LIB", "soccer", "soccer", "soccer", "conmebol.libertadores", "soccer"),
  L("sud", "Sudamericana", "SUD", "soccer", "soccer", "soccer", "conmebol.sudamericana", "soccer"),
  L("nations", "UEFA Nations League", "UNL", "soccer", "soccer", "soccer", "uefa.nations", "soccer"),
  L("fifa", "FIFA Internationals", "FIFA", "soccer", "soccer", "soccer", "fifa.world", "soccer"),

  L("urc", "United Rugby Championship", "URC", "rugby", "world", "rugby", "270557", "rugby"),
  L("premrugby", "Premiership Rugby", "PREM", "rugby", "world", "rugby", "267979", "rugby"),
  L("superrugby", "Super Rugby", "SR", "rugby", "world", "rugby", "242041", "rugby"),
  L("sixnations", "Six Nations", "6N", "rugby", "world", "rugby", "180659", "rugby"),
  L("afl", "AFL", "AFL", "afl", "world", "australian-football", "afl", "australian-football"),
];

/** Leagues that shipped before the universal-sport expansion. Used to merge new ids into existing books. */
export const SHIPPED_V1 = new Set([
  "nfl",
  "cfb",
  "nba",
  "wnba",
  "ncaam",
  "ncaaw",
  "mlb",
  "nhl",
  "epl",
  "laliga",
  "seriea",
  "bundesliga",
  "ligue1",
  "mls",
  "ucl",
  "nwsl",
  "ufc",
  "pga",
  "f1",
]);

export const DEFAULT_LEAGUE_IDS = LEAGUES.map((l) => l.id);

export const FAMILIES: { id: LeagueFamily | "all" | "live"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "us", label: "US" },
  { id: "soccer", label: "Soccer" },
  { id: "fight", label: "Fight" },
  { id: "racket", label: "Tennis" },
  { id: "motors", label: "Golf / Motor" },
  { id: "world", label: "World" },
];

export function leagueById(id: string) {
  return LEAGUES.find((l) => l.id === id);
}

export function scoreboardUrl(league: LeagueDef, dates?: string) {
  const base = `https://site.web.api.espn.com/apis/site/v2/sports/${league.espnSport}/${league.espnLeague}/scoreboard`;
  const params = new URLSearchParams();
  if (dates) params.set("dates", dates);
  if (league.sport === "football" && league.id === "cfb") params.set("limit", "80");
  if (league.sport === "tennis") params.set("limit", "300");
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function summaryUrl(league: LeagueDef, eventId: string) {
  return `https://site.web.api.espn.com/apis/site/v2/sports/${league.espnSport}/${league.espnLeague}/summary?event=${encodeURIComponent(eventId)}`;
}

export function gamecastHref(league: LeagueDef, eventId: string) {
  if (league.sport === "soccer") return `https://www.espn.com/soccer/match/_/gameId/${eventId}`;
  if (league.sport === "mma") return `https://www.espn.com/mma/fightcenter/_/id/${eventId}/league/${league.espnLeague}`;
  if (league.sport === "tennis") return `https://www.espn.com/tennis/match/_/gameId/${eventId}`;
  if (league.sport === "golf") return `https://www.espn.com/golf/leaderboard`;
  if (league.sport === "racing") return `https://www.espn.com/racing/race/_/id/${eventId}`;
  if (league.sport === "rugby") return `https://www.espn.com/rugby/match/_/gameId/${eventId}`;
  if (league.sport === "afl") return `https://www.espn.com/australian-football/game/_/gameId/${eventId}`;
  return `https://www.espn.com/${league.path}/game/_/gameId/${eventId}`;
}

export function eventLabel(game: {
  format?: string;
  away: { abbr: string; shortName: string };
  home: { abbr: string; shortName: string };
  shortName: string;
}) {
  if (game.format === "fight") return `${game.away.shortName} vs ${game.home.shortName}`;
  if (game.format === "field") return game.shortName;
  return `${game.away.abbr} @ ${game.home.abbr}`;
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
    case "softball":
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
    case "rugby":
    case "lacrosse":
    case "afl":
      return [
        { key: "g", label: "Goals", group: "", stat: "G" },
        { key: "a", label: "Assists", group: "", stat: "A" },
        { key: "sot", label: "Shots on target", group: "", stat: "SOT" },
        { key: "s", label: "Shots", group: "", stat: "S" },
      ];
    case "tennis":
      return [
        { key: "aces", label: "Aces", group: "", stat: "ACES" },
        { key: "df", label: "Double faults", group: "", stat: "DF" },
      ];
    default:
      return [];
  }
}
