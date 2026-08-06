/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Gauge, Clock, Eye, AlertTriangle, Milestone, RefreshCw, Zap } from 'lucide-react';
import { TripStats } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

interface StatsCardProps {
  stats: TripStats;
  onReset: () => void;
  locale: Locale;
}

export const StatsCard: React.FC<StatsCardProps> = ({ stats, onReset, locale }) => {
  const t = TRANSLATIONS[locale];
  // Formats duration in seconds to hh:mm:ss or mm:ss
  const formatDuration = (secs: number): string => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="flex flex-col p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase mb-5 pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <Zap size={12} className="text-white" /> {t.tripStatsHeader}
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all text-[10px] font-bold tracking-wider active:scale-95 select-none cursor-pointer"
        >
          <RefreshCw size={10} /> {t.resetBtn}
        </button>
      </div>

      {/* Stats Bento Grid with Bold Typography structure */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {/* Max Speed */}
        <div className="border-l border-white/10 pl-4 py-1">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{t.maxSpeed}</div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono flex items-baseline gap-1">
            {Math.round(stats.maxSpeed)} <span className="text-[10px] opacity-40 uppercase font-sans font-semibold">KM/H</span>
          </div>
        </div>

        {/* Avg Speed */}
        <div className="border-l border-white/10 pl-4 py-1">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{t.avgSpeed}</div>
          <div className="text-2xl md:text-3xl font-black text-neutral-200 font-mono flex items-baseline gap-1">
            {Math.round(stats.avgSpeed)} <span className="text-[10px] opacity-40 uppercase font-sans font-semibold">KM/H</span>
          </div>
        </div>

        {/* Distance */}
        <div className="border-l border-white/10 pl-4 py-1">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{t.distance}</div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono flex items-baseline gap-1">
            {stats.distance.toFixed(2)} <span className="text-[10px] opacity-40 uppercase font-sans font-semibold">KM</span>
          </div>
        </div>

        {/* Duration */}
        <div className="border-l border-white/10 pl-4 py-1">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5">{t.duration}</div>
          <div className="text-2xl md:text-3xl font-black text-neutral-200 font-mono flex items-baseline gap-1">
            {formatDuration(stats.duration)} <span className="text-[10px] opacity-40 uppercase font-sans font-semibold">M:S</span>
          </div>
        </div>

        {/* Violations Over-speed */}
        <div className={`pl-4 py-1 border-l col-span-2 md:col-span-1 transition-colors duration-300 ${
          stats.violationsCount > 0 
            ? 'border-red-500 bg-red-950/10' 
            : 'border-white/10'
        }`}>
          <div className={`text-[10px] uppercase tracking-widest mb-1.5 ${stats.violationsCount > 0 ? 'text-red-400 font-bold' : 'text-white/40'}`}>{t.violationAlerts}</div>
          <div className="text-2xl md:text-3xl font-black font-mono flex items-baseline gap-1">
            <span className={stats.violationsCount > 0 ? 'text-red-500' : 'text-white'}>{stats.violationsCount}</span>
            <span className="text-[10px] opacity-40 uppercase font-sans font-semibold">{t.times}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
