import React, { useState } from 'react';
import { NBA_TEAMS } from '../data/nbaData';
import { Team, TipOffScript, GameSettings } from '../types/game';
import { Trophy, ArrowLeftRight, Check, Sparkles, Play, Shield, Flame } from 'lucide-react';
import { soundEngine } from '../utils/audio';

import { TeamWheelPicker } from './TeamWheelPicker';

interface ExhibitionSetupProps {
  onStartGame: (settings: GameSettings) => void;
}

export const ExhibitionSetup: React.FC<ExhibitionSetupProps> = ({ onStartGame }) => {
  const [awayTeamId, setAwayTeamId] = useState<string>('gsw'); // Warriors
  const [homeTeamId, setHomeTeamId] = useState<string>('lal'); // Lakers
  const [quarterMinutes, setQuarterMinutes] = useState<number>(3);
  const [tipOffWinner, setTipOffWinner] = useState<'away' | 'home'>('home');
  const [customTipReceiver, setCustomTipReceiver] = useState<string>('');

  const awayTeam = NBA_TEAMS.find((t) => t.id === awayTeamId) || NBA_TEAMS[0];
  const homeTeam = NBA_TEAMS.find((t) => t.id === homeTeamId) || NBA_TEAMS[1];

  const awayCenter = awayTeam.roster.find((p) => p.position === 'C') || awayTeam.roster[0];
  const homeCenter = homeTeam.roster.find((p) => p.position === 'C') || homeTeam.roster[0];

  const handleSwap = () => {
    soundEngine.playSqueak();
    const temp = awayTeamId;
    setAwayTeamId(homeTeamId);
    setHomeTeamId(temp);
  };

  const handleRandomize = () => {
    soundEngine.playBounce();
    const shuffled = [...NBA_TEAMS].sort(() => 0.5 - Math.random());
    setAwayTeamId(shuffled[0].id);
    setHomeTeamId(shuffled[1].id);
  };

  const handleStart = () => {
    soundEngine.playWhistle();
    soundEngine.playClapper();

    const winningTeam = tipOffWinner === 'home' ? homeTeam : awayTeam;
    const losingTeam = tipOffWinner === 'home' ? awayTeam : homeTeam;
    const winningCenter = tipOffWinner === 'home' ? homeCenter : awayCenter;
    const losingCenter = tipOffWinner === 'home' ? awayCenter : homeCenter;
    
    // Determine receiving guard
    const availableGuards = winningTeam.roster.filter((p) => p.position === 'PG' || p.position === 'SG');
    const selectedGuard = availableGuards.find((p) => p.id === customTipReceiver) || availableGuards[0] || winningTeam.roster[0];

    const tipScript: TipOffScript = {
      winnerTeamId: winningTeam.id,
      jumperPlayerId: winningCenter.id,
      receiverPlayerId: selectedGuard.id,
      narration: `The referee tosses the leather skyward! ${winningCenter.name} out-leaps ${losingCenter.name} at center court and taps it cleanly to ${selectedGuard.name}! Possession scripted for the ${winningTeam.name}!`,
    };

    onStartGame({
      quarterLengthMinutes: quarterMinutes,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      tipOff: tipScript,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Header: Clean Script The Court title without any text over it */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase font-display tracking-tight text-white flex items-center justify-center gap-3">
          <span>Script The Court</span>
          <span className="text-xs md:text-sm font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2.5 py-0.5 rounded align-middle">
            DEMO
          </span>
        </h1>
      </div>

      {/* Team Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-center mb-8">
        {/* Away Team Selector */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl backdrop-blur-sm">
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: awayTeam.primaryColor }}
          />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Visiting Team (Away)
            </span>
            <span
              className="text-xs font-extrabold px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: `${awayTeam.primaryColor}30`, color: awayTeam.secondaryColor }}
            >
              {awayTeam.conference}
            </span>
          </div>

          {/* Team Scroll Wheel */}
          <div className="mb-4">
            <TeamWheelPicker
              teams={NBA_TEAMS}
              selectedTeamId={awayTeamId}
              onSelectTeam={(id) => {
                if (id === homeTeamId) {
                  setHomeTeamId(awayTeamId);
                }
                setAwayTeamId(id);
              }}
              label="Scroll Wheel Team Select"
            />
          </div>

          {/* Star Player Feature */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Franchise Anchor</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{awayTeam.roster[0].name}</span>
                <span className="text-xs text-amber-400 font-mono">#{awayTeam.roster[0].number}</span>
              </div>
              <div className="text-xs text-slate-400">{awayTeam.roster[0].archetype}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-athletic text-amber-400">
                {awayTeam.roster[0].rating}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">OVR</div>
            </div>
          </div>

          {/* Starting 5 preview */}
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
              <span>Starters</span>
              <span className="text-slate-500">{awayTeam.arenaName}</span>
            </div>
            <div className="space-y-1.5">
              {awayTeam.roster.slice(0, 5).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 w-5">#{player.number}</span>
                    <span className="font-semibold text-slate-200">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[10px] uppercase">{player.position}</span>
                    <span className="font-bold text-amber-400 font-mono">{player.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VS Center Pillar & Swap */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-display text-base font-black text-amber-400 shadow-lg">
            VS
          </div>
          <button
            onClick={handleSwap}
            title="Swap Home and Away"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRandomize}
            className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
          >
            Random
          </button>
        </div>

        {/* Home Team Selector */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl backdrop-blur-sm">
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: homeTeam.primaryColor }}
          />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Host Team (Home Arena)
            </span>
            <span
              className="text-xs font-extrabold px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: `${homeTeam.primaryColor}30`, color: homeTeam.secondaryColor }}
            >
              {homeTeam.conference}
            </span>
          </div>

          {/* Team Scroll Wheel */}
          <div className="mb-4">
            <TeamWheelPicker
              teams={NBA_TEAMS}
              selectedTeamId={homeTeamId}
              onSelectTeam={(id) => {
                if (id === awayTeamId) {
                  setAwayTeamId(homeTeamId);
                }
                setHomeTeamId(id);
              }}
              label="Scroll Wheel Team Select"
            />
          </div>

          {/* Star Player Feature */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Franchise Anchor</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{homeTeam.roster[0].name}</span>
                <span className="text-xs text-amber-400 font-mono">#{homeTeam.roster[0].number}</span>
              </div>
              <div className="text-xs text-slate-400">{homeTeam.roster[0].archetype}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-athletic text-amber-400">
                {homeTeam.roster[0].rating}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">OVR</div>
            </div>
          </div>

          {/* Starting 5 preview */}
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
              <span>Starters</span>
              <span className="text-slate-500">{homeTeam.arenaName}</span>
            </div>
            <div className="space-y-1.5">
              {homeTeam.roster.slice(0, 5).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 w-5">#{player.number}</span>
                    <span className="font-semibold text-slate-200">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[10px] uppercase">{player.position}</span>
                    <span className="font-bold text-amber-400 font-mono">{player.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scripting Rules & Settings Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          Game Production & Tip-Off Scripting
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quarter Length Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quarter Duration (4 Quarters Total Match)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mins: 12, label: '12 Min', desc: 'NBA Reg' },
                { mins: 5, label: '5 Min', desc: 'Standard' },
                { mins: 3, label: '3 Min', desc: 'Fast' },
                { mins: 1, label: '1 Min', desc: 'Lightning' },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => {
                    setQuarterMinutes(opt.mins);
                    soundEngine.playSqueak();
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    quarterMinutes === opt.mins
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-400/50'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-200">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Script Tip-Off Winner */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Script Opening Tip-Off Outcome
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setTipOffWinner('away');
                  soundEngine.playWhistle();
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  tipOffWinner === 'away'
                    ? 'bg-amber-500/10 border-amber-500/60 text-white'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{awayTeam.name} Win Tip</div>
                  <div className="text-[11px] text-slate-400">
                    {awayCenter.name} out-leaps {homeCenter.name}
                  </div>
                </div>
                {tipOffWinner === 'away' && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipOffWinner('home');
                  soundEngine.playWhistle();
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  tipOffWinner === 'home'
                    ? 'bg-amber-500/10 border-amber-500/60 text-white'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{homeTeam.name} Win Tip</div>
                  <div className="text-[11px] text-slate-400">
                    {homeCenter.name} out-leaps {awayCenter.name}
                  </div>
                </div>
                {tipOffWinner === 'home' && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                First possession will be scripted for the{' '}
                <strong className="text-amber-400 font-bold">
                  {tipOffWinner === 'home' ? homeTeam.name : awayTeam.name}
                </strong>
                .
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="text-center">
        <button
          onClick={handleStart}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider text-base rounded-xl shadow-lg shadow-amber-500/20 transform active:scale-98 transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Action! Script Exhibition Game</span>
        </button>
      </div>
    </div>
  );
};
