import React, { useState } from 'react';
import { League, Team, Match, MatchFormat, Innings } from '../types';
import { Play, Shield, MapPin, Trophy } from 'lucide-react';

interface NewMatchModalProps {
  leagues: League[];
  teams: Team[];
  initialLeagueId?: string;
  onClose: () => void;
  onStartMatch: (newMatch: Match) => void;
}

export const NewMatchModal: React.FC<NewMatchModalProps> = ({
  leagues,
  teams,
  initialLeagueId,
  onClose,
  onStartMatch,
}) => {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(initialLeagueId || leagues[0]?.id || '');
  const [team1Id, setTeam1Id] = useState<string>(teams[0]?.id || '');
  const [team2Id, setTeam2Id] = useState<string>(teams[1]?.id || teams[0]?.id || '');
  const [venue, setVenue] = useState<string>('Wankhede Stadium, Mumbai');
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [maxOvers, setMaxOvers] = useState<number>(20);
  const [tossWinnerId, setTossWinnerId] = useState<string>(teams[0]?.id || '');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);
  const team1 = teams.find(t => t.id === team1Id);
  const team2 = teams.find(t => t.id === team2Id);

  // Determine who bats first
  const battingFirstTeam =
    (tossWinnerId === team1Id && tossDecision === 'bat') ||
    (tossWinnerId === team2Id && tossDecision === 'bowl')
      ? team1
      : team2;

  const bowlingFirstTeam = battingFirstTeam?.id === team1?.id ? team2 : team1;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!team1 || !team2 || team1.id === team2.id || !battingFirstTeam || !bowlingFirstTeam) {
      alert('Please select two different teams.');
      return;
    }

    const openingBatters = battingFirstTeam.players.slice(0, 2);
    const openingBowler = bowlingFirstTeam.players.find(p => p.role === 'bowler' || p.role === 'all-rounder') || bowlingFirstTeam.players[0];

    const initialInnings1: Innings = {
      battingTeamId: battingFirstTeam.id,
      bowlingTeamId: bowlingFirstTeam.id,
      totalRuns: 0,
      wickets: 0,
      legalBalls: 0,
      oversString: '0.0',
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0, total: 0 },
      battingScorecard: openingBatters.map((p, idx) => ({
        playerId: p.id,
        playerName: p.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        isBatting: true,
        battingOrder: idx + 1,
      })),
      bowlingScorecard: openingBowler
        ? [
            {
              playerId: openingBowler.id,
              playerName: openingBowler.name,
              overs: 0,
              ballsBowled: 0,
              maidens: 0,
              runsConceded: 0,
              wickets: 0,
              economy: 0,
              wides: 0,
              noBalls: 0,
              dots: 0,
            },
          ]
        : [],
      fallOfWickets: [],
      partnerships:
        openingBatters.length === 2
          ? [
              {
                batter1: openingBatters[0].name,
                batter2: openingBatters[1].name,
                runs: 0,
                balls: 0,
              },
            ]
          : [],
      balls: [],
    };

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      leagueId: selectedLeague?.id || 'custom-league',
      leagueName: selectedLeague?.name || 'Friendly Series',
      matchTitle: `${team1.name} vs ${team2.name}`,
      venue: venue.trim() || 'Central Cricket Ground',
      date: 'Today, Live',
      format,
      maxOvers,
      team1Id: team1.id,
      team2Id: team2.id,
      tossWinnerId,
      tossDecision,
      status: 'live',
      currentInningsNumber: 1,
      currentStrikerId: openingBatters[0]?.id,
      currentNonStrikerId: openingBatters[1]?.id,
      currentBowlerId: openingBowler?.id,
      innings1: initialInnings1,
    };

    onStartMatch(newMatch);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleStart}
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            Configure &amp; Launch Live Match
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Tournament */}
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Select Tournament / League</label>
            <select
              value={selectedLeagueId}
              onChange={e => {
                setSelectedLeagueId(e.target.value);
                const l = leagues.find(lg => lg.id === e.target.value);
                if (l) {
                  setFormat(l.format);
                  setMaxOvers(l.maxOvers);
                  if (l.venues[0]) setVenue(l.venues[0]);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
            >
              {leagues.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.season})
                </option>
              ))}
            </select>
          </div>

          {/* Teams Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Team 1</label>
              <select
                value={team1Id}
                onChange={e => {
                  setTeam1Id(e.target.value);
                  if (tossWinnerId !== e.target.value && tossWinnerId !== team2Id) {
                    setTossWinnerId(e.target.value);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id} disabled={t.id === team2Id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Team 2</label>
              <select
                value={team2Id}
                onChange={e => setTeam2Id(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id} disabled={t.id === team1Id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toss & Decision */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Toss Won By</label>
              <select
                value={tossWinnerId}
                onChange={e => setTossWinnerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value={team1Id}>{team1?.name || 'Team 1'}</option>
                <option value={team2Id}>{team2?.name || 'Team 2'}</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Elected To</label>
              <select
                value={tossDecision}
                onChange={e => setTossDecision(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500 font-bold capitalize"
              >
                <option value="bat">Bat First</option>
                <option value="bowl">Bowl First</option>
              </select>
            </div>
          </div>

          {/* Overs & Venue */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Max Overs Per Side</label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxOvers}
                onChange={e => setMaxOvers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Match Venue</label>
              <input
                type="text"
                placeholder="Stadium name"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* First Innings Summary */}
          <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-emerald-300">
            <strong>Batting First:</strong> {battingFirstTeam?.name} • <strong>Bowling First:</strong> {bowlingFirstTeam?.name}
          </div>

          {/* Scoreboard Write Permission Info */}
          <div className="p-3 bg-slate-950/90 border border-emerald-900/50 rounded-lg space-y-1 text-xs">
            <div className="font-bold text-slate-200 flex items-center justify-between">
              <span>Designated Match Scoreboard Managers:</span>
              <span className="text-emerald-400 font-mono text-[11px]">Write Access</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-400 font-medium block">{team1?.name}:</span>
                <span className="text-emerald-400 font-bold">
                  {team1?.players.find(p => p.id === team1?.designatedScorerPlayerId || p.canManageScoreboard)?.name || team1?.players[0]?.name || 'Unassigned'}
                </span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-400 font-medium block">{team2?.name}:</span>
                <span className="text-emerald-400 font-bold">
                  {team2?.players.find(p => p.id === team2?.designatedScorerPlayerId || p.canManageScoreboard)?.name || team2?.players[0]?.name || 'Unassigned'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Only the single designated player from each team can edit scores. All other players on both teams will have view-only access.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Start Live Scoring
          </button>
        </div>
      </form>
    </div>
  );
};
