import { Team, Player, ScriptedPlay, PlayCategory, ShotOutcome } from '../types/game';

// Helper to calculate game clock string
export function formatGameClock(secondsRemainingInQuarter: number): string {
  const mins = Math.floor(secondsRemainingInQuarter / 60);
  const secs = secondsRemainingInQuarter % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function generatePlayCommentary(
  category: PlayCategory,
  outcome: ShotOutcome,
  shooter: Player,
  defender?: Player,
  passer?: Player,
  points: number = 0,
  special?: {
    injury?: string;
    penalty?: string;
    review?: string;
    isBuzzerBeater?: boolean;
  }
): string {
  const shooterName = shooter.name;
  const defenderName = defender ? defender.name : 'the defense';
  const assistText = passer ? ` off a crisp dime from ${passer.name}` : ' in isolation';

  if (special?.injury) {
    return `CRITICAL INJURY TIMEOUT: ${shooterName} drives hard, lands awkwardly on ${defenderName}'s foot and clutches his ankle in pain! Team trainers rush out onto the court.`;
  }

  if (special?.penalty === 'FLAGRANT_2_EJECTION') {
    return `EJECTION! Whistle blows violently! ${defenderName} delivers an excessive clothesline foul on ${shooterName}! Referees immediately review and toss ${defenderName} from the arena!`;
  }

  if (special?.penalty === 'TECHNICAL') {
    return `TECHNICAL FOUL! Whistle blows as ${defenderName} screams directly in the referee's face following the whistle! Unsportsmanlike conduct awarded.`;
  }

  if (special?.review) {
    return `OFFICIAL REVIEW: Crew chief steps to the monitor to review the out-of-bounds possession. Ruling on the floor is under microscopic frame-by-frame scrutiny.`;
  }

  if (special?.isBuzzerBeater && outcome === 'MADE') {
    return `AT THE BUZZER! ${shooterName} launches with the clock expiring... IT'S GOOD! BANG! WHAT A MIRACULOUS BUZZER BEATER!`;
  }

  switch (category) {
    case 'ALLEY_OOP':
      if (outcome === 'MADE') {
        return `${passer ? passer.name : 'The point guard'} lofts a gorgeous alley-oop lob toward the stratosphere! ${shooterName} leaps above the square, catches with two hands, and SLAMS IT DOWN!`;
      } else {
        return `${passer ? passer.name : 'The guard'} tosses the alley-oop pass, but the timing is broken and it sails out of bounds!`;
      }

    case 'DRIVE_AND_KICK':
      if (outcome === 'MADE') {
        return `${passer ? passer.name : 'The guard'} drives the lane, collapses the entire defense, and lasers a cross-court kick-out pass to ${shooterName} in the corner... CASH MONEY! 3-POINTER!`;
      } else {
        return `${passer ? passer.name : 'The guard'} kicks out to ${shooterName} on the perimeter, but the 3-point attempt rattles in and out!`;
      }

    case 'PICK_AND_ROLL':
      if (outcome === 'MADE') {
        return `${passer ? passer.name : 'The point god'} executes the high pick-and-roll, threads a sublime pocket bounce pass through two defenders to ${shooterName}, who finishes smoothly at the glass!`;
      } else {
        return `${passer ? passer.name : 'The offense'} tries the pocket pass on the roll, but ${defenderName} intercepts the pass!`;
      }

    case 'PASS_AND_SCORE':
      if (outcome === 'MADE') {
        return `${passer ? passer.name : 'The guard'} whips a dazzling behind-the-back pass right into the shooting pocket of ${shooterName}, who buries the dagger over ${defenderName}!`;
      } else {
        return `${passer ? passer.name : 'The guard'} dishes inside to ${shooterName}, but the contested finish bounces off the iron.`;
      }

    case 'THREE_POINTER':
      if (outcome === 'MADE') {
        const calls = [
          `${shooterName} sizes up ${defenderName}, steps back behind the arc... BANG! Splashes it from downtown${assistText}!`,
          `High screen set, ${shooterName} pulls up from 30 feet... IT RAINS HOME! Nothing but the bottom of the nylon!`,
          `${shooterName} catches in the corner, lets it fly over the outstretched contest of ${defenderName}... SWISH!`,
        ];
        return calls[Math.floor(Math.random() * calls.length)];
      } else {
        return `${shooterName} launches the contested triple over ${defenderName}... Rims out off the back iron!`;
      }

    case 'SLAM_DUNK':
      if (outcome === 'MADE') {
        const dunks = [
          `LOOK OUT BELOW! ${shooterName} elevates with fury and hammers home a vicious posterizer right over ${defenderName}!`,
          `${passer ? `${passer.name} throws the lob... ` : ''}${shooterName} catches in mid-air and rips the rim off with both hands!`,
          `${shooterName} blows past ${defenderName} along the baseline and throws down a thunderous windmill slam!`,
        ];
        return dunks[Math.floor(Math.random() * dunks.length)];
      } else if (outcome === 'BLOCKED') {
        return `${shooterName} rises for the dunk, but ${defenderName} meets him at the summit and SWATS IT OUT OF BOUNDS!`;
      } else {
        return `${shooterName} tries to throw it down over ${defenderName}, but it rattles off the back of the cylinder!`;
      }

    case 'MID_RANGE':
      if (outcome === 'MADE') {
        return `${shooterName} hits the brakes at the elbow, elevates with a smooth fadeaway over ${defenderName}... PURE!`;
      } else {
        return `${shooterName} pulls up from 16 feet over ${defenderName}... short off the front of the rim.`;
      }

    case 'DRIVE_LAYUP':
      if (outcome === 'MADE' || outcome === 'FOUL_AND_ONE') {
        return `${shooterName} slashes through traffic, spins off ${defenderName}, lays it high off the glass and in${outcome === 'FOUL_AND_ONE' ? ' AND THE FOUL!' : '!'}`;
      } else {
        return `${shooterName} drives hard to the cup but loses control in heavy traffic against ${defenderName}.`;
      }

    case 'SHOOTING_FOUL':
      return `Whistle! ${shooterName} draws the contact inside against ${defenderName}. He heads to the charity stripe for free throws.`;

    case 'TURNOVER':
      return `TURNOVER! ${shooterName} gets swarmed by ${defenderName}, who strips the ball clean away and initiates the break!`;

    default:
      return `${shooterName} operates against ${defenderName} and scores ${points} points!`;
  }
}

export function createPossessionScript(
  possessionIndex: number,
  quarter: number,
  secondsRemaining: number,
  offenseTeam: Team,
  defenseTeam: Team,
  category: PlayCategory = 'THREE_POINTER',
  customOutcome?: ShotOutcome,
  selectedShooterId?: string
): ScriptedPlay {
  const offenseOnCourt = offenseTeam.roster.filter((p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME');
  const defenseOnCourt = defenseTeam.roster.filter((p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME');

  // Pick or assign shooter
  const shooter = selectedShooterId 
    ? offenseTeam.roster.find((p) => p.id === selectedShooterId) || offenseOnCourt[0]
    : offenseOnCourt[Math.floor(Math.random() * offenseOnCourt.length)];

  // Pick defender
  const defender = defenseOnCourt[Math.floor(Math.random() * defenseOnCourt.length)];
  
  // Pick assist if available
  const potentialPassers = offenseOnCourt.filter((p) => p.id !== shooter.id);
  const passer = potentialPassers.length > 0 && Math.random() > 0.4 
    ? potentialPassers[Math.floor(Math.random() * potentialPassers.length)] 
    : undefined;

  let outcome: ShotOutcome = customOutcome || 'MADE';
  let points = 0;
  let shotDesc = '';
  let freeThrows: { total: number; made: number } | undefined = undefined;

  // Ensure passer exists for pass plays
  let assignedPasser = passer;
  if (!assignedPasser && potentialPassers.length > 0 && (category === 'ALLEY_OOP' || category === 'DRIVE_AND_KICK' || category === 'PICK_AND_ROLL' || category === 'PASS_AND_SCORE')) {
    assignedPasser = potentialPassers[0];
  }

  switch (category) {
    case 'ALLEY_OOP':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 2 : 0;
      shotDesc = outcome === 'MADE' ? 'Lofted Alley-Oop Lob Slam' : 'Missed Alley-Oop Lob';
      break;

    case 'DRIVE_AND_KICK':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 3 : 0;
      shotDesc = outcome === 'MADE' ? 'Drive & Kick Corner 3-Pointer' : 'Drive & Kick 3-Point Miss';
      break;

    case 'PICK_AND_ROLL':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 2 : 0;
      shotDesc = outcome === 'MADE' ? 'Pick-and-Roll Pocket Pass Layup' : 'Contested P&R Roll Miss';
      break;

    case 'PASS_AND_SCORE':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 2 : 0;
      shotDesc = outcome === 'MADE' ? 'Pinpoint Dish & Score' : 'Contested Catch-and-Shoot Miss';
      break;

    case 'THREE_POINTER':
      outcome = customOutcome || (shooter.attributes.threePt >= 85 ? 'MADE' : 'MISSED');
      points = outcome === 'MADE' ? 3 : 0;
      shotDesc = outcome === 'MADE' ? 'Deep 3-Point Shot (27 ft)' : 'Contested 3-Point Miss';
      break;

    case 'SLAM_DUNK':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 2 : 0;
      shotDesc = outcome === 'MADE' ? 'Thunderous Rim-Rocker Dunk' : 'Blocked Dunk Attempt';
      break;

    case 'MID_RANGE':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 2 : 0;
      shotDesc = outcome === 'MADE' ? '18-ft Pull-up Fadeaway' : 'Contested Mid-Range Miss';
      break;

    case 'DRIVE_LAYUP':
      outcome = customOutcome || (Math.random() > 0.7 ? 'FOUL_AND_ONE' : 'MADE');
      points = outcome === 'FOUL_AND_ONE' ? 3 : (outcome === 'MADE' ? 2 : 0);
      shotDesc = 'Acrobatic Driving Finger-roll Layup';
      if (outcome === 'FOUL_AND_ONE') {
        freeThrows = { total: 1, made: 1 };
      }
      break;

    case 'SHOOTING_FOUL':
      outcome = 'MADE';
      freeThrows = { total: 2, made: 2 };
      points = 2;
      shotDesc = 'Shooting Foul - 2 Free Throws';
      break;

    case 'TURNOVER':
      outcome = 'STOLEN';
      points = 0;
      shotDesc = 'Stolen Pass / Lost Ball Turnover';
      break;

    case 'FLAGRANT_TECHNICAL':
      outcome = 'MADE';
      points = 2;
      freeThrows = { total: 2, made: 2 };
      shotDesc = 'Flagrant Foul 1 / Technical Foul';
      break;

    case 'INJURY_EVENT':
      outcome = 'MISSED';
      points = 0;
      shotDesc = 'Awkward Landing Ankle Sprain';
      break;

    case 'REFEREE_REVIEW':
      outcome = 'MADE';
      points = 2;
      shotDesc = 'Out-of-bounds Call Overturned on Video Replay';
      break;

    case 'BUZZER_BEATER':
      outcome = customOutcome || 'MADE';
      points = outcome === 'MADE' ? 3 : 0;
      shotDesc = 'Game-Winning Buzzer Beater 3-Pointer';
      break;
  }

  const commentary = generatePlayCommentary(category, outcome, shooter, defender, assignedPasser, points);

  return {
    id: `play_${possessionIndex}_${Date.now()}`,
    possessionIndex,
    quarter,
    clockRemaining: formatGameClock(secondsRemaining),
    offenseTeamId: offenseTeam.id,
    defenseTeamId: defenseTeam.id,
    category,
    shooterPlayerId: shooter.id,
    defenderPlayerId: defender?.id,
    passerPlayerId: assignedPasser?.id,
    outcome,
    pointsEarned: points,
    shotDescription: shotDesc,
    freeThrows,
    commentary,
  };
}
