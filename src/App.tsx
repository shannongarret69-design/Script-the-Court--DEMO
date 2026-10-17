import React, { useState, useEffect, useRef } from 'react';
import { NBA_TEAMS } from './data/nbaData';
import {
  Team,
  Player,
  ScriptedPlay,
  GameSettings,
  GamePhase,
  PlayCategory,
  ShotOutcome,
} from './types/game';
import { Navbar } from './components/Navbar';
import { ExhibitionSetup } from './components/ExhibitionSetup';
import { Scoreboard } from './components/Scoreboard';
import { CourtVisualizer } from './components/CourtVisualizer';
import { DirectorConsole } from './components/DirectorConsole';
import { PlayByPlayFeed } from './components/PlayByPlayFeed';
import { ScriptwriterModal } from './components/ScriptwriterModal';
import { BoxScoreModal } from './components/BoxScoreModal';
import { InjuryReportModal } from './components/InjuryReportModal';
import { DirectorGuideModal } from './components/DirectorGuideModal';
import { GameOverModal } from './components/GameOverModal';
import { PlayDesignerModal } from './components/PlayDesignerModal';
import { createPossessionScript, formatGameClock, generatePlayCommentary } from './utils/scriptGenerator';
import { soundEngine } from './utils/audio';
import { DepthChartModal } from './components/DepthChartModal';

