import React from 'react';
import { X, BookOpen, Clapperboard, Sparkles, Activity, ShieldAlert, Award } from 'lucide-react';

interface DirectorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectorGuideModal: React.FC<DirectorGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase font-display text-white tracking-wide">
                Director's Guide · How To Script
              </h2>
              <div className="text-xs text-slate-400">Master every rule of Script the Court</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-amber-400" />
              1. Possession Scripting Engine
            </h3>
            <p className="text-xs text-slate-400">
              Unlike ordinary sports games where a random number generator dictates plays, in <strong>Script the Court</strong> you have full creative control over the outcome of every single possession.
            </p>
            <ul className="text-xs space-y-1 list-disc pl-5 text-slate-300">
              <li>Use the <strong>Instant Script Cues</strong> for 1-click execution (3PT Daggers, Poster Dumps, Steals).</li>
              <li>Open the <strong>Custom Scriptwriter</strong> to hand-select the shooter, defender, assist teammate, exact shot type, and write your own broadcast commentary.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              2. Scripting the Tip-Off
            </h3>
            <p className="text-xs text-slate-400">
              Before the game starts in <strong>Exhibition Mode</strong>, you script which center wins the opening jump ball and which guard collects the possession, immediately setting the tempo.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              3. Penalties, Technicals & Ejections
            </h3>
            <p className="text-xs text-slate-400">
              Add intense referee drama to any possession:
            </p>
            <ul className="text-xs space-y-1 list-disc pl-5 text-slate-300">
              <li><strong>Common Fouls:</strong> Award 2 or 3 free throws at the charity stripe.</li>
              <li><strong>Technical Fouls:</strong> Award penalty free throws for unsportsmanlike referee confrontation.</li>
              <li><strong>Flagrant 2:</strong> Trigger violent collisions and instant player ejections from the game!</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              4. Injuries & Bench Depth
            </h3>
            <p className="text-xs text-slate-400">
              Script injuries mid-play (ankle sprains, hyperextended knees). When a player goes down, trainers rush out, and you must use the <strong>Medical & Injury Protocol</strong> to sub in a bench player!
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              5. Passing Mechanics & Dime Assists
            </h3>
            <p className="text-xs text-slate-400">
              Direct realistic passing sequences: alley-oop lobs, high pick-and-roll pocket passes, drive-and-kick corner 3s, and wrap-around dish passes. Watch the ball zip from the playmaker to the finisher across the court with custom pass trajectories and assist stat tracking.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              6. Video Reviews, Buzzer Beaters & Instant Execution
            </h3>
            <p className="text-xs text-slate-400">
              Confirming a play in the scriptwriter or clicking any instant cue immediately executes the play on the floor. Send referees to the sideline monitor with official VAR reviews to overturn controversial calls, and script game-winning buzzer beaters with red backboard LED lights!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
