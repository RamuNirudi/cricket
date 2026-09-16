export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';
export type BattingStyle = 'Right-hand bat' | 'Left-hand bat';
export type BowlingStyle = 
  | 'Right-arm fast'
  | 'Right-arm medium'
  | 'Right-arm off-spin'
  | 'Right-arm leg-spin'
  | 'Left-arm fast'
  | 'Left-arm orthodox'
  | 'Left-arm unorthodox'
  | 'None';

export interface Player {
  id: string;
  name: string;
  shortName: string;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  teamId: string;
  avatarNumber?: number;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  canManageScoreboard?: boolean; // Only ONE player per team has write/edit access
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  homeGround: string;
  logo: string; // Emoji or short badge icon
  players: Player[];
  designatedScorerPlayerId?: string; // ID of the single player who has write access to the scoreboard
}

export type MatchFormat = 'T20' | 'ODI' | 'T10' | 'The Hundred' | 'Custom';

export interface League {
  id: string;
  name: string;
  code: string;
  season: string;
  format: MatchFormat;
  maxOvers: number;
  status: 'active' | 'archived' | 'upcoming';
  teams: string[]; // Team IDs
  venues: string[];
  bannerGradient: string;
  description: string;
  year: number;
  championTeamId?: string;
  runnerUpTeamId?: string;
  playerOfTournament?: string;
}

export type ExtraType = 'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye';

export type WicketType = 
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'retired-hurt';

export interface BallRecord {
  id: string;
  overIndex: number; // 0-based over number (e.g. 0 for first over)
  ballInOver: number; // 1 to 6 (legal balls)
  isLegalBall: boolean;
  batsmanId: string;
  batsmanName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  runsBat: number; // runs off bat: 0, 1, 2, 3, 4, 6
  extraType: ExtraType;
  extraRuns: number; // 1 for wide/no-ball + any overthrows/runs
  isWicket: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  dismissedPlayerName?: string;
  fielderId?: string;
  fielderName?: string;
  commentary: string;
  timestamp: number;
  cumulativeScore: number;
  cumulativeWickets: number;
}

export interface BattingScorecardEntry {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalText?: string;
  bowlerName?: string;
  fielderName?: string;
  isBatting: boolean; // currently at the crease
  battingOrder: number;
}

export interface BowlingScorecardEntry {
  playerId: string;
  playerName: string;
  overs: number; // in cricket notation e.g. 3.4
  ballsBowled: number; // total legal balls
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  dots: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overs: string;
  playerName: string;
  dismissal: string;
}

export interface Partnership {
  batter1: string;
  batter2: string;
  runs: number;
  balls: number;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  legalBalls: number; // legal balls bowled
  oversString: string; // e.g. "15.4"
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
    total: number;
  };
  battingScorecard: BattingScorecardEntry[];
  bowlingScorecard: BowlingScorecardEntry[];
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  balls: BallRecord[];
  isDeclaredOrAllOut?: boolean;
}

export type MatchStatus = 'live' | 'completed' | 'scheduled' | 'archived';

export interface Match {
  id: string;
  leagueId: string;
  leagueName: string;
  matchTitle: string; // e.g. "Match 14: Super Kings vs Titans"
  venue: string;
  date: string;
  format: MatchFormat;
  maxOvers: number;
  team1Id: string;
  team2Id: string;
  tossWinnerId: string;
  tossDecision: 'bat' | 'bowl';
  status: MatchStatus;
  currentInningsNumber: 1 | 2;
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  currentBowlerId?: string;
  innings1: Innings;
  innings2?: Innings;
  targetRuns?: number;
  result?: string;
  playerOfTheMatch?: {
    playerId: string;
    playerName: string;
    performanceSummary: string;
  };
}

export interface TournamentArchive {
  id: string;
  leagueId: string;
  leagueName: string;
  season: string;
  year: number;
  format: MatchFormat;
  championTeam: Team;
  runnerUpTeam: Team;
  finalScore: string;
  finalMatchId?: string;
  topRunScorer: {
    playerName: string;
    teamName: string;
    runs: number;
    average: number;
    strikeRate: number;
    highScore: number;
  };
  topWicketTaker: {
    playerName: string;
    teamName: string;
    wickets: number;
    economy: number;
    bestFigures: string;
  };
  playerOfTournament: {
    playerName: string;
    teamName: string;
    stats: string;
  };
  totalMatches: number;
  standings: {
    teamName: string;
    shortName: string;
    played: number;
    won: number;
    lost: number;
    points: number;
    netRunRate: string;
  }[];
  keyMatches: Match[];
}

export interface PlayerCareerStats {
  playerId: string;
  name: string;
  teamName: string;
  role: PlayerRole;
  batting: {
    matches: number;
    innings: number;
    runs: number;
    ballsFaced: number;
    highScore: number;
    notOuts: number;
    fifties: number;
    hundreds: number;
    fours: number;
    sixes: number;
    average: number;
    strikeRate: number;
  };
  bowling: {
    innings: number;
    overs: number;
    legalBalls: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    bestFigures: string;
    economy: number;
    average: number;
    fourWickets: number;
    fiveWickets: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
  matchLog: {
    matchId: string;
    matchTitle: string;
    date: string;
    leagueName: string;
    opponent: string;
    runsScored?: number;
    ballsFaced?: number;
    wicketsTaken?: number;
    oversBowled?: number;
    runsConceded?: number;
  }[];
}
