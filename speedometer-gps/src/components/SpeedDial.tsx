/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { VehicleType } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

interface SpeedDialProps {
  speed: number;
  limit: number;
  vehicleType: VehicleType;
  isOverLimit: boolean;
  isNearingLimit: boolean; // within 5 km/h
  locale: Locale;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({
  speed,
  limit,
  vehicleType,
  isOverLimit,
  isNearingLimit,
  locale
}) => {
  const t = TRANSLATIONS[locale];
  // Ensure we don't divide by zero and cap speed at 180 km/h for gauge UI mapping
  const maxGaugeSpeed = vehicleType === 'car' ? 180 : 120;
  const percentage = Math.min(Math.max((speed / maxGaugeSpeed) * 100, 0), 100);

  // SVG configurations for the circular gauge arc
  const radius = 120;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~753.98
  
  // We use a 270-degree arc (three quarters of a circle)
  // Total gap is 90 degrees out of 360 (which is 1/4 of circle).
  // Thus we draw an arc that is 75% of full circle.
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  // Let's create tick marks around the dial (0 to 180 for cars, 0 to 120 for motorbikes)
  const ticksCount = 10;
  const ticks = Array.from({ length: ticksCount + 1 }).map((_, index) => {
    const value = Math.round((maxGaugeSpeed / ticksCount) * index);
    // Gauge starts at 135 degrees (bottom-left) and ends at 45 degrees (bottom-right)
    const angle = 135 + (270 / ticksCount) * index;
    return { value, angle };
  });

  // Calculate needle rotation angle (starts at 135deg for speed 0, spans 270deg max)
  const needleAngle = 135 + (speed / maxGaugeSpeed) * 270;

  // Get status color palette
  let colorClass = 'text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]';
  let strokeColor = 'url(#speedGradNormal)';
  let bgGlow = 'rgba(255, 255, 255, 0.02)';
  
  if (isOverLimit) {
    colorClass = 'text-red-500 animate-pulse drop-shadow-[0_0_55px_rgba(239,68,68,0.25)]';
    strokeColor = 'url(#speedGradDanger)';
    bgGlow = 'rgba(239, 68, 68, 0.12)';
  } else if (isNearingLimit) {
    colorClass = 'text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.15)]';
    strokeColor = 'url(#speedGradWarning)';
    bgGlow = 'rgba(245, 158, 11, 0.06)';
  }

  return (
    <div className="relative flex flex-col items-center justify-center p-6 md:p-8 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-2xl overflow-hidden group">
      
      {/* Immersive radial glow background */}
      <div 
        className="absolute inset-0 transition-colors duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${bgGlow} 0%, rgba(10, 10, 11, 0) 70%)`
        }}
      />

      {/* Clean human labels representing visual quality */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase">
        <span>{locale === 'vi' ? 'ĐỒNG HỒ ĐO VI TRÌNH' : 'TELEMETRY SPEED GAUGE'}</span>
        <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOverLimit ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
          <span>{isOverLimit ? (locale === 'vi' ? 'QUÁ TỐC ĐỘ' : 'OVER LIMIT') : (locale === 'vi' ? 'BÌNH THƯỜNG' : 'NORMAL')}</span>
        </div>
      </div>

      <div className="relative mt-4 w-[280px] h-[280px] flex items-center justify-center">
        {/* SVG Core Speed Dial Layer */}
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300" id="gauge-svg">
          <defs>
            {/* Smooth color gradients matching safety status */}
            <linearGradient id="speedGradNormal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
            <linearGradient id="speedGradWarning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="speedGradDanger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc Treads (unfilled track) */}
          <circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke="#1c1c1f"
            strokeWidth={strokeWidth - 2}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="origin-center rotate-[225deg]"
          />

          {/* Active speed level progress arc */}
          <motion.circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className="origin-center rotate-[225deg] transition-all duration-150 ease-out"
            filter={isOverLimit || isNearingLimit ? 'url(#glow)' : undefined}
          />

