import React, { useState, useEffect } from 'react';
import {
  getStoredTeams,
  saveStoredTeams,
  getStoredLeagues,
  saveStoredLeagues,
  getStoredMatches,
  saveStoredMatches,
  getStoredArchives,
  saveStoredArchives,
  resetToInitialData,
  updatePlayerCareerStatsFromMatch,
  getCurrentUserPlayerId,
  setCurrentUserPlayerId,
} from './services/storage';
import { Team, League, Match, TournamentArchive } from './types';
import { Navbar, AppTab } from './components/Navbar';
import { LiveMatchTracker } from './components/LiveMatchTracker';
import { MatchesListView } from './components/MatchesListView';
import { LeaguesView } from './components/LeaguesView';
import { PlayerStatsView } from './components/PlayerStatsView';
import { ArchivesView } from './components/ArchivesView';
import { TeamsView } from './components/TeamsView';
import { NewMatchModal } from './components/NewMatchModal';
import { ScorecardView } from './components/ScorecardView';

export default function App() {
  const [teams, setTeams] = useState<Team[]>(() => getStoredTeams());
  const [leagues, setLeagues] = useState<League[]>(() => getStoredLeagues());
  const [matches, setMatches] = useState<Match[]>(() => getStoredMatches());
  const [archives, setArchives] = useState<TournamentArchive[]>(() => getStoredArchives());
  const [activeTab, setActiveTab] = useState<AppTab>('live');

  // Currently loaded match for Live Scoring Console or Scorecard view
  const [activeMatchId, setActiveMatchId] = useState<string>(() => {
    const initialMatches = getStoredMatches();
    const liveMatch = initialMatches.find(m => m.status === 'live');
    return liveMatch ? liveMatch.id : (initialMatches[0]?.id || '');
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(undefined);
  const [activePlayerId, setActivePlayerId] = useState<string>(() => getCurrentUserPlayerId());

  // New Match modal state
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [newMatchLeagueId, setNewMatchLeagueId] = useState<string | undefined>(undefined);

  const currentMatch = matches.find(m => m.id === activeMatchId) || matches[0];
  const hasLiveMatch = matches.some(m => m.status === 'live');

  // Handler: Update Match
  const handleUpdateMatch = (updatedMatch: Match) => {
    const updatedMatches = matches.map(m => (m.id === updatedMatch.id ? updatedMatch : m));
    setMatches(updatedMatches);
    saveStoredMatches(updatedMatches);

    // If match finished, update player career logs and stats
    if (updatedMatch.status === 'completed') {
      updatePlayerCareerStatsFromMatch(updatedMatch, teams);
    }
  };

  // Handler: Launch new match
  const handleStartNewMatch = (newMatch: Match) => {
    const updated = [newMatch, ...matches];
    setMatches(updated);
    saveStoredMatches(updated);
    setActiveMatchId(newMatch.id);
    setShowNewMatchModal(false);
    setActiveTab('live');
  };

  // Handler: Teams update
  const handleSaveTeams = (updatedTeams: Team[]) => {
    setTeams(updatedTeams);
    saveStoredTeams(updatedTeams);
  };

  // Handler: Leagues update
  const handleSaveLeagues = (updatedLeagues: League[]) => {
    setLeagues(updatedLeagues);
    saveStoredLeagues(updatedLeagues);
  };

  // Handler: Archives update
  const handleSaveArchives = (updatedArchives: TournamentArchive[]) => {
    setArchives(updatedArchives);
    saveStoredArchives(updatedArchives);
  };

  // Handler: Reset seed data
  const handleResetData = () => {
    resetToInitialData();
    const loadedTeams = getStoredTeams();
    const loadedLeagues = getStoredLeagues();
    const loadedMatches = getStoredMatches();
    const loadedArchives = getStoredArchives();

    setTeams(loadedTeams);
    setLeagues(loadedLeagues);
    setMatches(loadedMatches);
    setArchives(loadedArchives);

    const liveMatch = loadedMatches.find(m => m.status === 'live');
    if (liveMatch) {
      setActiveMatchId(liveMatch.id);
    } else if (loadedMatches[0]) {
      setActiveMatchId(loadedMatches[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={tab => {
          setActiveTab(tab);
          // If switching to players, deselect any active detail
          if (tab !== 'players') setSelectedPlayerId(undefined);
        }}
        hasLiveMatch={hasLiveMatch}
        liveMatchSummary={currentMatch?.matchTitle}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* TAB 1: Live Scoring Console */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            {/* Quick Match Selector Pill Bar if multiple matches */}
            {matches.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
                  Active Fixtures:
                </span>
                {matches.map(m => {
                  const isSelected = m.id === activeMatchId;
                  const isLive = m.status === 'live';
                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveMatchId(m.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                      <span>{m.matchTitle}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentMatch ? (
              <LiveMatchTracker
                match={currentMatch}
                teams={teams}
                onUpdateMatch={handleUpdateMatch}
                onSelectPlayer={playerId => {
                  setSelectedPlayerId(playerId);
                  setActiveTab('players');
                }}
                activePlayerId={activePlayerId}
                onSelectActivePlayer={playerId => {
                  setActivePlayerId(playerId);
                }}
              />
            ) : (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-slate-400 text-sm mb-4">No active matches found.</p>
                <button
                  onClick={() => setShowNewMatchModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-500"
                >
                  Create &amp; Start Match
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Matches & Fixtures List */}
        {activeTab === 'matches' && (
          <MatchesListView
            matches={matches}
            teams={teams}
            leagues={leagues}
            onSelectMatch={matchId => {
              setActiveMatchId(matchId);
              setActiveTab('live');
            }}
            onOpenNewMatchModal={leagueId => {
              setNewMatchLeagueId(leagueId);
              setShowNewMatchModal(true);
            }}
          />
        )}

        {/* TAB 3: Leagues & Points Table */}
        {activeTab === 'leagues' && (
          <LeaguesView
            leagues={leagues}
            teams={teams}
            matches={matches}
            onSaveLeagues={handleSaveLeagues}
            onSaveArchives={handleSaveArchives}
            onSelectMatch={matchId => {
              setActiveMatchId(matchId);
              setActiveTab('live');
            }}
            onOpenNewMatchModal={leagueId => {
              setNewMatchLeagueId(leagueId);
              setShowNewMatchModal(true);
            }}
          />
        )}

        {/* TAB 4: Player Statistics */}
        {activeTab === 'players' && (
          <PlayerStatsView
            teams={teams}
            leagues={leagues}
            matches={matches}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={playerId => setSelectedPlayerId(playerId)}
          />
        )}

        {/* TAB 5: Tournament Archives */}
        {activeTab === 'archives' && (
          <ArchivesView
            archives={archives}
            matches={matches}
            teams={teams}
            onSelectMatch={matchId => {
              setActiveMatchId(matchId);
              setActiveTab('live');
            }}
          />
        )}

        {/* TAB 6: Teams & Rosters */}
        {activeTab === 'teams' && (
          <TeamsView
            teams={teams}
            onSaveTeams={handleSaveTeams}
            onSelectPlayer={playerId => {
              setSelectedPlayerId(playerId);
              setActiveTab('players');
            }}
          />
        )}
      </main>

      {/* Modal: New Match Setup */}
      {showNewMatchModal && (
        <NewMatchModal
          leagues={leagues}
          teams={teams}
          initialLeagueId={newMatchLeagueId}
          onClose={() => setShowNewMatchModal(false)}
          onStartMatch={handleStartNewMatch}
        />
      )}
    </div>
  );
}
