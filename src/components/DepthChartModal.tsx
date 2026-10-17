import React, { useState } from 'react';
import { Team, Player } from '../types/game';
import { X, Users, RefreshCw } from 'lucide-react';

interface DepthChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: Team;
  awayTeam: Team;
  onSubstitute: (teamId: string, subOutId: string, subInId: string) => void;
}

export const DepthChartModal: React.FC<DepthChartModalProps> = ({ isOpen, onClose, homeTeam, awayTeam, onSubstitute }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black uppercase text-white tracking-wide">Depth Chart & Substitutions</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[homeTeam, awayTeam].map(team => (
            <div key={team.id} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4 uppercase">{team.city} {team.name}</h3>
              {['PG', 'SG', 'SF', 'PF', 'C'].map(pos => {
                const starter = team.roster.find(p => p.position === pos && p.isOnCourt);
                const bench = team.roster.filter(p => p.position === pos && !p.isOnCourt);
                return (
                  <div key={pos} className="mb-3 p-2 bg-slate-900 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 w-8">{pos}</span>
                    <div className="text-sm font-bold text-white flex-1">{starter?.name || 'Empty'}</div>
                    {bench.length > 0 && (
                      <select 
                        className="bg-slate-800 text-xs p-1 rounded border border-slate-700 text-white"
                        onChange={(e) => onSubstitute(team.id, starter?.id || '', e.target.value)}
                      >
                        <option value="">Sub...</option>
                        {bench.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
