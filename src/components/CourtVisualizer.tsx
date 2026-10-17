import React, { useEffect, useState } from 'react';
import { Team, Player, ScriptedPlay } from '../types/game';
import { Play, Pause, FastForward, Activity, AlertTriangle, Sparkles, CheckCircle2, Layers } from 'lucide-react';
import courtBgImage from '../assets/images/game_court_hardwood_1792254001911.jpg';

interface CourtVisualizerProps {
  homeTeam: Team;
  awayTeam: Team;
  possessionTeamId: string;
  currentPlay: ScriptedPlay | null;
  isPlaying: boolean;
  playSpeed: number; // 1, 2, 4
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onNextPlay: () => void;
  onOpenScriptwriter: () => void;
  onOpenPlayDesigner: () => void;
  playAnimationProgress: number; // 0 to 1
  isBuzzerActive: boolean;
  isReviewActive: boolean;
  activeInjury: { player: Player; description: string } | null;
  activeFoul: { player: Player; description: string } | null;
  quarterTransition?: { from: number; to: number; label: string } | null;
}

export const CourtVisualizer: React.FC<CourtVisualizerProps> = ({
  homeTeam,
  awayTeam,
  possessionTeamId,
  currentPlay,
  isPlaying,
  playSpeed,
  onTogglePlay,
  onChangeSpeed,
  onNextPlay,
  onOpenScriptwriter,
  onOpenPlayDesigner,
  playAnimationProgress,
  isBuzzerActive,
  isReviewActive,
  activeInjury,
  activeFoul,
  quarterTransition,
}) => {
  // Court dimensions in SVG viewBox: 940 x 500 (94ft x 50ft regulation ratio)
  const effectiveOffenseId = currentPlay ? currentPlay.offenseTeamId : possessionTeamId;
  const isOffenseAway = effectiveOffenseId === awayTeam.id;
  const offenseTeam = isOffenseAway ? awayTeam : homeTeam;
  const defenseTeam = isOffenseAway ? homeTeam : awayTeam;

  // Attack direction: if Away offense, attack right (x: 880), if Home offense, attack left (x: 60)
  const targetBasketX = isOffenseAway ? 880 : 60;
  const targetBasketY = 250;

  // Find active shooter, passer, and defender
  const shooter = offenseTeam.roster.find((p) => p.id === currentPlay?.shooterPlayerId) || offenseTeam.roster[0];
  const defender = defenseTeam.roster.find((p) => p.id === currentPlay?.defenderPlayerId) || defenseTeam.roster[0];
  const passer = offenseTeam.roster.find((p) => p.id === currentPlay?.passerPlayerId);
  const hasPass = !!passer && passer.id !== shooter.id;

  const passerPos = isOffenseAway ? { x: 560, y: 250 } : { x: 380, y: 250 };

  // Positions of other players on court
  const getPlayerPositions = () => {
    // 5 offense, 5 defense
    const offPlayers = offenseTeam.roster.filter((p) => p.isOnCourt).slice(0, 5);
    const defPlayers = defenseTeam.roster.filter((p) => p.isOnCourt).slice(0, 5);

    let basePositions = isOffenseAway
      ? [
          { x: 640, y: 150 }, // Wing
          { x: 590, y: 250 }, // Point
          { x: 640, y: 350 }, // Wing
          { x: 780, y: 170 }, // Corner / High post
          { x: 820, y: 300 }, // Dunker spot
        ]
      : [
          { x: 300, y: 150 },
          { x: 350, y: 250 },
          { x: 300, y: 350 },
          { x: 160, y: 170 },
          { x: 120, y: 300 },
        ];

    if (currentPlay?.drawnPlay?.playerPositions) {
      const drawnOff = currentPlay.drawnPlay.playerPositions.filter((p) => p.isOffense);
      if (drawnOff.length >= 5) {
        basePositions = drawnOff.slice(0, 5).map((pos) => {
          let cx = 0;
          let cy = 0;
          if (isOffenseAway) {
            cx = 880 - ((pos.y - 60) / 360) * 360;
            cy = 250 - ((pos.x - 250) / 250) * 190;
          } else {
            cx = 60 + ((pos.y - 60) / 360) * 360;
            cy = 250 + ((pos.x - 250) / 250) * 190;
          }
          return {
            x: Math.round(Math.max(40, Math.min(900, cx))),
            y: Math.round(Math.max(40, Math.min(460, cy))),
          };
        });
      }
    }

    return { offPlayers, defPlayers, basePositions };
  };

  const { offPlayers, defPlayers, basePositions } = getPlayerPositions();

  const getOffensePlayerPosition = (idx: number) => {
    const base = basePositions[idx] || { x: 470, y: 250 };
    const player = offPlayers[idx];
    const isShooter = player?.id === shooter?.id;
    let posX = base.x;
    let posY = base.y;

    if (isShooter && currentPlay) {
      const t = Math.min(1, playAnimationProgress * 1.5);
      if (currentPlay.category === 'SLAM_DUNK' || currentPlay.category === 'DRIVE_LAYUP' || currentPlay.category === 'ALLEY_OOP') {
        const targetDunkX = isOffenseAway ? 850 : 90;
        posX = posX + (targetDunkX - posX) * t;
        posY = posY + (targetBasketY - posY) * t;
      } else if (currentPlay.category === 'THREE_POINTER') {
        posX = isOffenseAway ? posX - 15 * t : posX + 15 * t;
      }
    }
    return { x: posX, y: posY };
  };

  // Calculate ball trajectory based on play category and animation progress (following player who has it)
  const getBallPosition = () => {
    const shooterIdx = offPlayers.findIndex((p) => p.id === shooter?.id);
    const passerIdx = offPlayers.findIndex((p) => p.id === passer?.id);
    const defaultOffIdx = 0;

    const shooterPos = getOffensePlayerPosition(shooterIdx >= 0 ? shooterIdx : defaultOffIdx);
    const passerPosCoords = passerIdx >= 0 ? getOffensePlayerPosition(passerIdx) : (isOffenseAway ? { x: 560, y: 250 } : { x: 380, y: 250 });

    if (!currentPlay) {
      const pgPos = getOffensePlayerPosition(0);
      return { x: pgPos.x, y: pgPos.y, z: 5 };
    }

    const t = playAnimationProgress; // 0 to 1

    if (hasPass) {
      if (t < 0.35) {
        // Phase 1: Ball travels from Passer to Shooter
        const pT = t / 0.35;
        const curX = passerPosCoords.x + (shooterPos.x - passerPosCoords.x) * pT;
        const curY = passerPosCoords.y + (shooterPos.y - passerPosCoords.y) * pT;
        const arcZ = Math.sin(pT * Math.PI) * 22;
        return { x: curX, y: curY, z: arcZ };
      } else if (t < 0.55) {
        // Phase 2: Ball follows Shooter while gathering / dribbling
        return { x: shooterPos.x, y: shooterPos.y, z: 5 };
      } else {
        // Phase 3: Shot in the air towards the hoop
        const shotT = (t - 0.55) / 0.45;
        const flightX = shooterPos.x + (targetBasketX - shooterPos.x) * shotT;
        const flightY = shooterPos.y + (targetBasketY - shooterPos.y) * shotT;
        const arcZ = Math.sin(shotT * Math.PI) * 60;

        if (currentPlay.outcome === 'MISSED' && shotT > 0.85) {
          return {
            x: targetBasketX + (isOffenseAway ? -15 : 15) * Math.sin(shotT * 10),
            y: targetBasketY + 20 * Math.sin(shotT * 10),
            z: Math.max(0, 15 - (shotT - 0.85) * 40),
          };
        }
        return { x: flightX, y: flightY, z: arcZ };
      }
    }

    // SOLO ISOLATION PLAY (NO PASS)
    if (t < 0.4) {
      // Phase 1: Ball follows Shooter while setting up / driving
      return { x: shooterPos.x, y: shooterPos.y, z: 5 };
    } else {
      // Phase 2: Shot in the air towards the hoop
      const shotT = (t - 0.4) / 0.6;
      const flightX = shooterPos.x + shotT * (targetBasketX - shooterPos.x);
      const flightY = shooterPos.y + shotT * (targetBasketY - shooterPos.y);
      const arcZ = Math.sin(shotT * Math.PI) * 55;

      if (currentPlay.outcome === 'MISSED' && shotT > 0.85) {
        return {
          x: targetBasketX + (isOffenseAway ? -15 : 15) * Math.sin(shotT * 10),
          y: targetBasketY + 20 * Math.sin(shotT * 10),
          z: Math.max(0, 15 - (shotT - 0.85) * 40),
        };
      }
      return { x: flightX, y: flightY, z: arcZ };
    }
  };

  const ballPos = getBallPosition();

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Visual Arena Background Scrim */}
      <div className="relative aspect-[16/9] md:aspect-[21/10] w-full max-h-[540px] overflow-hidden select-none bg-amber-950/20">
        <img
          src={courtBgImage}
          alt="Hardwood Basketball Court"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-[1px]"
        />

        {/* SVG Interactive Court Layout */}
        <svg
          viewBox="0 0 940 500"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Main Hardwood Floor */}
          <rect x="20" y="20" width="900" height="460" fill="#c49a5b" rx="4" />
          <rect x="20" y="20" width="900" height="460" fill="url(#hardwoodPattern)" opacity="0.4" />

          {/* Hardwood SVG pattern definition */}
          <defs>
            <pattern id="hardwoodPattern" width="40" height="12" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="40" y2="0" stroke="#a3783a" strokeWidth="0.5" />
              <line x1="0" y1="6" x2="40" y2="6" stroke="#b28744" strokeWidth="0.5" />
              <line x1="20" y1="0" x2="20" y2="6" stroke="#8f6629" strokeWidth="0.5" />
              <line x1="40" y1="6" x2="40" y2="12" stroke="#8f6629" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Outer Boundary Line */}
          <rect
            x="20"
            y="20"
            width="900"
            height="460"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
          />

          {/* Half-Court Line */}
          <line x1="470" y1="20" x2="470" y2="480" stroke="#ffffff" strokeWidth="3" />

          {/* Center Circle */}
          <circle cx="470" cy="250" r="60" fill="none" stroke="#ffffff" strokeWidth="3" />
          <circle cx="470" cy="250" r="20" fill="none" stroke="#ffffff" strokeWidth="2.5" />

          {/* Center Court Team Emblem Stamp */}
          <text
            x="470"
            y="255"
            textAnchor="middle"
            fill="#ffffff"
            opacity="0.25"
            fontSize="26"
            fontWeight="900"
            fontFamily="Archivo Black, sans-serif"
          >
            {homeTeam.tricode}
          </text>

          {/* LEFT BASKET AREA (Home side basket) */}
          {/* Left Painted Key */}
          <rect
            x="20"
            y="170"
            width="190"
            height="160"
            fill={homeTeam.courtKeyColor}
            opacity="0.8"
            stroke="#ffffff"
            strokeWidth="3"
          />
          {/* Left Free-Throw Circle */}
          <circle cx="210" cy="250" r="60" fill="none" stroke="#ffffff" strokeWidth="3" />
          {/* Left 3-Point Arc */}
          <path
            d="M 20,60 L 140,60 A 238,238 0 0,1 140,440 L 20,440"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          />
          {/* Left Restricted Area Arc */}
          <path d="M 60,210 A 40,40 0 0,1 60,290" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          {/* Left Backboard & Rim */}
          <line
            x1="50"
            y1="220"
            x2="50"
            y2="280"
            stroke={isBuzzerActive ? '#ef4444' : '#ffffff'}
            strokeWidth={isBuzzerActive ? '6' : '4'}
            className={isBuzzerActive ? 'animate-pulse' : ''}
          />
          <circle cx="62" cy="250" r="9" fill="none" stroke="#f97316" strokeWidth="3.5" />
          {/* Left Net Indicator */}
          <line x1="62" y1="250" x2="68" y2="250" stroke="#ffffff" strokeWidth="2" strokeDasharray="2,2" />

          {/* RIGHT BASKET AREA (Away side attack basket) */}
          {/* Right Painted Key */}
          <rect
            x="730"
            y="170"
            width="190"
            height="160"
            fill={awayTeam.courtKeyColor}
            opacity="0.8"
            stroke="#ffffff"
            strokeWidth="3"
          />
          {/* Right Free-Throw Circle */}
          <circle cx="730" cy="250" r="60" fill="none" stroke="#ffffff" strokeWidth="3" />
          {/* Right 3-Point Arc */}
          <path
            d="M 920,60 L 800,60 A 238,238 0 0,0 800,440 L 920,440"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          />
          {/* Right Restricted Area Arc */}
          <path d="M 880,210 A 40,40 0 0,0 880,290" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          {/* Right Backboard & Rim */}
          <line
            x1="890"
            y1="220"
            x2="890"
            y2="280"
            stroke={isBuzzerActive ? '#ef4444' : '#ffffff'}
            strokeWidth={isBuzzerActive ? '6' : '4'}
            className={isBuzzerActive ? 'animate-pulse' : ''}
          />
          <circle cx="878" cy="250" r="9" fill="none" stroke="#f97316" strokeWidth="3.5" />
          {/* Right Net Indicator */}
          <line x1="878" y1="250" x2="872" y2="250" stroke="#ffffff" strokeWidth="2" strokeDasharray="2,2" />

          {/* Backboard LED Red Flash on Buzzer Beater */}
          {isBuzzerActive && (
            <rect
              x="20"
              y="20"
              width="900"
              height="460"
              fill="rgba(239, 68, 68, 0.15)"
              stroke="#ef4444"
              strokeWidth="6"
              className="animate-pulse"
            />
          )}

          {/* PLAYERS RENDERING ON COURT */}
          {/* Render Defense Players */}
          {defPlayers.map((player, idx) => {
            const pos = basePositions[idx] || { x: 470, y: 250 };
            const isMatchupDefender = player.id === defender?.id;
            // Shift defender toward shooter if matchup
            const offsetX = isMatchupDefender ? (isOffenseAway ? 30 : -30) : 0;
            const offsetY = isMatchupDefender ? 10 : 0;

            return (
              <g
                key={player.id}
                transform={`translate(${pos.x + offsetX}, ${pos.y + offsetY})`}
                className="transition-transform duration-300"
              >
                <circle cx="0" cy="0" r="16" fill={defenseTeam.primaryColor} stroke="#ffffff" strokeWidth="2" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="Space Mono, monospace"
                >
                  {player.number}
                </text>
                <text
                  x="0"
                  y="26"
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="9"
                  fontWeight="600"
                  className="drop-shadow"
                >
                  {player.name.split(' ').pop()}
                </text>
              </g>
            );
          })}

          {/* Render Offense Players */}
          {offPlayers.map((player, idx) => {
            const isShooter = player.id === shooter?.id;
            const isPasser = player.id === passer?.id && hasPass;
            let posX = basePositions[idx]?.x || 470;
            let posY = basePositions[idx]?.y || 250;

            // Animate shooter position toward rim if driving or dunking
            if (isShooter && currentPlay) {
              const t = Math.min(1, playAnimationProgress * 1.5);
              if (currentPlay.category === 'SLAM_DUNK' || currentPlay.category === 'DRIVE_LAYUP' || currentPlay.category === 'ALLEY_OOP') {
                const targetDunkX = isOffenseAway ? 850 : 90;
                posX = posX + (targetDunkX - posX) * t;
                posY = posY + (targetBasketY - posY) * t;
              } else if (currentPlay.category === 'THREE_POINTER') {
                posX = isOffenseAway ? posX - 15 * t : posX + 15 * t;
              }
            }

            return (
              <g
                key={player.id}
                transform={`translate(${posX}, ${posY})`}
                className="transition-transform duration-200"
              >
                {/* Shooter Highlight aura */}
                {isShooter && (
                  <circle
                    cx="0"
                    cy="0"
                    r="23"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="4,2"
                    className="animate-spin"
                  />
                )}
                {/* Passer Highlight aura during pass phase */}
                {isPasser && playAnimationProgress < 0.4 && (
                  <>
                    <circle
                      cx="0"
                      cy="0"
                      r="23"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="4,2"
                      className="animate-spin"
                    />
                    <text
                      x="0"
                      y="-22"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Space Mono, monospace"
                    >
                      DISH
                    </text>
                  </>
                )}
                <circle cx="0" cy="0" r="16" fill={offenseTeam.primaryColor} stroke={isPasser && playAnimationProgress < 0.4 ? "#38bdf8" : "#fbbf24"} strokeWidth="2.5" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="Space Mono, monospace"
                >
                  {player.number}
                </text>
                <text
                  x="0"
                  y="26"
                  textAnchor="middle"
                  fill={isShooter ? "#fbbf24" : isPasser ? "#38bdf8" : "#f1f5f9"}
                  fontSize="10"
                  fontWeight="800"
                  className="drop-shadow"
                >
                  {player.name.split(' ').pop()}
                </text>
              </g>
            );
          })}

          {/* DYNAMIC PASS TRAJECTORY LINE */}
          {hasPass && playAnimationProgress < 0.4 && (
            <g>
              <line
                x1={passerPos.x}
                y1={passerPos.y}
                x2={isOffenseAway ? 640 : 300}
                y2={180}
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                className="animate-pulse"
              />
              <text
                x={(passerPos.x + (isOffenseAway ? 640 : 300)) / 2}
                y={210}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="11"
                fontWeight="900"
                fontFamily="Space Mono, monospace"
              >
                PASS ➔
              </text>
            </g>
          )}

          {/* THE BASKETBALL */}
          <g transform={`translate(${ballPos.x}, ${ballPos.y - ballPos.z})`}>
            {/* Ball Shadow on floor */}
            <ellipse
              cx="0"
              cy={ballPos.z}
              rx={7 + ballPos.z * 0.1}
              ry={4 + ballPos.z * 0.05}
              fill="rgba(0, 0, 0, 0.45)"
            />
            {/* Basketball Sphere */}
            <circle cx="0" cy="0" r="7.5" fill="#ea580c" stroke="#7c2d12" strokeWidth="1" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="#7c2d12" strokeWidth="0.8" />
            <path d="M -5,-5 Q 0,0 -5,5" fill="none" stroke="#7c2d12" strokeWidth="0.8" />
            <path d="M 5,-5 Q 0,0 5,5" fill="none" stroke="#7c2d12" strokeWidth="0.8" />
          </g>

          {/* Net Swish Ripple or Rim Sparkle on Made Shot */}
          {playAnimationProgress > 0.85 && currentPlay?.outcome === 'MADE' && (
            <g transform={`translate(${targetBasketX}, ${targetBasketY})`}>
              <circle
                cx="0"
                cy="0"
                r="22"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                className="animate-ping"
              />
              <text
                x="0"
                y="-25"
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="16"
                fontWeight="900"
                fontFamily="Archivo Black, sans-serif"
              >
                SWISH!
              </text>
            </g>
          )}

          {/* Dunk Boom Burst */}
          {playAnimationProgress > 0.8 && currentPlay?.category === 'SLAM_DUNK' && (
            <g transform={`translate(${targetBasketX}, ${targetBasketY})`}>
              <circle
                cx="0"
                cy="0"
                r="30"
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                className="animate-ping"
              />
              <text
                x="0"
                y="-30"
                textAnchor="middle"
                fill="#f97316"
                fontSize="18"
                fontWeight="900"
                fontFamily="Archivo Black, sans-serif"
              >
                SLAM!
              </text>
            </g>
          )}
        </svg>

        {/* DRAMA OVERLAYS: Injury, Referee Review, Flagrant Whistle */}
        {activeInjury && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-30 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 max-w-md text-center shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center mx-auto mb-3 text-rose-400">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">
                Court Emergency · Player Down
              </div>
              <h3 className="text-xl font-black uppercase text-white font-display mb-2">
                {activeInjury.player.name} Injured
              </h3>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                {activeInjury.description}
              </p>
              <div className="text-xs text-amber-400 font-semibold mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                Medical trainers are escorting the player to the locker room. Substitution required.
              </div>
            </div>
          </div>
        )}

        {isReviewActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border-2 border-amber-500 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 z-30">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
            <div>
              <div className="text-[10px] font-extrabold tracking-widest uppercase text-amber-400">
                Official Replay Monitor
              </div>
              <div className="text-sm font-bold text-white">
                Under Official Video Review at the Scorer's Table
              </div>
            </div>
          </div>
        )}

        {/* Quarter Intermission Transition Banner */}
        {quarterTransition && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border-2 border-amber-400 rounded-2xl px-8 py-5 shadow-2xl text-center z-40 backdrop-blur-md animate-in zoom-in-95">
            <div className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold mb-1">
              NBA Broadcast Intermission
            </div>
            <div className="text-2xl font-black font-display text-white uppercase tracking-wider">
              {quarterTransition.label}
            </div>
            <div className="text-xs text-slate-300 mt-2">
              Possession screenplay loaded for Quarter {quarterTransition.to}
            </div>
          </div>
        )}

        {/* Awaiting Script Overlay when no play is scripted */}
        {!currentPlay && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-center gap-3 z-30 backdrop-blur-sm animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs text-slate-200">
              No play scripted for <strong className="text-amber-400">{offenseTeam.name}</strong>. Choose a cue or draw the exact play!
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPlayDesigner}
                className="px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Draw Play</span>
              </button>
              <button
                onClick={onOpenScriptwriter}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                Script Play
              </button>
            </div>
          </div>
        )}

        {activeFoul && (
          <div className="absolute top-4 right-4 bg-slate-900/90 border border-amber-500/60 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2.5 z-30">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <div className="text-xs font-bold text-slate-200">
              <strong className="text-amber-400">WHISTLE:</strong> {activeFoul.description}
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Simulation Controller Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-slate-950 border-t border-slate-800">
        {/* Playback Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            disabled={!currentPlay}
            title={
              !currentPlay
                ? 'No play scripted. Choose a play cue below to script this possession!'
                : isPlaying
                ? 'Pause Video'
                : 'Start Video'
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              !currentPlay
                ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                : isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : !currentPlay ? (
              <>
                <Play className="w-4 h-4 fill-current opacity-30 text-slate-600" />
                <span>No Play Scripted</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Video</span>
              </>
            )}
          </button>

          <button
            onClick={onNextPlay}
            disabled={!currentPlay}
            title={!currentPlay ? "Script a play first" : "Step to next possession"}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-colors ${
              !currentPlay
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
            }`}
          >
            <FastForward className="w-4 h-4" />
            <span>Next Play</span>
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 font-semibold px-2">Speed:</span>
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                playSpeed === speed
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Scriptwriter and Play Designer Triggers */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenPlayDesigner}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Layers className="w-4 h-4" />
            <span>Draw Exact Play</span>
          </button>

          <button
            onClick={onOpenScriptwriter}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Script Next Play</span>
          </button>
        </div>
      </div>
    </div>
  );
};
