import React, { useState } from 'react';
import { ScriptedPlay, Team } from '../types/game';
import { ScrollText, Flame, ShieldAlert, Activity, CheckCircle2, ChevronDown } from 'lucide-react';

interface PlayByPlayFeedProps {
  plays: ScriptedPlay[];
  homeTeam: Team;
  awayTeam: Team;
}

export const PlayByPlayFeed: React.FC<PlayByPlayFeedProps> = ({ plays, homeTeam, awayTeam }) => {
  const [filter, setFilter] = useState<'ALL' | 'DRAMA' | 'SCORING'>('ALL');

  const filteredPlays = plays.filter((play) => {
    if (filter === 'DRAMA') {
      return (
        !!play.injuryDetails ||
        !!play.penaltyDetails ||
        !!play.refereeReview ||
        play.category === 'BUZZER_BEATER'
      );
    }
    if (filter === 'SCORING') {
      return play.pointsEarned > 0;
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-black uppercase font-display text-white tracking-wider">
            Director's Play-by-Play Screenplay
          </h3>
          <span className="text-xs text-slate-500 font-mono">({plays.length} plays)</span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
          {(['ALL', 'SCORING', 'DRAMA'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'SCORING' ? 'Scoring' : 'Drama Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Plays Scroll Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5">
        {filteredPlays.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ScrollText className="w-8 h-8 mb-2 opacity-40 text-amber-400" />
            <div className="text-xs font-semibold">The screenplay has not started yet.</div>
            <div className="text-[11px] text-slate-600 mt-1">
              Plays scripted on the court will record here in chronological broadcast order.
            </div>
          </div>
        ) : (
          filteredPlays.map((play) => {
            const isAway = play.offenseTeamId === awayTeam.id;
            const offenseTeam = isAway ? awayTeam : homeTeam;

            return (
              <div
                key={play.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all text-xs space-y-1.5"
              >
                {/* Meta Bar */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: offenseTeam.primaryColor }}
                    />
                    <span className="font-extrabold uppercase font-mono text-white">
                      {offenseTeam.tricode}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 font-mono">
                      Q{play.quarter} {play.clockRemaining}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {play.pointsEarned > 0 ? (
                      <span className="font-black text-amber-400 font-mono">
                        +{play.pointsEarned} PTS
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">{play.outcome}</span>
                    )}
                  </div>
                </div>

                {/* Narration */}
                <p className="text-slate-200 text-xs leading-relaxed font-medium">
                  {play.commentary}
                </p>

                {/* Drama Special Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {play.penaltyDetails && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                      <ShieldAlert className="w-3 h-3" />
                      {play.penaltyDetails.penaltyType.replace(/_/g, ' ')}
                    </span>
                  )}

                  {play.injuryDetails && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                      <Activity className="w-3 h-3" />
                      INJURY: {play.injuryDetails.injuryName}
                    </span>
                  )}

                  {play.refereeReview && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                      📺 {play.refereeReview.finalDecision.replace(/_/g, ' ')}
                    </span>
                  )}

                  {play.category === 'BUZZER_BEATER' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      🚨 BUZZER BEATER
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
