import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Team } from '../types/game';
import { ChevronUp, ChevronDown, Disc } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface TeamWheelPickerProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  label: string;
}

export const TeamWheelPicker: React.FC<TeamWheelPickerProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  label,
}) => {
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const accumulatedWheelRef = useRef<number>(0);

  const currentIndex = teams.findIndex((t) => t.id === selectedTeamId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleStep = useCallback((direction: 1 | -1) => {
    soundEngine.playSqueak();
    const nextIdx = (safeIndex + direction + teams.length) % teams.length;
    onSelectTeam(teams[nextIdx].id);
  }, [safeIndex, teams, onSelectTeam]);

  // Dedicated non-passive wheel listener so user's physical mouse scroll wheel spins the team picker!
  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent browser viewport from scrolling while user is interacting with the wheel
      e.preventDefault();
      accumulatedWheelRef.current += e.deltaY;

      // Threshold for each wheel notch
      const threshold = 35;
      if (accumulatedWheelRef.current >= threshold) {
        handleStep(1);
        accumulatedWheelRef.current = 0;
      } else if (accumulatedWheelRef.current <= -threshold) {
        handleStep(-1);
        accumulatedWheelRef.current = 0;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleStep]);

  // Drag handlers for mouse & touch
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const diff = dragStartYRef.current - e.clientY;
    if (diff > 35) {
      handleStep(1);
      dragStartYRef.current = e.clientY;
    } else if (diff < -35) {
      handleStep(-1);
      dragStartYRef.current = e.clientY;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = dragStartYRef.current - e.touches[0].clientY;
    if (diff > 35) {
      handleStep(1);
      dragStartYRef.current = e.touches[0].clientY;
    } else if (diff < -35) {
      handleStep(-1);
      dragStartYRef.current = e.touches[0].clientY;
    }
  };

  // Generate 5 visible slots: -2, -1, 0 (selected), +1, +2
  const visibleSlots = [-2, -1, 0, 1, 2].map((offset) => {
    const index = (safeIndex + offset + teams.length) % teams.length;
    return {
      offset,
      team: teams[index],
      index,
    };
  });

  const selectedTeam = teams[safeIndex];

  return (
    <div className="w-full space-y-2 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
        <span>{label}</span>
        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
          <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Scroll Wheel</span>
        </div>
      </div>

      {/* 3D Cylindrical Wheel Shell */}
      <div className="relative bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner overflow-hidden p-2">
        {/* Up Wheel Button */}
        <button
          type="button"
          onClick={() => handleStep(-1)}
          title="Scroll Up"
          className="w-full py-1.5 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-900/60 rounded-lg transition-colors cursor-pointer group"
        >
          <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        {/* 3D Wheel Drum Viewport */}
        <div
          ref={wheelContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="relative h-[220px] flex flex-col items-center justify-center cursor-ns-resize overflow-hidden"
          style={{ perspective: '800px' }}
        >
          {/* Center Target Selection Bracket */}
          <div className="absolute inset-x-2 h-14 top-1/2 -translate-y-1/2 rounded-xl border-2 border-amber-400/80 bg-amber-400/5 shadow-lg shadow-amber-500/10 pointer-events-none z-20 flex items-center justify-between px-3">
            <div className="w-1.5 h-6 rounded-full bg-amber-400 animate-pulse" />
            <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400/60">
              {safeIndex + 1} / {teams.length}
            </div>
            <div className="w-1.5 h-6 rounded-full bg-amber-400 animate-pulse" />
          </div>

          {/* Wheel Slots with 3D Rotation */}
          <div className="w-full h-full relative flex items-center justify-center">
            {visibleSlots.map(({ offset, team }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);

              // 3D Cylinder geometry transforms
              const translateY = offset * 42;
              const rotateX = -offset * 24;
              const scale = isCenter ? 1 : absOffset === 1 ? 0.92 : 0.82;
              const opacity = isCenter ? 1 : absOffset === 1 ? 0.65 : 0.28;
              const zIndex = isCenter ? 15 : 10 - absOffset;

              const starPlayer = team.roster[0];

              return (
                <div
                  key={`${team.id}-${offset}`}
                  onClick={() => {
                    if (!isCenter) {
                      soundEngine.playBounce();
                      onSelectTeam(team.id);
                    }
                  }}
                  className={`absolute inset-x-3 h-12 rounded-xl flex items-center justify-between px-3 transition-all duration-150 cursor-pointer ${
                    isCenter
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    transform: `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`,
                    transformOrigin: 'center center',
                    opacity,
                    zIndex,
                  }}
                >
                  {/* Team Color Accent Bar */}
                  <div
                    className="w-2 h-7 rounded-full shrink-0 mr-2.5"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  {/* Team Identification */}
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-sm tracking-wider text-white">
                        {team.tricode}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {team.shortName}
                      </span>
                    </div>
                    {isCenter && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {starPlayer.name} ({starPlayer.archetype})
                      </div>
                    )}
                  </div>

                  {/* Rating / Conference */}
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-mono font-black text-xs text-amber-400">
                      {starPlayer.rating} <span className="text-[9px] text-slate-400">OVR</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase">
                      {team.conference}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Down Wheel Button */}
        <button
          type="button"
          onClick={() => handleStep(1)}
          title="Scroll Down"
          className="w-full py-1.5 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-900/60 rounded-lg transition-colors cursor-pointer group"
        >
          <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Wheel Control Legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
        <span>Use mouse wheel or drag to spin</span>
        <span className="text-amber-400/80 font-bold">{selectedTeam.name}</span>
      </div>
    </div>
  );
};
