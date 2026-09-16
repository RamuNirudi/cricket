import React, { useState, useEffect, useRef } from 'react';
import { Match, Team, Innings, BallRecord, ExtraType, WicketType, BattingScorecardEntry, BowlingScorecardEntry } from '../types';
import { ScorecardView } from './ScorecardView';
import { generateBallCommentary, legalBallsToOversString, calculateStrikeRate, calculateEconomy } from '../utils/cricketCalculations';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeftRight, 
  Award, 
  AlertCircle, 
  ChevronRight, 
  Activity, 
  FileText, 
  Clock, 
  BarChart2, 
  CheckCircle2,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  UserCheck,
  UserX
} from 'lucide-react';
import { getCurrentUserPlayerId, setCurrentUserPlayerId } from '../services/storage';

interface LiveMatchTrackerProps {
  match: Match;
  teams: Team[];
  onUpdateMatch: (updatedMatch: Match) => void;
  onSelectPlayer: (playerId: string) => void;
  activePlayerId?: string;
  onSelectActivePlayer?: (playerId: string) => void;
}

export const LiveMatchTracker: React.FC<LiveMatchTrackerProps> = ({
  match,
  teams,
  onUpdateMatch,
  onSelectPlayer,
  activePlayerId,
  onSelectActivePlayer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'scorecard' | 'commentary' | 'stats'>('console');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(2000); // ms per ball
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);

  // Identify participating teams in this fixture
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);

  // Identify designated scorers: exactly ONE player per team has write/edit access
  const team1Scorer = team1?.players.find(
    p => p.id === team1.designatedScorerPlayerId || p.canManageScoreboard
  ) || team1?.players[0];

  const team2Scorer = team2?.players.find(
    p => p.id === team2.designatedScorerPlayerId || p.canManageScoreboard
  ) || team2?.players[0];

  // Other players for quick view-only testing
  const team1OtherPlayer = team1?.players.find(p => p.id !== team1Scorer?.id);
  const team2OtherPlayer = team2?.players.find(p => p.id !== team2Scorer?.id);

  // Resolve currently active interacting player
  const [localActiveId, setLocalActiveId] = useState<string>(() => {
    return activePlayerId || getCurrentUserPlayerId() || team1Scorer?.id || '';
  });

  const effectiveActivePlayerId = activePlayerId || localActiveId || getCurrentUserPlayerId() || team1Scorer?.id || '';
  const activeUserPlayer = teams.flatMap(t => t.players).find(p => p.id === effectiveActivePlayerId);
  const activeUserTeam = teams.find(t => t.players.some(p => p.id === effectiveActivePlayerId));

  // Determine scoreboard write access: only the designated scorer of Team 1 OR Team 2
  const isTeam1Scorer = Boolean(team1Scorer && effectiveActivePlayerId === team1Scorer.id);
  const isTeam2Scorer = Boolean(team2Scorer && effectiveActivePlayerId === team2Scorer.id);
  const hasWriteAccess = isTeam1Scorer || isTeam2Scorer;

  const handleSwitchPlayer = (newPlayerId: string) => {
    setLocalActiveId(newPlayerId);
    setCurrentUserPlayerId(newPlayerId);
    if (onSelectActivePlayer) {
      onSelectActivePlayer(newPlayerId);
    }
  };

  // Wicket form state
  const [wicketType, setWicketType] = useState<WicketType>('caught');
  const [dismissedBatterRole, setDismissedBatterRole] = useState<'striker' | 'nonStriker'>('striker');
  const [selectedFielderId, setSelectedFielderId] = useState<string>('');
  const [nextBatterId, setNextBatterId] = useState<string>('');

  // Next Bowler form state
  const [nextBowlerId, setNextBowlerId] = useState<string>('');

  const autoPlayTimerRef = useRef<any>(null);

  const battingTeam = teams.find(t => 
    t.id === (match.currentInningsNumber === 1 ? match.innings1.battingTeamId : match.innings2?.battingTeamId)
  );
  const bowlingTeam = teams.find(t => 
    t.id === (match.currentInningsNumber === 1 ? match.innings1.bowlingTeamId : match.innings2?.bowlingTeamId)
  );

  const currentInnings = match.currentInningsNumber === 1 ? match.innings1 : match.innings2!;

  // Current striker and non-striker
  const striker = currentInnings?.battingScorecard.find(b => b.playerId === match.currentStrikerId);
  const nonStriker = currentInnings?.battingScorecard.find(b => b.playerId === match.currentNonStrikerId);
  const bowler = currentInnings?.bowlingScorecard.find(b => b.playerId === match.currentBowlerId);

  // Fallback striker/non-striker/bowler auto-assignment if missing
  useEffect(() => {
    if (match.status === 'live' && currentInnings) {
      let updated = false;
      let newStrikerId = match.currentStrikerId;
      let newNonStrikerId = match.currentNonStrikerId;
      let newBowlerId = match.currentBowlerId;

      if (!newStrikerId) {
        const availableBatter = currentInnings.battingScorecard.find(b => !b.isOut) || currentInnings.battingScorecard[0];
        if (availableBatter) {
          newStrikerId = availableBatter.playerId;
          updated = true;
        }
      }
      if (!newNonStrikerId && newStrikerId) {
        const otherBatter = currentInnings.battingScorecard.find(b => !b.isOut && b.playerId !== newStrikerId);
        if (otherBatter) {
          newNonStrikerId = otherBatter.playerId;
          updated = true;
        }
      }
      if (!newBowlerId) {
        const candidateBowler = currentInnings.bowlingScorecard[0];
        if (candidateBowler) {
          newBowlerId = candidateBowler.playerId;
          updated = true;
        }
      }

      if (updated) {
        onUpdateMatch({
          ...match,
          currentStrikerId: newStrikerId,
          currentNonStrikerId: newNonStrikerId,
          currentBowlerId: newBowlerId,
        });
      }
    }
  }, [match.currentInningsNumber, match.status]);

  // Handle real-time simulation interval
  useEffect(() => {
    if (isSimulating && match.status === 'live') {
      autoPlayTimerRef.current = setTimeout(() => {
        simulateRandomBall();
      }, simulationSpeed);
    }
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    }
  }, [isSimulating, match, simulationSpeed]);

  const simulateRandomBall = () => {
    if (!hasWriteAccess) {
      setIsSimulating(false);
      setShowAccessDeniedModal(true);
      return;
    }

    if (match.status !== 'live') {
      setIsSimulating(false);
      return;
    }

    const rand = Math.random();
    if (rand < 0.05) {
      // Wicket (5% chance)
      const wicketTypes: WicketType[] = ['caught', 'bowled', 'lbw', 'run-out'];
      const chosenType = wicketTypes[Math.floor(Math.random() * wicketTypes.length)];
      handleWicketBall(chosenType, 'striker');
    } else if (rand < 0.09) {
      // Extra: Wide or No ball
      const isWide = Math.random() > 0.3;
      handleBallScore(0, isWide ? 'wide' : 'no-ball', 1);
    } else if (rand < 0.45) {
      // Dot ball
      handleBallScore(0, 'none', 0);
    } else if (rand < 0.70) {
      // 1 run
      handleBallScore(1, 'none', 0);
    } else if (rand < 0.82) {
      // 2 runs
      handleBallScore(2, 'none', 0);
    } else if (rand < 0.94) {
      // 4 boundary
      handleBallScore(4, 'none', 0);
    } else {
      // 6 maximum
      handleBallScore(6, 'none', 0);
    }
  };

  // Switch Striker
  const handleSwapStrikers = () => {
    if (!hasWriteAccess) {
      setShowAccessDeniedModal(true);
      return;
    }

    onUpdateMatch({
      ...match,
      currentStrikerId: match.currentNonStrikerId,
      currentNonStrikerId: match.currentStrikerId,
    });
  };

  // Main Ball Processing Logic
  const handleBallScore = (runsBat: number, extraType: ExtraType = 'none', extraRuns: number = 0) => {
    if (!hasWriteAccess) {
      setShowAccessDeniedModal(true);
      return;
    }

    if (match.status !== 'live' || !currentInnings) return;

    const isLegal = extraType !== 'wide' && extraType !== 'no-ball';
    const totalBallRuns = runsBat + extraRuns;

    const currentLegalBalls = currentInnings.legalBalls + (isLegal ? 1 : 0);
    const newTotalRuns = currentInnings.totalRuns + totalBallRuns;

    const currentOverIdx = Math.floor(currentInnings.legalBalls / 6);
    const ballInThisOver = (currentInnings.legalBalls % 6) + (isLegal ? 1 : 0);

    const strikerPlayer = striker || currentInnings.battingScorecard[0];
    const bowlerPlayer = bowler || currentInnings.bowlingScorecard[0];
    const nonStrikerPlayer = nonStriker || currentInnings.battingScorecard[1];

    const comment = generateBallCommentary(
      isLegal ? ballInThisOver : currentInnings.legalBalls % 6,
      currentOverIdx,
      runsBat,
      extraType,
      extraRuns,
      false,
      undefined,
      strikerPlayer?.playerName,
      bowlerPlayer?.playerName
    );

    const newBall: BallRecord = {
      id: `ball-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      overIndex: currentOverIdx,
      ballInOver: isLegal ? ballInThisOver : currentInnings.legalBalls % 6,
      isLegalBall: isLegal,
      batsmanId: strikerPlayer?.playerId || '',
      batsmanName: strikerPlayer?.playerName || '',
      nonStrikerId: nonStrikerPlayer?.playerId || '',
      nonStrikerName: nonStrikerPlayer?.playerName || '',
      bowlerId: bowlerPlayer?.playerId || '',
      bowlerName: bowlerPlayer?.playerName || '',
      runsBat,
      extraType,
      extraRuns,
      isWicket: false,
      commentary: comment,
      timestamp: Date.now(),
      cumulativeScore: newTotalRuns,
      cumulativeWickets: currentInnings.wickets,
    };

    // Update Batting Scorecard
    const updatedBatting = currentInnings.battingScorecard.map(b => {
      if (b.playerId === strikerPlayer?.playerId) {
        const newRuns = b.runs + runsBat;
        const newBalls = b.balls + (extraType === 'wide' ? 0 : 1);
        const new4s = b.fours + (runsBat === 4 ? 1 : 0);
        const new6s = b.sixes + (runsBat === 6 ? 1 : 0);
        return {
          ...b,
          runs: newRuns,
          balls: newBalls,
          fours: new4s,
          sixes: new6s,
          strikeRate: calculateStrikeRate(newRuns, newBalls),
          isBatting: true,
        };
      }
      return b;
    });

    // Update Bowling Scorecard
    const runsConcededForBowler = runsBat + (extraType === 'wide' || extraType === 'no-ball' ? extraRuns : 0);
    const updatedBowling = currentInnings.bowlingScorecard.map(bw => {
      if (bw.playerId === bowlerPlayer?.playerId) {
        const newLegalBalls = bw.ballsBowled + (isLegal ? 1 : 0);
        const newRuns = bw.runsConceded + runsConcededForBowler;
        const newDots = bw.dots + (runsBat === 0 && extraType === 'none' ? 1 : 0);
        const newWides = bw.wides + (extraType === 'wide' ? 1 : 0);
        const newNBs = bw.noBalls + (extraType === 'no-ball' ? 1 : 0);
        return {
          ...bw,
          ballsBowled: newLegalBalls,
          overs: Number(legalBallsToOversString(newLegalBalls)),
          runsConceded: newRuns,
          dots: newDots,
          wides: newWides,
          noBalls: newNBs,
          economy: calculateEconomy(newRuns, newLegalBalls),
        };
      }
      return bw;
    });

    // Update Extras
    const updatedExtras = {
      ...currentInnings.extras,
      wides: currentInnings.extras.wides + (extraType === 'wide' ? extraRuns : 0),
      noBalls: currentInnings.extras.noBalls + (extraType === 'no-ball' ? extraRuns : 0),
      byes: currentInnings.extras.byes + (extraType === 'bye' ? extraRuns : 0),
      legByes: currentInnings.extras.legByes + (extraType === 'leg-bye' ? extraRuns : 0),
      total: currentInnings.extras.total + (extraType !== 'none' ? extraRuns : 0),
    };

    // Update Partnerships
    let updatedPartnerships = [...currentInnings.partnerships];
    if (updatedPartnerships.length > 0) {
      const lastP = { ...updatedPartnerships[updatedPartnerships.length - 1] };
      lastP.runs += totalBallRuns;
      if (isLegal) lastP.balls += 1;
      updatedPartnerships[updatedPartnerships.length - 1] = lastP;
    } else {
      updatedPartnerships.push({
        batter1: strikerPlayer?.playerName || 'Batter 1',
        batter2: nonStrikerPlayer?.playerName || 'Batter 2',
        runs: totalBallRuns,
        balls: isLegal ? 1 : 0,
      });
    }

    const updatedInnings: Innings = {
      ...currentInnings,
      totalRuns: newTotalRuns,
      legalBalls: currentLegalBalls,
      oversString: legalBallsToOversString(currentLegalBalls),
      extras: updatedExtras,
      battingScorecard: updatedBatting,
      bowlingScorecard: updatedBowling,
      partnerships: updatedPartnerships,
      balls: [newBall, ...currentInnings.balls],
    };

    // Strike Rotation check
    // Odd runs off bat or byes/leg-byes rotate strike
    let nextStrikerId = match.currentStrikerId;
    let nextNonStrikerId = match.currentNonStrikerId;
    if (runsBat % 2 === 1 || (extraType === 'bye' && extraRuns % 2 === 1) || (extraType === 'leg-bye' && extraRuns % 2 === 1)) {
      nextStrikerId = match.currentNonStrikerId;
      nextNonStrikerId = match.currentStrikerId;
    }

    // Check if over completed (legal ball % 6 === 0)
    let nextBowlerIdFinal = match.currentBowlerId;
    if (isLegal && currentLegalBalls % 6 === 0) {
      // Over finished: change strike!
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;

      // Prompt bowler selection unless in auto simulation
      if (!isSimulating) {
        setShowBowlerModal(true);
      } else {
        // Pick next bowler automatically
        const otherBowlers = bowlingTeam?.players.filter(p => p.id !== bowlerPlayer?.playerId) || [];
        if (otherBowlers.length > 0) {
          const autoNext = otherBowlers[Math.floor(Math.random() * otherBowlers.length)];
          nextBowlerIdFinal = autoNext.id;
          // Ensure bowler entry exists in scorecard
          if (!updatedBowling.some(b => b.playerId === autoNext.id)) {
            updatedBowling.push({
              playerId: autoNext.id,
              playerName: autoNext.name,
              overs: 0,
              ballsBowled: 0,
              maidens: 0,
              runsConceded: 0,
              wickets: 0,
              economy: 0,
              wides: 0,
              noBalls: 0,
              dots: 0,
            });
          }
        }
      }
    }

    // Check match completion or innings break
    checkMatchStatusAndEmit(updatedInnings, nextStrikerId, nextNonStrikerId, nextBowlerIdFinal);
  };

  // Handle Wickets
  const handleWicketBall = (type: WicketType = 'caught', who: 'striker' | 'nonStriker' = 'striker', fielderIdParam?: string, newBatterIdParam?: string) => {
    if (!hasWriteAccess) {
      setShowAccessDeniedModal(true);
      return;
    }

    if (match.status !== 'live' || !currentInnings) return;

    const currentLegalBalls = currentInnings.legalBalls + 1; // standard wicket is a legal delivery
    const currentOverIdx = Math.floor(currentInnings.legalBalls / 6);
    const ballInThisOver = (currentInnings.legalBalls % 6) + 1;

    const dismissedBatter = who === 'striker' ? striker : nonStriker;
    const survivingBatter = who === 'striker' ? nonStriker : striker;
    const bowlerPlayer = bowler || currentInnings.bowlingScorecard[0];

    const fielder = bowlingTeam?.players.find(p => p.id === (fielderIdParam || selectedFielderId));
    const fielderName = fielder?.name;

    const comment = generateBallCommentary(
      ballInThisOver,
      currentOverIdx,
      0,
      'none',
      0,
      true,
      type,
      dismissedBatter?.playerName,
      bowlerPlayer?.playerName,
      fielderName
    );

    const newBall: BallRecord = {
      id: `ball-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      overIndex: currentOverIdx,
      ballInOver: ballInThisOver,
      isLegalBall: true,
      batsmanId: striker?.playerId || '',
      batsmanName: striker?.playerName || '',
      nonStrikerId: nonStriker?.playerId || '',
      nonStrikerName: nonStriker?.playerName || '',
      bowlerId: bowlerPlayer?.playerId || '',
      bowlerName: bowlerPlayer?.playerName || '',
      runsBat: 0,
      extraType: 'none',
      extraRuns: 0,
      isWicket: true,
      wicketType: type,
      dismissedPlayerId: dismissedBatter?.playerId,
      dismissedPlayerName: dismissedBatter?.playerName,
      fielderId: fielder?.id,
      fielderName,
      commentary: comment,
      timestamp: Date.now(),
      cumulativeScore: currentInnings.totalRuns,
      cumulativeWickets: currentInnings.wickets + 1,
    };

    // Update dismissal text
    let dismissalText = 'out';
    if (type === 'bowled') dismissalText = `b ${bowlerPlayer?.playerName}`;
    else if (type === 'caught') dismissalText = `c ${fielderName || 'fielder'} b ${bowlerPlayer?.playerName}`;
    else if (type === 'lbw') dismissalText = `lbw b ${bowlerPlayer?.playerName}`;
    else if (type === 'run-out') dismissalText = `run out (${fielderName || 'direct hit'})`;
    else if (type === 'stumped') dismissalText = `st ${fielderName || 'keeper'} b ${bowlerPlayer?.playerName}`;
    else if (type === 'hit-wicket') dismissalText = `hit wicket b ${bowlerPlayer?.playerName}`;

    // Update Batting Scorecard
    const updatedBatting = currentInnings.battingScorecard.map(b => {
      if (b.playerId === dismissedBatter?.playerId) {
        return {
          ...b,
          balls: b.balls + (who === 'striker' ? 1 : 0),
          isOut: true,
          isBatting: false,
          dismissalText,
          bowlerName: bowlerPlayer?.playerName,
          fielderName,
        };
      }
      return b;
    });

    // Find next batsman to walk in
    const existingInningsPlayerIds = updatedBatting.map(b => b.playerId);
    const unbattedPlayers = battingTeam?.players.filter(p => !existingInningsPlayerIds.includes(p.id)) || [];

    let incomingPlayer = unbattedPlayers.find(p => p.id === (newBatterIdParam || nextBatterId));
    if (!incomingPlayer && unbattedPlayers.length > 0) {
      incomingPlayer = unbattedPlayers[0];
    }

    if (incomingPlayer) {
      updatedBatting.push({
        playerId: incomingPlayer.id,
        playerName: incomingPlayer.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        isBatting: true,
        battingOrder: updatedBatting.length + 1,
      });
    }

    // Update Bowling Scorecard
    const isBowlerCredited = type !== 'run-out';
    const updatedBowling = currentInnings.bowlingScorecard.map(bw => {
      if (bw.playerId === bowlerPlayer?.playerId) {
        const newLegalBalls = bw.ballsBowled + 1;
        const newWickets = bw.wickets + (isBowlerCredited ? 1 : 0);
        return {
          ...bw,
          ballsBowled: newLegalBalls,
          overs: Number(legalBallsToOversString(newLegalBalls)),
          wickets: newWickets,
          dots: bw.dots + 1,
          economy: calculateEconomy(bw.runsConceded, newLegalBalls),
        };
      }
      return bw;
    });

    // Fall of Wicket Record
    const newFow = {
      wicketNumber: currentInnings.wickets + 1,
      score: currentInnings.totalRuns,
      overs: legalBallsToOversString(currentLegalBalls),
      playerName: dismissedBatter?.playerName || 'Batsman',
      dismissal: dismissalText,
    };

    // Partnerships: close current, start new
    const updatedPartnerships = [...currentInnings.partnerships];
    if (incomingPlayer && survivingBatter) {
      updatedPartnerships.push({
        batter1: survivingBatter.playerName,
        batter2: incomingPlayer.name,
        runs: 0,
        balls: 0,
      });
    }

    const updatedInnings: Innings = {
      ...currentInnings,
      wickets: currentInnings.wickets + 1,
      legalBalls: currentLegalBalls,
      oversString: legalBallsToOversString(currentLegalBalls),
      battingScorecard: updatedBatting,
      bowlingScorecard: updatedBowling,
      fallOfWickets: [...currentInnings.fallOfWickets, newFow],
      partnerships: updatedPartnerships,
      balls: [newBall, ...currentInnings.balls],
    };

    // Determine new striker & non-striker
    let newStrikerId = match.currentStrikerId;
    let newNonStrikerId = match.currentNonStrikerId;

    if (who === 'striker') {
      newStrikerId = incomingPlayer ? incomingPlayer.id : undefined;
    } else {
      newNonStrikerId = incomingPlayer ? incomingPlayer.id : undefined;
    }

    // If over finished on this ball
    if (currentLegalBalls % 6 === 0) {
      const temp = newStrikerId;
      newStrikerId = newNonStrikerId;
      newNonStrikerId = temp;
      if (!isSimulating) setShowBowlerModal(true);
    }

    setShowWicketModal(false);
    checkMatchStatusAndEmit(updatedInnings, newStrikerId, newNonStrikerId, match.currentBowlerId);
  };

  // Check victory / target reached / all out / 20 overs reached
  const checkMatchStatusAndEmit = (
    updatedInnings: Innings,
    newStrikerId?: string,
    newNonStrikerId?: string,
    newBowlerId?: string
  ) => {
    const isAllOut = updatedInnings.wickets >= 10;
    const isOversFinished = updatedInnings.legalBalls >= match.maxOvers * 6;

    // 2nd Innings Check: Has target been chased?
    if (match.currentInningsNumber === 2 && match.targetRuns) {
      if (updatedInnings.totalRuns >= match.targetRuns) {
        // Batting team wins!
        const wicketsInHand = 10 - updatedInnings.wickets;
        const ballsRemaining = match.maxOvers * 6 - updatedInnings.legalBalls;
        const resultText = `${battingTeam?.name} won by ${wicketsInHand} wicket${wicketsInHand !== 1 ? 's' : ''} (with ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining)`;

        setIsSimulating(false);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        onUpdateMatch({
          ...match,
          status: 'completed',
          innings2: updatedInnings,
          result: resultText,
          currentStrikerId: newStrikerId,
          currentNonStrikerId: newNonStrikerId,
          currentBowlerId: newBowlerId,
        });
        return;
      }

      if (isAllOut || isOversFinished) {
        // Bowling team defended the target or tied!
        let resultText = '';
        if (updatedInnings.totalRuns === match.targetRuns - 1) {
          resultText = 'Match Tied! (Super Over required)';
        } else {
          const runMargin = match.targetRuns - 1 - updatedInnings.totalRuns;
          resultText = `${bowlingTeam?.name} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
        }

        setIsSimulating(false);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

        onUpdateMatch({
          ...match,
          status: 'completed',
          innings2: updatedInnings,
          result: resultText,
          currentStrikerId: newStrikerId,
          currentNonStrikerId: newNonStrikerId,
          currentBowlerId: newBowlerId,
        });
        return;
      }

      // Normal 2nd innings continuation
      onUpdateMatch({
        ...match,
        innings2: updatedInnings,
        currentStrikerId: newStrikerId,
        currentNonStrikerId: newNonStrikerId,
        currentBowlerId: newBowlerId,
      });
      return;
    }

    // 1st Innings Check: Check if 1st innings ends
    if (match.currentInningsNumber === 1 && (isAllOut || isOversFinished)) {
      // Transition to 2nd innings!
      const target = updatedInnings.totalRuns + 1;
      const newBattingTeam = teams.find(t => t.id === match.innings1.bowlingTeamId);
      const newBowlingTeam = teams.find(t => t.id === match.innings1.battingTeamId);

      const openingBatters = newBattingTeam?.players.slice(0, 2) || [];
      const openingBowler = newBowlingTeam?.players[0];

      const initial2ndInnings: Innings = {
        battingTeamId: newBattingTeam?.id || '',
        bowlingTeamId: newBowlingTeam?.id || '',
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
        bowlingScorecard: openingBowler ? [{
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
        }] : [],
        fallOfWickets: [],
        partnerships: openingBatters.length === 2 ? [{
          batter1: openingBatters[0].name,
          batter2: openingBatters[1].name,
          runs: 0,
          balls: 0,
        }] : [],
        balls: [],
      };

      onUpdateMatch({
        ...match,
        innings1: updatedInnings,
        innings2: initial2ndInnings,
        currentInningsNumber: 2,
        targetRuns: target,
        currentStrikerId: openingBatters[0]?.id,
        currentNonStrikerId: openingBatters[1]?.id,
        currentBowlerId: openingBowler?.id,
      });
      return;
    }

    // Normal 1st innings continuation
    onUpdateMatch({
      ...match,
      innings1: updatedInnings,
      currentStrikerId: newStrikerId,
      currentNonStrikerId: newNonStrikerId,
      currentBowlerId: newBowlerId,
    });
  };

  // Undo Last Ball
  const handleUndoBall = () => {
    if (!hasWriteAccess) {
      setShowAccessDeniedModal(true);
      return;
    }

    if (!currentInnings.balls || currentInnings.balls.length === 0) return;

    const [lastBall, ...remainingBalls] = currentInnings.balls;
    const runsToSubtract = lastBall.runsBat + lastBall.extraRuns;
    const isLegal = lastBall.isLegalBall;

    const newLegalBalls = Math.max(0, currentInnings.legalBalls - (isLegal ? 1 : 0));
    const newTotalRuns = Math.max(0, currentInnings.totalRuns - runsToSubtract);
    const newWickets = Math.max(0, currentInnings.wickets - (lastBall.isWicket ? 1 : 0));

    // Revert Batting Scorecard
    const updatedBatting = currentInnings.battingScorecard.map(b => {
      if (b.playerId === lastBall.batsmanId) {
        const ballsFaced = Math.max(0, b.balls - (lastBall.extraType === 'wide' ? 0 : 1));
        const runs = Math.max(0, b.runs - lastBall.runsBat);
        const fours = Math.max(0, b.fours - (lastBall.runsBat === 4 ? 1 : 0));
        const sixes = Math.max(0, b.sixes - (lastBall.runsBat === 6 ? 1 : 0));
        return {
          ...b,
          runs,
          balls: ballsFaced,
          fours,
          sixes,
          strikeRate: calculateStrikeRate(runs, ballsFaced),
          isOut: lastBall.isWicket && lastBall.dismissedPlayerId === b.playerId ? false : b.isOut,
          dismissalText: lastBall.isWicket && lastBall.dismissedPlayerId === b.playerId ? undefined : b.dismissalText,
        };
      }
      return b;
    });

    // Revert Bowling Scorecard
    const runsConcededForBowler = lastBall.runsBat + (lastBall.extraType === 'wide' || lastBall.extraType === 'no-ball' ? lastBall.extraRuns : 0);
    const updatedBowling = currentInnings.bowlingScorecard.map(bw => {
      if (bw.playerId === lastBall.bowlerId) {
        const ballsBowled = Math.max(0, bw.ballsBowled - (isLegal ? 1 : 0));
        const runsConceded = Math.max(0, bw.runsConceded - runsConcededForBowler);
        const wickets = Math.max(0, bw.wickets - (lastBall.isWicket && lastBall.wicketType !== 'run-out' ? 1 : 0));
        return {
          ...bw,
          ballsBowled,
          overs: Number(legalBallsToOversString(ballsBowled)),
          runsConceded,
          wickets,
          economy: calculateEconomy(runsConceded, ballsBowled),
        };
      }
      return bw;
    });

    // Revert Extras
    const updatedExtras = {
      ...currentInnings.extras,
      wides: Math.max(0, currentInnings.extras.wides - (lastBall.extraType === 'wide' ? lastBall.extraRuns : 0)),
      noBalls: Math.max(0, currentInnings.extras.noBalls - (lastBall.extraType === 'no-ball' ? lastBall.extraRuns : 0)),
      byes: Math.max(0, currentInnings.extras.byes - (lastBall.extraType === 'bye' ? lastBall.extraRuns : 0)),
      legByes: Math.max(0, currentInnings.extras.legByes - (lastBall.extraType === 'leg-bye' ? lastBall.extraRuns : 0)),
      total: Math.max(0, currentInnings.extras.total - (lastBall.extraType !== 'none' ? lastBall.extraRuns : 0)),
    };

    // Revert Fall of Wicket if it was a wicket
    const updatedFow = lastBall.isWicket
      ? currentInnings.fallOfWickets.slice(0, -1)
      : currentInnings.fallOfWickets;

    const revertedInnings: Innings = {
      ...currentInnings,
      totalRuns: newTotalRuns,
      wickets: newWickets,
      legalBalls: newLegalBalls,
      oversString: legalBallsToOversString(newLegalBalls),
      extras: updatedExtras,
      battingScorecard: updatedBatting,
      bowlingScorecard: updatedBowling,
      fallOfWickets: updatedFow,
      balls: remainingBalls,
    };

    onUpdateMatch({
      ...match,
      ...(match.currentInningsNumber === 1
        ? { innings1: revertedInnings }
        : { innings2: revertedInnings }),
      currentStrikerId: lastBall.batsmanId,
      currentNonStrikerId: lastBall.nonStrikerId,
      currentBowlerId: lastBall.bowlerId,
      status: 'live',
      result: undefined,
    });
  };

  // Recent Balls in current over
  const recentBalls = currentInnings.balls.slice(0, 8);

  // Rate calculations
  const crr = currentInnings.legalBalls > 0
    ? ((currentInnings.totalRuns / currentInnings.legalBalls) * 6).toFixed(2)
    : '0.00';

  let rrr: string | null = null;
  let runsNeeded: number | null = null;
  let ballsRemaining: number | null = null;

  if (match.currentInningsNumber === 2 && match.targetRuns) {
    runsNeeded = Math.max(0, match.targetRuns - currentInnings.totalRuns);
    ballsRemaining = Math.max(0, match.maxOvers * 6 - currentInnings.legalBalls);
    rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
  }

  return (
    <div id="live-match-tracker-root" className="space-y-4">
      {/* Scoreboard Access Permission & Persona Switcher Banner */}
      <div
        id="scoreboard-access-banner"
        className={`border rounded-xl p-4 transition-all shadow-lg ${
          hasWriteAccess
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                hasWriteAccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {hasWriteAccess ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wide font-mono ${
                    hasWriteAccess
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {hasWriteAccess ? 'Scoreboard Write Access: Active' : 'Scoreboard: View-Only Mode'}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Acting as:{' '}
                  <strong className="text-white">
                    {activeUserPlayer?.name || 'Spectator'}
                  </strong>{' '}
                  <span className="text-slate-400">
                    ({activeUserTeam?.name || 'Unassigned Team'})
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {hasWriteAccess ? (
                  <span>
                    You are the designated scoreboard manager for{' '}
                    <strong className="text-emerald-300">
                      {isTeam1Scorer ? team1?.name : team2?.name}
                    </strong>
                    . You have write/edit access to record deliveries, update scores, and manage this match.
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-300">Scoreboard editing is restricted.</strong> Only one designated player from each team can manage the scoreboard:{' '}
                    <strong className="text-white">
                      {team1?.shortName} ({team1Scorer?.name})
                    </strong>{' '}
                    or{' '}
                    <strong className="text-white">
                      {team2?.shortName} ({team2Scorer?.name})
                    </strong>
                    . All other players have view-only access.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Role & Permission Testing Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs shrink-0 self-start lg:self-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
              Switch Persona:
            </span>

            {/* Team 1 Scorer (Write) */}
            {team1Scorer && (
              <button
                type="button"
                id="switch-team1-scorer-btn"
                onClick={() => handleSwitchPlayer(team1Scorer.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  effectiveActivePlayerId === team1Scorer.id
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`Switch to ${team1?.name} Scorer (Write Access)`}
              >
                <Edit3 className="w-3 h-3 text-emerald-400" />
                <span>
                  {team1?.shortName} Scorer ({team1Scorer.shortName})
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase font-mono font-bold">
                  Write
                </span>
              </button>
            )}

            {/* Team 1 Teammate (View-Only) */}
            {team1OtherPlayer && (
              <button
                type="button"
                id="switch-team1-other-btn"
                onClick={() => handleSwitchPlayer(team1OtherPlayer.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  effectiveActivePlayerId === team1OtherPlayer.id
                    ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`Switch to ${team1?.name} Teammate (View-Only Access)`}
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>
                  {team1?.shortName} ({team1OtherPlayer.shortName})
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase font-mono font-bold">
                  View
                </span>
              </button>
            )}

            {/* Team 2 Scorer (Write) */}
            {team2Scorer && (
              <button
                type="button"
                id="switch-team2-scorer-btn"
                onClick={() => handleSwitchPlayer(team2Scorer.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  effectiveActivePlayerId === team2Scorer.id
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`Switch to ${team2?.name} Scorer (Write Access)`}
              >
                <Edit3 className="w-3 h-3 text-emerald-400" />
                <span>
                  {team2?.shortName} Scorer ({team2Scorer.shortName})
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase font-mono font-bold">
                  Write
                </span>
              </button>
            )}

            {/* Team 2 Teammate (View-Only) */}
            {team2OtherPlayer && (
              <button
                type="button"
                id="switch-team2-other-btn"
                onClick={() => handleSwitchPlayer(team2OtherPlayer.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  effectiveActivePlayerId === team2OtherPlayer.id
                    ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`Switch to ${team2?.name} Teammate (View-Only Access)`}
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>
                  {team2?.shortName} ({team2OtherPlayer.shortName})
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase font-mono font-bold">
                  View
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Match Card Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {match.status === 'live' ? 'LIVE' : match.status.toUpperCase()}
            </span>
            <span className="text-slate-400 font-medium">{match.leagueName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{match.venue}</span>
          </div>

          {/* Auto Simulation Controls */}
          {match.status === 'live' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Auto-Play Live:</span>
              <button
                id="toggle-simulate-btn"
                onClick={() => {
                  if (!hasWriteAccess) {
                    setShowAccessDeniedModal(true);
                    return;
                  }
                  setIsSimulating(!isSimulating);
                }}
                disabled={!hasWriteAccess}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  !hasWriteAccess
                    ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                    : isSimulating
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={
                  !hasWriteAccess
                    ? 'Simulation locked: Scoreboard write access required'
                    : undefined
                }
              >
                {!hasWriteAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : isSimulating ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {!hasWriteAccess
                  ? 'Simulation Locked'
                  : isSimulating
                  ? 'Pause Live Ticker'
                  : 'Auto-Simulate Live'}
              </button>

              {isSimulating && (
                <select
                  value={simulationSpeed}
                  onChange={e => setSimulationSpeed(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                >
                  <option value={1000}>Fast (1s)</option>
                  <option value={2000}>Normal (2s)</option>
                  <option value={3500}>Slow (3.5s)</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* Live Scoreboard Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{battingTeam?.logo || '🏏'}</span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {battingTeam?.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                Batting
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                {currentInnings.totalRuns}/{currentInnings.wickets}
              </span>
              <span className="text-base sm:text-lg text-slate-400 font-mono">
                ({currentInnings.oversString} / {match.maxOvers} ov)
              </span>
            </div>

            {/* Run Rates & Target Info */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
              <div className="bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                CRR: <span className="font-bold text-white font-mono">{crr}</span>
              </div>
              {match.currentInningsNumber === 2 && match.targetRuns && (
                <>
                  <div className="bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                    RRR: <span className="font-bold text-amber-400 font-mono">{rrr}</span>
                  </div>
                  <div className="bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-800/40 text-emerald-300 font-medium">
                    Need <strong>{runsNeeded}</strong> from <strong>{ballsRemaining}</strong> balls
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Opposition / 1st Innings Summary */}
          <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {match.currentInningsNumber === 2 ? '1st Innings Score' : 'Opponent'}
              </span>
              <span className="text-xs text-slate-500">
                {match.tossWinnerId === battingTeam?.id ? battingTeam?.shortName : bowlingTeam?.shortName} won toss &amp; chose to {match.tossDecision}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{bowlingTeam?.logo || '🛡️'}</span>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{bowlingTeam?.name}</h4>
                  <p className="text-xs text-slate-400">
                    {match.currentInningsNumber === 2
                      ? `${match.innings1.totalRuns}/${match.innings1.wickets} (${match.innings1.oversString} ov)`
                      : 'Bowling now'}
                  </p>
                </div>
              </div>

              {match.result && (
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Result
                  </div>
                  <div className="text-xs text-slate-300 max-w-[200px] leading-tight mt-0.5 font-medium">
                    {match.result}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Balls Strip */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Over:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {recentBalls.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No balls yet in this spell</span>
              ) : (
                recentBalls.map(b => (
                  <span
                    key={b.id}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-transform hover:scale-110 ${
                      b.isWicket
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                        : b.runsBat === 6
                        ? 'bg-purple-600 text-white'
                        : b.runsBat === 4
                        ? 'bg-blue-600 text-white'
                        : b.extraType !== 'none'
                        ? 'bg-amber-600/80 text-white'
                        : b.runsBat === 0
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-700 text-white'
                    }`}
                    title={`${b.batsmanName}: ${b.runsBat}r, ${b.extraType !== 'none' ? b.extraType : ''}`}
                  >
                    {b.isWicket ? 'W' : b.extraType === 'wide' ? 'Wd' : b.extraType === 'no-ball' ? 'Nb' : b.runsBat}
                  </span>
                ))
              )}
            </div>
          </div>

          {match.status === 'live' && (
            <div className="flex items-center gap-2">
              <button
                id="undo-last-ball-btn"
                onClick={() => {
                  if (!hasWriteAccess) {
                    setShowAccessDeniedModal(true);
                    return;
                  }
                  handleUndoBall();
                }}
                disabled={!hasWriteAccess || currentInnings.balls.length === 0}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  !hasWriteAccess
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={
                  !hasWriteAccess
                    ? 'Scoreboard write access required to undo'
                    : 'Undo last delivery'
                }
              >
                {!hasWriteAccess ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                Undo Ball
              </button>

              <button
                id="swap-striker-btn"
                onClick={() => {
                  if (!hasWriteAccess) {
                    setShowAccessDeniedModal(true);
                    return;
                  }
                  handleSwapStrikers();
                }}
                disabled={!hasWriteAccess}
                className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  !hasWriteAccess
                    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={
                  !hasWriteAccess
                    ? 'Scoreboard write access required to switch ends'
                    : 'Manually switch striker end'
                }
              >
                {!hasWriteAccess ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <ArrowLeftRight className="w-3 h-3" />
                )}
                Switch Ends
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub Navigation: Console vs Full Scorecard vs Commentary vs Match Stats */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-xl gap-1">
        <button
          id="tab-console"
          onClick={() => setActiveSubTab('console')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'console'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          Scoring Console
        </button>

        <button
          id="tab-scorecard"
          onClick={() => setActiveSubTab('scorecard')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'scorecard'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Detailed Scorecard
        </button>

        <button
          id="tab-commentary"
          onClick={() => setActiveSubTab('commentary')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'commentary'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ball Feed ({currentInnings.balls.length})
        </button>

        <button
          id="tab-stats"
          onClick={() => setActiveSubTab('stats')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'stats'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Match Info &amp; Awards
        </button>
      </div>

      {/* SUB-VIEW 1: Interactive Scoring Console */}
      {activeSubTab === 'console' && (
        <div className="space-y-4">
          {/* Batters & Bowler Active Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Striker Card */}
            <div
              onClick={() => striker && onSelectPlayer(striker.playerId)}
              className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-lg cursor-pointer hover:border-emerald-500 transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl uppercase">
                On Strike *
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Batter (Striker)</span>
                <h4 className="text-base font-bold text-white truncate mt-0.5">
                  {striker?.playerName || 'Select Striker'}
                </h4>
              </div>
              <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800 text-xs">
                <span className="text-xl font-black text-white font-mono">
                  {striker?.runs ?? 0} <span className="text-xs text-slate-400 font-normal font-sans">({striker?.balls ?? 0})</span>
                </span>
                <span className="text-slate-400 font-mono">
                  4s: <strong>{striker?.fours ?? 0}</strong> • 6s: <strong>{striker?.sixes ?? 0}</strong> • SR: <strong>{striker?.strikeRate ?? 0}</strong>
                </span>
              </div>
            </div>

            {/* Non-Striker Card */}
            <div
              onClick={() => nonStriker && onSelectPlayer(nonStriker.playerId)}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md cursor-pointer hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Batter (Non-Striker)</span>
                <h4 className="text-base font-bold text-slate-200 truncate mt-0.5">
                  {nonStriker?.playerName || 'Select Non-Striker'}
                </h4>
              </div>
              <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800 text-xs">
                <span className="text-xl font-black text-slate-300 font-mono">
                  {nonStriker?.runs ?? 0} <span className="text-xs text-slate-500 font-normal font-sans">({nonStriker?.balls ?? 0})</span>
                </span>
                <span className="text-slate-400 font-mono">
                  4s: <strong>{nonStriker?.fours ?? 0}</strong> • 6s: <strong>{nonStriker?.sixes ?? 0}</strong> • SR: <strong>{nonStriker?.strikeRate ?? 0}</strong>
                </span>
              </div>
            </div>

            {/* Current Bowler Card */}
            <div
              onClick={() => bowler && onSelectPlayer(bowler.playerId)}
              className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 shadow-lg cursor-pointer hover:border-amber-500 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 uppercase font-semibold">Current Bowler</span>
                <button
                  id="change-bowler-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    setShowBowlerModal(true);
                  }}
                  disabled={!hasWriteAccess}
                  className={`text-[10px] underline flex items-center gap-1 ${
                    !hasWriteAccess
                      ? 'text-slate-500 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard write access required to change bowler' : undefined}
                >
                  {!hasWriteAccess && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                  Change Bowler
                </button>
              </div>
              <h4 className="text-base font-bold text-white truncate mt-0.5">
                {bowler?.playerName || 'Select Bowler'}
              </h4>
              <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800 text-xs">
                <span className="text-xl font-black text-white font-mono">
                  {bowler?.wickets ?? 0}-{bowler?.runsConceded ?? 0}
                </span>
                <span className="text-slate-400 font-mono">
                  O: <strong>{bowler?.overs ?? '0.0'}</strong> • Econ: <strong>{bowler?.economy ?? '0.00'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Scoring Keypad */}
          {match.status === 'live' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 relative">
              {/* If View-Only, show prominent banner inside keypad */}
              {!hasWriteAccess && (
                <div
                  id="keypad-view-only-warning"
                  className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200"
                >
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-white">
                        Scoreboard Keypad Locked (View-Only Mode)
                      </span>
                      <span className="text-[11px] text-amber-300/80 leading-relaxed block">
                        Logged in as {activeUserPlayer?.name} ({activeUserTeam?.name}). Only the designated scoreboard manager from each team ({team1?.shortName}: {team1Scorer?.name}, {team2?.shortName}: {team2Scorer?.name}) can modify the score.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {team1Scorer && (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlayer(team1Scorer.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{team1?.shortName} Scorer</span>
                      </button>
                    )}
                    {team2Scorer && (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlayer(team2Scorer.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{team2?.shortName} Scorer</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Ball-by-Ball Scoring Controls</span>
                  {!hasWriteAccess && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </h4>
                <span className="text-xs text-slate-400">
                  {hasWriteAccess ? 'Click button to record delivery' : 'View-only mode: Controls locked'}
                </span>
              </div>

              {/* Standard Runs */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                <button
                  id="btn-run-0"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(0, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base shadow-md flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Dot ball'}
                >
                  <span>0</span>
                  <span className="text-[10px] font-normal text-slate-400 font-sans">Dot</span>
                </button>

                <button
                  id="btn-run-1"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(1, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base border shadow-md flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/40 active:scale-95'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Single run'}
                >
                  <span>1</span>
                  <span className="text-[10px] font-normal text-emerald-400/70 font-sans">Single</span>
                </button>

                <button
                  id="btn-run-2"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(2, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base border shadow-md flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border-emerald-700/40 active:scale-95'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Two runs'}
                >
                  <span>2</span>
                  <span className="text-[10px] font-normal text-emerald-400/70 font-sans">Two</span>
                </button>

                <button
                  id="btn-run-3"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(3, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base border shadow-md flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-300 border-emerald-700/40 active:scale-95'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Three runs'}
                >
                  <span>3</span>
                  <span className="text-[10px] font-normal text-emerald-400/70 font-sans">Three</span>
                </button>

                <button
                  id="btn-run-4"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(4, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-lg shadow-blue-600/20'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Four boundary'}
                >
                  <span>4</span>
                  <span className="text-[10px] font-normal text-blue-100 font-sans">Four!</span>
                </button>

                <button
                  id="btn-run-6"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    handleBallScore(6, 'none', 0);
                  }}
                  disabled={!hasWriteAccess}
                  className={`py-3.5 rounded-xl font-black text-base flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95 shadow-lg shadow-purple-600/20'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Six maximum'}
                >
                  <span>6</span>
                  <span className="text-[10px] font-normal text-purple-100 font-sans">Six!</span>
                </button>

                <button
                  id="btn-wicket"
                  onClick={() => {
                    if (!hasWriteAccess) {
                      setShowAccessDeniedModal(true);
                      return;
                    }
                    setShowWicketModal(true);
                  }}
                  disabled={!hasWriteAccess}
                  className={`col-span-2 sm:col-span-1 py-3.5 rounded-xl font-black text-base flex flex-col items-center transition-all ${
                    !hasWriteAccess
                      ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow-lg shadow-rose-600/20'
                  }`}
                  title={!hasWriteAccess ? 'Scoreboard locked: View-only player' : 'Record Wicket'}
                >
                  <span>W</span>
                  <span className="text-[10px] font-normal text-rose-100 font-sans">Wicket</span>
                </button>
              </div>

              {/* Extras Controls */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 font-medium block mb-2">Extras &amp; Penalties:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    id="btn-wide"
                    onClick={() => {
                      if (!hasWriteAccess) {
                        setShowAccessDeniedModal(true);
                        return;
                      }
                      handleBallScore(0, 'wide', 1);
                    }}
                    disabled={!hasWriteAccess}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      !hasWriteAccess
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/40 active:scale-95'
                    }`}
                  >
                    +1 Wide (WD)
                  </button>

                  <button
                    id="btn-noball"
                    onClick={() => {
                      if (!hasWriteAccess) {
                        setShowAccessDeniedModal(true);
                        return;
                      }
                      handleBallScore(0, 'no-ball', 1);
                    }}
                    disabled={!hasWriteAccess}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      !hasWriteAccess
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/40 active:scale-95'
                    }`}
                  >
                    +1 No Ball (NB)
                  </button>

                  <button
                    id="btn-bye"
                    onClick={() => {
                      if (!hasWriteAccess) {
                        setShowAccessDeniedModal(true);
                        return;
                      }
                      handleBallScore(0, 'bye', 1);
                    }}
                    disabled={!hasWriteAccess}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      !hasWriteAccess
                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95'
                    }`}
                  >
                    +1 Bye (B)
                  </button>

                  <button
                    id="btn-legbye"
                    onClick={() => {
                      if (!hasWriteAccess) {
                        setShowAccessDeniedModal(true);
                        return;
                      }
                      handleBallScore(0, 'leg-bye', 1);
                    }}
                    disabled={!hasWriteAccess}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      !hasWriteAccess
                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95'
                    }`}
                  >
                    +1 Leg Bye (LB)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-lg">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Match Finished</h3>
              <p className="text-sm text-emerald-400 font-semibold mt-1">{match.result}</p>
              {match.playerOfTheMatch && (
                <div className="mt-4 p-3 max-w-md mx-auto bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-wider">Player of the Match</span>
                  <div className="text-white font-bold text-sm mt-0.5">{match.playerOfTheMatch.playerName}</div>
                  <div className="text-emerald-400 mt-0.5">{match.playerOfTheMatch.performanceSummary}</div>
                </div>
              )}
            </div>
          )}

          {/* Quick Commentary Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Latest Live Delivery</span>
              <span className="text-emerald-400 font-mono text-[10px]">Real-time Feed</span>
            </h4>
            {currentInnings.balls.length > 0 ? (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-sm text-slate-200 font-sans leading-relaxed">
                <span className="font-bold text-emerald-400 font-mono mr-2">
                  {currentInnings.balls[0].commentary.split(' - ')[0]}
                </span>
                {currentInnings.balls[0].commentary.split(' - ').slice(1).join(' - ')}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No balls recorded yet for this innings.</p>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Scorecard View */}
      {activeSubTab === 'scorecard' && (
        <ScorecardView match={match} teams={teams} />
      )}

      {/* SUB-VIEW 3: Full Chronological Commentary Feed */}
      {activeSubTab === 'commentary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3">
            <span>Chronological Ball-by-Ball Feed</span>
            <span className="text-xs text-slate-400">{currentInnings.balls.length} deliveries recorded</span>
          </h4>

          {currentInnings.balls.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">No balls bowled yet in this innings.</div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto pr-1">
              {currentInnings.balls.map(b => (
                <div key={b.id} className="py-2.5 flex items-start gap-3 hover:bg-slate-800/20 px-2 rounded transition-colors">
                  <span
                    className={`w-9 h-7 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                      b.isWicket
                        ? 'bg-rose-600 text-white'
                        : b.runsBat === 6
                        ? 'bg-purple-600 text-white'
                        : b.runsBat === 4
                        ? 'bg-blue-600 text-white'
                        : b.extraType !== 'none'
                        ? 'bg-amber-600 text-white'
                        : b.runsBat === 0
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {b.isWicket ? 'OUT' : b.extraType === 'wide' ? 'WD' : b.extraType === 'no-ball' ? 'NB' : `${b.runsBat}`}
                  </span>
                  <div className="flex-1 text-xs">
                    <div className="text-slate-200 font-sans">{b.commentary}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-2">
                      <span>Score: <strong>{b.cumulativeScore}/{b.cumulativeWickets}</strong></span>
                      <span>•</span>
                      <span>Bowler: {b.bowlerName}</span>
                      <span>•</span>
                      <span>Batter: {b.batsmanName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: Match Info, Worm & Awards */}
      {activeSubTab === 'stats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Match Details &amp; Tournament Context
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">Fixture Info</span>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Tournament</span>
                <span className="text-white font-medium">{match.leagueName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Match</span>
                <span className="text-white font-medium">{match.matchTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Venue</span>
                <span className="text-white font-medium">{match.venue}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Format</span>
                <span className="text-white font-medium">{match.format} ({match.maxOvers} Overs)</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-lg border border-slate-800">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">Toss &amp; Conditions</span>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Toss Winner</span>
                <span className="text-white font-medium">
                  {teams.find(t => t.id === match.tossWinnerId)?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Elected To</span>
                <span className="text-emerald-400 font-bold uppercase">{match.tossDecision}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status</span>
                <span className="text-white font-semibold capitalize">{match.status}</span>
              </div>
            </div>
          </div>

          {/* Awards section */}
          {match.playerOfTheMatch ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">Player of the Match</span>
                <h4 className="text-base font-bold text-white">{match.playerOfTheMatch.playerName}</h4>
                <p className="text-xs text-slate-300">{match.playerOfTheMatch.performanceSummary}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
              Player of the Match award will be determined upon completion of both innings.
            </div>
          )}
        </div>
      )}

      {/* MODAL: Wicket Logger */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="p-1 rounded bg-rose-600 text-white text-xs font-black">W</span>
                Record Wicket Delivery
              </h3>
              <button
                onClick={() => setShowWicketModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dismissal Method */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">Dismissal Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['caught', 'bowled', 'lbw', 'run-out', 'stumped', 'hit-wicket'] as WicketType[]).map(wt => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setWicketType(wt)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      wicketType === wt
                        ? 'bg-rose-600 text-white font-bold shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {wt.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Who is Out */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">Dismissed Batsman</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDismissedBatterRole('striker')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium text-left truncate transition-all ${
                    dismissedBatterRole === 'striker'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Striker: {striker?.playerName || 'Striker'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedBatterRole('nonStriker')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium text-left truncate transition-all ${
                    dismissedBatterRole === 'nonStriker'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Non-Striker: {nonStriker?.playerName || 'Non-Striker'}
                </button>
              </div>
            </div>

            {/* Fielder (for caught, run-out, stumped) */}
            {(wicketType === 'caught' || wicketType === 'run-out' || wicketType === 'stumped') && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">
                  {wicketType === 'caught' ? 'Caught By (Fielder)' : wicketType === 'run-out' ? 'Run Out By (Fielder)' : 'Stumped By (Wicketkeeper)'}
                </label>
                <select
                  value={selectedFielderId}
                  onChange={e => setSelectedFielderId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs outline-none focus:border-rose-500"
                >
                  <option value="">-- Select Fielder --</option>
                  {bowlingTeam?.players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isWicketKeeper ? '(WK)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Next Batter Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold block">Next Batsman to Crease</label>
              <select
                value={nextBatterId}
                onChange={e => setNextBatterId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Next Batsman --</option>
                {battingTeam?.players
                  .filter(p => !currentInnings.battingScorecard.some(b => b.playerId === p.id))
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleWicketBall(wicketType, dismissedBatterRole, selectedFielderId, nextBatterId)}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-600/20"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Next Bowler Selector */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500 text-slate-950 text-xs font-black">O</span>
                Select Bowler for Next Over
              </h3>
              <button
                onClick={() => setShowBowlerModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Choose the bowler to deliver from this bowling end (cannot be the previous bowler {bowler?.playerName}):
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {bowlingTeam?.players
                  .filter(p => p.id !== bowler?.playerId)
                  .map(p => {
                    const existingBowlRecord = currentInnings.bowlingScorecard.find(bw => bw.playerId === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          let updatedBowling = [...currentInnings.bowlingScorecard];
                          if (!existingBowlRecord) {
                            updatedBowling.push({
                              playerId: p.id,
                              playerName: p.name,
                              overs: 0,
                              ballsBowled: 0,
                              maidens: 0,
                              runsConceded: 0,
                              wickets: 0,
                              economy: 0,
                              wides: 0,
                              noBalls: 0,
                              dots: 0,
                            });
                          }

                          onUpdateMatch({
                            ...match,
                            currentBowlerId: p.id,
                            ...(match.currentInningsNumber === 1
                              ? { innings1: { ...match.innings1, bowlingScorecard: updatedBowling } }
                              : { innings2: { ...match.innings2!, bowlingScorecard: updatedBowling } }),
                          });
                          setShowBowlerModal(false);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.bowlingStyle}</div>
                        </div>
                        {existingBowlRecord ? (
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-amber-400">{existingBowlRecord.wickets}-{existingBowlRecord.runsConceded}</span>
                            <span className="text-slate-400 block">({existingBowlRecord.overs} ov)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400">Fresh Bowler</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Scoreboard Access Denied / Role Switcher */}
      {showAccessDeniedModal && (
        <div
          id="modal-access-denied"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 border border-amber-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Scoreboard Modification Restricted
                </h3>
                <p className="text-xs text-amber-300/90 mt-0.5 font-medium">
                  Only designated scorers have write/edit access to update the score.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-3">
              <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800/80">
                <span>Current Interacting User:</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                  {activeUserPlayer?.name || 'Spectator'} ({activeUserTeam?.name || 'Unassigned'})
                </span>
              </div>

              <div className="text-slate-300 leading-relaxed">
                As per league regulations,{' '}
                <strong className="text-amber-300">
                  only one designated player from each team
                </strong>{' '}
                possesses write/edit authorization to manage and modify the scoreboard. All other players have view-only access.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {team1?.name} Scorer (Team A):
                  </span>
                  <h5 className="font-bold text-white text-sm mt-0.5">
                    {team1Scorer?.name || 'Unassigned'}
                  </h5>
                  <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                    ✓ Full Write Access
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {team2?.name} Scorer (Team B):
                  </span>
                  <h5 className="font-bold text-white text-sm mt-0.5">
                    {team2Scorer?.name || 'Unassigned'}
                  </h5>
                  <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                    ✓ Full Write Access
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] text-slate-400 block font-medium">
                Switch to an authorized designated scorer to modify the scoreboard:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {team1Scorer && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchPlayer(team1Scorer.id);
                      setShowAccessDeniedModal(false);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Act as {team1Scorer.shortName} ({team1?.shortName})</span>
                  </button>
                )}

                {team2Scorer && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchPlayer(team2Scorer.id);
                      setShowAccessDeniedModal(false);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Act as {team2Scorer.shortName} ({team2?.shortName})</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAccessDeniedModal(false)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all text-center mt-2 border border-slate-700/60"
              >
                Continue in View-Only Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
