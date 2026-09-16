import React, { useState } from 'react';
import { TournamentArchive, Match, Team } from '../types';
import { Trophy, Award, Shield, Calendar, ChevronRight, FileText, Medal } from 'lucide-react';
import { ScorecardView } from './ScorecardView';

interface ArchivesViewProps {
  archives: TournamentArchive[];
  matches: Match[];
  teams: Team[];
  onSelectMatch: (matchId: string) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  archives,
  matches,
  teams,
  onSelectMatch,
}) => {
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>(archives[0]?.id || '');
  const [inspectedMatch, setInspectedMatch] = useState<Match | null>(null);

  const selectedArchive = archives.find(a => a.id === selectedArchiveId) || archives[0];

  return (
    <div id="archives-view-root" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Historical Tournament Archives
          </h3>
          <p className="text-xs text-slate-400">
            Chronicles of every past edition, tournament champions, individual accolades, and complete final scorecards.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          <strong className="text-amber-400">{archives.length}</strong> Preserved Editions
        </div>
      </div>

      {/* Archive Edition Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {archives.map(a => {
          const isSelected = a.id === selectedArchive?.id;
          return (
            <button
              key={a.id}
              onClick={() => {
                setSelectedArchiveId(a.id);
                setInspectedMatch(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2.5 border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{a.leagueName}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                {a.year}
              </span>
            </button>
          );
        })}
      </div>

      {selectedArchive && (
        <div className="space-y-6">
          {/* Championship Podium Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/50 p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Historic Champions Vault
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedArchive.season} ({selectedArchive.year})</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedArchive.leagueName}
                </h2>
                <p className="text-sm font-medium text-amber-200">
                  {selectedArchive.finalScore}
                </p>
              </div>

              {/* Champion & Runner-up Badges */}
              <div className="flex items-center gap-3">
                {/* Champion */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/50 text-center min-w-[130px] shadow-lg">
                  <span className="text-3xl block mb-1">{selectedArchive.championTeam.logo}</span>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1">
                    <Trophy className="w-3 h-3" /> Champions
                  </div>
                  <div className="font-bold text-xs text-white truncate mt-0.5">
                    {selectedArchive.championTeam.name}
                  </div>
                </div>

                {/* Runner-up */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center min-w-[120px]">
                  <span className="text-3xl block mb-1">{selectedArchive.runnerUpTeam.logo}</span>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                    <Medal className="w-3 h-3" /> Runners-Up
                  </div>
                  <div className="font-bold text-xs text-slate-300 truncate mt-0.5">
                    {selectedArchive.runnerUpTeam.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tournament Honors & Individual Accolades */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MVP */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                  Player of the Tournament
                </span>
                <h4 className="text-sm font-bold text-white truncate">{selectedArchive.playerOfTournament.playerName}</h4>
                <div className="text-[11px] text-slate-400 truncate">{selectedArchive.playerOfTournament.teamName}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">{selectedArchive.playerOfTournament.stats}</div>
              </div>
            </div>

            {/* Orange Cap */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Orange Cap (Leading Runs)
                </span>
                <h4 className="text-sm font-bold text-white truncate">{selectedArchive.topRunScorer.playerName}</h4>
                <div className="text-[11px] text-slate-400 truncate">{selectedArchive.topRunScorer.teamName}</div>
                <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                  <strong>{selectedArchive.topRunScorer.runs} runs</strong> (Avg: {selectedArchive.topRunScorer.average})
                </div>
              </div>
            </div>

            {/* Purple Cap */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Purple Cap (Leading Wickets)
                </span>
                <h4 className="text-sm font-bold text-white truncate">{selectedArchive.topWicketTaker.playerName}</h4>
                <div className="text-[11px] text-slate-400 truncate">{selectedArchive.topWicketTaker.teamName}</div>
                <div className="text-[10px] text-purple-300 font-mono mt-0.5">
                  <strong>{selectedArchive.topWicketTaker.wickets} wickets</strong> (Econ: {selectedArchive.topWicketTaker.economy})
                </div>
              </div>
            </div>
          </div>

          {/* Final Tournament Standings Archive */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Final Tournament Standings</span>
              <span className="text-xs text-slate-500 font-normal">Archived Points Matrix</span>
            </h4>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3 text-right">Played</th>
                    <th className="py-2.5 px-3 text-right">Won</th>
                    <th className="py-2.5 px-3 text-right">Lost</th>
                    <th className="py-2.5 px-3 text-right">NRR</th>
                    <th className="py-2.5 px-4 text-right font-bold text-white">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {selectedArchive.standings.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 text-xs font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-white font-medium text-xs">
                        {st.teamName} <span className="text-slate-400 text-[10px]">({st.shortName})</span>
                        {idx === 0 && <span className="ml-2 text-amber-400 font-bold">🏆 Champions</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{st.played}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">{st.won}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-semibold">{st.lost}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{st.netRunRate}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-amber-400 text-sm">
                        {st.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archived Matches & Scorecards Preview */}
          {inspectedMatch && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Archived Scorecard: {inspectedMatch.matchTitle}
                </h4>
                <button
                  onClick={() => setInspectedMatch(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Close Scorecard
                </button>
              </div>
              <ScorecardView match={inspectedMatch} teams={teams} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
