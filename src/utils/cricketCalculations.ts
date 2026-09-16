import { BallRecord, ExtraType, WicketType } from '../types';

export function legalBallsToOversString(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

export function legalBallsToOversDecimal(legalBalls: number): number {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return Number(`${overs}.${balls}`);
}

export function calculateStrikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Number(((runs / balls) * 100).toFixed(1));
}

export function calculateEconomy(runsConceded: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  const overs = legalBalls / 6;
  return Number((runsConceded / overs).toFixed(2));
}

export function calculateCurrentRunRate(runs: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  const overs = legalBalls / 6;
  return Number((runs / overs).toFixed(2));
}

export function calculateRequiredRunRate(runsNeeded: number, ballsRemaining: number): number | null {
  if (ballsRemaining <= 0) return null;
  const overs = ballsRemaining / 6;
  return Number((runsNeeded / overs).toFixed(2));
}

export function generateBallCommentary(
  ballNumberInOver: number,
  overIndex: number,
  runsBat: number,
  extraType: ExtraType,
  extraRuns: number,
  isWicket: boolean,
  wicketType?: WicketType,
  batsmanName?: string,
  bowlerName?: string,
  fielderName?: string
): string {
  const overDisplay = `${overIndex}.${ballNumberInOver}`;
  const batter = batsmanName || 'Batsman';
  const bowler = bowlerName || 'Bowler';

  if (isWicket) {
    switch (wicketType) {
      case 'bowled':
        return `${overDisplay} - OUT! Bowled him! ${bowler} fires a searing delivery crashing into middle and off. ${batter} departs!`;
      case 'caught':
        return `${overDisplay} - OUT! Caught! ${batter} tries to clear the infield, gets a thick edge, and ${fielderName || 'fielder'} takes a clean catch!`;
      case 'lbw':
        return `${overDisplay} - OUT! LBW! Trapped right in front! ${bowler} strikes with pin-point accuracy, umpire raises the finger.`;
      case 'run-out':
        return `${overDisplay} - OUT! Run out! Direct hit from ${fielderName || 'the deep'}! ${batter} was well short of the crease.`;
      case 'stumped':
        return `${overDisplay} - OUT! Stumped! ${batter} stepped down the track, missed the turn, and the keeper whipped the bails off in a flash!`;
      case 'hit-wicket':
        return `${overDisplay} - OUT! Hit wicket! ${batter} accidentally dislodges the bails while playing deep in the crease.`;
      default:
        return `${overDisplay} - OUT! Wicket falls! Big celebration from ${bowler} and team.`;
    }
  }

  if (extraType === 'wide') {
    const totalExtra = extraRuns || 1;
    return `${overDisplay} - WIDE ball from ${bowler}! Straying down the leg side, umpire signals wide (${totalExtra} run${totalExtra > 1 ? 's' : ''}).`;
  }

  if (extraType === 'no-ball') {
    return `${overDisplay} - NO BALL called! Overstepping by ${bowler}. Free Hit coming up!`;
  }

  if (extraType === 'bye') {
    return `${overDisplay} - Bye taken. The ball beats everyone through to the keeper, batters scamper for ${extraRuns} run(s).`;
  }

  if (extraType === 'leg-bye') {
    return `${overDisplay} - Leg bye! Deflected off the thigh pad, good running between the wickets for ${extraRuns} run(s).`;
  }

  switch (runsBat) {
    case 0: {
      const dotDescriptions = [
        `${overDisplay} - Dot ball. Defended solidly right back down the pitch to ${bowler}.`,
        `${overDisplay} - No run. Good length ball on off stump, beaten outside the edge.`,
        `${overDisplay} - Pushed gently towards mid-off, no run conceded.`,
        `${overDisplay} - Sharp bouncer from ${bowler}, ${batter} sways out of the line gracefully.`,
      ];
      return dotDescriptions[Math.floor(Math.random() * dotDescriptions.length)];
    }
    case 1:
      return `${overDisplay} - 1 run. ${batter} taps it into the gap at cover point and takes a brisk single.`;
    case 2:
      return `${overDisplay} - 2 runs. Clipped nicely off the hips into deep square leg, positive intent and swift running for a double.`;
    case 3:
      return `${overDisplay} - 3 runs. Driven through extra cover, good fielding on the ropes cuts off the boundary.`;
    case 4: {
      const fourDescriptions = [
        `${overDisplay} - FOUR! Cracking shot! ${batter} leans into an exquisite cover drive that races to the fence!`,
        `${overDisplay} - FOUR! Pulled away with authority behind square leg, one bounce and into the advertising cushions!`,
        `${overDisplay} - FOUR! Delicate late cut past backward point, pure timing and placement!`,
        `${overDisplay} - FOUR! Smashed straight down the ground, leaves the mid-on fielder with no chance!`,
      ];
      return fourDescriptions[Math.floor(Math.random() * fourDescriptions.length)];
    }
    case 6: {
      const sixDescriptions = [
        `${overDisplay} - SIX! High, handsome and into the top tier! Massive hit over deep mid-wicket!`,
        `${overDisplay} - SIX! Stepped down the ground and launched it high over long-on for a gigantic maximum!`,
        `${overDisplay} - SIX! Hooked into the stands! What power and timing from ${batter}!`,
        `${overDisplay} - SIX! Scooped right over the wicketkeeper's head into the crowd! Audacious innovation!`,
      ];
      return sixDescriptions[Math.floor(Math.random() * sixDescriptions.length)];
    }
    default:
      return `${overDisplay} - ${runsBat} runs scored by ${batter}.`;
  }
}
