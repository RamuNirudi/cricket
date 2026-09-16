import React, { useState } from 'react';
import { Innings, Match, Team } from '../types';

interface ScorecardViewProps {
  match: Match;
  teams: Team[];
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({ match, teams }) => {
  const [activeInningsTab, setActiveInningsTab] = useState<1 | 2>(
    match.currentInningsNumber === 2 && match.innings2 ? 2 : 1
  );

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  const currentInnings: Innings | undefined =
    activeInningsTab === 1 ? match.innings1 : match.innings2;

  const battingTeam = teams.find(t => t.id === currentInnings?.battingTeamId);
  const bowlingTeam = teams.find(t => t.id === currentInnings?.bowlingTeamId);

  return (
    <div id="scorecard-view-container" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-100">
      {/* Innings Selector Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
        <button
          id="tab-innings-1"
          onClick={() => setActiveInningsTab(1)}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-between ${
            activeInningsTab === 1
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <span className="truncate">
            {teams.find(t => t.id === match.innings1.battingTeamId)?.shortName || '1st Innings'}:{' '}
            <strong className="text-white">
              {match.innings1.totalRuns}/{match.innings1.wickets}
            </strong>
          </span>
          <span className="text-xs opacity-80">({match.innings1.oversString} ov)</span>
        </button>

        {match.innings2 ? (
          <button
            id="tab-innings-2"
            onClick={() => setActiveInningsTab(2)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-between ${
              activeInningsTab === 2
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="truncate">
              {teams.find(t => t.id === match.innings2.battingTeamId)?.shortName || '2nd Innings'}:{' '}
              <strong className="text-white">
                {match.innings2.totalRuns}/{match.innings2.wickets}
              </strong>
            </span>
            <span className="text-xs opacity-80">({match.innings2.oversString} ov)</span>
          </button>
        ) : (
          <div className="flex-1 py-2 px-4 rounded-lg font-medium text-sm text-slate-500 bg-slate-900/30 flex items-center justify-center italic text-xs">
            2nd Innings Yet to Bat
          </div>
        )}
      </div>

      {!currentInnings ? (
        <div className="p-8 text-center text-slate-400">Innings data not available yet.</div>
      ) : (
        <div className="p-5 space-y-6">
          {/* Innings Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{battingTeam?.logo || '🏏'}</span>
              <div>
                <h4 className="font-bold text-white text-base">
                  {battingTeam?.name} Innings
                </h4>
                <p className="text-xs text-slate-400">
                  Target: {match.targetRuns ? `${match.targetRuns} runs` : 'Setting target'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {currentInnings.totalRuns}/{currentInnings.wickets}
              </span>
              <span className="text-xs text-slate-400 ml-2 font-mono">
                ({currentInnings.oversString} / {match.maxOvers} ov)
              </span>
              <div className="text-xs text-slate-400">
                Run Rate:{' '}
                <span className="text-slate-200 font-semibold font-mono">
                  {currentInnings.legalBalls > 0
                    ? ((currentInnings.totalRuns / currentInnings.legalBalls) * 6).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Batting Scorecard Table */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Batting Scorecard</span>
            </h5>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Batter</th>
                    <th className="py-2.5 px-3">Dismissal</th>
                    <th className="py-2.5 px-3 text-right">R</th>
                    <th className="py-2.5 px-3 text-right">B</th>
                    <th className="py-2.5 px-3 text-right">4s</th>
                    <th className="py-2.5 px-3 text-right">6s</th>
                    <th className="py-2.5 px-3 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {currentInnings.battingScorecard.map((entry, idx) => {
                    const isStriker = match.status === 'live' && match.currentStrikerId === entry.playerId && activeInningsTab === match.currentInningsNumber;
                    const isNonStriker = match.status === 'live' && match.currentNonStrikerId === entry.playerId && activeInningsTab === match.currentInningsNumber;

                    return (
                      <tr
                        key={entry.playerId || idx}
                        className={`transition-colors ${
                          isStriker
                            ? 'bg-emerald-950/30 font-medium'
                            : isNonStriker
                            ? 'bg-slate-800/30'
                            : 'hover:bg-slate-800/20'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{entry.playerName}</span>
                            {isStriker && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                * Strike
                              </span>
                            )}
                            {isNonStriker && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/50 text-slate-300 rounded">
                                Non-strike
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-400">
                          {entry.isOut ? (
                            <span className="text-rose-300/80">{entry.dismissalText || 'out'}</span>
                          ) : entry.isBatting ? (
                            <span className="text-emerald-400 font-medium">not out</span>
                          ) : (
                            <span className="text-slate-500">yet to bat</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white font-mono">
                          {entry.runs}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                          {entry.balls}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                          {entry.fours}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                          {entry.sixes}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {entry.strikeRate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Extras row */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800/80 text-xs">
              <span className="text-slate-400">
                <strong>Extras:</strong> {currentInnings.extras.total} (b {currentInnings.extras.byes}, lb{' '}
                {currentInnings.extras.legByes}, w {currentInnings.extras.wides}, nb{' '}
                {currentInnings.extras.noBalls})
              </span>
              <span className="text-slate-300 font-semibold">
                Total:{' '}
                <strong className="text-white text-sm">
                  {currentInnings.totalRuns}/{currentInnings.wickets}
                </strong>{' '}
                ({currentInnings.oversString} Overs, RR: {(
                  (currentInnings.totalRuns / Math.max(1, currentInnings.legalBalls)) *
                  6
                ).toFixed(2)})
              </span>
            </div>
          </div>

          {/* Fall of Wickets */}
          {currentInnings.fallOfWickets.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fall of Wickets
              </h5>
              <div className="flex flex-wrap gap-2 text-xs">
                {currentInnings.fallOfWickets.map(fow => (
                  <div
                    key={fow.wicketNumber}
                    className="px-2.5 py-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300"
                  >
                    <span className="text-rose-400 font-semibold">
                      {fow.score}/{fow.wicketNumber}
                    </span>{' '}
                    <span className="text-slate-400">
                      ({fow.playerName}, {fow.overs} ov)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bowling Scorecard Table */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Bowling — {bowlingTeam?.name}</span>
            </h5>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Bowler</th>
                    <th className="py-2.5 px-3 text-right">O</th>
                    <th className="py-2.5 px-3 text-right">M</th>
                    <th className="py-2.5 px-3 text-right">R</th>
                    <th className="py-2.5 px-3 text-right font-bold text-rose-300">W</th>
                    <th className="py-2.5 px-3 text-right">Econ</th>
                    <th className="py-2.5 px-3 text-right">0s</th>
                    <th className="py-2.5 px-3 text-right">WD</th>
                    <th className="py-2.5 px-3 text-right">NB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {currentInnings.bowlingScorecard.map((bowl, idx) => {
                    const isCurrentBowler = match.status === 'live' && match.currentBowlerId === bowl.playerId && activeInningsTab === match.currentInningsNumber;

                    return (
                      <tr
                        key={bowl.playerId || idx}
                        className={`transition-colors ${
                          isCurrentBowler
                            ? 'bg-amber-950/20 font-medium'
                            : 'hover:bg-slate-800/20'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{bowl.playerName}</span>
                            {isCurrentBowler && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                Bowling
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {bowl.overs}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {bowl.maidens}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {bowl.runsConceded}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                          {bowl.wickets}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {bowl.economy}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {bowl.dots}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {bowl.wides}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {bowl.noBalls}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partnerships */}
          {currentInnings.partnerships.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Partnerships
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {currentInnings.partnerships.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs flex flex-col justify-between"
                  >
                    <div className="text-slate-300 font-medium truncate">
                      {p.batter1} &amp; {p.batter2}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-slate-400">
                      <span className="font-bold text-emerald-400 text-sm">{p.runs} runs</span>
                      <span>({p.balls} balls)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
