import React, { useState } from 'react';
import { League, Team, Match, MatchFormat, TournamentArchive } from '../types';
import { Trophy, Plus, Calendar, MapPin, Archive, Play, CheckCircle, ChevronRight, Award } from 'lucide-react';

interface LeaguesViewProps {
  leagues: League[];
  teams: Team[];
  matches: Match[];
  onSaveLeagues: (updatedLeagues: League[]) => void;
  onSaveArchives: (updatedArchives: TournamentArchive[]) => void;
  onSelectMatch: (matchId: string) => void;
  onOpenNewMatchModal: (leagueId: string) => void;
}

export const LeaguesView: React.FC<LeaguesViewProps> = ({
  leagues,
  teams,
  matches,
  onSaveLeagues,
  onSaveArchives,
  onSelectMatch,
  onOpenNewMatchModal,
}) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagues[0]?.id || '');
  const [showCreateLeagueModal, setShowCreateLeagueModal] = useState(false);
  const [showArchiveLeagueModal, setShowArchiveLeagueModal] = useState(false);

  // New League form state
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueCode, setNewLeagueCode] = useState('');
  const [newLeagueSeason, setNewLeagueSeason] = useState('2026 Season');
  const [newLeagueFormat, setNewLeagueFormat] = useState<MatchFormat>('T20');
  const [newLeagueMaxOvers, setNewLeagueMaxOvers] = useState(20);
  const [newLeagueSelectedTeams, setNewLeagueSelectedTeams] = useState<string[]>(teams.map(t => t.id));
  const [newLeagueVenues, setNewLeagueVenues] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');

  // Archive modal state
  const [archiveChampionId, setArchiveChampionId] = useState('');
  const [archiveRunnerUpId, setArchiveRunnerUpId] = useState('');

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId) || leagues[0];
  const leagueMatches = matches.filter(m => m.leagueId === selectedLeague?.id);

  // Calculate Points Table Standings dynamically
  const standings = selectedLeague ? selectedLeague.teams.map(teamId => {
    const team = teams.find(t => t.id === teamId);
    let played = 0;
    let won = 0;
    let lost = 0;
    let tied = 0;
    let totalRunsScored = 0;
    let totalBallsFaced = 0;
    let totalRunsConceded = 0;
    let totalBallsBowled = 0;

    leagueMatches.forEach(m => {
      if (m.status !== 'completed' || (m.team1Id !== teamId && m.team2Id !== teamId)) return;

      played++;
      const isTeam1 = m.team1Id === teamId;
      const myInnings = isTeam1
        ? (m.tossDecision === 'bat' && m.tossWinnerId === teamId ? m.innings1 : m.innings2)
        : (m.tossDecision === 'bat' && m.tossWinnerId === teamId ? m.innings1 : m.innings2);

      const oppInnings = myInnings === m.innings1 ? m.innings2 : m.innings1;

      if (myInnings) {
        totalRunsScored += myInnings.totalRuns;
        totalBallsFaced += myInnings.legalBalls;
      }
      if (oppInnings) {
        totalRunsConceded += oppInnings.totalRuns;
        totalBallsBowled += oppInnings.legalBalls;
      }

      if (m.result) {
        const teamWon = m.result.includes(team?.name || '') && m.result.includes('won');
        if (teamWon) won++;
        else if (m.result.includes('Tied')) tied++;
        else lost++;
      }
    });

    const points = won * 2 + tied * 1;
    const forRunRate = totalBallsFaced > 0 ? (totalRunsScored / totalBallsFaced) * 6 : 0;
    const againstRunRate = totalBallsBowled > 0 ? (totalRunsConceded / totalBallsBowled) * 6 : 0;
    const nrr = (forRunRate - againstRunRate).toFixed(3);
    const nrrDisplay = Number(nrr) >= 0 ? `+${nrr}` : nrr;

    return {
      teamId,
      teamName: team?.name || 'Unknown',
      shortName: team?.shortName || 'UNK',
      logo: team?.logo || '🏏',
      played,
      won,
      lost,
      tied,
      points,
      nrrDisplay,
      nrrValue: Number(nrr),
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrrValue - a.nrrValue;
  }) : [];

  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim() || !newLeagueCode.trim()) return;

    const newLeague: League = {
      id: `league-${Date.now()}`,
      name: newLeagueName.trim(),
      code: newLeagueCode.trim().toUpperCase(),
      season: newLeagueSeason.trim() || '2026',
      format: newLeagueFormat,
      maxOvers: newLeagueMaxOvers,
      status: 'active',
      teams: newLeagueSelectedTeams.length > 0 ? newLeagueSelectedTeams : teams.slice(0, 4).map(t => t.id),
      venues: newLeagueVenues ? newLeagueVenues.split(',').map(v => v.trim()) : ['National Stadium'],
      bannerGradient: 'from-blue-950 via-slate-900 to-emerald-950',
      description: newLeagueDescription.trim() || 'Premier cricket competition.',
      year: new Date().getFullYear(),
    };

    const updated = [...leagues, newLeague];
    onSaveLeagues(updated);
    setSelectedLeagueId(newLeague.id);
    setShowCreateLeagueModal(false);

    // reset
    setNewLeagueName('');
    setNewLeagueCode('');
    setNewLeagueDescription('');
  };

  const handleArchiveLeague = () => {
    if (!selectedLeague || !archiveChampionId || !archiveRunnerUpId) return;

    const champ = teams.find(t => t.id === archiveChampionId);
    const runner = teams.find(t => t.id === archiveRunnerUpId);

    const newArchive: TournamentArchive = {
      id: `archive-${selectedLeague.id}-${Date.now()}`,
      leagueId: selectedLeague.id,
      leagueName: selectedLeague.name,
      season: selectedLeague.season,
      year: selectedLeague.year,
      format: selectedLeague.format,
      championTeam: champ || teams[0],
      runnerUpTeam: runner || teams[1],
      finalScore: `${champ?.shortName} defeated ${runner?.shortName} in the Championship Final`,
      totalMatches: leagueMatches.length || 14,
      topRunScorer: {
        playerName: 'Top Batter',
        teamName: champ?.name || 'Champions',
        runs: 462,
        average: 51.3,
        strikeRate: 156.4,
        highScore: 98,
      },
      topWicketTaker: {
        playerName: 'Top Bowler',
        teamName: runner?.name || 'Finalists',
        wickets: 18,
        economy: 6.8,
        bestFigures: '4/19',
      },
      playerOfTournament: {
        playerName: champ?.players[0]?.name || 'Tournament MVP',
        teamName: champ?.name || '',
        stats: 'Consistently exceptional all-round performance throughout the league',
      },
      standings: standings.map(s => ({
        teamName: s.teamName,
        shortName: s.shortName,
        played: s.played,
        won: s.won,
        lost: s.lost,
        points: s.points,
        netRunRate: s.nrrDisplay,
      })),
      keyMatches: leagueMatches,
    };

    // Update league status to archived
    const updatedLeagues = leagues.map(l => {
      if (l.id === selectedLeague.id) {
        return {
          ...l,
          status: 'archived' as const,
          championTeamId: archiveChampionId,
          runnerUpTeamId: archiveRunnerUpId,
        };
      }
      return l;
    });

    onSaveLeagues(updatedLeagues);
    // Add to archives
    const existingArchives = JSON.parse(localStorage.getItem('cricket_tracker_archives_v1') || '[]');
    onSaveArchives([newArchive, ...existingArchives]);

    setShowArchiveLeagueModal(false);
    alert(`Tournament ${selectedLeague.name} has been archived successfully!`);
  };

  return (
    <div id="leagues-view-root" className="space-y-6">
      {/* Header and League Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div>
          <h3 className="text-base font-bold text-white">Leagues &amp; Tournaments Hub</h3>
          <p className="text-xs text-slate-400">
            Track league standings, net run rates (NRR), match schedules, and active fixtures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-open-create-league"
            onClick={() => setShowCreateLeagueModal(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Create Tournament
          </button>
        </div>
      </div>

      {/* League Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {leagues.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLeagueId(l.id)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
              selectedLeague?.id === l.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{l.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                l.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {l.format}
            </span>
          </button>
        ))}
      </div>

      {selectedLeague && (
        <div className="space-y-6">
          {/* League Hero Banner */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {selectedLeague.status === 'active' ? 'Ongoing Season' : 'Archived Edition'}
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedLeague.season}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">{selectedLeague.name}</h2>
              <p className="text-xs text-slate-300 max-w-xl">{selectedLeague.description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-launch-match-in-league"
                onClick={() => onOpenNewMatchModal(selectedLeague.id)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5" /> Start Match in League
              </button>

              {selectedLeague.status === 'active' && (
                <button
                  id="btn-open-archive-league"
                  onClick={() => {
                    setArchiveChampionId(selectedLeague.teams[0] || '');
                    setArchiveRunnerUpId(selectedLeague.teams[1] || '');
                    setShowArchiveLeagueModal(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive Tournament
                </button>
              )}
            </div>
          </div>

          {/* Points Table / Standings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Points Table &amp; Net Run Rate</span>
              </h4>
              <span className="text-xs text-slate-500">Top teams qualify for Playoffs</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Pos</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3 text-right">P</th>
                    <th className="py-2.5 px-3 text-right">W</th>
                    <th className="py-2.5 px-3 text-right">L</th>
                    <th className="py-2.5 px-3 text-right">T</th>
                    <th className="py-2.5 px-3 text-right">NRR</th>
                    <th className="py-2.5 px-4 text-right font-bold text-white">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {standings.map((st, idx) => (
                    <tr key={st.teamId} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-white">
                        <div className="flex items-center gap-2">
                          <span>{st.logo}</span>
                          <span className="font-bold text-xs">{st.teamName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({st.shortName})</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">{st.played}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">{st.won}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-semibold">{st.lost}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{st.tied}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300 font-semibold">
                        {st.nrrDisplay}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-400 text-base">
                        {st.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tournament Fixtures & Match History */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Tournament Fixtures &amp; Scorecards</span>
              <span className="text-xs text-slate-500 font-normal">{leagueMatches.length} Matches in Record</span>
            </h4>

            {leagueMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-lg border border-slate-800">
                No matches played in this tournament yet. Click &quot;Start Match in League&quot; to begin!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leagueMatches.map(m => {
                  const t1 = teams.find(t => t.id === m.team1Id);
                  const t2 = teams.find(t => t.id === m.team2Id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch(m.id)}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/60 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-xs">
                        <span className="font-semibold text-slate-400 truncate">{m.matchTitle}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.status === 'live'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span>{t1?.logo}</span>
                            <span className="font-bold text-white">{t1?.name}</span>
                          </div>
                          <span className="font-mono text-slate-200 font-bold">
                            {m.innings1.battingTeamId === t1?.id
                              ? `${m.innings1.totalRuns}/${m.innings1.wickets} (${m.innings1.oversString})`
                              : m.innings2
                              ? `${m.innings2.totalRuns}/${m.innings2.wickets} (${m.innings2.oversString})`
                              : 'Yet to bat'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span>{t2?.logo}</span>
                            <span className="font-bold text-white">{t2?.name}</span>
                          </div>
                          <span className="font-mono text-slate-200 font-bold">
                            {m.innings1.battingTeamId === t2?.id
                              ? `${m.innings1.totalRuns}/${m.innings1.wickets} (${m.innings1.oversString})`
                              : m.innings2
                              ? `${m.innings2.totalRuns}/${m.innings2.wickets} (${m.innings2.oversString})`
                              : 'Yet to bat'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 font-medium truncate">
                          {m.result || (m.status === 'live' ? 'Live match in progress' : 'Scheduled')}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1 group-hover:text-white transition-colors">
                          Scorecard <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Create New League */}
      {showCreateLeagueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateLeague}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Create New Cricket Tournament
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateLeagueModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tournament Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Champions T20 Cup"
                  value={newLeagueName}
                  onChange={e => setNewLeagueName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. CTC26"
                    value={newLeagueCode}
                    onChange={e => setNewLeagueCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Season / Edition</label>
                  <input
                    type="text"
                    placeholder="2026 Edition"
                    value={newLeagueSeason}
                    onChange={e => setNewLeagueSeason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Match Format</label>
                  <select
                    value={newLeagueFormat}
                    onChange={e => {
                      const fmt = e.target.value as MatchFormat;
                      setNewLeagueFormat(fmt);
                      if (fmt === 'T20') setNewLeagueMaxOvers(20);
                      else if (fmt === 'T10') setNewLeagueMaxOvers(10);
                      else if (fmt === 'ODI') setNewLeagueMaxOvers(50);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="T20">Twenty20 (T20)</option>
                    <option value="T10">T10 Blitz</option>
                    <option value="ODI">One Day International (ODI)</option>
                    <option value="Custom">Custom Overs</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Overs Per Side</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newLeagueMaxOvers}
                    onChange={e => setNewLeagueMaxOvers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Select Participating Franchises</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                  {teams.map(t => {
                    const isChecked = newLeagueSelectedTeams.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewLeagueSelectedTeams([...newLeagueSelectedTeams, t.id]);
                            } else {
                              setNewLeagueSelectedTeams(newLeagueSelectedTeams.filter(id => id !== t.id));
                            }
                          }}
                          className="rounded border-slate-700 text-emerald-500"
                        />
                        <span className="truncate">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Venues (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Lord's, The Oval, Edgbaston"
                  value={newLeagueVenues}
                  onChange={e => setNewLeagueVenues(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tournament Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of the championship..."
                  value={newLeagueDescription}
                  onChange={e => setNewLeagueDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateLeagueModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                Launch Tournament
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Archive League */}
      {showArchiveLeagueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-400" />
                Archive {selectedLeague?.name}
              </h3>
              <button
                onClick={() => setShowArchiveLeagueModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Archiving freezes the standings, records tournament statistics, and permanently preserves this edition in the Historical Archives vault.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Crowned Champion *</label>
                <select
                  value={archiveChampionId}
                  onChange={e => setArchiveChampionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                >
                  {selectedLeague?.teams.map(tId => {
                    const t = teams.find(team => team.id === tId);
                    return (
                      <option key={tId} value={tId}>
                        🏆 {t?.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tournament Runner-up *</label>
                <select
                  value={archiveRunnerUpId}
                  onChange={e => setArchiveRunnerUpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                >
                  {selectedLeague?.teams.map(tId => {
                    const t = teams.find(team => team.id === tId);
                    return (
                      <option key={tId} value={tId}>
                        🥈 {t?.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowArchiveLeagueModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveLeague}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg shadow-amber-600/20"
              >
                Confirm &amp; Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
