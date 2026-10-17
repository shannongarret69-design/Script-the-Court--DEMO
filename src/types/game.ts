export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type InjuryStatus = 'HEALTHY' | 'QUESTIONABLE' | 'OUT_GAME' | 'HERO_RETURN';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: PlayerPosition;
  rating: number; // 75-99
  archetype: string; // e.g. "Deep Sniper", "Rim Protector", "Point God"
  teamId: string;
  isStarter: boolean;
  isOnCourt: boolean;
  // Attributes
  attributes: {
    threePt: number;
    dunk: number;
    midRange: number;
    defense: number;
    playmaking: number;
    clutch: number;
  };
  // Live Game Stats
  stats: {
    points: number;
    fgm: number;
    fga: number;
    threePm: number;
    threePa: number;
    ftm: number;
    fta: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
  };
  injury?: {
    type: string;
    description: string;
    status: InjuryStatus;
    injuredAtPossession: number;
  };
}

export interface Team {
  id: string;
  name: string;
  city: string;
  shortName: string;
  tricode: string; // LAL, GSW, BOS, etc.
  primaryColor: string;
  secondaryColor: string;
  courtKeyColor: string;
  arenaName: string;
  conference: 'EAST' | 'WEST';
  roster: Player[];
}

export type PlayCategory = 
  | 'PASS_AND_SCORE'
  | 'ALLEY_OOP'
  | 'DRIVE_AND_KICK'
  | 'PICK_AND_ROLL'
  | 'THREE_POINTER'
  | 'SLAM_DUNK'
  | 'MID_RANGE'
  | 'DRIVE_LAYUP'
  | 'TURNOVER'
  | 'SHOOTING_FOUL'
  | 'FLAGRANT_TECHNICAL'
  | 'INJURY_EVENT'
  | 'REFEREE_REVIEW'
  | 'BUZZER_BEATER';

export type PassType = 'CHEST_PASS' | 'BOUNCE_PASS' | 'LOB_PASS' | 'SKIP_PASS' | 'BEHIND_BACK';

export type ShotOutcome = 'MADE' | 'MISSED' | 'BLOCKED' | 'STOLEN' | 'FOUL_AND_ONE';

export interface TipOffScript {
  winnerTeamId: string;
  jumperPlayerId: string;
  receiverPlayerId: string;
  narration: string;
}

export interface DrawnPoint {
  x: number;
  y: number;
}

export interface DrawnPlayerPosition {
  playerId: string;
  isOffense: boolean;
  x: number; // 0 to 500 relative half court
  y: number; // 0 to 470 relative half court
}

export interface DrawnPassLine {
  fromPlayerId: string;
  toPlayerId: string;
  from: DrawnPoint;
  to: DrawnPoint;
  passType: PassType;
}

export interface DrawnShotAngle {
  shooterPlayerId: string;
  origin: DrawnPoint;
  targetBasket: DrawnPoint;
  angleDeg: number;
  distanceFt: number;
  isThreePointer: boolean;
}

export interface DrawnPlayDetails {
  playerPositions: DrawnPlayerPosition[];
  passLines: DrawnPassLine[];
  shotAngle?: DrawnShotAngle;
  defensiveAction?: 'NONE' | 'STEAL' | 'BLOCK';
  defenderId?: string;
  interceptPoint?: DrawnPoint;
}

export interface ScriptedPlay {
  id: string;
  possessionIndex: number;
  quarter: number;
  clockRemaining: string; // e.g. "09:42"
  offenseTeamId: string;
  defenseTeamId: string;
  
  // Scripted details
  category: PlayCategory;
  shooterPlayerId: string;
  defenderPlayerId?: string;
  passerPlayerId?: string; // Assist
  
  outcome: ShotOutcome;
  pointsEarned: number; // 0, 1, 2, 3, 4

  // Tactical chalkboard drawn details
  drawnPlay?: DrawnPlayDetails;
  
  // Specific sub-mechanics
  shotDescription: string;
  freeThrows?: {
    total: number;
    made: number;
  };
  
  // Drama & scripting events
  injuryDetails?: {
    injuredPlayerId: string;
    injuryName: string;
    severity: 'MINOR_RETURN' | 'OUT_FOR_GAME';
    description: string;
  };
  
  penaltyDetails?: {
    foulingPlayerId: string;
    penaltyType: 'COMMON' | 'OFFENSIVE_CHARGE' | 'TECHNICAL' | 'FLAGRANT_1' | 'FLAGRANT_2_EJECTION';
    ejected: boolean;
    description: string;
  };
  
  refereeReview?: {
    initialCall: string;
    finalDecision: 'CALL_OVERTURNED' | 'CALL_STANDS';
    reason: string;
  };
  
  // Commentary text
  commentary: string;
  directorNote?: string;
}

export interface GameSettings {
  quarterLengthMinutes: number; // 1, 2, 3, 5, or 12 minutes
  totalPossessions?: number; // legacy optional
  homeTeamId: string;
  awayTeamId: string;
  tipOff: TipOffScript;
}

export type GamePhase = 
  | 'SETUP'
  | 'TIP_OFF_CINEMATIC'
  | 'LIVE_PLAY'
  | 'PLAY_PAUSED'
  | 'GAME_OVER';
