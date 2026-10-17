import React from 'react';
import { Team, Player } from '../types/game';
import { X, Activity, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface InjuryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: Team;
  awayTeam: Team;
  onSubstitutePlayer: (teamId: string, subOutPlayerId: string, subInPlayerId: string) => void;
}

export const InjuryReportModal: React.FC<InjuryReportModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  onSubstitutePlayer,
}) => {
  if (!isOpen) return null;

  const injuredPlayers: { player: Player; team: Team }[] = [];
  [awayTeam, homeTeam].forEach((team) => {
    team.roster.forEach((p) => {
      if (p.injury && p.injury.status === 'OUT_GAME') {
        injuredPlayers.push({ player: p, team });
      }
    });
  });

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase font-display text-white tracking-wide">
                Medical & Injury Protocol
              </h2>
              <div className="text-xs text-slate-400">
                Manage sidelined players and sub in fresh bench depth
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {injuredPlayers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-80" />
              <div className="text-sm font-bold text-white">All Rosters 100% Healthy</div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active injuries on the floor. You can script an injury during any upcoming possession in the Director's Board!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Active Sidelined Players ({injuredPlayers.length})
              </div>

              {injuredPlayers.map(({ player, team }) => {
                const benchOptions = team.roster.filter(
                  (p) => !p.isOnCourt && p.injury?.status !== 'OUT_GAME'
                );

                return (
                  <div
                    key={player.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {team.tricode}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{player.name}</span>
                            <span className="text-xs text-rose-400 font-mono">#{player.number}</span>
                          </div>
                          <div className="text-xs text-rose-300">
                            {player.injury?.description || 'Sprained Ankle'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        OUT FOR GAME
                      </span>
                    </div>

                    {/* Substitution Action */}
                    {player.isOnCourt && (
                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                          Select Bench Replacement
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {benchOptions.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                soundEngine.playWhistle();
                                onSubstitutePlayer(team.id, player.id, sub.id);
                              }}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 text-xs font-semibold text-slate-200 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                                <span>{sub.name}</span>
                              </div>
                              <span className="text-slate-400 text-[10px]">
                                {sub.position} · {sub.rating}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
