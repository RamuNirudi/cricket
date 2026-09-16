import React from 'react';
import { Activity, Trophy, Users, BarChart2, Archive, Calendar, RotateCcw } from 'lucide-react';

export type AppTab = 'live' | 'matches' | 'leagues' | 'players' | 'archives' | 'teams';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  hasLiveMatch: boolean;
  liveMatchSummary?: string;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  hasLiveMatch,
  liveMatchSummary,
  onResetData,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectTab('live')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🏏</span>
            </div>
            <div>
              <span className="font-black text-base text-white tracking-tight flex items-center gap-1.5">
                PITCH<span className="text-emerald-400">PULSE</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO
                </span>
              </span>
              <p className="text-[10px] text-slate-400 hidden sm:block">Real-time Cricket Score &amp; League Archives</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 text-xs">
            <button
              id="nav-live-tab"
              onClick={() => onSelectTab('live')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all relative ${
                currentTab === 'live'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Console
              {hasLiveMatch && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </button>

            <button
              id="nav-matches-tab"
              onClick={() => onSelectTab('matches')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'matches'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Matches
            </button>

            <button
              id="nav-leagues-tab"
              onClick={() => onSelectTab('leagues')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'leagues'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leagues &amp; Standings
            </button>

            <button
              id="nav-players-tab"
              onClick={() => onSelectTab('players')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'players'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Player Stats
            </button>

            <button
              id="nav-archives-tab"
              onClick={() => onSelectTab('archives')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'archives'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archives
            </button>

            <button
              id="nav-teams-tab"
              onClick={() => onSelectTab('teams')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                currentTab === 'teams'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Teams
            </button>
          </nav>

          {/* Quick Actions / Reset Seed */}
          <div className="flex items-center gap-2">
            <button
              id="btn-reset-defaults"
              onClick={() => {
                if (confirm('Reset database to realistic tournament seed data? (Active match, classic archives, stats)')) {
                  onResetData();
                }
              }}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-800/80"
              title="Reset to default league seed data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-800/80 gap-1 text-xs">
          <button
            onClick={() => onSelectTab('live')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'live' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Live Console
          </button>
          <button
            onClick={() => onSelectTab('matches')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'matches' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => onSelectTab('leagues')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'leagues' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Leagues
          </button>
          <button
            onClick={() => onSelectTab('players')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'players' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Player Stats
          </button>
          <button
            onClick={() => onSelectTab('archives')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'archives' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Archives
          </button>
          <button
            onClick={() => onSelectTab('teams')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap ${
              currentTab === 'teams' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Teams
          </button>
        </div>
      </div>
    </header>
  );
};
