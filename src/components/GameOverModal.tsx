import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Team, Player, ScriptedPlay } from '../types/game';
import { Trophy, Award, RotateCcw, FileText, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface GameOverModalProps {
  isOpen: boolean;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  plays: ScriptedPlay[];
  onPlayAgain: () => void;
  onOpenBoxScore: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  plays,
  onPlayAgain,
  onOpenBoxScore,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundEngine.playBuzzer();
      soundEngine.playCrowdCheer();
      // Trigger festive arena confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isHomeWinner = homeScore >= awayScore;
  const winningTeam = isHomeWinner ? homeTeam : awayTeam;
  const losingTeam = isHomeWinner ? awayTeam : homeTeam;
  const winningScore = isHomeWinner ? homeScore : awayScore;
  const losingScore = isHomeWinner ? awayScore : homeScore;

  // Determine Game MVP from winning team
  const allWinningPlayers = [...winningTeam.roster];
  allWinningPlayers.sort((a, b) => b.stats.points - a.stats.points);
  const mvp = allWinningPlayers[0];

  // Highlights
  const buzzerPlays = plays.filter((p) => p.category === 'BUZZER_BEATER' && p.outcome === 'MADE');
  const dunks = plays.filter((p) => p.category === 'SLAM_DUNK' && p.outcome === 'MADE');
  const injuries = plays.filter((p) => !!p.injuryDetails);
  const ejections = plays.filter((p) => p.penaltyDetails?.ejected);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-center">
        {/* Banner */}
        <div
          className="p-8 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${winningTeam.primaryColor}dd 0%, #090d16 100%)`,
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Trophy className="w-3.5 h-3.5" />
            Final Broadcast Buzzer
          </div>

          <h2 className="text-3xl md:text-4xl font-black uppercase font-display text-white mb-2">
            {winningTeam.name} Victory!
          </h2>

          <div className="flex items-center justify-center gap-6 my-4">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-300">{awayTeam.tricode}</div>
              <div className="text-4xl font-black font-athletic font-mono-numbers text-white">
                {awayScore}
              </div>
            </div>
            <div className="text-slate-500 font-display text-xl font-bold">FINAL</div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-300">{homeTeam.tricode}</div>
              <div className="text-4xl font-black font-athletic font-mono-numbers text-white">
                {homeScore}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Game MVP */}
          {mvp && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Script MVP of the Game
                  </div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>{mvp.name}</span>
                    <span className="text-xs text-slate-400 font-mono">#{mvp.number}</span>
                  </div>
                  <div className="text-xs text-slate-400">{winningTeam.name}</div>
                </div>
              </div>

              <div className="text-right font-mono-numbers">
                <div className="text-2xl font-black font-athletic text-amber-400">
                  {mvp.stats.points} <span className="text-xs font-normal text-slate-400">PTS</span>
                </div>
                <div className="text-xs text-slate-400">
                  {mvp.stats.assists} AST · {mvp.stats.rebounds} REB
                </div>
              </div>
            </div>
          )}

          {/* Script Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Total Plays Scripted
              </div>
              <div className="text-xl font-black font-mono text-white mt-1">{plays.length}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Poster Dunks
              </div>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">{dunks.length}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Buzzer Beat
              </div>
              <div className="text-xl font-black font-mono text-sky-400 mt-1">
                {buzzerPlays.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Drama & Ejections
              </div>
              <div className="text-xl font-black font-mono text-rose-400 mt-1">
                {injuries.length + ejections.length}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenBoxScore}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Inspect Full Box Score</span>
            </button>

            <button
              onClick={onPlayAgain}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Direct New Matchup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
