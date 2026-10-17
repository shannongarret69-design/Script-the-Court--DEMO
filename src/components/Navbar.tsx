import React from 'react';
import { Volume2, VolumeX, Clapperboard, RotateCcw } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface NavbarProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenBoxScore: () => void;
  onNewGame: () => void;
  isGameActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenBoxScore,
  onNewGame,
  isGameActive,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Clapperboard className="w-4 h-4" />
        </div>
        <span className="text-lg font-black tracking-wider uppercase font-display text-white flex items-center gap-2">
          <span>Script The Court</span>
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded">
            DEMO
          </span>
        </span>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <button
          onClick={onOpenRules}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          Director's Guide
        </button>
        {isGameActive && (
          <button
            onClick={onOpenBoxScore}
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Live Box Score
          </button>
        )}
        <span className="text-slate-600">·</span>
        <span className="text-slate-300 font-medium">Exhibition Mode</span>
      </nav>

      {/* Zone 3: Sound toggle & primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Stadium Audio' : 'Unmute Stadium Audio'}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
        </button>

        {isGameActive ? (
          <button
            onClick={onNewGame}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Match</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            Broadcast Ready
          </div>
        )}
      </div>
    </header>
  );
};
