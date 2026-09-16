import React, { useState } from 'react';
import { PlayerCareerStats, Team, League, Match, PlayerRole } from '../types';
import { getOrCreatePlayerStats } from '../services/storage';
import { Search, Trophy, Filter, ArrowUpDown, ChevronRight, User, Shield, Target } from 'lucide-react';

interface PlayerStatsViewProps {
  teams: Team[];
  leagues: League[];
  matches: Match[];
  selectedPlayerId?: string;
  onSelectPlayer: (playerId: string | undefined) => void;
}

export const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({
  teams,
  leagues,
  matches,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | PlayerRole>('all');
  const [sortBy, setSortBy] = useState<'runs' | 'wickets' | 'batAvg' | 'strikeRate' | 'economy'>('runs');

  // Collect all players across teams
  const allPlayers = teams.flatMap(t => t.players);

  // Compute career stats for all players
  const playerStatsList: PlayerCareerStats[] = allPlayers.map(p =>
    getOrCreatePlayerStats(p, teams, matches)
  );

  // Filter and sort
  const filteredPlayers = playerStatsList.filter(ps => {
    const matchesSearch = ps.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const teamObj = teams.find(t => t.name === ps.teamName);
    const matchesTeam = selectedTeamFilter === 'all' || (teamObj && teamObj.id === selectedTeamFilter);
    const matchesRole = selectedRoleFilter === 'all' || ps.role === selectedRoleFilter;

    return matchesSearch && matchesTeam && matchesRole;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'runs':
        return b.batting.runs - a.batting.runs;
      case 'wickets':
        return b.bowling.wickets - a.bowling.wickets;
      case 'batAvg':
        return b.batting.average - a.batting.average;
      case 'strikeRate':
        return b.batting.strikeRate - a.batting.strikeRate;
      case 'economy':
        return (a.bowling.economy || 99) - (b.bowling.economy || 99);
      default:
        return b.batting.runs - a.batting.runs;
    }
  });

  // Selected player for deep detail modal
  const activePlayerDetail = selectedPlayerId
    ? playerStatsList.find(p => p.playerId === selectedPlayerId)
    : null;

  // Stat leaders calculation
  const topRunScorer = [...playerStatsList].sort((a, b) => b.batting.runs - a.batting.runs)[0];
  const topWicketTaker = [...playerStatsList].sort((a, b) => b.bowling.wickets - a.bowling.wickets)[0];
  const topStriker = [...playerStatsList]
    .filter(p => p.batting.runs > 100)
    .sort((a, b) => b.batting.strikeRate - a.batting.strikeRate)[0];

  return (
    <div id="player-stats-view-root" className="space-y-6">
      {/* Top Statistical Leaderboard Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topRunScorer && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/30 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Orange Cap Leader</span>
              <h4 className="text-sm font-bold text-white truncate">{topRunScorer.name}</h4>
              <p className="text-xs text-slate-300 font-mono">
                <strong className="text-amber-300">{topRunScorer.batting.runs}</strong> runs (Avg {topRunScorer.batting.average})
              </p>
            </div>
          </div>
        )}

        {topWicketTaker && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-slate-900 border border-purple-500/30 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Purple Cap Leader</span>
              <h4 className="text-sm font-bold text-white truncate">{topWicketTaker.name}</h4>
              <p className="text-xs text-slate-300 font-mono">
                <strong className="text-purple-300">{topWicketTaker.bowling.wickets}</strong> wickets (Econ {topWicketTaker.bowling.economy})
              </p>
            </div>
          </div>
        )}

        {topStriker && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Strike Rate Maestro</span>
              <h4 className="text-sm font-bold text-white truncate">{topStriker.name}</h4>
              <p className="text-xs text-slate-300 font-mono">
                SR <strong className="text-emerald-300">{topStriker.batting.strikeRate}</strong> ({topStriker.batting.sixes} sixes)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="player-search-input"
            type="text"
            placeholder="Search players by name or team..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Team filter */}
          <select
            id="filter-team-select"
            value={selectedTeamFilter}
            onChange={e => setSelectedTeamFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-500"
          >
            <option value="all">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            id="filter-role-select"
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-500"
          >
            <option value="all">All Roles</option>
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="all-rounder">All-Rounder</option>
            <option value="wicket-keeper">Wicket-Keeper</option>
          </select>

          {/* Sort By */}
          <select
            id="sort-stats-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-500 font-medium"
          >
            <option value="runs">Sort by Runs</option>
            <option value="wickets">Sort by Wickets</option>
            <option value="batAvg">Sort by Batting Average</option>
            <option value="strikeRate">Sort by Strike Rate</option>
            <option value="economy">Sort by Bowling Economy</option>
          </select>
        </div>
      </div>

      {/* Players Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-right">Mat</th>
                <th className="py-3 px-3 text-right">Runs</th>
                <th className="py-3 px-3 text-right">HS</th>
                <th className="py-3 px-3 text-right">Bat Avg</th>
                <th className="py-3 px-3 text-right">SR</th>
                <th className="py-3 px-3 text-right font-bold text-purple-400">Wkts</th>
                <th className="py-3 px-3 text-right">Econ</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs italic">
                    No players found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map(p => (
                  <tr
                    key={p.playerId}
                    onClick={() => onSelectPlayer(p.playerId)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-white">
                      <div>
                        <div className="font-bold group-hover:text-emerald-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.teamName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 capitalize">
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{p.batting.matches}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">{p.batting.runs}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{p.batting.highScore}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-medium">{p.batting.average}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{p.batting.strikeRate}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-purple-400">{p.bowling.wickets}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{p.bowling.economy || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlayer(p.playerId);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        View Profile <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Detailed Player Profile & Match Logs */}
      {activePlayerDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 text-slate-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-xl font-black text-white shadow-md">
                  {activePlayerDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{activePlayerDetail.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-semibold text-emerald-400">{activePlayerDetail.teamName}</span>
                    <span>•</span>
                    <span className="capitalize">{activePlayerDetail.role}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectPlayer(undefined)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Career Batting Matrix */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                <span>Career Batting Record</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Runs</span>
                  <div className="text-lg font-black text-white font-mono">{activePlayerDetail.batting.runs}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Inns: {activePlayerDetail.batting.innings}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Batting Average</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">{activePlayerDetail.batting.average}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Not Outs: {activePlayerDetail.batting.notOuts}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Strike Rate</span>
                  <div className="text-lg font-black text-amber-400 font-mono">{activePlayerDetail.batting.strikeRate}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Balls: {activePlayerDetail.batting.ballsFaced}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Milestones</span>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {activePlayerDetail.batting.hundreds} x 100 | {activePlayerDetail.batting.fifties} x 50
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">High Score: {activePlayerDetail.batting.highScore}</span>
                </div>
              </div>
            </div>

            {/* Career Bowling Matrix */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                <span>Career Bowling Record</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Wickets</span>
                  <div className="text-lg font-black text-purple-400 font-mono">{activePlayerDetail.bowling.wickets}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Best: {activePlayerDetail.bowling.bestFigures}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Economy Rate</span>
                  <div className="text-lg font-black text-white font-mono">{activePlayerDetail.bowling.economy || '-'}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Overs: {activePlayerDetail.bowling.overs}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Bowling Average</span>
                  <div className="text-lg font-black text-white font-mono">{activePlayerDetail.bowling.average || '-'}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Maidens: {activePlayerDetail.bowling.maidens}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Catches &amp; Fielding</span>
                  <div className="text-sm font-bold text-white font-mono mt-1">
                    {activePlayerDetail.fielding.catches} catches
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Run Outs: {activePlayerDetail.fielding.runOuts}</span>
                </div>
              </div>
            </div>

            {/* Match-by-Match Performance Across Leagues */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                <span>Match Performance Log Across Leagues</span>
                <span className="text-[10px] text-emerald-400 font-mono">Verified Match History</span>
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Tournament / Match</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Batting Performance</th>
                      <th className="py-2 px-3 text-right">Bowling Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-sans">
                    {activePlayerDetail.matchLog.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                          No recent tournament matches recorded yet for this player.
                        </td>
                      </tr>
                    ) : (
                      activePlayerDetail.matchLog.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-white">{log.matchTitle}</div>
                            <div className="text-[10px] text-slate-400">{log.leagueName}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-400">{log.date}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {log.runsScored !== undefined ? (
                              <span className="text-white font-bold">
                                {log.runsScored} <span className="text-slate-400 font-normal">({log.ballsFaced}b)</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {log.wicketsTaken !== undefined ? (
                              <span className="text-purple-400 font-bold">
                                {log.wicketsTaken}/{log.runsConceded}{' '}
                                <span className="text-slate-400 font-normal">({log.oversBowled} ov)</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">DNB</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
