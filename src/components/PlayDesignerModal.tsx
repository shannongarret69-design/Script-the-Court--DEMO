import React, { useState, useRef, useEffect } from 'react';
import { Team, Player, ScriptedPlay, PassType, ShotOutcome, DrawnPlayDetails, DrawnPassLine, DrawnShotAngle, DrawnPlayerPosition } from '../types/game';
import { X, Play, RotateCcw, Move, ArrowRight, Target, ShieldAlert, Sparkles, Layers, Info } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { formatGameClock } from '../utils/scriptGenerator';

interface PlayDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  possessionTeamId: string;
  possessionIndex: number;
  quarter: number;
  secondsRemaining: number;
  homeTeam: Team;
  awayTeam: Team;
  onExecutePlay: (play: ScriptedPlay) => void;
}

type DrawTool = 'MOVE_PLAYERS' | 'DRAW_PASS' | 'DRAW_SHOT' | 'SET_STEAL' | 'SET_BLOCK';

export const PlayDesignerModal: React.FC<PlayDesignerModalProps> = ({
  isOpen,
  onClose,
  possessionTeamId,
  possessionIndex,
  quarter,
  secondsRemaining,
  homeTeam,
  awayTeam,
  onExecutePlay,
}) => {
  if (!isOpen) return null;

  const isAwayOffense = possessionTeamId === awayTeam.id;
  const offenseTeam = isAwayOffense ? awayTeam : homeTeam;
  const defenseTeam = isAwayOffense ? homeTeam : awayTeam;

  const activeOffense = offenseTeam.roster.filter((p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME').slice(0, 5);
  const activeDefense = defenseTeam.roster.filter((p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME').slice(0, 5);

  // Active Tool
  const [activeTool, setActiveTool] = useState<DrawTool>('DRAW_PASS');
  const [passType, setPassType] = useState<PassType>('LOB_PASS');
  const [shotOutcome, setShotOutcome] = useState<ShotOutcome>('MADE');

  // Player positions on half court (coordinates: x 0..500, y 0..420. Hoop is at x:250, y:60)
  const [playerPositions, setPlayerPositions] = useState<DrawnPlayerPosition[]>(() => [
    // Offense
    { playerId: activeOffense[0]?.id || 'off-0', isOffense: true, x: 250, y: 320 }, // PG Top
    { playerId: activeOffense[1]?.id || 'off-1', isOffense: true, x: 100, y: 260 }, // SG Left Wing
    { playerId: activeOffense[2]?.id || 'off-2', isOffense: true, x: 400, y: 260 }, // SF Right Wing
    { playerId: activeOffense[3]?.id || 'off-3', isOffense: true, x: 60, y: 110 },  // PF Left Corner
    { playerId: activeOffense[4]?.id || 'off-4', isOffense: true, x: 320, y: 150 }, // C Dunker/Post
    // Defense
    { playerId: activeDefense[0]?.id || 'def-0', isOffense: false, x: 250, y: 290 },
    { playerId: activeDefense[1]?.id || 'def-1', isOffense: false, x: 125, y: 240 },
    { playerId: activeDefense[2]?.id || 'def-2', isOffense: false, x: 375, y: 240 },
    { playerId: activeDefense[3]?.id || 'def-3', isOffense: false, x: 90, y: 120 },
    { playerId: activeDefense[4]?.id || 'def-4', isOffense: false, x: 275, y: 120 },
  ]);

  // Multi-pass segments & custom drawn ball destination
  interface PassSegment {
    id: string;
    passerId: string;
    receiverId: string;
    passType: PassType;
  }

  const [passSegments, setPassSegments] = useState<PassSegment[]>([
    {
      id: 'pass-1',
      passerId: activeOffense[0]?.id || '',
      receiverId: activeOffense[4]?.id || activeOffense[1]?.id || '',
      passType: 'CHEST_PASS',
    },
  ]);

  // Designated Shooter
  const [selectedShooterId, setSelectedShooterId] = useState<string>(activeOffense[4]?.id || activeOffense[0]?.id || '');

  // Pass lines & custom drawn ball destination
  const [passLines, setPassLines] = useState<DrawnPassLine[]>([]);
  const [customPassTarget, setCustomPassTarget] = useState<{ x: number; y: number } | null>(null);

  // Shot Angle details
  const [shotAngle, setShotAngle] = useState<DrawnShotAngle>({
    shooterPlayerId: activeOffense[4]?.id || activeOffense[0]?.id || '',
    origin: { x: 320, y: 150 },
    targetBasket: { x: 250, y: 60 },
    angleDeg: 38,
    distanceFt: 14.5,
    isThreePointer: false,
  });

  // Defensive Actions (Steal or Block)
  const [defensiveAction, setDefensiveAction] = useState<'NONE' | 'STEAL' | 'BLOCK'>('NONE');
  const [selectedDefenderId, setSelectedDefenderId] = useState<string>(activeDefense[0]?.id || '');

  // Player roles via double-click popup menu (Nothing, Pass, Shooting, Screen / Block, Nothing, Steal, Anti Screen)
  const [playerRoles, setPlayerRoles] = useState<Record<string, string>>({});
  const [activePopupPlayerId, setActivePopupPlayerId] = useState<string | null>(null);

  const handleSelectPlayerRole = (playerId: string, role: string) => {
    soundEngine.playClapper();
    setPlayerRoles((prev) => ({ ...prev, [playerId]: role }));
    setActivePopupPlayerId(null);

    const pos = playerPositions.find((p) => p.playerId === playerId);
    if (!pos) return;

    if (pos.isOffense) {
      if (role === 'PASS') {
        setPassSegments((prev) =>
          prev.map((s, i) => (i === 0 ? { ...s, passerId: playerId } : s))
        );
      } else if (role === 'SHOOT') {
        setSelectedShooterId(playerId);
      }
    } else {
      if (role === 'BLOCK') {
        setDefensiveAction('BLOCK');
        setSelectedDefenderId(playerId);
      } else if (role === 'STEAL') {
        setDefensiveAction('STEAL');
        setSelectedDefenderId(playerId);
      }
    }
  };

  // Dragging player state & SVG ref
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Click on court canvas to draw where the ball goes (pass target or shot origin)
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const scaleX = 500 / rect.width;
    const scaleY = 420 / rect.height;
    const clickX = Math.round(clientX * scaleX);
    const clickY = Math.round(clientY * scaleY);

    if (activeTool === 'DRAW_PASS') {
      soundEngine.playBounce();
      setCustomPassTarget({ x: clickX, y: clickY });
    } else if (activeTool === 'DRAW_SHOT') {
      soundEngine.playSwish();
      const basketX = 250;
      const basketY = 60;
      const dx = clickX - basketX;
      const dy = clickY - basketY;
      const distancePixels = Math.hypot(dx, dy);
      const distanceFt = Math.round((distancePixels / 7.6) * 10) / 10;
      const angleDeg = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
      const isThree = distanceFt >= 23.75 || (Math.abs(dx) >= 165 && clickY <= 160);

      setShotAngle({
        shooterPlayerId: selectedShooterId,
        origin: { x: clickX, y: clickY },
        targetBasket: { x: basketX, y: basketY },
        angleDeg,
        distanceFt,
        isThreePointer: isThree,
      });
    }
  };

  // Delete pass line when clicking player who has a pass line
  const handlePlayerClick = (playerId: string) => {
    const isPasserOrReceiver = passLines.some(
      (p) => p.fromPlayerId === playerId || p.toPlayerId === playerId
    );
    if (isPasserOrReceiver && passLines.length > 0) {
      soundEngine.playSqueak();
      setPassLines([]);
      setCustomPassTarget(null);
    }
  };

  // Sync pass lines from passSegments when players move or pass configuration changes
  useEffect(() => {
    const lines: DrawnPassLine[] = [];
    passSegments.forEach((seg) => {
      const passer = playerPositions.find((p) => p.playerId === seg.passerId);
      const receiver = playerPositions.find((p) => p.playerId === seg.receiverId);
      if (passer) {
        const target = customPassTarget || (receiver ? { x: receiver.x, y: receiver.y } : { x: passer.x + 80, y: passer.y - 80 });
        lines.push({
          fromPlayerId: seg.passerId,
          toPlayerId: seg.receiverId,
          from: { x: passer.x, y: passer.y },
          to: { x: target.x, y: target.y },
          passType: seg.passType,
        });
      }
    });
    setPassLines(lines);
  }, [passSegments, customPassTarget, playerPositions]);

  // Sync shot angle when designated shooter moves (unless custom shot origin was clicked)
  useEffect(() => {
    const shooter = playerPositions.find((p) => p.playerId === selectedShooterId);
    if (shooter) {
      const basketX = 250;
      const basketY = 60;
      const dx = shooter.x - basketX;
      const dy = shooter.y - basketY;
      const distancePixels = Math.hypot(dx, dy);
      // Court scale: half court length ~47ft = 360px -> ~7.6px per foot
      const distanceFt = Math.round((distancePixels / 7.6) * 10) / 10;
      const angleDeg = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
      const isThree = distanceFt >= 23.75 || (Math.abs(dx) >= 165 && shooter.y <= 160);

      setShotAngle({
        shooterPlayerId: selectedShooterId,
        origin: { x: shooter.x, y: shooter.y },
        targetBasket: { x: basketX, y: basketY },
        angleDeg,
        distanceFt,
        isThreePointer: isThree,
      });
    }
  }, [selectedShooterId, playerPositions]);

  // Handle Dragging
  const handlePointerDown = (playerId: string) => {
    setDraggingPlayerId(playerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingPlayerId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert to SVG viewbox coords (0..500, 0..420)
    const scaleX = 500 / rect.width;
    const scaleY = 420 / rect.height;
    const newX = Math.max(25, Math.min(475, clientX * scaleX));
    const newY = Math.max(30, Math.min(400, clientY * scaleY));

    setPlayerPositions((prev) =>
      prev.map((pos) => (pos.playerId === draggingPlayerId ? { ...pos, x: Math.round(newX), y: Math.round(newY) } : pos))
    );
  };

  const handlePointerUp = () => {
    if (draggingPlayerId) {
      soundEngine.playSqueak();
      setDraggingPlayerId(null);
    }
  };

  // Formations
  const applyFormation = (type: '5_OUT' | 'HORNS' | 'PICK_AND_ROLL' | 'CORNER_ISO') => {
    soundEngine.playClapper();
    if (type === '5_OUT') {
      setPlayerPositions((prev) =>
        prev.map((pos, idx) => {
          if (!pos.isOffense) return pos;
          if (idx === 0) return { ...pos, x: 250, y: 340 }; // PG
          if (idx === 1) return { ...pos, x: 90, y: 260 };  // Wing L
          if (idx === 2) return { ...pos, x: 410, y: 260 }; // Wing R
          if (idx === 3) return { ...pos, x: 55, y: 120 };  // Corner L
          if (idx === 4) return { ...pos, x: 445, y: 120 }; // Corner R
          return pos;
        })
      );
    } else if (type === 'PICK_AND_ROLL') {
      setPlayerPositions((prev) =>
        prev.map((pos, idx) => {
          if (!pos.isOffense) return pos;
          if (idx === 0) return { ...pos, x: 220, y: 320 }; // PG with ball
          if (idx === 1) return { ...pos, x: 80, y: 240 };  // Wing
          if (idx === 2) return { ...pos, x: 420, y: 240 }; // Corner
          if (idx === 3) return { ...pos, x: 60, y: 110 };
          if (idx === 4) return { ...pos, x: 245, y: 300 }; // Screener / Roller Center
          return pos;
        })
      );
    } else if (type === 'HORNS') {
      setPlayerPositions((prev) =>
        prev.map((pos, idx) => {
          if (!pos.isOffense) return pos;
          if (idx === 0) return { ...pos, x: 250, y: 340 }; // PG
          if (idx === 1) return { ...pos, x: 55, y: 110 };  // Corner
          if (idx === 2) return { ...pos, x: 445, y: 110 }; // Corner
          if (idx === 3) return { ...pos, x: 190, y: 210 }; // High Post Elbow L
          if (idx === 4) return { ...pos, x: 310, y: 210 }; // High Post Elbow R
          return pos;
        })
      );
    } else if (type === 'CORNER_ISO') {
      setPlayerPositions((prev) =>
        prev.map((pos, idx) => {
          if (!pos.isOffense) return pos;
          if (idx === 0) return { ...pos, x: 80, y: 110 };  // Shooter in corner
          if (idx === 1) return { ...pos, x: 320, y: 330 }; // Cleared weakside
          if (idx === 2) return { ...pos, x: 410, y: 280 };
          if (idx === 3) return { ...pos, x: 430, y: 160 };
          if (idx === 4) return { ...pos, x: 350, y: 130 };
          return pos;
        })
      );
    }
  };

  // Playbook Presets
  const applyPresetPlay = (preset: 'ALLEY_OOP' | 'DRIVE_KICK' | 'DEFENSIVE_STEAL' | 'WEMBY_BLOCK') => {
    soundEngine.playClapper();
    if (preset === 'ALLEY_OOP') {
      applyFormation('PICK_AND_ROLL');
      setPassSegments([
        { id: 'p-1', passerId: activeOffense[0].id, receiverId: activeOffense[4].id, passType: 'LOB_PASS' },
      ]);
      setSelectedShooterId(activeOffense[4].id);
      setShotOutcome('MADE');
      setDefensiveAction('NONE');
    } else if (preset === 'DRIVE_KICK') {
      applyFormation('5_OUT');
      setPassSegments([
        { id: 'p-1', passerId: activeOffense[0].id, receiverId: activeOffense[3].id, passType: 'SKIP_PASS' },
      ]);
      setSelectedShooterId(activeOffense[3].id);
      setShotOutcome('MADE');
      setDefensiveAction('NONE');
    } else if (preset === 'DEFENSIVE_STEAL') {
      applyFormation('5_OUT');
      setPassSegments([
        { id: 'p-1', passerId: activeOffense[0].id, receiverId: activeOffense[2].id, passType: 'CHEST_PASS' },
      ]);
      setSelectedShooterId(activeOffense[2].id);
      setDefensiveAction('STEAL');
      setSelectedDefenderId(activeDefense[2].id);
      setShotOutcome('STOLEN');
    } else if (preset === 'WEMBY_BLOCK') {
      applyFormation('PICK_AND_ROLL');
      setPassSegments([
        { id: 'p-1', passerId: activeOffense[0].id, receiverId: activeOffense[4].id, passType: 'BOUNCE_PASS' },
      ]);
      setSelectedShooterId(activeOffense[4].id);
      setDefensiveAction('BLOCK');
      setSelectedDefenderId(activeDefense[4].id);
      setShotOutcome('BLOCKED');
    }
  };

  // Execute the exact drawn play
  const handleExecute = () => {
    soundEngine.playWhistle();
    soundEngine.playClapper();

    const shooter = offenseTeam.roster.find((p) => p.id === selectedShooterId) || activeOffense[0];
    const passer = passLines.length > 0 ? offenseTeam.roster.find((p) => p.id === passLines[0].fromPlayerId) : undefined;
    const defender = defenseTeam.roster.find((p) => p.id === selectedDefenderId) || activeDefense[0];
    const firstPassType = passSegments.length > 0 ? passSegments[0].passType : 'CHEST_PASS';

    let outcome: ShotOutcome = shotOutcome;
    if (defensiveAction === 'STEAL') outcome = 'STOLEN';
    if (defensiveAction === 'BLOCK') outcome = 'BLOCKED';

    const isThree = shotAngle.isThreePointer;
    let points = outcome === 'MADE' ? (isThree ? 3 : 2) : 0;

    let category: any = isThree ? 'THREE_POINTER' : 'MID_RANGE';
    if (firstPassType === 'LOB_PASS' && shotAngle.distanceFt <= 8) {
      category = 'ALLEY_OOP';
    } else if (firstPassType === 'SKIP_PASS' && isThree) {
      category = 'DRIVE_AND_KICK';
    } else if (passLines.length > 0) {
      category = 'PASS_AND_SCORE';
    }

    let description = `${shooter.name} ${isThree ? '3-Pointer' : 'Jumper'} from ${shotAngle.distanceFt}ft (${shotAngle.angleDeg}°)`;
    if (category === 'ALLEY_OOP') description = `Lob Pass from ${passer?.name || 'guard'} to ${shooter.name} for Alley-Oop!`;
    if (outcome === 'STOLEN') description = `Pass intercepted by ${defender.name} for a fast break steal!`;
    if (outcome === 'BLOCKED') description = `Shot rejected by ${defender.name} with a high-flying block!`;

    let commentary = '';
    if (outcome === 'STOLEN') {
      commentary = `Tactical Trap! ${defender.name} jumps into the passing lane, intercepts the pass from ${passer?.name || 'offense'}, and forces a live-ball turnover!`;
    } else if (outcome === 'BLOCKED') {
      commentary = `Denial at the apex! ${defender.name} contests the shot from ${shooter.name} (${shotAngle.distanceFt}ft out) and swats it clean out of bounds!`;
    } else if (outcome === 'MADE') {
      commentary = passLines.length > 0
        ? `Crisp execution! ${passer?.name} whips a ${passType.toLowerCase().replace('_', ' ')} across the floor to ${shooter.name}, who sinks the ${shotAngle.distanceFt}ft attempt from ${shotAngle.angleDeg}°!`
        : `Calculated isolation! ${shooter.name} creates space and buries the ${shotAngle.distanceFt}ft jumper!`;
    } else {
      commentary = `${shooter.name} lets it fly from ${shotAngle.distanceFt}ft, but the ball rims off!`;
    }

    const drawnPlayData: DrawnPlayDetails = {
      playerPositions,
      passLines,
      shotAngle,
      defensiveAction,
      defenderId: defender.id,
      interceptPoint: defensiveAction === 'STEAL' && passLines.length > 0
        ? { x: (passLines[0].from.x + passLines[0].to.x) / 2, y: (passLines[0].from.y + passLines[0].to.y) / 2 }
        : undefined,
    };

    const newPlay: ScriptedPlay = {
      id: `drawn-play-${possessionIndex}-${Date.now()}`,
      possessionIndex,
      quarter,
      clockRemaining: formatGameClock(secondsRemaining),
      offenseTeamId: offenseTeam.id,
      defenseTeamId: defenseTeam.id,
      category,
      shooterPlayerId: shooter.id,
      defenderPlayerId: defender.id,
      passerPlayerId: passer?.id,
      outcome,
      pointsEarned: points,
      shotDescription: description,
      commentary,
      drawnPlay: drawnPlayData,
    };

    onExecutePlay(newPlay);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase font-display text-white tracking-wider flex items-center gap-2">
                <span>Tactical Chalkboard · Draw The Exact Play</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black">
                  Q{quarter} · {formatGameClock(secondsRemaining)}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Drag players to exact court spots, draw passing routes, shot angles, and script blocks or steals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-y-auto flex-1">
          {/* Left Canvas: SVG Half-Court with Draggable Tokens & Drawn Lines */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-slate-800 p-3 relative shadow-inner">
            <div className="w-full flex items-center justify-between mb-2 text-xs font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Offense: <strong className="text-white">{offenseTeam.name}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Defense: <strong className="text-white">{defenseTeam.name}</strong></span>
              </span>
              <span className="text-amber-400 text-[11px]">Hover & Drag Any Player</span>
            </div>

            {/* Drawing Mode Selector */}
            <div className="w-full grid grid-cols-3 gap-1.5 mb-2">
              {[
                { tool: 'MOVE_PLAYERS', label: '1. Move Players', icon: '👤' },
                { tool: 'DRAW_PASS', label: '2. Click Court = Pass To', icon: '↗️' },
                { tool: 'DRAW_SHOT', label: '3. Click Court = Shot From', icon: '🎯' },
              ].map((t) => (
                <button
                  key={t.tool}
                  type="button"
                  onClick={() => setActiveTool(t.tool as any)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTool === t.tool
                      ? 'bg-amber-500 text-slate-950 shadow ring-1 ring-amber-400'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* SVG Interactive Half Court Canvas */}
            <div className="relative w-full max-w-[500px] aspect-[500/420] rounded-xl overflow-hidden border border-slate-700 bg-[#c49a5b] shadow-2xl select-none">
              <svg
                ref={svgRef}
                viewBox="0 0 500 420"
                className="w-full h-full cursor-crosshair"
                onClick={handleSvgClick}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {/* Court Hardwood Base Pattern */}
                <rect x="0" y="0" width="500" height="420" fill="#c49a5b" />
                <rect x="0" y="0" width="500" height="420" fill="#a3783a" opacity="0.15" />

                {/* Court Lines */}
                {/* Boundary */}
                <rect x="15" y="15" width="470" height="390" fill="none" stroke="#ffffff" strokeWidth="3" />
                
                {/* Free Throw Key / Painted Area */}
                <rect
                  x="170"
                  y="15"
                  width="160"
                  height="190"
                  fill={offenseTeam.courtKeyColor || '#1e293b'}
                  opacity="0.85"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                
                {/* Free Throw Circle */}
                <circle cx="250" cy="205" r="60" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                <line x1="170" y1="205" x2="330" y2="205" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 4" />

                {/* Restricted Area Arc */}
                <path d="M 210,60 A 40,40 0 0,0 290,60" fill="none" stroke="#ffffff" strokeWidth="2.5" />

                {/* 3-Point Arc */}
                <path
                  d="M 60,15 L 60,110 A 210,210 0 0,0 440,110 L 440,15"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                />

                {/* Basket Hoop & Backboard */}
                {/* Backboard */}
                <line x1="220" y1="40" x2="280" y2="40" stroke="#000000" strokeWidth="4" />
                <line x1="220" y1="39" x2="280" y2="39" stroke="#ffffff" strokeWidth="2" />
                {/* Rim Support */}
                <line x1="250" y1="40" x2="250" y2="52" stroke="#ea580c" strokeWidth="3" />
                {/* Rim */}
                <circle cx="250" cy="60" r="12" fill="none" stroke="#ea580c" strokeWidth="3.5" />
                {/* Net */}
                <circle cx="250" cy="60" r="9" fill="#ffffff" opacity="0.3" />

                {/* DRAWN PASS LINES */}
                {passLines.map((pass, i) => (
                  <g key={`pass-line-${i}`}>
                    <line
                      x1={pass.from.x}
                      y1={pass.from.y}
                      x2={pass.to.x}
                      y2={pass.to.y}
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      strokeDasharray={pass.passType === 'BOUNCE_PASS' ? '6 5' : pass.passType === 'LOB_PASS' ? '4 3' : 'none'}
                    />
                    {/* Pass Arrowhead */}
                    <circle cx={pass.to.x} cy={pass.to.y} r="6" fill="#38bdf8" />
                    {/* Pass Type Badge */}
                    <text
                      x={(pass.from.x + pass.to.x) / 2}
                      y={(pass.from.y + pass.to.y) / 2 - 8}
                      textAnchor="middle"
                      fill="#0284c7"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="bg-white px-1"
                    >
                      {pass.passType.replace('_', ' ')}
                    </text>
                  </g>
                ))}

                {/* DRAWN SHOT ANGLE ARROW */}
                {shotAngle && (
                  <g>
                    {/* Trajectory dotted line to basket */}
                    <line
                      x1={shotAngle.origin.x}
                      y1={shotAngle.origin.y}
                      x2={shotAngle.targetBasket.x}
                      y2={shotAngle.targetBasket.y}
                      stroke={shotOutcome === 'MADE' ? '#22c55e' : '#f59e0b'}
                      strokeWidth="3"
                      strokeDasharray="5 3"
                    />
                    {/* Shot Target Ring */}
                    <circle cx={shotAngle.targetBasket.x} cy={shotAngle.targetBasket.y} r="16" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />
                    
                    {/* Shot details badge */}
                    <rect
                      x={(shotAngle.origin.x + shotAngle.targetBasket.x) / 2 - 40}
                      y={(shotAngle.origin.y + shotAngle.targetBasket.y) / 2 - 12}
                      width="80"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x={(shotAngle.origin.x + shotAngle.targetBasket.x) / 2}
                      y={(shotAngle.origin.y + shotAngle.targetBasket.y) / 2 + 2}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Space Mono, monospace"
                    >
                      {shotAngle.distanceFt}ft · {shotAngle.angleDeg}°
                    </text>
                  </g>
                )}

                {/* DEFENSIVE ACTION INDICATORS (Steal / Block) */}
                {defensiveAction === 'STEAL' && passLines.length > 0 && (
                  <g>
                    <circle
                      cx={(passLines[0].from.x + passLines[0].to.x) / 2}
                      cy={(passLines[0].from.y + passLines[0].to.y) / 2}
                      r="18"
                      fill="#ef4444"
                      opacity="0.3"
                    />
                    <text
                      x={(passLines[0].from.x + passLines[0].to.x) / 2}
                      y={(passLines[0].from.y + passLines[0].to.y) / 2 + 4}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="11"
                      fontWeight="900"
                    >
                      ⚡ STEAL
                    </text>
                  </g>
                )}

                {defensiveAction === 'BLOCK' && (
                  <g>
                    <circle cx="250" cy="75" r="22" fill="#ef4444" opacity="0.3" />
                    <text x="250" y="80" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="900">
                      🚫 BLOCK
                    </text>
                  </g>
                )}

                {/* PLAYER TOKENS */}
                {playerPositions.map((pos) => {
                  const player = pos.isOffense
                    ? offenseTeam.roster.find((p) => p.id === pos.playerId)
                    : defenseTeam.roster.find((p) => p.id === pos.playerId);
                  
                  const isPasser = passSegments.some((s) => s.passerId === pos.playerId);
                  const isReceiver = passSegments.some((s) => s.receiverId === pos.playerId);
                  const isShooter = pos.playerId === selectedShooterId;
                  const isStealer = defensiveAction === 'STEAL' && pos.playerId === selectedDefenderId;
                  const isBlocker = defensiveAction === 'BLOCK' && pos.playerId === selectedDefenderId;

                  return (
                    <g
                      key={pos.playerId}
                      onPointerDown={() => handlePointerDown(pos.playerId)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayerClick(pos.playerId);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setActivePopupPlayerId(pos.playerId);
                        soundEngine.playSqueak();
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {/* Glow Ring if Selected */}
                      {(isShooter || isPasser || isReceiver || isStealer || isBlocker) && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="22"
                          fill="none"
                          stroke={isStealer || isBlocker ? '#ef4444' : isShooter ? '#22c55e' : '#38bdf8'}
                          strokeWidth="3"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Main Player Circle */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="16"
                        fill={pos.isOffense ? offenseTeam.primaryColor : '#0f172a'}
                        stroke={pos.isOffense ? '#ffffff' : '#ef4444'}
                        strokeWidth="2.5"
                      />

                      {/* Jersey Number */}
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill={pos.isOffense ? offenseTeam.secondaryColor : '#ffffff'}
                        fontSize="11"
                        fontWeight="900"
                        fontFamily="Barlow Condensed, sans-serif"
                      >
                        {player?.number ?? 'X'}
                      </text>

                      {/* Role Tag Badge if set */}
                      {playerRoles[pos.playerId] && playerRoles[pos.playerId] !== 'NOTHING' && (
                        <g transform={`translate(${pos.x}, ${pos.y - 20})`}>
                          <rect x="-24" y="-8" width="48" height="14" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="1" />
                          <text x="0" y="2" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="900">
                            {playerRoles[pos.playerId]}
                          </text>
                        </g>
                      )}

                      {/* Player Name Tag */}
                      <rect
                        x={pos.x - 30}
                        y={pos.y + 18}
                        width="60"
                        height="14"
                        rx="3"
                        fill="#020617"
                        opacity="0.85"
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 28}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {player?.name.split(' ').pop() || pos.playerId}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Double-Click Player Popup Menu */}
              {activePopupPlayerId && (() => {
                const pPos = playerPositions.find((p) => p.playerId === activePopupPlayerId);
                const pObj = pPos
                  ? pPos.isOffense
                    ? offenseTeam.roster.find((p) => p.id === pPos.playerId)
                    : defenseTeam.roster.find((p) => p.id === pPos.playerId)
                  : null;
                if (!pPos || !pObj) return null;

                const isOff = pPos.isOffense;
                const options = isOff
                  ? [
                      { id: 'NOTHING', label: 'Nothing', icon: '⚪' },
                      { id: 'PASS', label: 'Pass', icon: '↗️' },
                      { id: 'SHOOT', label: 'Shooting', icon: '🎯' },
                      { id: 'SCREEN', label: 'Screen', icon: '🛡️' },
                    ]
                  : [
                      { id: 'BLOCK', label: 'Block', icon: '🚫' },
                      { id: 'NOTHING', label: 'Nothing', icon: '⚪' },
                      { id: 'STEAL', label: 'Steal', icon: '⚡' },
                      { id: 'ANTI_SCREEN', label: 'Anti Screen', icon: '🛑' },
                    ];

                return (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs z-30 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div>
                          <h4 className="text-xs font-black uppercase text-white font-display">
                            #{pObj.number} {pObj.name}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {isOff ? 'Offensive Role' : 'Defensive Action'}
                          </p>
                        </div>
                        <button
                          onClick={() => setActivePopupPlayerId(null)}
                          className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectPlayerRole(pPos.playerId, opt.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              playerRoles[pPos.playerId] === opt.id
                                ? 'bg-amber-500/20 border-amber-500 text-white font-bold ring-1 ring-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <span className="text-base">{opt.icon}</span>
                            <span className="text-[11px] font-semibold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Formation Spacing Buttons */}
            <div className="w-full flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Formations:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: '5_OUT', label: '5-Out Spacing' },
                  { key: 'PICK_AND_ROLL', label: 'Pick & Roll' },
                  { key: 'HORNS', label: 'Horns Set' },
                  { key: 'CORNER_ISO', label: 'Corner Iso' },
                ].map((fmt) => (
                  <button
                    key={fmt.key}
                    type="button"
                    onClick={() => applyFormation(fmt.key as any)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Play Designer Controls, Passes, Shots & Steals/Blocks */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            {/* Quick Playbook Preset Buttons */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Playbook Tactical Presets</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPresetPlay('ALLEY_OOP')}
                  className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/80 hover:border-sky-400 text-sky-200 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold">Lob & Slam</div>
                  <div className="text-[10px] text-sky-400">P&R Alley-Oop</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPlay('DRIVE_KICK')}
                  className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/80 hover:border-amber-400 text-amber-200 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold">Drive & Kick 3</div>
                  <div className="text-[10px] text-amber-400">Skip Pass to Corner</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPlay('DEFENSIVE_STEAL')}
                  className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/80 hover:border-rose-400 text-rose-200 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold">Trap & Steal</div>
                  <div className="text-[10px] text-rose-400">Lane Interception</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetPlay('WEMBY_BLOCK')}
                  className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/80 hover:border-emerald-400 text-emerald-200 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold">Rim Rejection</div>
                  <div className="text-[10px] text-emerald-400">Swat / Block</div>
                </button>
              </div>
            </div>

            {/* Passing Setup with Multiple Pass Segments & Plus Sign */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
                <span>1. Sequential Passes (Multi-Pass Play)</span>
                <span className="text-[10px] font-mono text-slate-500">Top pass happens first</span>
              </div>

              <div className="space-y-3">
                {passSegments.map((seg, idx) => (
                  <div key={seg.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-300">
                      <span>Pass #{idx + 1} {idx === 0 ? '(Happens First)' : '(Happens After)'}</span>
                      {passSegments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playSqueak();
                            setPassSegments((prev) => prev.filter((s) => s.id !== seg.id));
                          }}
                          className="text-rose-400 hover:text-rose-300 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Passer</label>
                        <select
                          value={seg.passerId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassSegments((prev) =>
                              prev.map((s) => (s.id === seg.id ? { ...s, passerId: val } : s))
                            );
                          }}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs"
                        >
                          {activeOffense.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.number} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Receiver</label>
                        <select
                          value={seg.receiverId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPassSegments((prev) =>
                              prev.map((s) => (s.id === seg.id ? { ...s, receiverId: val } : s))
                            );
                          }}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs"
                        >
                          {activeOffense.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.number} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Pass Delivery Type</label>
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        {(['CHEST_PASS', 'BOUNCE_PASS', 'LOB_PASS', 'SKIP_PASS'] as PassType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setPassSegments((prev) =>
                                prev.map((s) => (s.id === seg.id ? { ...s, passType: t } : s))
                              );
                            }}
                            className={`py-1 rounded font-bold transition-colors ${
                              seg.passType === t
                                ? 'bg-sky-500 text-slate-950'
                                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {t.split('_')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Plus sign under current pass menu to add pass segment */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playSqueak();
                  const lastSeg = passSegments[passSegments.length - 1];
                  const nextPasser = lastSeg ? lastSeg.receiverId : activeOffense[0]?.id;
                  const nextReceiver = activeOffense.find((p) => p.id !== nextPasser)?.id || activeOffense[0]?.id;
                  setPassSegments((prev) => [
                    ...prev,
                    {
                      id: `pass-${Date.now()}`,
                      passerId: nextPasser,
                      receiverId: nextReceiver,
                      passType: 'CHEST_PASS',
                    },
                  ]);
                }}
                className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span className="text-base font-black">+</span>
                <span>Add Sequential Pass Segment</span>
              </button>
            </div>

            {/* Shot Angle & Shooter Selection */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>2. Shot Angle & Finisher</span>
                <span className="text-[10px] font-mono text-amber-400/90">
                  {shotAngle.distanceFt}ft · {shotAngle.isThreePointer ? '3PT' : '2PT'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedShooterId}
                  onChange={(e) => setSelectedShooterId(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium text-xs"
                >
                  {activeOffense.map((p) => (
                    <option key={p.id} value={p.id}>
                      Finisher: #{p.number} {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShotOutcome('MADE')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      shotOutcome === 'MADE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Made
                  </button>
                  <button
                    type="button"
                    onClick={() => setShotOutcome('MISSED')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      shotOutcome === 'MISSED' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Miss
                  </button>
                </div>
              </div>
            </div>

            {/* Defensive Interference (Steal or Block) */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                <span>3. Defensive Action (Steal / Block)</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDefensiveAction('NONE')}
                  className={`py-1.5 rounded-lg font-bold transition-colors ${
                    defensiveAction === 'NONE'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setDefensiveAction('STEAL')}
                  className={`py-1.5 rounded-lg font-bold transition-colors ${
                    defensiveAction === 'STEAL'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-900 border border-rose-900/50 text-rose-300 hover:text-white'
                  }`}
                >
                  ⚡ Steal
                </button>
                <button
                  type="button"
                  onClick={() => setDefensiveAction('BLOCK')}
                  className={`py-1.5 rounded-lg font-bold transition-colors ${
                    defensiveAction === 'BLOCK'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-900 border border-rose-900/50 text-rose-300 hover:text-white'
                  }`}
                >
                  🚫 Block
                </button>
              </div>

              {defensiveAction !== 'NONE' && (
                <div className="pt-1">
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {defensiveAction === 'STEAL' ? 'Stealing Defender' : 'Contesting Blocker'}
                  </label>
                  <select
                    value={selectedDefenderId}
                    onChange={(e) => setSelectedDefenderId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-rose-800/80 rounded-lg text-white font-medium text-xs"
                  >
                    {activeDefense.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.number} {p.name} ({p.position})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="font-mono text-amber-400 font-bold">SCRIPT PREVIEW:</span>
            <span className="truncate max-w-lg">
              {defensiveAction === 'STEAL'
                ? `Defender steals pass from ${activeOffense.find((p) => p.id === (passSegments[0]?.passerId || ''))?.name || 'passer'}!`
                : defensiveAction === 'BLOCK'
                ? `Defender swats ${activeOffense.find((p) => p.id === selectedShooterId)?.name || 'shooter'}'s shot at the rim!`
                : `${activeOffense.find((p) => p.id === selectedShooterId)?.name} ${shotAngle.distanceFt}ft ${shotAngle.isThreePointer ? '3PT' : '2PT'} (${shotOutcome})`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExecute}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Exact Play on Court</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
