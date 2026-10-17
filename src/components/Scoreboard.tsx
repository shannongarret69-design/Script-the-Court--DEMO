import React from 'react';
import { Team, ScriptedPlay } from '../types/game';
import { Clapperboard, ChevronRight } from 'lucide-react';

interface ScoreboardProps {
  awayTeam: Team;
  homeTeam: Team;
  awayScore: number;
  homeScore: number;
  quarter: number;
  clockRemaining: string;
  shotClock: number;
  possessionTeamId: string;
  currentPlay?: ScriptedPlay;
  awayFouls: number;
  homeFouls: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  quarter,
  clockRemaining,
  shotClock,
  possessionTeamId,
  currentPlay,
  awayFouls,
  homeFouls,
}) => {
  const isAwayOffense = possessionTeamId === awayTeam.id;
  const isHomeOffense = possessionTeamId === homeTeam.id;

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 shadow-2xl relative z-20">
      {/* Top Thin Director Progress Strip */}
      <div className="flex items-center justify-between px-6 py-1 bg-slate-900 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
          <span className="uppercase tracking-wider font-display">Script the Court</span>
          <span className="text-slate-600">·</span>
          <span>
            {quarter > 4 ? (
              <strong className="text-amber-400">OVERTIME PERIOD</strong>
            ) : (
              <>
                Quarter <strong className="text-white">{quarter}</strong> of <strong className="text-white">4</strong>
              </>
            )}
          </span>
          {/* Quarter Indicators */}
          <div className="flex items-center gap-1 ml-2">
            {[1, 2, 3, 4].map((q) => (
              <span
                key={q}
                className={`px-1.5 py-0.2 rounded text-[9px] font-black font-mono ${
                  quarter === q
                    ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                    : quarter > q
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-900 text-slate-600 border border-slate-800'
                }`}
              >
                Q{q}
              </span>
            ))}
            {quarter > 4 && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black font-mono bg-rose-500 text-white animate-pulse">
                OT
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            Arena: <strong className="text-slate-200">{homeTeam.arenaName}</strong>
          </span>
        </div>
      </div>

      {/* Main Broadcast Scorebug Bar */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Away Team Block */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
              isAwayOffense
                ? 'bg-slate-800/90 ring-2 ring-amber-400/80 shadow-md shadow-amber-500/10'
                : 'bg-slate-900/60'
            }`}
          >
            {/* Color Bar & Possession Dot */}
            <div
              className="w-2.5 h-9 rounded-full"
              style={{ backgroundColor: awayTeam.primaryColor }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider uppercase font-display text-white">
                  {awayTeam.tricode}
                </span>
                {isAwayOffense && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 animate-pulse">
                    BALL
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{awayTeam.city}</span>
                <span>·</span>
                <span className="font-mono">Fouls: {awayFouls}</span>
                {awayFouls >= 5 && <span className="text-amber-400 font-bold">BONUS</span>}
              </div>
            </div>
          </div>

          <div className="text-4xl md:text-5xl font-black font-athletic tracking-tight text-white font-mono-numbers px-2 min-w-[60px] text-center">
            {awayScore}
          </div>
        </div>

        {/* Center Game Clock & Quarter */}
        <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="text-amber-400 uppercase text-xs tracking-wider">
              {quarter > 4 ? `OT ${quarter - 4}` : `Q${quarter}`}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xl text-white font-mono-numbers tracking-widest">
              {clockRemaining}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
            <span>Shot Clock</span>
            <span
              className={`font-mono text-xs font-black ${
                shotClock <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-300'
              }`}
            >
              :{shotClock.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Home Team Block */}
        <div className="flex items-center gap-4">
          <div className="text-4xl md:text-5xl font-black font-athletic tracking-tight text-white font-mono-numbers px-2 min-w-[60px] text-center">
            {homeScore}
          </div>

          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
              isHomeOffense
                ? 'bg-slate-800/90 ring-2 ring-amber-400/80 shadow-md shadow-amber-500/10'
                : 'bg-slate-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-end gap-2">
                {isHomeOffense && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 animate-pulse">
                    BALL
                  </span>
                )}
                <span className="text-lg font-black tracking-wider uppercase font-display text-white">
                  {homeTeam.tricode}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-2">
                {homeFouls >= 5 && <span className="text-amber-400 font-bold">BONUS</span>}
                <span className="font-mono">Fouls: {homeFouls}</span>
                <span>·</span>
                <span>{homeTeam.city}</span>
              </div>
            </div>
            {/* Color Bar */}
            <div
              className="w-2.5 h-9 rounded-full"
              style={{ backgroundColor: homeTeam.primaryColor }}
            />
          </div>
        </div>
      </div>

      {/* Scripting Ticker / Director Cue Banner */}
      {currentPlay ? (
        <div className="bg-slate-900/95 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              Active Script
            </span>
            <span className="font-semibold text-white truncate">
              {currentPlay.shotDescription}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-400 truncate hidden sm:inline">
              {currentPlay.commentary}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-4 font-mono text-[11px]">
            <span className="text-slate-400">Award:</span>
            <span className="text-amber-400 font-bold">
              {currentPlay.outcome === 'MADE' || currentPlay.outcome === 'FOUL_AND_ONE'
                ? `+${currentPlay.pointsEarned} PTS`
                : currentPlay.outcome}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/95 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
              Awaiting Script
            </span>
            <span className="text-slate-300">
              No play scripted yet. Choose an Instant Cue below or open Custom Scriptwriter to direct this play.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80">Director Standby</span>
        </div>
      )}
    </div>
  );
};
