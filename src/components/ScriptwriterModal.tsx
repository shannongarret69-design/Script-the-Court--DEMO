import React, { useState } from 'react';
import { Team, Player, ScriptedPlay, PlayCategory, ShotOutcome } from '../types/game';
import { X, Sparkles, AlertCircle, ShieldAlert, Award, FileText, Check, Play } from 'lucide-react';
import { generatePlayCommentary } from '../utils/scriptGenerator';
import { soundEngine } from '../utils/audio';

import { createPossessionScript } from '../utils/scriptGenerator';

interface ScriptwriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlay: ScriptedPlay | null;
  possessionTeamId: string;
  possessionIndex: number;
  quarter: number;
  secondsRemaining: number;
  homeTeam: Team;
  awayTeam: Team;
  onSaveScript: (newScript: ScriptedPlay, executeImmediately?: boolean) => void;
}

export const ScriptwriterModal: React.FC<ScriptwriterModalProps> = ({
  isOpen,
  onClose,
  currentPlay,
  possessionTeamId,
  possessionIndex,
  quarter,
  secondsRemaining,
  homeTeam,
  awayTeam,
  onSaveScript,
}) => {
  if (!isOpen) return null;

  const effectiveOffenseId = currentPlay ? currentPlay.offenseTeamId : possessionTeamId;
  const isOffenseAway = effectiveOffenseId === awayTeam.id;
  const offenseTeam = isOffenseAway ? awayTeam : homeTeam;
  const defenseTeam = isOffenseAway ? homeTeam : awayTeam;

  const basePlay: ScriptedPlay =
    currentPlay ||
    createPossessionScript(
      possessionIndex,
      quarter,
      secondsRemaining,
      offenseTeam,
      defenseTeam,
      'THREE_POINTER',
      'MADE'
    );

  const activeOffensePlayers = offenseTeam.roster.filter(
    (p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME'
  );
  const activeDefensePlayers = defenseTeam.roster.filter(
    (p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME'
  );

  const [category, setCategory] = useState<PlayCategory>(basePlay.category);
  const [shooterId, setShooterId] = useState<string>(basePlay.shooterPlayerId);
  const [defenderId, setDefenderId] = useState<string>(
    basePlay.defenderPlayerId || defenseTeam.roster[0]?.id || ''
  );
  const [passerId, setPasserId] = useState<string>(
    basePlay.passerPlayerId || activeOffensePlayers.find((p) => p.id !== basePlay.shooterPlayerId)?.id || ''
  );
  const [outcome, setOutcome] = useState<ShotOutcome>(basePlay.outcome);
  const [points, setPoints] = useState<number>(basePlay.pointsEarned);

  // Drama sub-mechanics
  const [hasPenalty, setHasPenalty] = useState<boolean>(!!basePlay.penaltyDetails);
  const [penaltyType, setPenaltyType] = useState<
    'COMMON' | 'OFFENSIVE_CHARGE' | 'TECHNICAL' | 'FLAGRANT_1' | 'FLAGRANT_2_EJECTION'
  >(basePlay.penaltyDetails?.penaltyType || 'TECHNICAL');

  const [hasInjury, setHasInjury] = useState<boolean>(!!basePlay.injuryDetails);
  const [injuredPlayerId, setInjuredPlayerId] = useState<string>(
    basePlay.injuryDetails?.injuredPlayerId || basePlay.shooterPlayerId
  );
  const [injurySeverity, setInjurySeverity] = useState<'MINOR_RETURN' | 'OUT_FOR_GAME'>(
    basePlay.injuryDetails?.severity || 'OUT_FOR_GAME'
  );
  const [injuryDesc, setInjuryDesc] = useState<string>(
    basePlay.injuryDetails?.description || 'Severe ankle twist on awkward landing'
  );

  const [hasReview, setHasReview] = useState<boolean>(!!basePlay.refereeReview);
  const [reviewDecision, setReviewDecision] = useState<'CALL_OVERTURNED' | 'CALL_STANDS'>(
    basePlay.refereeReview?.finalDecision || 'CALL_OVERTURNED'
  );

  const [customCommentary, setCustomCommentary] = useState<string>(basePlay.commentary);

  const handleCategoryChange = (newCat: PlayCategory) => {
    setCategory(newCat);
    soundEngine.playSqueak();

    let newOutcome: ShotOutcome = 'MADE';
    let newPts = 2;

    // Auto-select passer if passing category
    const isPassingPlay = ['PASS_AND_SCORE', 'ALLEY_OOP', 'DRIVE_AND_KICK', 'PICK_AND_ROLL'].includes(newCat);
    let chosenPasserId = passerId;
    if (isPassingPlay && (!chosenPasserId || chosenPasserId === shooterId)) {
      const other = activeOffensePlayers.find((p) => p.id !== shooterId);
      if (other) {
        chosenPasserId = other.id;
        setPasserId(other.id);
      }
    }

    if (newCat === 'THREE_POINTER' || newCat === 'BUZZER_BEATER' || newCat === 'DRIVE_AND_KICK') {
      newPts = 3;
    } else if (newCat === 'TURNOVER') {
      newOutcome = 'STOLEN';
      newPts = 0;
    } else if (newCat === 'INJURY_EVENT') {
      newOutcome = 'MISSED';
      newPts = 0;
      setHasInjury(true);
    } else if (newCat === 'FLAGRANT_TECHNICAL') {
      setHasPenalty(true);
      newPts = 2;
    } else if (newCat === 'REFEREE_REVIEW') {
      setHasReview(true);
    }

    setOutcome(newOutcome);
    setPoints(newPts);

    // Auto update draft commentary
    const shooter = offenseTeam.roster.find((p) => p.id === shooterId) || activeOffensePlayers[0];
    const defender = defenseTeam.roster.find((p) => p.id === defenderId);
    const passer = offenseTeam.roster.find((p) => p.id === chosenPasserId);
    const generated = generatePlayCommentary(newCat, newOutcome, shooter, defender, passer, newPts);
    setCustomCommentary(generated);
  };

  const handleApply = (executeNow: boolean = false) => {
    soundEngine.playClapper();

    const shooter = offenseTeam.roster.find((p) => p.id === shooterId) || activeOffensePlayers[0];
    const defender = defenseTeam.roster.find((p) => p.id === defenderId);
    const passer = offenseTeam.roster.find((p) => p.id === passerId);

    let desc = `${category.replace(/_/g, ' ')}`;
    if (category === 'THREE_POINTER') desc = '3-Point Jump Shot';
    if (category === 'SLAM_DUNK') desc = 'High-Flying Posterizer Slam';
    if (category === 'ALLEY_OOP') desc = 'Alley-Oop Lob Slam';
    if (category === 'DRIVE_AND_KICK') desc = 'Drive & Kick 3-Pointer';
    if (category === 'PICK_AND_ROLL') desc = 'Pick & Roll Pocket Pass';
    if (category === 'PASS_AND_SCORE') desc = 'Pinpoint Pass & Score';
    if (category === 'BUZZER_BEATER') desc = 'Game-Winning Buzzer Beater';
    if (category === 'SHOOTING_FOUL') desc = 'Shooting Foul (2 Free Throws)';

    const updated: ScriptedPlay = {
      ...basePlay,
      category,
      shooterPlayerId: shooterId,
      defenderPlayerId: defenderId || undefined,
      passerPlayerId: passerId || undefined,
      outcome,
      pointsEarned: points,
      shotDescription: desc,
      commentary: customCommentary,
      penaltyDetails: hasPenalty
        ? {
            foulingPlayerId: defenderId,
            penaltyType,
            ejected: penaltyType === 'FLAGRANT_2_EJECTION',
            description: `${penaltyType.replace(/_/g, ' ')} committed by ${defender?.name || 'defender'}`,
          }
        : undefined,
      injuryDetails: hasInjury
        ? {
            injuredPlayerId,
            injuryName: 'Sprained Ankle',
            severity: injurySeverity,
            description: injuryDesc,
          }
        : undefined,
      refereeReview: hasReview
        ? {
            initialCall: 'Call on the floor',
            finalDecision: reviewDecision,
            reason: 'High-speed camera angle confirms indisputable visual evidence',
          }
        : undefined,
    };

    onSaveScript(updated, executeNow);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase font-display text-white tracking-wide">
                Script The Possession
              </h2>
              <div className="text-xs text-slate-400">
                Directing possession for{' '}
                <strong className="text-amber-400">{offenseTeam.name}</strong> vs{' '}
                {defenseTeam.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {/* 1. Category Selector with Passing Options */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Play Action & Passing Mechanics
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { cat: 'PASS_AND_SCORE', label: 'Pass & Score', icon: '🤝' },
                { cat: 'ALLEY_OOP', label: 'Alley-Oop Lob', icon: '🚀' },
                { cat: 'DRIVE_AND_KICK', label: 'Drive & Kick', icon: '⚡' },
                { cat: 'PICK_AND_ROLL', label: 'Pick & Roll', icon: '🔄' },
                { cat: 'THREE_POINTER', label: '3-Point Shot', icon: '🎯' },
                { cat: 'SLAM_DUNK', label: 'Poster Dunk', icon: '💥' },
                { cat: 'MID_RANGE', label: 'Mid-Range Fade', icon: '🏀' },
                { cat: 'DRIVE_LAYUP', label: 'Drive & Layup', icon: '💨' },
                { cat: 'SHOOTING_FOUL', label: 'Shooting Foul', icon: '🛑' },
                { cat: 'TURNOVER', label: 'Steal / TO', icon: '⚠️' },
                { cat: 'FLAGRANT_TECHNICAL', label: 'Flagrant / Tech', icon: '🟨' },
                { cat: 'INJURY_EVENT', label: 'Player Injury', icon: '🚑' },
                { cat: 'REFEREE_REVIEW', label: 'VAR Review', icon: '📺' },
                { cat: 'BUZZER_BEATER', label: 'Buzzer Beater', icon: '🚨' },
              ].map((item) => (
                <button
                  key={item.cat}
                  type="button"
                  onClick={() => handleCategoryChange(item.cat as PlayCategory)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    category === item.cat
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-400/50'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-base mb-1">{item.icon}</div>
                  <div className="text-[11px] font-bold truncate">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Key Actors: Passer (Assist), Shooter, Defender */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passer (Playmaker) */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                Passer / Playmaker ({offenseTeam.tricode})
              </label>
              <select
                value={passerId}
                onChange={(e) => setPasserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">(No Pass / Solo Isolation)</option>
                {activeOffensePlayers
                  .filter((p) => p.id !== shooterId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      #{player.number} {player.name} ({player.position} · PASS {player.attributes.playmaking})
                    </option>
                  ))}
              </select>
            </div>

            {/* Shooter / Scorer */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Shooter / Finisher ({offenseTeam.tricode})
              </label>
              <select
                value={shooterId}
                onChange={(e) => setShooterId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
              >
                {activeOffensePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name} ({player.position} · {player.rating} OVR)
                  </option>
                ))}
              </select>
            </div>

            {/* Defender */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Primary Defender ({defenseTeam.tricode})
              </label>
              <select
                value={defenderId}
                onChange={(e) => setDefenderId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
              >
                {activeDefensePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.number} {player.name} ({player.position} · DEF {player.attributes.defense})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Outcome & Points Awarded */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Play Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { out: 'MADE', label: 'Made Basket', pts: category === 'THREE_POINTER' || category === 'DRIVE_AND_KICK' ? 3 : 2 },
                  { out: 'MISSED', label: 'Missed Shot', pts: 0 },
                  { out: 'FOUL_AND_ONE', label: 'And-1 Foul', pts: category === 'THREE_POINTER' || category === 'DRIVE_AND_KICK' ? 4 : 3 },
                  { out: 'BLOCKED', label: 'Blocked Shot', pts: 0 },
                  { out: 'STOLEN', label: 'Stolen / TO', pts: 0 },
                ].map((item) => (
                  <button
                    key={item.out}
                    type="button"
                    onClick={() => {
                      setOutcome(item.out as ShotOutcome);
                      setPoints(item.pts);
                      soundEngine.playBounce();
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      outcome === item.out
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Points Scripted to Award
              </label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4].map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPoints(pt)}
                    className={`flex-1 py-2 text-sm font-black font-mono rounded-lg border transition-all cursor-pointer ${
                      points === pt
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    +{pt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Special Drama Mechanics: Penalty / Injury / Review */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Dramatic In-Game Scripts (Fouls, Injuries, Reviews)
            </div>

            {/* Toggle Penalty */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPenalty}
                  onChange={(e) => setHasPenalty(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Script Referee Foul / Penalty Event</span>
              </label>
              {hasPenalty && (
                <div className="pl-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'COMMON', label: 'Common Foul' },
                    { id: 'TECHNICAL', label: 'Technical Foul' },
                    { id: 'FLAGRANT_1', label: 'Flagrant 1' },
                    { id: 'FLAGRANT_2_EJECTION', label: 'Flagrant 2 (EJECTION)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setPenaltyType(
                          p.id as
                            | 'COMMON'
                            | 'OFFENSIVE_CHARGE'
                            | 'TECHNICAL'
                            | 'FLAGRANT_1'
                            | 'FLAGRANT_2_EJECTION'
                        )
                      }
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                        penaltyType === p.id
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Injury */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInjury}
                  onChange={(e) => setHasInjury(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                />
                <span>Script Player Injury Incident</span>
              </label>
              {hasInjury && (
                <div className="pl-6 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Injured Player
                      </span>
                      <select
                        value={injuredPlayerId}
                        onChange={(e) => setInjuredPlayerId(e.target.value)}
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {[...activeOffensePlayers, ...activeDefensePlayers].map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.teamId.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Severity
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setInjurySeverity('OUT_FOR_GAME')}
                          className={`py-1 px-2 text-[11px] font-bold rounded border ${
                            injurySeverity === 'OUT_FOR_GAME'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Out for Game
                        </button>
                        <button
                          type="button"
                          onClick={() => setInjurySeverity('MINOR_RETURN')}
                          className={`py-1 px-2 text-[11px] font-bold rounded border ${
                            injurySeverity === 'MINOR_RETURN'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Will Return Later
                        </button>
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={injuryDesc}
                    onChange={(e) => setInjuryDesc(e.target.value)}
                    placeholder="e.g. Sprained ankle landing on defender's foot"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* Toggle Referee Review */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReview}
                  onChange={(e) => setHasReview(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>Script Video Replay Review & Controversy</span>
              </label>
              {hasReview && (
                <div className="pl-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('CALL_OVERTURNED')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border ${
                      reviewDecision === 'CALL_OVERTURNED'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Call Overturned (In Favor of Offense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('CALL_STANDS')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border ${
                      reviewDecision === 'CALL_STANDS'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Original Call Stands (Defense Ball)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. Custom Commentary / Writer's Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Scriptwriter Commentary & Narrative Direction</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const shooter =
                    offenseTeam.roster.find((p) => p.id === shooterId) || activeOffensePlayers[0];
                  const defender = defenseTeam.roster.find((p) => p.id === defenderId);
                  const passer = offenseTeam.roster.find((p) => p.id === passerId);
                  const gen = generatePlayCommentary(
                    category,
                    outcome,
                    shooter,
                    defender,
                    passer,
                    points,
                    {
                      injury: hasInjury ? injuryDesc : undefined,
                      penalty: hasPenalty ? penaltyType : undefined,
                      review: hasReview ? reviewDecision : undefined,
                      isBuzzerBeater: category === 'BUZZER_BEATER',
                    }
                  );
                  setCustomCommentary(gen);
                }}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Auto-generate commentary
              </button>
            </div>
            <textarea
              rows={2}
              value={customCommentary}
              onChange={(e) => setCustomCommentary(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions with Immediate Execution */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => handleApply(false)}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Save Script Only
          </button>
          <button
            onClick={() => handleApply(true)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Confirm & Execute on Court</span>
          </button>
        </div>
      </div>
    </div>
  );
};
