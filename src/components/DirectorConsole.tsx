import React from 'react';
import { Team, Player, ScriptedPlay, PlayCategory, ShotOutcome } from '../types/game';
import { Sparkles, Sliders, Zap, ShieldAlert, Activity, Eye, Trophy, RefreshCw, Play, Layers } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface DirectorConsoleProps {
  currentPlay: ScriptedPlay | null;
  possessionTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  onOpenScriptwriter: () => void;
  onOpenPlayDesigner: () => void;
  onQuickScript: (category: PlayCategory, outcome: ShotOutcome, extraPoints?: number, executeNow?: boolean) => void;
  onApplyScriptPreset: (presetType: 'RUN_OFFENSE' | 'CHAOS_DRAMA' | 'CLUTCH_THRILLER') => void;
  onOpenSubstitutions: () => void;
  injuredCount: number;
}

export const DirectorConsole: React.FC<DirectorConsoleProps> = ({
  currentPlay,
  possessionTeamId,
  homeTeam,
  awayTeam,
  onOpenScriptwriter,
  onOpenPlayDesigner,
  onQuickScript,
  onApplyScriptPreset,
  onOpenSubstitutions,
  injuredCount,
}) => {
  const effectiveOffenseId = currentPlay ? currentPlay.offenseTeamId : possessionTeamId;
  const isOffenseAway = effectiveOffenseId === awayTeam.id;
  const offenseTeam = isOffenseAway ? awayTeam : homeTeam;
  const activeOffense = offenseTeam.roster.filter((p) => p.isOnCourt && p.injury?.status !== 'OUT_GAME');
  const shooter = currentPlay
    ? offenseTeam.roster.find((p) => p.id === currentPlay.shooterPlayerId) || activeOffense[0] || offenseTeam.roster[0]
    : activeOffense[0] || offenseTeam.roster[0];
  const passer = currentPlay ? offenseTeam.roster.find((p) => p.id === currentPlay.passerPlayerId) : undefined;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase font-display text-white tracking-wider flex items-center gap-2">
              <span>Director's Board · Script Next Outcome</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                Auto-Execute Enabled
              </span>
            </h3>
            <div className="text-[11px] text-slate-400">
              Possession: <strong className="text-amber-400">{offenseTeam.name}</strong> · Finisher:{' '}
              <strong className="text-white">{shooter.name}</strong>
              {passer && passer.id !== shooter.id ? (
                <span> · Playmaker: <strong className="text-sky-400">{passer.name}</strong></span>
              ) : !currentPlay ? (
                <span className="text-amber-400 font-semibold"> · Click a cue to script & run play</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {injuredCount > 0 && (
            <button
              onClick={onOpenSubstitutions}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Injury Protocol ({injuredCount})</span>
            </button>
          )}

          <button
            onClick={onOpenPlayDesigner}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/60 text-sky-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Draw Play (Chalkboard)</span>
          </button>

          <button
            onClick={onOpenScriptwriter}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Scriptwriter</span>
          </button>
        </div>
      </div>

      {/* Quick 1-Click Scripting Shortcuts - Auto Executes on click! */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Script Cues (Click to Script & Execute on Court)</span>
          </div>
          <span className="text-[10px] text-slate-500">Passing & Drama</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {/* Passing Cues */}
          <button
            onClick={() => onQuickScript('ALLEY_OOP', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-center transition-all group cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🚀</div>
            <div className="text-xs font-bold text-sky-300">Alley-Oop Lob</div>
            <div className="text-[10px] text-amber-400 font-mono">Pass & Slam</div>
          </button>

          <button
            onClick={() => onQuickScript('PICK_AND_ROLL', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-center transition-all group cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🔄</div>
            <div className="text-xs font-bold text-sky-300">Pick & Roll</div>
            <div className="text-[10px] text-amber-400 font-mono">Pocket Pass</div>
          </button>

          <button
            onClick={() => onQuickScript('DRIVE_AND_KICK', 'MADE', 3, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-center transition-all group cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">⚡</div>
            <div className="text-xs font-bold text-sky-300">Drive & Kick 3</div>
            <div className="text-[10px] text-amber-400 font-mono">Pass +3 PTS</div>
          </button>

          <button
            onClick={() => onQuickScript('PASS_AND_SCORE', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 text-center transition-all group cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🤝</div>
            <div className="text-xs font-bold text-sky-300">Dish & Score</div>
            <div className="text-[10px] text-amber-400 font-mono">Assist Dime</div>
          </button>

          {/* Scoring Cues */}
          <button
            onClick={() => onQuickScript('THREE_POINTER', 'MADE', 3, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🎯</div>
            <div className="text-xs font-bold text-slate-200">3PT Dagger</div>
            <div className="text-[10px] text-amber-400 font-mono">+3 PTS</div>
          </button>

          <button
            onClick={() => onQuickScript('SLAM_DUNK', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">💥</div>
            <div className="text-xs font-bold text-slate-200">Poster Dunk</div>
            <div className="text-[10px] text-amber-400 font-mono">+2 PTS</div>
          </button>

          <button
            onClick={() => onQuickScript('MID_RANGE', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🏀</div>
            <div className="text-xs font-bold text-slate-200">Fadeaway</div>
            <div className="text-[10px] text-amber-400 font-mono">+2 PTS</div>
          </button>

          {/* Defense & Drama */}
          <button
            onClick={() => onQuickScript('TURNOVER', 'STOLEN', 0, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">⚠️</div>
            <div className="text-xs font-bold text-slate-200">Steal & Break</div>
            <div className="text-[10px] text-rose-400 font-mono">Turnover</div>
          </button>

          <button
            onClick={() => onQuickScript('SHOOTING_FOUL', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🛑</div>
            <div className="text-xs font-bold text-slate-200">Foul (2 FTs)</div>
            <div className="text-[10px] text-amber-400 font-mono">+2 PTS</div>
          </button>

          <button
            onClick={() => onQuickScript('FLAGRANT_TECHNICAL', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🟨</div>
            <div className="text-xs font-bold text-slate-200">Flagrant / Tech</div>
            <div className="text-[10px] text-rose-400 font-mono">Whistle</div>
          </button>

          <button
            onClick={() => onQuickScript('INJURY_EVENT', 'MISSED', 0, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">🚑</div>
            <div className="text-xs font-bold text-slate-200">Ankle Injury</div>
            <div className="text-[10px] text-rose-400 font-mono">Sidelined</div>
          </button>

          <button
            onClick={() => onQuickScript('REFEREE_REVIEW', 'MADE', 2, true)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-400/60 text-center transition-all group cursor-pointer hover:scale-[1.02]"
          >
            <div className="text-sm mb-1 group-hover:scale-110 transition-transform">📺</div>
            <div className="text-xs font-bold text-slate-200">VAR Overturn</div>
            <div className="text-[10px] text-sky-400 font-mono">Review</div>
          </button>
        </div>
      </div>

      {/* Preset Screenplays */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">
            Director Arc Presets (Instant Execute):
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onApplyScriptPreset('RUN_OFFENSE')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Script 10-0 Run
          </button>
          <button
            onClick={() => onApplyScriptPreset('CLUTCH_THRILLER')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Script Buzzer Thriller
          </button>
          <button
            onClick={() => onApplyScriptPreset('CHAOS_DRAMA')}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Script Maximum Chaos (Techs & Reviews)
          </button>
        </div>
      </div>
    </div>
  );
};
