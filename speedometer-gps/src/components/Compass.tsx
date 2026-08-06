/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Compass as CompassIcon, Navigation, Globe, MapPin } from 'lucide-react';
import { GPSCoords } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

interface CompassProps {
  coords: GPSCoords;
  locale: Locale;
}

export const Compass: React.FC<CompassProps> = ({ coords, locale }) => {
  const t = TRANSLATIONS[locale];
  // Fallback heading if GPS is unavailable or static is 0 degrees (N)
  const heading = coords.heading !== null && !isNaN(coords.heading) ? coords.heading : 0;

  // Convert heading in degrees to human-readable Vietnamese initials
  const getCardinalDirection = (deg: number): string => {
    const d = (deg % 360 + 360) % 360; // normalize
    if (locale === 'en') {
      if (d >= 337.5 || d < 22.5) return t.cardinalN;
      if (d >= 22.5 && d < 67.5) return t.cardinalNE;
      if (d >= 67.5 && d < 112.5) return t.cardinalE;
      if (d >= 112.5 && d < 157.5) return t.cardinalSE;
      if (d >= 157.5 && d < 202.5) return t.cardinalS;
      if (d >= 202.5 && d < 247.5) return t.cardinalSW;
      if (d >= 247.5 && d < 292.5) return t.cardinalW;
      if (d >= 292.5 && d < 337.5) return t.cardinalNW;
      return t.cardinalN;
    } else {
      if (d >= 337.5 || d < 22.5) return t.cardinalN;
      if (d >= 22.5 && d < 67.5) return t.cardinalNE;
      if (d >= 67.5 && d < 112.5) return t.cardinalE;
      if (d >= 112.5 && d < 157.5) return t.cardinalSE;
      if (d >= 157.5 && d < 202.5) return t.cardinalS;
      if (d >= 202.5 && d < 247.5) return t.cardinalSW;
      if (d >= 247.5 && d < 292.5) return t.cardinalW;
      if (d >= 292.5 && d < 337.5) return t.cardinalNW;
      return t.cardinalN;
    }
  };

  const cardinal = getCardinalDirection(heading);

  return (
    <div className="flex flex-col p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl overflow-hidden font-mono text-xs">
      {/* Container header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 mb-5 pb-2 border-b border-white/5 uppercase">
        <span className="flex items-center gap-1.5">
          <CompassIcon size={12} className="text-white" /> {t.compassHeader}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Visual Rotating Compass */}
        <div className="flex flex-col items-center justify-center p-2">
          <div className="relative w-36 h-36 rounded-full border border-white/5 bg-neutral-950 flex items-center justify-center shadow-inner group">
            {/* Compass ticks design */}
            <div className="absolute inset-0.5 rounded-full border border-dashed border-white/5 pointer-events-none" />

            {/* Rotating ring with cardinal marks */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ rotate: -heading }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            >
              {/* North Accent */}
              <div className="absolute top-2.5 text-[10px] font-sans font-black text-red-500 select-none">
                {locale === 'vi' ? 'B' : 'N'}
              </div>
              {/* South */}
              <div className="absolute bottom-2.5 text-[10px] font-sans font-black text-neutral-400 select-none">
                {locale === 'vi' ? 'N' : 'S'}
              </div>
              {/* East */}
              <div className="absolute right-2.5 text-[10px] font-sans font-black text-neutral-400 select-none">
                {locale === 'vi' ? 'Đ' : 'E'}
              </div>
              {/* West */}
              <div className="absolute left-2.5 text-[10px] font-sans font-black text-neutral-400 select-none">
                {locale === 'vi' ? 'T' : 'W'}
              </div>

              {/* Angle sub-ticks inside svg */}
              <svg className="absolute w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="0.5" strokeDasharray="1, 3" />
                <line x1="50" y1="10" x2="50" y2="14" stroke="#3f3f46" strokeWidth="1" />
                <line x1="90" y1="50" x2="86" y2="50" stroke="#3f3f46" strokeWidth="1" />
                <line x1="50" y1="90" x2="50" y2="86" stroke="#3f3f46" strokeWidth="1" />
                <line x1="10" y1="50" x2="14" y2="50" stroke="#3f3f46" strokeWidth="1" />
              </svg>
            </motion.div>

            {/* Stationary Center Compass Needle */}
            <div className="absolute flex items-center justify-center pointer-events-none">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <Navigation size={20} className="text-white fill-white/10 transform -translate-y-[2px]" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-white ring-2 ring-white/20" />
              </div>
            </div>

            {/* Degree display inside center */}
            <div className="absolute bottom-6 bg-black border border-white/5 rounded px-2 py-0.5 text-[9px] font-mono font-bold text-white">
              {Math.round(heading)}°
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-white font-bold font-sans">
            {cardinal}
          </p>
        </div>

        {/* GPS Information list */}
        <div className="space-y-3 font-mono text-neutral-400">
          <div className="border-l border-white/10 pl-4 py-1 flex items-center justify-between">
            <span className="text-white/40 uppercase tracking-widest text-[10px]">{t.latitude}</span>
            <span className="text-white font-black hover:text-white/80 select-all transition-all">
              {coords.latitude !== null ? coords.latitude.toFixed(6) : t.noData}
            </span>
          </div>

          <div className="border-l border-white/10 pl-4 py-1 flex items-center justify-between">
            <span className="text-white/40 uppercase tracking-widest text-[10px]">{t.longitude}</span>
            <span className="text-white font-black hover:text-white/80 select-all transition-all">
              {coords.longitude !== null ? coords.longitude.toFixed(6) : t.noData}
            </span>
          </div>

          <div className="border-l border-white/10 pl-4 py-1 flex items-center justify-between">
            <span className="text-white/40 uppercase tracking-widest text-[10px]">{t.altitude}</span>
            <span className="text-white font-black">
              {coords.altitude !== null ? `${Math.round(coords.altitude)} m` : '---'}
            </span>
          </div>

          <div className="border-l border-white/10 pl-4 py-1 flex items-center justify-between">
            <span className="text-white/40 uppercase tracking-widest text-[10px]">{t.gpsErrorAcc}</span>
            <span className="text-white font-black">
              {coords.accuracy !== null ? `± ${Math.round(coords.accuracy)} m` : '---'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
