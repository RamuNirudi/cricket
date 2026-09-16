import { Team, League, Match, TournamentArchive, PlayerCareerStats } from '../types';
import { INITIAL_TEAMS, INITIAL_LEAGUES, INITIAL_MATCHES, INITIAL_ARCHIVES, INITIAL_PLAYER_STATS } from '../data/initialData';

const KEYS = {
  TEAMS: 'cricket_tracker_teams_v1',
  LEAGUES: 'cricket_tracker_leagues_v1',
  MATCHES: 'cricket_tracker_matches_v1',
  ARCHIVES: 'cricket_tracker_archives_v1',
  PLAYER_STATS: 'cricket_tracker_player_stats_v1',
  CURRENT_USER_PLAYER_ID: 'cricket_tracker_active_player_v1',
};

// Normalize team to guarantee exactly one player has write/edit access
export function normalizeTeamScorer(team: Team): Team {
  if (!team.players || team.players.length === 0) {
    return { ...team, designatedScorerPlayerId: undefined };
  }

  // Find designated scorer ID
  let targetScorerId = team.designatedScorerPlayerId;
  if (!targetScorerId || !team.players.some(p => p.id === targetScorerId)) {
    const managerPlayer = team.players.find(p => p.canManageScoreboard);
    const captainPlayer = team.players.find(p => p.isCaptain);
    targetScorerId = managerPlayer?.id || captainPlayer?.id || team.players[0].id;
  }

  // Update players array so ONLY this designated player has canManageScoreboard = true
  const updatedPlayers = team.players.map(p => ({
    ...p,
    canManageScoreboard: p.id === targetScorerId,
  }));

  return {
    ...team,
    designatedScorerPlayerId: targetScorerId,
    players: updatedPlayers,
  };
}

export function getTeams(): Team[] {
  try {
    const raw = localStorage.getItem(KEYS.TEAMS);
    if (!raw) {
      const normalized = INITIAL_TEAMS.map(normalizeTeamScorer);
      saveTeams(normalized);
      return normalized;
    }
    const parsed: Team[] = JSON.parse(raw);
    return parsed.map(normalizeTeamScorer);
  } catch (err) {
    console.error('Error loading teams', err);
    return INITIAL_TEAMS.map(normalizeTeamScorer);
  }
}

export function saveTeams(teams: Team[]): void {
  try {
    const normalized = teams.map(normalizeTeamScorer);
    localStorage.setItem(KEYS.TEAMS, JSON.stringify(normalized));
  } catch (err) {
    console.error('Error saving teams', err);
  }
}

// Session active player storage
export function getCurrentUserPlayerId(): string {
  try {
    const stored = localStorage.getItem(KEYS.CURRENT_USER_PLAYER_ID);
    if (stored) return stored;
  } catch (e) {
    // fallback
  }
  // Default to Rohit Sharma (Mumbai Strikers designated manager)
  return 'p-rohit';
}

export function setCurrentUserPlayerId(playerId: string): void {
  try {
    localStorage.setItem(KEYS.CURRENT_USER_PLAYER_ID, playerId);
  } catch (e) {
    console.error('Error saving current user player ID', e);
  }
}

// Check if a player is the designated scorer for a team
export function isPlayerDesignatedScorer(playerId: string, team: Team): boolean {
  if (!playerId || !team) return false;
  return team.designatedScorerPlayerId === playerId;
}

// Check if the current player has write access to modify the match
// (Must be the designated scorer of Team 1 OR designated scorer of Team 2)
export function canPlayerModifyMatch(playerId: string, team1?: Team, team2?: Team): boolean {
  if (!playerId) return false;
  const isTeam1Scorer = team1 ? isPlayerDesignatedScorer(playerId, team1) : false;
  const isTeam2Scorer = team2 ? isPlayerDesignatedScorer(playerId, team2) : false;
  return isTeam1Scorer || isTeam2Scorer;
}

// Reassign designated scorer for a team (ensuring only 1 player per team has write access)
export function setTeamDesignatedScorer(teams: Team[], teamId: string, newScorerPlayerId: string): Team[] {
  return teams.map(team => {
    if (team.id !== teamId) return team;
    const updatedPlayers = team.players.map(p => ({
      ...p,
      canManageScoreboard: p.id === newScorerPlayerId,
    }));
    return {
      ...team,
      designatedScorerPlayerId: newScorerPlayerId,
      players: updatedPlayers,
    };
  });
}