export default function App() {
  // Navigation & Sound
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');

  // Modals
  const [isScriptwriterOpen, setIsScriptwriterOpen] = useState<boolean>(false);
  const [isPlayDesignerOpen, setIsPlayDesignerOpen] = useState<boolean>(false);
  const [isBoxScoreOpen, setIsBoxScoreOpen] = useState<boolean>(false);
  const [isInjuryModalOpen, setIsInjuryModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isDepthChartOpen, setIsDepthChartOpen] = useState<boolean>(false);

  // Quarter intermission transition alert
  const [quarterTransition, setQuarterTransition] = useState<{ from: number; to: number; label: string } | null>(null);

  // Teams & Game State
  const [homeTeam, setHomeTeam] = useState<Team>(() => JSON.parse(JSON.stringify(NBA_TEAMS[0])));
  const [awayTeam, setAwayTeam] = useState<Team>(() => JSON.parse(JSON.stringify(NBA_TEAMS[1])));
  const [settings, setSettings] = useState<GameSettings | null>(null);

  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [quarter, setQuarter] = useState<number>(1);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(720); // 12 mins per quarter
  const [shotClock, setShotClock] = useState<number>(24);
  const [homeFouls, setHomeFouls] = useState<number>(0);
  const [awayFouls, setAwayFouls] = useState<number>(0);

  // Scripting State
  const [currentPlay, setCurrentPlay] = useState<ScriptedPlay | null>(null);
  const [executedPlays, setExecutedPlays] = useState<ScriptedPlay[]>([]);
  const [completedPossessions, setCompletedPossessions] = useState<number>(0);
  const [possessionTeamId, setPossessionTeamId] = useState<string>('');

  // Simulation & Animation loop
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [playAnimationProgress, setPlayAnimationProgress] = useState<number>(0);
  const [isBuzzerActive, setIsBuzzerActive] = useState<boolean>(false);
  const [isReviewActive, setIsReviewActive] = useState<boolean>(false);
  const [activeInjuryAlert, setActiveInjuryAlert] = useState<{
    player: Player;
    description: string;
  } | null>(null);
  const [activeFoulAlert, setActiveFoulAlert] = useState<{
    player: Player;
    description: string;
  } | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Toggle stadium sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
  };

  // Start Exhibition Match
  const handleStartExhibition = (newSettings: GameSettings) => {
    setSettings(newSettings);

    const baseHome = NBA_TEAMS.find((t) => t.id === newSettings.homeTeamId) || NBA_TEAMS[0];
    const baseAway = NBA_TEAMS.find((t) => t.id === newSettings.awayTeamId) || NBA_TEAMS[1];

    // Deep clone teams for fresh stats
    const freshHome: Team = JSON.parse(JSON.stringify(baseHome));
    const freshAway: Team = JSON.parse(JSON.stringify(baseAway));

    setHomeTeam(freshHome);
    setAwayTeam(freshAway);
    setHomeScore(0);
    setAwayScore(0);
    setQuarter(1);
    const qSecs = (newSettings.quarterLengthMinutes || 3) * 60;
    setSecondsRemaining(qSecs);
    setShotClock(24);
    setQuarterTransition(null);
    setHomeFouls(0);
    setAwayFouls(0);
    setExecutedPlays([]);
    setCompletedPossessions(0);

    // Tip-off scripted winner gets first possession!
    const firstPossessionTeamId = newSettings.tipOff.winnerTeamId;
    setPossessionTeamId(firstPossessionTeamId);

    // No play is pre-scripted: user must script the play first!
    setCurrentPlay(null);

    setGamePhase('LIVE_PLAY');
    setIsPlaying(false);
    setPlayAnimationProgress(0);
  };

  // Execute currently scripted play and resolve game effects
  const resolveCurrentPlay = () => {
    if (!currentPlay || !settings) return;

    const isAwayOffense = currentPlay.offenseTeamId === awayTeam.id;
    const offenseTeam = isAwayOffense ? awayTeam : homeTeam;
    const defenseTeam = isAwayOffense ? homeTeam : awayTeam;

    // 1. Play sound effects
    if (currentPlay.outcome === 'MADE' || currentPlay.outcome === 'FOUL_AND_ONE') {
      if (currentPlay.category === 'SLAM_DUNK') {
        soundEngine.playDunk();
      } else {
        soundEngine.playSwish();
      }
      soundEngine.playCrowdCheer();
    } else if (currentPlay.outcome === 'BLOCKED') {
      soundEngine.playRimClank();
    } else if (currentPlay.outcome === 'MISSED') {
      soundEngine.playRimClank();
      soundEngine.playCrowdGasp();
    }

    if (currentPlay.penaltyDetails) {
      soundEngine.playWhistle();
      setActiveFoulAlert({
        player:
          defenseTeam.roster.find((p) => p.id === currentPlay.penaltyDetails?.foulingPlayerId) ||
          defenseTeam.roster[0],
        description: currentPlay.penaltyDetails.description,
      });
      setTimeout(() => setActiveFoulAlert(null), 3000);
    }

    if (currentPlay.injuryDetails) {
      soundEngine.playWhistle();
      soundEngine.playCrowdGasp();
      const injuredPlayer =
        [...homeTeam.roster, ...awayTeam.roster].find(
          (p) => p.id === currentPlay.injuryDetails?.injuredPlayerId
        ) || offenseTeam.roster[0];

      // Mark player injured
      injuredPlayer.injury = {
        type: currentPlay.injuryDetails.injuryName,
        description: currentPlay.injuryDetails.description,
        status: currentPlay.injuryDetails.severity === 'OUT_FOR_GAME' ? 'OUT_GAME' : 'QUESTIONABLE',
        injuredAtPossession: completedPossessions,
      };

      setActiveInjuryAlert({
        player: injuredPlayer,
        description: currentPlay.injuryDetails.description,
      });
      setTimeout(() => setActiveInjuryAlert(null), 3500);
    }

    // 2. Update player statistics
    const shooter = offenseTeam.roster.find((p) => p.id === currentPlay.shooterPlayerId);
    if (shooter) {
      shooter.stats.points += currentPlay.pointsEarned;
      shooter.stats.fga += 1;
      if (currentPlay.outcome === 'MADE' || currentPlay.outcome === 'FOUL_AND_ONE') {
        shooter.stats.fgm += 1;
      }
      if (currentPlay.category === 'THREE_POINTER' || currentPlay.category === 'BUZZER_BEATER') {
        shooter.stats.threePa += 1;
        if (currentPlay.outcome === 'MADE') shooter.stats.threePm += 1;
      }
      if (currentPlay.freeThrows) {
        shooter.stats.fta += currentPlay.freeThrows.total;
        shooter.stats.ftm += currentPlay.freeThrows.made;
      }
    }

    if (currentPlay.passerPlayerId) {
      const passer = offenseTeam.roster.find((p) => p.id === currentPlay.passerPlayerId);
      if (passer && (currentPlay.outcome === 'MADE' || currentPlay.outcome === 'FOUL_AND_ONE')) {
        passer.stats.assists += 1;
      }
    }

    if (currentPlay.defenderPlayerId) {
      const defender = defenseTeam.roster.find((p) => p.id === currentPlay.defenderPlayerId);
      if (defender) {
        if (currentPlay.outcome === 'BLOCKED') defender.stats.blocks += 1;
        if (currentPlay.outcome === 'STOLEN') defender.stats.steals += 1;
        if (currentPlay.penaltyDetails) defender.stats.fouls += 1;
      }
    }

    // 3. Update scores
    if (isAwayOffense) {
      setAwayScore((prev) => prev + currentPlay.pointsEarned);
    } else {
      setHomeScore((prev) => prev + currentPlay.pointsEarned);
    }

    if (currentPlay.penaltyDetails) {
      if (isAwayOffense) {
        setHomeFouls((prev) => prev + 1);
      } else {
        setAwayFouls((prev) => prev + 1);
      }
    }

    // 4. Archive play in history
    setExecutedPlays((prev) => [currentPlay, ...prev]);
    const nextPossessionIndex = completedPossessions + 1;
    setCompletedPossessions(nextPossessionIndex);

    // 5. Decrement quarter clock (approx 16-24 seconds per possession)
    const timePerPlay = Math.floor(Math.random() * 8) + 16;
    const quarterDurationSecs = (settings?.quarterLengthMinutes || 3) * 60;
    let nextSeconds = secondsRemaining - timePerPlay;
    let nextQuarter = quarter;

    if (nextSeconds <= 0) {
      soundEngine.playBuzzer();
      if (quarter < 4) {
        // Advance to next quarter (Q1 -> Q2 -> Q3 -> Q4)
        nextQuarter = quarter + 1;
        nextSeconds = quarterDurationSecs;
        setQuarterTransition({
          from: quarter,
          to: nextQuarter,
          label: quarter === 2 ? 'Halftime Intermission' : `End of Quarter ${quarter}`,
        });
        setTimeout(() => setQuarterTransition(null), 3500);
      } else {
        // Quarter 4 or OT finished: check if tied
        const updatedAway = isAwayOffense ? awayScore + currentPlay.pointsEarned : awayScore;
        const updatedHome = !isAwayOffense ? homeScore + currentPlay.pointsEarned : homeScore;

        if (updatedAway === updatedHome) {
          // TIED AT END OF REGULATION: 5:00 OVERTIME!
          nextQuarter = quarter + 1;
          nextSeconds = 300; // 5 min OT
          setQuarterTransition({
            from: quarter,
            to: nextQuarter,
            label: 'Game Tied! Overtime Period (5:00)',
          });
          setTimeout(() => setQuarterTransition(null), 4000);
        } else {
          // FINAL BUZZER: 4 QUARTERS COMPLETED! GAME OVER!
          nextSeconds = 0;
          setIsPlaying(false);
          setGamePhase('GAME_OVER');
          setIsGameOverOpen(true);
          return;
        }
      }
    }

    setSecondsRemaining(Math.max(0, nextSeconds));
    setQuarter(nextQuarter);
    setShotClock(24);

    // Next possession switches offense
    const nextOffenseId = isAwayOffense ? homeTeam.id : awayTeam.id;
    setPossessionTeamId(nextOffenseId);

    const nextOffenseTeam = nextOffenseId === homeTeam.id ? homeTeam : awayTeam;
    const nextDefenseTeam = nextOffenseId === homeTeam.id ? awayTeam : homeTeam;

    // When no play was scripted there should be NO play: wait for user to script next possession!
    setCurrentPlay(null);
    setIsPlaying(false);
    setPlayAnimationProgress(0);
  };

  // Play animation loop (moves ball & players on court)
  useEffect(() => {
    if (gamePhase !== 'LIVE_PLAY' || !isPlaying) return;
    if (!currentPlay) {
      setIsPlaying(false);
      return;
    }

    let progress = playAnimationProgress;
    const speed = playSpeed;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Rate: normal play lasts ~1.8 seconds (faster)
      const rate = (1 / 1.0) * speed;
      progress += delta * rate;

      if (progress >= 1) {
        setPlayAnimationProgress(1);
        resolveCurrentPlay();
        lastTimeRef.current = 0;
      } else {
        setPlayAnimationProgress(progress);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [isPlaying, gamePhase, playSpeed, playAnimationProgress, currentPlay]);

  // Video playback toggle: when no play was scripted there is NO play when clicking start!
  const handleTogglePlay = () => {
    if (!currentPlay) {
      soundEngine.playSqueak();
      return;
    }
    setIsPlaying(!isPlaying);
  };

  // Step immediately to next play
  const handleNextPlay = () => {
    if (!currentPlay) return;
    soundEngine.playSqueak();
    resolveCurrentPlay();
  };

  // Quick Scripting action (e.g. 1-click 3PT Dagger, Poster Dunk, Ankle Injury, Alley-Oop)
  const handleQuickScript = (
    category: PlayCategory,
    outcome: ShotOutcome,
    extraPoints?: number,
    executeNow: boolean = true
  ) => {
    soundEngine.playClapper();

    const effectiveOffenseId = currentPlay ? currentPlay.offenseTeamId : possessionTeamId;
    const isAway = effectiveOffenseId === awayTeam.id;
    const offenseTeam = isAway ? awayTeam : homeTeam;
    const defenseTeam = isAway ? homeTeam : awayTeam;

    const activeOffense = offenseTeam.roster.filter(
      (p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME'
    );
    const shooter = activeOffense[0] || offenseTeam.roster[0];
    const defender = defenseTeam.roster.find((p) => p.isOnCourt) || defenseTeam.roster[0];

    // Pick passer if passing play
    let passer: Player | undefined = undefined;
    const isPassingPlay = ['ALLEY_OOP', 'PICK_AND_ROLL', 'DRIVE_AND_KICK', 'PASS_AND_SCORE'].includes(category);
    if (isPassingPlay) {
      passer = activeOffense.find((p) => p.id !== shooter.id) || activeOffense[1];
    }

    let points = extraPoints ?? (category === 'THREE_POINTER' || category === 'DRIVE_AND_KICK' ? 3 : 2);
    if (outcome === 'MISSED' || outcome === 'STOLEN' || outcome === 'BLOCKED') points = 0;

    let shotDesc = `${category.replace(/_/g, ' ')}`;
    if (category === 'ALLEY_OOP') shotDesc = 'Alley-Oop Lob Slam';
    if (category === 'PICK_AND_ROLL') shotDesc = 'Pick & Roll Pocket Pass';
    if (category === 'DRIVE_AND_KICK') shotDesc = 'Drive & Kick 3-Pointer';
    if (category === 'PASS_AND_SCORE') shotDesc = 'Pinpoint Pass & Score';

    let injuryDetails = undefined;
    let penaltyDetails = undefined;
    let refereeReview = undefined;

    if (category === 'INJURY_EVENT') {
      injuryDetails = {
        injuredPlayerId: shooter.id,
        injuryName: 'Sprained Ankle',
        severity: 'OUT_FOR_GAME' as const,
        description: `${shooter.name} suffered a sharp ankle twist on the landing.`,
      };
      points = 0;
      outcome = 'MISSED';
    }

    if (category === 'FLAGRANT_TECHNICAL') {
      penaltyDetails = {
        foulingPlayerId: defender.id,
        penaltyType: 'TECHNICAL' as const,
        ejected: false,
        description: `Technical foul assessed to ${defender.name}`,
      };
      points = 2;
    }

    if (category === 'REFEREE_REVIEW') {
      refereeReview = {
        initialCall: 'Out of bounds on offense',
        finalDecision: 'CALL_OVERTURNED' as const,
        reason: 'Review confirms defender was last to touch before line crossing',
      };
      points = 2;
    }

    const commentary = generatePlayCommentary(category, outcome, shooter, defender, passer, points, {
      injury: injuryDetails?.description,
      penalty: penaltyDetails?.penaltyType,
      review: refereeReview?.finalDecision,
      isBuzzerBeater: category === 'BUZZER_BEATER',
    });

    const updated: ScriptedPlay = {
      id: currentPlay?.id || `play-${completedPossessions}-${Date.now()}`,
      possessionIndex: completedPossessions,
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
      shotDescription: shotDesc,
      commentary,
      injuryDetails,
      penaltyDetails,
      refereeReview,
    };

    setCurrentPlay(updated);

    // If requested, immediately execute the play on court
    if (executeNow) {
      setPlayAnimationProgress(0);
      setIsPlaying(true);
    }
  };

  // Narrative Presets (multi-possession themes) - executes immediately!
  const handleApplyScriptPreset = (presetType: 'RUN_OFFENSE' | 'CHAOS_DRAMA' | 'CLUTCH_THRILLER') => {
    soundEngine.playClapper();
    if (presetType === 'RUN_OFFENSE') {
      handleQuickScript('THREE_POINTER', 'MADE', 3, true);
    } else if (presetType === 'CHAOS_DRAMA') {
      handleQuickScript('FLAGRANT_TECHNICAL', 'MADE', 2, true);
    } else if (presetType === 'CLUTCH_THRILLER') {
      handleQuickScript('BUZZER_BEATER', 'MADE', 3, true);
      setIsBuzzerActive(true);
      setTimeout(() => setIsBuzzerActive(false), 2500);
    }
  };

  // Substitute player in case of injury or tactical rotation
  const handleSubstitutePlayer = (teamId: string, subOutPlayerId: string, subInPlayerId: string) => {
    const isAway = teamId === awayTeam.id;
    const team = isAway ? awayTeam : homeTeam;

    const subOut = team.roster.find((p) => p.id === subOutPlayerId);
    const subIn = team.roster.find((p) => p.id === subInPlayerId);

    if (subOut && subIn) {
      subOut.isOnCourt = false;
      subIn.isOnCourt = true;
    }

    if (isAway) {
      setAwayTeam({ ...team });
    } else {
      setHomeTeam({ ...team });
    }

    setIsInjuryModalOpen(false);
  };

  // Sidelined injured players count
  const injuredCount = [...homeTeam.roster, ...awayTeam.roster].filter(
    (p) => p.injury?.status === 'OUT_GAME'
  ).length;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Bar Contract Navigation */}
      <Navbar
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsGuideOpen(true)}
        onOpenBoxScore={() => setIsBoxScoreOpen(true)}
        onNewGame={() => setGamePhase('SETUP')}
        isGameActive={gamePhase === 'LIVE_PLAY'}
        setIsDepthChartOpen={setIsDepthChartOpen}
      />

      {/* Main Game Screen */}
      <main className="flex-1">
        {gamePhase === 'SETUP' ? (
          <ExhibitionSetup onStartGame={handleStartExhibition} />
        ) : (
          <div className="space-y-4 pb-12">
            {/* Scoreboard Bug */}
            <Scoreboard
              awayTeam={awayTeam}
              homeTeam={homeTeam}
              awayScore={awayScore}
              homeScore={homeScore}
              quarter={quarter}
              clockRemaining={formatGameClock(secondsRemaining)}
              shotClock={shotClock}
              possessionTeamId={possessionTeamId}
              currentPlay={currentPlay || undefined}
              awayFouls={awayFouls}
              homeFouls={homeFouls}
            />

            {/* Main Stage: Court Visualizer & Director Workstation */}
            <div className="max-w-6xl mx-auto px-4 space-y-4">
              {/* Interactive Court */}
              <CourtVisualizer
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                possessionTeamId={possessionTeamId}
                currentPlay={currentPlay}
                isPlaying={isPlaying}
                playSpeed={playSpeed}
                onTogglePlay={handleTogglePlay}
                onChangeSpeed={(s) => setPlaySpeed(s)}
                onNextPlay={handleNextPlay}
                onOpenScriptwriter={() => setIsScriptwriterOpen(true)}
                onOpenPlayDesigner={() => setIsPlayDesignerOpen(true)}
                playAnimationProgress={playAnimationProgress}
                isBuzzerActive={isBuzzerActive}
                isReviewActive={isReviewActive}
                activeInjury={activeInjuryAlert}
                activeFoul={activeFoulAlert}
                quarterTransition={quarterTransition}
              />

              {/* Lower Deck: Director's Board & Play-by-Play Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <DirectorConsole
                    currentPlay={currentPlay}
                    possessionTeamId={possessionTeamId}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    onOpenScriptwriter={() => setIsScriptwriterOpen(true)}
                    onOpenPlayDesigner={() => setIsPlayDesignerOpen(true)}
                    onQuickScript={handleQuickScript}
                    onApplyScriptPreset={handleApplyScriptPreset}
                    onOpenSubstitutions={() => setIsInjuryModalOpen(true)}
                    onOpenDepthChart={() => setIsDepthChartOpen(true)}
                    injuredCount={injuredCount}
                  />
                </div>

                <div className="lg:col-span-5">
                  <PlayByPlayFeed
                    plays={executedPlays}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tactical Chalkboard Play Designer Modal */}
      <PlayDesignerModal
        isOpen={isPlayDesignerOpen}
        onClose={() => setIsPlayDesignerOpen(false)}
        possessionTeamId={possessionTeamId}
        possessionIndex={completedPossessions}
        quarter={quarter}
        secondsRemaining={secondsRemaining}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onExecutePlay={(drawnPlay) => {
          setCurrentPlay(drawnPlay);
          setPlayAnimationProgress(0);
          setIsPlaying(true);
          setIsPlayDesignerOpen(false);
        }}
      />

      {/* Scriptwriter Modal */}
      <ScriptwriterModal
        isOpen={isScriptwriterOpen}
        onClose={() => setIsScriptwriterOpen(false)}
        currentPlay={currentPlay}
        possessionTeamId={possessionTeamId}
        possessionIndex={completedPossessions}
        quarter={quarter}
        secondsRemaining={secondsRemaining}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSaveScript={(updatedPlay, executeImmediately) => {
          setCurrentPlay(updatedPlay);
          if (executeImmediately) {
            setPlayAnimationProgress(0);
            setIsPlaying(true);
          }
        }}
      />

      {/* Box Score Modal */}
      <BoxScoreModal
        isOpen={isBoxScoreOpen}
        onClose={() => setIsBoxScoreOpen(false)}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        awayScore={awayScore}
        homeScore={homeScore}
      />

      {/* Injury Protocol Modal */}
      <InjuryReportModal
        isOpen={isInjuryModalOpen}
        onClose={() => setIsInjuryModalOpen(false)}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubstitutePlayer={handleSubstitutePlayer}
      />

      <DepthChartModal
        isOpen={isDepthChartOpen}
        onClose={() => setIsDepthChartOpen(false)}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubstitute={handleSubstitutePlayer}
      />

      {/* Director's Guide Modal */}
      <DirectorGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Game Over Summary Modal */}
      <GameOverModal
        isOpen={isGameOverOpen}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        plays={executedPlays}
        onPlayAgain={() => {
          setIsGameOverOpen(false);
          setGamePhase('SETUP');
        }}
        onOpenBoxScore={() => {
          setIsBoxScoreOpen(true);
        }}
      />
    </div>
  );
}
