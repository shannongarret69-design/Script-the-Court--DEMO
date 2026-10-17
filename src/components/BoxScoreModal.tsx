import React, { useState } from 'react';
import { Team } from '../types/game';
import { X, Trophy, Activity } from 'lucide-react';

interface BoxScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: Team;
  awayTeam: Team;
  awayScore: number;
  homeScore: number;
}

export const BoxScoreModal: React.FC<BoxScoreModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  awayScore,
  homeScore,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'AWAY' | 'HOME'>('AWAY');
  const team = activeTab === 'AWAY' ? awayTeam : homeTeam;

  // Calculate team totals
  const totals = team.roster.reduce(
    (acc, p) => ({
      points: acc.points + p.stats.points,
      fgm: acc.fgm + p.stats.fgm,
      fga: acc.fga + p.stats.fga,
      threePm: acc.threePm + p.stats.threePm,
      threePa: acc.threePa + p.stats.threePa,
      ftm: acc.ftm + p.stats.ftm,
      fta: acc.fta + p.stats.fta,
      rebounds: acc.rebounds + p.stats.rebounds,
      assists: acc.assists + p.stats.assists,
      steals: acc.steals + p.stats.steals,
      blocks: acc.blocks + p.stats.blocks,
      turnovers: acc.turnovers + p.stats.turnovers,
      fouls: acc.fouls + p.stats.fouls,
    }),
    {
      points: 0,
      fgm: 0,
      fga: 0,
      threePm: 0,
      threePa: 0,
      ftm: 0,
      fta: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
    }
  );

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-black uppercase font-display text-white tracking-wide">
                Official NBA Exhibition Box Score
              </h2>
              <div className="text-xs text-slate-400">
                {awayTeam.name} <strong className="text-white font-mono">{awayScore}</strong> @{' '}
                {homeTeam.name} <strong className="text-white font-mono">{homeScore}</strong>
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

        {/* Team Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('AWAY')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-lg transition-all ${
              activeTab === 'AWAY'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {awayTeam.name} ({awayScore})
          </button>
          <button
            onClick={() => setActiveTab('HOME')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-lg transition-all ${
              activeTab === 'HOME'
                ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {homeTeam.name} ({homeScore})
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2 text-center">Pos</th>
                <th className="py-2.5 px-2 text-center">PTS</th>
                <th className="py-2.5 px-2 text-center">FG</th>
                <th className="py-2.5 px-2 text-center">3PT</th>
                <th className="py-2.5 px-2 text-center">FT</th>
                <th className="py-2.5 px-2 text-center">REB</th>
                <th className="py-2.5 px-2 text-center">AST</th>
                <th className="py-2.5 px-2 text-center">STL</th>
                <th className="py-2.5 px-2 text-center">BLK</th>
                <th className="py-2.5 px-2 text-center">TO</th>
                <th className="py-2.5 px-2 text-center">PF</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
              {team.roster.map((player) => (
                <tr
                  key={player.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    player.injury?.status === 'OUT_GAME' ? 'opacity-50 bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-mono">#{player.number}</span>
                      <span className="font-bold text-white">{player.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{player.position}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-400">
                    {player.stats.points}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">
                    {player.stats.fgm}-{player.stats.fga}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">
                    {player.stats.threePm}-{player.stats.threePa}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">
                    {player.stats.ftm}-{player.stats.fta}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.rebounds}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.assists}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.steals}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.blocks}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.turnovers}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{player.stats.fouls}</td>
                  <td className="py-2.5 px-3 text-right">
                    {player.injury?.status === 'OUT_GAME' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
                        <Activity className="w-3 h-3" />
                        Injured
                      </span>
                    ) : player.isOnCourt ? (
                      <span className="text-[10px] font-bold text-emerald-400">On Court</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Bench</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-bold bg-slate-950/40 text-slate-200">
                <td className="py-3 px-3 uppercase">Total Team Stats</td>
                <td className="py-3 px-2 text-center">-</td>
                <td className="py-3 px-2 text-center text-amber-400">{totals.points}</td>
                <td className="py-3 px-2 text-center">
                  {totals.fgm}-{totals.fga}
                </td>
                <td className="py-3 px-2 text-center">
                  {totals.threePm}-{totals.threePa}
                </td>
                <td className="py-3 px-2 text-center">
                  {totals.ftm}-{totals.fta}
                </td>
                <td className="py-3 px-2 text-center">{totals.rebounds}</td>
                <td className="py-3 px-2 text-center">{totals.assists}</td>
                <td className="py-3 px-2 text-center">{totals.steals}</td>
                <td className="py-3 px-2 text-center">{totals.blocks}</td>
                <td className="py-3 px-2 text-center">{totals.turnovers}</td>
                <td className="py-3 px-2 text-center">{totals.fouls}</td>
                <td className="py-3 px-3 text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