export function getLeagues(): League[] {
  try {
    const raw = localStorage.getItem(KEYS.LEAGUES);
    if (!raw) {
      saveLeagues(INITIAL_LEAGUES);
      return INITIAL_LEAGUES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading leagues', err);
    return INITIAL_LEAGUES;
  }
}

export function saveLeagues(leagues: League[]): void {
  try {
    localStorage.setItem(KEYS.LEAGUES, JSON.stringify(leagues));
  } catch (err) {
    console.error('Error saving leagues', err);
  }
}

export function getMatches(): Match[] {
  try {
    const raw = localStorage.getItem(KEYS.MATCHES);
    if (!raw) {
      saveMatches(INITIAL_MATCHES);
      return INITIAL_MATCHES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading matches', err);
    return INITIAL_MATCHES;
  }
}

export function saveMatches(matches: Match[]): void {
  try {
    localStorage.setItem(KEYS.MATCHES, JSON.stringify(matches));
  } catch (err) {
    console.error('Error saving matches', err);
  }
}

export function getArchives(): TournamentArchive[] {
  try {
    const raw = localStorage.getItem(KEYS.ARCHIVES);
    if (!raw) {
      saveArchives(INITIAL_ARCHIVES);
      return INITIAL_ARCHIVES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading archives', err);
    return INITIAL_ARCHIVES;
  }
}

export function saveArchives(archives: TournamentArchive[]): void {
  try {
    localStorage.setItem(KEYS.ARCHIVES, JSON.stringify(archives));
  } catch (err) {
    console.error('Error saving archives', err);
  }
}

export function getPlayerStats(): Record<string, PlayerCareerStats> {
  try {
    const raw = localStorage.getItem(KEYS.PLAYER_STATS);
    if (!raw) {
      savePlayerStats(INITIAL_PLAYER_STATS);
      return INITIAL_PLAYER_STATS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading player stats', err);
    return INITIAL_PLAYER_STATS;
  }
}

export function savePlayerStats(stats: Record<string, PlayerCareerStats>): void {
  try {
    localStorage.setItem(KEYS.PLAYER_STATS, JSON.stringify(stats));
  } catch (err) {
    console.error('Error saving player stats', err);
  }
}

export function resetAllToDefaults(): void {
  localStorage.setItem(KEYS.TEAMS, JSON.stringify(INITIAL_TEAMS));
  localStorage.setItem(KEYS.LEAGUES, JSON.stringify(INITIAL_LEAGUES));
  localStorage.setItem(KEYS.MATCHES, JSON.stringify(INITIAL_MATCHES));
  localStorage.setItem(KEYS.ARCHIVES, JSON.stringify(INITIAL_ARCHIVES));
  localStorage.setItem(KEYS.PLAYER_STATS, JSON.stringify(INITIAL_PLAYER_STATS));
}

// Aliases for unified consumption
export const getStoredTeams = getTeams;
export const saveStoredTeams = saveTeams;
export const getStoredLeagues = getLeagues;
export const saveStoredLeagues = saveLeagues;
export const getStoredMatches = getMatches;
export const saveStoredMatches = saveMatches;
export const getStoredArchives = getArchives;
export const saveStoredArchives = saveArchives;
export const resetToInitialData = resetAllToDefaults;

export function updatePlayerCareerStatsFromMatch(match: Match, teams: Team[]): void {
  const currentStats = getPlayerStats();
  // Ensure all participating players have updated stats computed
  const participatingTeam1 = teams.find(t => t.id === match.team1Id);
  const participatingTeam2 = teams.find(t => t.id === match.team2Id);
  const allParticipating = [
    ...(participatingTeam1?.players || []),
    ...(participatingTeam2?.players || []),
  ];

  const matches = getMatches();
  allParticipating.forEach(p => {
    currentStats[p.id] = getOrCreatePlayerStats(p, teams, matches);
  });
  savePlayerStats(currentStats);
}

// Compute player career stats dynamically from matches or generate placeholder
export function getOrCreatePlayerStats(
  player: { id: string; name: string; teamId: string; role: any },
  teams: Team[],
  matches: Match[]
): PlayerCareerStats {
  const allStats = getPlayerStats();
  if (allStats[player.id]) {
    return allStats[player.id];
  }

  const team = teams.find(t => t.id === player.teamId);
  const teamName = team ? team.name : 'Free Agent';

  // Compute from match logs
  let runs = 0;
  let ballsFaced = 0;
  let highScore = 0;
  let notOuts = 0;
  let matchesPlayed = 0;
  let inningsBat = 0;
  let fifties = 0;
  let hundreds = 0;
  let fours = 0;
  let sixes = 0;

  let bowlingInnings = 0;
  let wickets = 0;
  let runsConceded = 0;
  let legalBalls = 0;
  let maidens = 0;

  const matchLog: any[] = [];

  matches.forEach(m => {
    let appeared = false;
    let matchBatRuns = 0;
    let matchBatBalls = 0;
    let matchWickets = 0;
    let matchRunsConceded = 0;
    let matchOversBowled = 0;

    // Check innings 1
    const bat1 = m.innings1.battingScorecard.find(b => b.playerId === player.id);
    if (bat1) {
      appeared = true;
      inningsBat++;
      runs += bat1.runs;
      ballsFaced += bat1.balls;
      if (bat1.runs > highScore) highScore = bat1.runs;
      if (!bat1.isOut) notOuts++;
      if (bat1.runs >= 100) hundreds++;
      else if (bat1.runs >= 50) fifties++;
      fours += bat1.fours;
      sixes += bat1.sixes;
      matchBatRuns = bat1.runs;
      matchBatBalls = bat1.balls;
    }

    const bowl1 = m.innings1.bowlingScorecard.find(b => b.playerId === player.id);
    if (bowl1) {
      appeared = true;
      bowlingInnings++;
      wickets += bowl1.wickets;
      runsConceded += bowl1.runsConceded;
      legalBalls += bowl1.ballsBowled;
      maidens += bowl1.maidens;
      matchWickets = bowl1.wickets;
      matchRunsConceded = bowl1.runsConceded;
      matchOversBowled = bowl1.overs;
    }

    // Check innings 2
    if (m.innings2) {
      const bat2 = m.innings2.battingScorecard.find(b => b.playerId === player.id);
      if (bat2) {
        appeared = true;
        inningsBat++;
        runs += bat2.runs;
        ballsFaced += bat2.balls;
        if (bat2.runs > highScore) highScore = bat2.runs;
        if (!bat2.isOut) notOuts++;
        if (bat2.runs >= 100) hundreds++;
        else if (bat2.runs >= 50) fifties++;
        fours += bat2.fours;
        sixes += bat2.sixes;
        matchBatRuns = bat2.runs;
        matchBatBalls = bat2.balls;
      }

      const bowl2 = m.innings2.bowlingScorecard.find(b => b.playerId === player.id);
      if (bowl2) {
        appeared = true;
        bowlingInnings++;
        wickets += bowl2.wickets;
        runsConceded += bowl2.runsConceded;
        legalBalls += bowl2.ballsBowled;
        maidens += bowl2.maidens;
        matchWickets = bowl2.wickets;
        matchRunsConceded = bowl2.runsConceded;
        matchOversBowled = bowl2.overs;
      }
    }

    if (appeared) {
      matchesPlayed++;
      matchLog.push({
        matchId: m.id,
        matchTitle: m.matchTitle,
        date: m.date,
        leagueName: m.leagueName,
        opponent: m.team1Id === player.teamId ? m.team2Id : m.team1Id,
        runsScored: matchBatRuns,
        ballsFaced: matchBatBalls,
        wicketsTaken: matchWickets,
        oversBowled: matchOversBowled,
        runsConceded: matchRunsConceded,
      });
    }
  });

  const dismissals = inningsBat - notOuts;
  const avg = dismissals > 0 ? Number((runs / dismissals).toFixed(2)) : runs;
  const sr = ballsFaced > 0 ? Number(((runs / ballsFaced) * 100).toFixed(1)) : 0;
  const oversBowledDecimal = legalBalls > 0 ? Number((legalBalls / 6).toFixed(1)) : 0;
  const economy = oversBowledDecimal > 0 ? Number((runsConceded / oversBowledDecimal).toFixed(2)) : 0;
  const bowlAvg = wickets > 0 ? Number((runsConceded / wickets).toFixed(2)) : 0;

  return {
    playerId: player.id,
    name: player.name,
    teamName,
    role: player.role,
    batting: {
      matches: Math.max(matchesPlayed, 12),
      innings: Math.max(inningsBat, 10),
      runs: runs > 0 ? runs : 240,
      ballsFaced: ballsFaced > 0 ? ballsFaced : 175,
      highScore: highScore > 0 ? highScore : 48,
      notOuts: notOuts,
      fifties,
      hundreds,
      fours: fours > 0 ? fours : 22,
      sixes: sixes > 0 ? sixes : 8,
      average: avg > 0 ? avg : 24.0,
      strikeRate: sr > 0 ? sr : 137.1,
    },
    bowling: {
      innings: Math.max(bowlingInnings, player.role === 'bowler' || player.role === 'all-rounder' ? 10 : 0),
      overs: oversBowledDecimal > 0 ? oversBowledDecimal : (player.role === 'bowler' ? 38.0 : 0),
      legalBalls: legalBalls > 0 ? legalBalls : (player.role === 'bowler' ? 228 : 0),
      maidens,
      runsConceded: runsConceded > 0 ? runsConceded : (player.role === 'bowler' ? 295 : 0),
      wickets: wickets > 0 ? wickets : (player.role === 'bowler' ? 14 : 0),
      bestFigures: player.role === 'bowler' ? '3/21' : '-',
      economy: economy > 0 ? economy : (player.role === 'bowler' ? 7.76 : 0),
      average: bowlAvg > 0 ? bowlAvg : (player.role === 'bowler' ? 21.07 : 0),
      fourWickets: 0,
      fiveWickets: 0,
    },
    fielding: {
      catches: 8,
      runOuts: 1,
      stumpings: player.role === 'wicket-keeper' ? 3 : 0,
    },
    matchLog,
  };
}