          {/* Draw Tick Lines & Tiny Numbers around the dial */}
          {ticks.map((tick, i) => {
            const radAngle = (tick.angle * Math.PI) / 180;
            // tick inner start point
            const cosAngle = Math.cos(radAngle);
            const sinAngle = Math.sin(radAngle);
            const startX = 150 + (radius - strokeWidth - 4) * cosAngle;
            const startY = 150 + (radius - strokeWidth - 4) * sinAngle;
            // tick outer end point
            const endX = 150 + (radius - strokeWidth + 6) * cosAngle;
            const endY = 150 + (radius - strokeWidth + 6) * sinAngle;

            // text offset
            const textX = 150 + (radius - strokeWidth - 20) * cosAngle;
            const textY = 150 + (radius - strokeWidth - 20) * sinAngle;

            const isCurrentRange = speed >= tick.value;

            return (
              <g key={`tick-${i}`} className="origin-center">
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={isOverLimit && speed >= tick.value ? '#ef4444' : isCurrentRange ? '#e5e7eb' : '#27272a'}
                  strokeWidth={isCurrentRange ? '2.5' : '1.5'}
                  opacity={isCurrentRange ? 1 : 0.4}
                />
                <text
                  x={textX}
                  y={textY}
                  fill={isCurrentRange ? '#ffffff' : '#4b5563'}
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="rotate-90 origin-center select-none"
                  style={{
                    transform: `rotate(90deg) translate(${textY - 150}px, ${150 - textX}px)`
                  }}
                >
                  {tick.value}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Digital Speed Display Overlay (Centered) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 text-center select-none z-10" id="digital-speed-frame">
          {/* Active vehicle indicator */}
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 font-semibold uppercase mb-0.5">
            {vehicleType === 'car' ? (locale === 'vi' ? '🚗 Ô TÔ COCKPIT' : '🚗 CAR COCKPIT') : (locale === 'vi' ? '🏍️ XE MÁY COCKPIT' : '🏍️ BIKE COCKPIT')}
          </span>

          {/* Big Speed Number */}
          <div className="flex items-baseline justify-center">
            <span className={`text-7xl md:text-8xl font-display font-black tracking-tight tabular-nums leading-none ${colorClass}`}>
              {Math.round(speed)}
            </span>
          </div>

          <span className="text-sm font-light tracking-[0.25em] text-neutral-400 uppercase mt-1">
            km/h
          </span>

          {/* Safe/Warn Message Badge */}
          <div className="mt-4 px-3 py-1 rounded-full bg-neutral-950 border border-white/5 text-[10px] font-mono uppercase flex items-center gap-1.5 backdrop-blur-sm min-w-[130px] justify-center transition-all duration-300">
            {isOverLimit ? (
              <span className="text-red-500 font-bold tracking-tight animate-bounce flex items-center gap-1">
                <ShieldAlert size={11} /> {locale === 'vi' ? 'QUÁ TỐC ĐỘ!' : 'OVERSPEED!'}
              </span>
            ) : isNearingLimit ? (
              <span className="text-amber-500 font-bold tracking-tight flex items-center gap-1 animate-pulse">
                {locale === 'vi' ? 'SẮP VƯỢT GIỚI HẠN' : 'NEARING LIMIT'}
              </span>
            ) : (
              <span className="text-emerald-400 font-medium tracking-tight flex items-center gap-1">
                <ShieldCheck size={11} /> {locale === 'vi' ? 'TỐC ĐỘ AN TOÀN' : 'SAFE VELOCITY'}
              </span>
            )}
          </div>
        </div>

        {/* Speed Limit Traffic Sign Overlay (Vietnamese Standard) */}
        <div className="absolute top-2 right-2 flex flex-col items-center z-15 shadow-xl group-hover:scale-105 transition-transform duration-300">
          <div className="relative w-12 h-12 rounded-full bg-white border-[4px] border-red-600 flex items-center justify-center shadow-black/80">
            {/* Standard Red Border Circle Sign */}
            <span className="text-neutral-950 font-sans font-black text-lg text-center leading-none tracking-tight">
              {limit}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-500 tracking-wider mt-0.5 uppercase bg-black px-1.5 py-0.5 rounded border border-white/5 select-none font-bold">
            {locale === 'vi' ? 'Giới Hạn' : 'Limit'}
          </span>
        </div>
      </div>

      {/* Speedometer Footer Dashboard Metrics Row */}
      <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 font-mono">
        <div className="text-center">
          <p className="text-[9px] text-neutral-500 tracking-wider uppercase mb-0.5">{locale === 'vi' ? 'Tốc độ tối đa vạch' : 'Gauge Dial Max'}</p>
          <p className="text-sm font-semibold text-neutral-300">{maxGaugeSpeed} km/h</p>
        </div>
        <div className="text-center border-l border-white/5">
          <p className="text-[9px] text-neutral-500 tracking-wider uppercase mb-0.5">{locale === 'vi' ? 'Tải lượng an toàn' : 'Safety Percentage'}</p>
          <p className="text-sm font-semibold text-neutral-300">{Math.round(percentage)}%</p>
        </div>
      </div>
    </div>
  );
};
