import React, { useState } from 'react';
import { Team, Player, PlayerRole, BattingStyle, BowlingStyle } from '../types';
import { Plus, Users, Shield, Award, Edit, Trash2, Check, Lock, Edit3, ShieldCheck } from 'lucide-react';
import { setTeamDesignatedScorer } from '../services/storage';

interface TeamsViewProps {
  teams: Team[];
  onSaveTeams: (updatedTeams: Team[]) => void;
  onSelectPlayer: (playerId: string) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  onSaveTeams,
  onSelectPlayer,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // New Team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newTeamPrimaryColor, setNewTeamPrimaryColor] = useState('#2563EB');
  const [newTeamSecondaryColor, setNewTeamSecondaryColor] = useState('#F59E0B');
  const [newTeamHomeGround, setNewTeamHomeGround] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('🏏');
  const [newTeamScorerName, setNewTeamScorerName] = useState('');

  // New Player form state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('batsman');
  const [newPlayerBattingStyle, setNewPlayerBattingStyle] = useState<BattingStyle>('Right-hand bat');
  const [newPlayerBowlingStyle, setNewPlayerBowlingStyle] = useState<BowlingStyle>('Right-arm fast');
  const [newPlayerIsCaptain, setNewPlayerIsCaptain] = useState(false);
  const [newPlayerIsKeeper, setNewPlayerIsKeeper] = useState(false);
  const [newPlayerIsScorer, setNewPlayerIsScorer] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const designatedScorer = selectedTeam?.players.find(
    p => p.id === selectedTeam.designatedScorerPlayerId || p.canManageScoreboard
  ) || selectedTeam?.players[0];

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamShortName.trim()) return;

    const teamId = `team-${Date.now()}`;
    const initialPlayers: Player[] = [];
    let designatedScorerId: string | undefined = undefined;

    // Automatically create designated scoreboard manager player if provided or default
    const scorerNameInput = newTeamScorerName.trim() || `${newTeamShortName.trim()} Captain`;
    const names = scorerNameInput.split(' ');
    const short = names.length > 1 ? `${names[0][0]}. ${names.slice(1).join(' ')}` : scorerNameInput;
    const scorerPlayerId = `p-${Date.now()}-1`;
    designatedScorerId = scorerPlayerId;

    initialPlayers.push({
      id: scorerPlayerId,
      name: scorerNameInput,
      shortName: short,
      role: 'all-rounder',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      teamId: teamId,
      isCaptain: true,
      canManageScoreboard: true,
    });

    const newTeam: Team = {
      id: teamId,
      name: newTeamName.trim(),
      shortName: newTeamShortName.trim().toUpperCase(),
      primaryColor: newTeamPrimaryColor,
      secondaryColor: newTeamSecondaryColor,
      homeGround: newTeamHomeGround.trim() || 'Home Stadium',
      logo: newTeamLogo || '🏏',
      players: initialPlayers,
      designatedScorerPlayerId: designatedScorerId,
    };

    const updated = [...teams, newTeam];
    onSaveTeams(updated);
    setSelectedTeamId(newTeam.id);
    setShowCreateTeamModal(false);

    // reset fields
    setNewTeamName('');
    setNewTeamShortName('');
    setNewTeamHomeGround('');
    setNewTeamScorerName('');
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !selectedTeam) return;

    const names = newPlayerName.trim().split(' ');
    const short = names.length > 1 ? `${names[0][0]}. ${names.slice(1).join(' ')}` : newPlayerName;
    const newPlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const shouldBeScorer = newPlayerIsScorer || selectedTeam.players.length === 0;

    const newPlayer: Player = {
      id: newPlayerId,
      name: newPlayerName.trim(),
      shortName: short,
      role: newPlayerRole,
      battingStyle: newPlayerBattingStyle,
      bowlingStyle: newPlayerBowlingStyle,
      teamId: selectedTeam.id,
      isCaptain: newPlayerIsCaptain,
      isWicketKeeper: newPlayerIsKeeper,
      canManageScoreboard: shouldBeScorer,
    };

    const updatedTeams = teams.map(t => {
      if (t.id === selectedTeam.id) {
        const nextPlayers = shouldBeScorer
          ? t.players.map(p => ({ ...p, canManageScoreboard: false })).concat(newPlayer)
          : [...t.players, newPlayer];

        return {
          ...t,
          designatedScorerPlayerId: shouldBeScorer ? newPlayerId : t.designatedScorerPlayerId,
          players: nextPlayers,
        };
      }
      return t;
    });

    onSaveTeams(updatedTeams);
    setShowAddPlayerModal(false);
    setNewPlayerName('');
    setNewPlayerIsCaptain(false);
    setNewPlayerIsKeeper(false);
    setNewPlayerIsScorer(false);
  };

  const handleAssignScorer = (playerId: string) => {
    if (!selectedTeam) return;
    const updated = setTeamDesignatedScorer(teams, selectedTeam.id, playerId);
    onSaveTeams(updated);
  };

  const handleDeletePlayer = (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player from the squad?')) return;
    const updatedTeams = teams.map(t => {
      if (t.id === selectedTeam.id) {
        const remainingPlayers = t.players.filter(p => p.id !== playerId);
        let newScorerId = t.designatedScorerPlayerId;
        if (newScorerId === playerId) {
          // If deleted player was designated scorer, reassign to captain or first remaining player
          newScorerId = remainingPlayers[0]?.id;
        }
        return {
          ...t,
          designatedScorerPlayerId: newScorerId,
          players: remainingPlayers.map(p => ({
            ...p,
            canManageScoreboard: p.id === newScorerId,
          })),
        };
      }
      return t;
    });
    onSaveTeams(updatedTeams);
  };

  return (
    <div id="teams-view-root" className="space-y-6">
      {/* Header and Add Team Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div>
          <h3 className="text-base font-bold text-white">Teams &amp; Squad Rosters</h3>
          <p className="text-xs text-slate-400">
            Manage franchise clubs, build custom playing squads, and designate leadership roles.
          </p>
        </div>
        <button
          id="btn-open-create-team"
          onClick={() => setShowCreateTeamModal(true)}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> Create New Team
        </button>
      </div>

      {/* Main Grid: Teams Sidebar / Selector + Selected Team Squad */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Teams List Column */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Franchises ({teams.length})
          </span>
          <div className="space-y-1.5">
            {teams.map(team => {
              const isSelected = team.id === selectedTeam.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{team.logo}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{team.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {team.shortName} • {team.players.length} Players
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full border border-slate-700 shrink-0 ml-2"
                    style={{ backgroundColor: team.primaryColor }}
                    title={team.name}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Team Squad & Details */}
        <div className="md:col-span-3 space-y-4">
          {selectedTeam && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              {/* Team Profile Header */}
              <div
                className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4"
                style={{
                  background: `linear-gradient(135deg, ${selectedTeam.primaryColor}22 0%, #0f172a 100%)`,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-4xl p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    {selectedTeam.logo}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">{selectedTeam.name}</h2>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedTeam.shortName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Home Ground: <strong className="text-slate-300">{selectedTeam.homeGround}</strong>
                    </p>
                  </div>
                </div>

                <button
                  id="btn-open-add-player"
                  onClick={() => setShowAddPlayerModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Player to Squad
                </button>
              </div>

              {/* Squad Breakdown */}
              <div className="p-5 space-y-4">
                {/* Scoreboard Write Access Authority Card */}
                <div className="p-4 bg-slate-950/80 border border-emerald-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Designated Scoreboard Manager:</span>
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          <Edit3 className="w-3 h-3" />
                          {designatedScorer?.name || 'None Selected'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        <strong className="text-slate-200">Strict Permission Rule:</strong> Only this designated player from {selectedTeam.name} has write/edit access to update match scoreboards. All {Math.max(0, selectedTeam.players.length - 1)} other squad members are restricted to view-only access.
                      </p>
                    </div>
                  </div>

                  {selectedTeam.players.length > 1 && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Click &quot;Set as Scorer&quot; below to transfer write access to another teammate.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Current Squad ({selectedTeam.players.length} Players)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">1 Manager (Write) • {Math.max(0, selectedTeam.players.length - 1)} View-Only</span>
                </div>

                {selectedTeam.players.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-lg border border-slate-800">
                    No players in this squad yet. Click &quot;Add Player to Squad&quot; above to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedTeam.players.map((player, idx) => {
                      const isScorer = player.id === selectedTeam.designatedScorerPlayerId || player.canManageScoreboard;
                      return (
                        <div
                          key={player.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                            isScorer
                              ? 'bg-emerald-950/20 border-emerald-600/40 shadow-md shadow-emerald-950/30'
                              : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <span
                                onClick={() => onSelectPlayer(player.id)}
                                className="font-bold text-xs text-white hover:text-emerald-400 cursor-pointer truncate"
                              >
                                {idx + 1}. {player.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {player.isCaptain && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    (C)
                                  </span>
                                )}
                                {player.isWicketKeeper && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    (WK)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5">
                              {isScorer ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <Edit3 className="w-2.5 h-2.5 text-emerald-400" />
                                  Scoreboard Manager (Write)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                                  <Lock className="w-2.5 h-2.5" />
                                  View-Only
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 capitalize mt-2">
                              Role: <span className="text-slate-300 font-medium">{player.role}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {player.battingStyle} • {player.bowlingStyle}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/80 text-[11px]">
                            <button
                              type="button"
                              onClick={() => onSelectPlayer(player.id)}
                              className="text-emerald-400 hover:text-emerald-300 font-medium text-xs"
                            >
                              Career Stats
                            </button>

                            <div className="flex items-center gap-2">
                              {!isScorer && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignScorer(player.id)}
                                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                                  title="Assign single scoreboard edit permission to this player"
                                >
                                  <Edit3 className="w-3 h-3" /> Set as Scorer
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(player.id)}
                                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10"
                                title="Remove player"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Create New Team */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTeam}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Register New Cricket Franchise
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Franchise Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London Monarchs"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Short Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. LM"
                    value={newTeamShortName}
                    onChange={e => setNewTeamShortName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Badge Emoji</label>
                  <input
                    type="text"
                    placeholder="🏏"
                    value={newTeamLogo}
                    onChange={e => setNewTeamLogo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Home Stadium</label>
                <input
                  type="text"
                  placeholder="e.g. Lord's Cricket Ground"
                  value={newTeamHomeGround}
                  onChange={e => setNewTeamHomeGround(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTeamPrimaryColor}
                      onChange={e => setNewTeamPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300">{newTeamPrimaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTeamSecondaryColor}
                      onChange={e => setNewTeamSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-slate-300">{newTeamSecondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Designated Scoreboard Manager Field */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg space-y-1.5">
                <label className="text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  Initial Designated Scorer (Write Access)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Squad Captain (optional, defaults to Captain)"
                  value={newTeamScorerName}
                  onChange={e => setNewTeamScorerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 outline-none focus:border-emerald-500 text-xs"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Rule Enforcement: Only this 1 designated player will have write/edit access to update match scores. All other teammates will have view-only access.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                Save Franchise
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Player to Squad */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddPlayer}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Add Player to {selectedTeam?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Full Player Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Benjamin Stokes"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Primary Role *</label>
                  <select
                    value={newPlayerRole}
                    onChange={e => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500 capitalize"
                  >
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="all-rounder">All-Rounder</option>
                    <option value="wicket-keeper">Wicket-Keeper</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Batting Style</label>
                  <select
                    value={newPlayerBattingStyle}
                    onChange={e => setNewPlayerBattingStyle(e.target.value as BattingStyle)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="Right-hand bat">Right-hand bat</option>
                    <option value="Left-hand bat">Left-hand bat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Bowling Style</label>
                <select
                  value={newPlayerBowlingStyle}
                  onChange={e => setNewPlayerBowlingStyle(e.target.value as BowlingStyle)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="Right-arm fast">Right-arm fast</option>
                  <option value="Right-arm medium">Right-arm medium</option>
                  <option value="Right-arm off-spin">Right-arm off-spin</option>
                  <option value="Right-arm leg-spin">Right-arm leg-spin</option>
                  <option value="Left-arm fast">Left-arm fast</option>
                  <option value="Left-arm orthodox">Left-arm orthodox</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlayerIsCaptain}
                    onChange={e => setNewPlayerIsCaptain(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span className="text-slate-300">Team Captain (C)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlayerIsKeeper}
                    onChange={e => setNewPlayerIsKeeper(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span className="text-slate-300">Wicket-Keeper (WK)</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg bg-slate-950 border border-emerald-900/40 hover:border-emerald-700/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={newPlayerIsScorer}
                    onChange={e => setNewPlayerIsScorer(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                      <Edit3 className="w-3 h-3" />
                      Designate as Scoreboard Manager (Write Access)
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      Reassigns this team's single scoreboard write permission to this player. All other players on {selectedTeam?.name} will have view-only access.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                Confirm Player
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
