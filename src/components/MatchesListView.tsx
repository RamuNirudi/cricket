import React, { useState } from 'react';
import { Match, Team, League } from '../types';
import { Play, Calendar, Trophy, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface MatchesListViewProps {
  matches: Match[];
  teams: Team[];
  leagues: League[];
  onSelectMatch: (matchId: string) => void;
  onOpenNewMatchModal: (leagueId?: string) => void;
}

export const MatchesListView: React.FC<MatchesListViewProps> = ({
  matches,
  teams,
  leagues,
  onSelectMatch,
  onOpenNewMatchModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'completed'>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');

  const filteredMatches = matches.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesLeague = leagueFilter === 'all' || m.leagueId === leagueFilter;
    return matchesStatus && matchesLeague;
  });

  return (
    <div id="matches-list-view-root" className="space-y-5">
      {/* Header and Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div>
          <h3 className="text-base font-bold text-white">Matches &amp; Fixtures Across Leagues</h3>
          <p className="text-xs text-slate-400">
            Monitor real-time matches, scheduled clashes, and completed scorecards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-list-new-match"
            onClick={() => onOpenNewMatchModal()}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
          >
            <Play className="w-4 h-4" /> Start New Match
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Matches ({matches.length})
          </button>
          <button
            onClick={() => setStatusFilter('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'live'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            Live Now ({matches.filter(m => m.status === 'live').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed ({matches.filter(m => m.status === 'completed').length})
          </button>
        </div>

        {/* League Selector */}
        <select
          value={leagueFilter}
          onChange={e => setLeagueFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
        >
          <option value="all">All Tournaments</option>
          {leagues.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.map(match => {
          const team1 = teams.find(t => t.id === match.team1Id);
          const team2 = teams.find(t => t.id === match.team2Id);

          const isLive = match.status === 'live';

          return (
            <div
              key={match.id}
              onClick={() => onSelectMatch(match.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between shadow-lg ${
                isLive
                  ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">{match.leagueName}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{match.venue}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isLive
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                    {match.status}
                  </span>
                </div>

                {/* Team 1 Score */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{team1?.logo}</span>
                    <span className="font-bold text-white text-sm">{team1?.name}</span>
                  </div>
                  <span className="font-mono text-slate-200 font-bold text-sm">
                    {match.innings1.battingTeamId === team1?.id
                      ? `${match.innings1.totalRuns}/${match.innings1.wickets} (${match.innings1.oversString} ov)`
                      : match.innings2 && match.innings2.battingTeamId === team1?.id
                      ? `${match.innings2.totalRuns}/${match.innings2.wickets} (${match.innings2.oversString} ov)`
                      : 'Yet to bat'}
                  </span>
                </div>

                {/* Team 2 Score */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{team2?.logo}</span>
                    <span className="font-bold text-white text-sm">{team2?.name}</span>
                  </div>
                  <span className="font-mono text-slate-200 font-bold text-sm">
                    {match.innings1.battingTeamId === team2?.id
                      ? `${match.innings1.totalRuns}/${match.innings1.wickets} (${match.innings1.oversString} ov)`
                      : match.innings2 && match.innings2.battingTeamId === team2?.id
                      ? `${match.innings2.totalRuns}/${match.innings2.wickets} (${match.innings2.oversString} ov)`
                      : 'Yet to bat'}
                  </span>
                </div>
              </div>

              {/* Bottom Result / Target Bar */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className={`font-medium truncate ${isLive ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {match.result || (isLive ? `Live: ${match.innings2 ? `Need ${Math.max(0, (match.targetRuns || 0) - match.innings2.totalRuns)} runs` : '1st Innings'}` : 'Scheduled')}
                </span>
                <span className="text-slate-400 group-hover:text-white flex items-center gap-1 font-semibold transition-colors shrink-0 ml-2">
                  {isLive ? 'Score Live' : 'View Card'} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
