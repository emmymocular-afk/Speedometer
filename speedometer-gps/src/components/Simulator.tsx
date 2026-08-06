/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Gauge, HelpCircle, Flame, Snowflake, Sparkles } from 'lucide-react';
import { TRANSLATIONS, Locale } from '../i18n';

interface SimulatorProps {
  isActive: boolean;
  onSpeedUpdate: (speed: number) => void;
  speedLimit: number;
  locale: Locale;
}

export const Simulator: React.FC<SimulatorProps> = ({
  isActive,
  onSpeedUpdate,
  speedLimit,
  locale
}) => {
  const t = TRANSLATIONS[locale];
  const [accelerating, setAccelerating] = useState(false);
  const [braking, setBraking] = useState(false);
  const [cruiseEnabled, setCruiseEnabled] = useState(false);
  const [cruiseTargetSpeed, setCruiseTargetSpeed] = useState(60);
  const [autoDrive, setAutoDrive] = useState(false);
  const [roadType, setRoadType] = useState<'flat' | 'uphill' | 'downhill'>('flat');

  const currentSpeedRef = useRef(0);
  const autoPhaseRef = useRef(0); // For autoDrive simulation logic

  // We run a physics loop at 100ms when simulated mode is active
  useEffect(() => {
    if (!isActive) {
      setAccelerating(false);
      setBraking(false);
      setAutoDrive(false);
      return;
    }

    const interval = setInterval(() => {
      let speed = currentSpeedRef.current;
      
      // 1. Auto Drive Logic
      if (autoDrive) {
        autoPhaseRef.current += 1;
        const phase = autoPhaseRef.current;
        
        // Simulates a trip cycle in city, suburbs, and occasionally speeding
        // Accelerating phase
        if (phase < 120) {
          // Slowly accelerate towards limit
          const target = speedLimit - 5 + Math.sin(phase / 10) * 8;
          speed += (target - speed) * 0.05;
        } 
        // Peak limit test phase (forces exceeding limit slightly to trigger warnings)
        else if (phase >= 120 && phase < 200) {
          const target = speedLimit + 12 + Math.cos(phase / 8) * 4;
          speed += (target - speed) * 0.08;
        } 
        // Braking phase / light stop
        else if (phase >= 200 && phase < 280) {
          const target = 15 + Math.sin(phase / 12) * 5;
          speed += (target - speed) * 0.06;
        } 
        // Stop sign simulation
        else if (phase >= 280 && phase < 320) {
          speed += (0 - speed) * 0.15;
        } 
        // Restart cycle
        else {
          autoPhaseRef.current = 0;
        }
      }
      // 2. Cruise Control Logic
      else if (cruiseEnabled) {
        const delta = cruiseTargetSpeed - speed;
        speed += delta * 0.08; // smooth feedback towards target
      }
      // 3. Manual Pedal Physics Logic
      else {
        let accelCoef = 1.0;
        let dragCoef = 0.2; // road drag

        if (roadType === 'uphill') {
          accelCoef = 0.6;
          dragCoef = 0.4;
        } else if (roadType === 'downhill') {
          accelCoef = 1.4;
          dragCoef = 0.05;
        }

        // Apply controls
        if (accelerating) {
          speed += 2.8 * accelCoef;
        } else if (braking) {
          speed -= 4.5;
        } else {
          // Natural coasting drag
          speed -= dragCoef;
        }
      }

      // Safeguards and bounds (hard cap speed at 180 km/h)
      if (speed < 0) speed = 0;
      if (speed > 180) speed = 180;

      // Update ref and state
      currentSpeedRef.current = speed;
      onSpeedUpdate(speed);

    }, 80);

    return () => clearInterval(interval);
  }, [isActive, accelerating, braking, cruiseEnabled, cruiseTargetSpeed, autoDrive, roadType, speedLimit, onSpeedUpdate]);

  // Handle keyboard events as accessibility keys for testing
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setAccelerating(true);
        setCruiseEnabled(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setBraking(true);
        setCruiseEnabled(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setAccelerating(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setBraking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl font-mono text-xs text-neutral-300">
      
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase mb-5 pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <Gauge size={12} className="text-white" /> {t.simulatorTitle}
        </span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white text-black text-[9px] font-black uppercase tracking-wider">
          {locale === 'vi' ? 'ĐANG CHẠY' : 'SIMULATIVE'}
        </span>
      </div>

      <div className="space-y-6">
        
        {/* Row 1: Quick AutoDrive & Road Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Autopilot Controller */}
          <div className="p-4 bg-black rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-white/40 block uppercase tracking-widest leading-none">{t.autoDriveTitle}</span>
                <span className="text-xs font-bold text-neutral-200">{t.robotDrive}</span>
              </div>
              <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${autoDrive ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                {autoDrive ? 'ON' : 'OFF'}
              </span>
            </div>
            
            <button
              onClick={() => {
                setAutoDrive(!autoDrive);
                setCruiseEnabled(false);
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-center gap-2 border cursor-pointer select-none ${
                autoDrive 
                  ? 'bg-white text-black border-white hover:bg-neutral-200 font-black' 
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              <Sparkles size={14} className={autoDrive ? 'animate-pulse text-black' : ''} />
              {autoDrive ? t.stopAutoDrive : t.startAutoDrive}
            </button>
          </div>

          {/* Road Drag Modifiers */}
          <div className="p-4 bg-black rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold text-white/40 block uppercase tracking-widest mb-3">{t.roadDragTitle}</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setRoadType('flat')}
                className={`py-2 rounded-lg text-[10px] font-bold tracking-tight transition-all text-center border cursor-pointer select-none ${
                  roadType === 'flat' 
                    ? 'bg-white border-white text-black font-black' 
                    : 'bg-neutral-900 border-white/5 hover:bg-white/5 text-neutral-400'
                }`}
              >
                {t.roadFlat}
              </button>
              <button
                onClick={() => setRoadType('uphill')}
                className={`py-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center tracking-tight transition-all text-center border cursor-pointer select-none ${
                  roadType === 'uphill' 
                    ? 'bg-amber-500 border-amber-400 text-black font-black' 
                    : 'bg-neutral-900 border-white/5 hover:bg-white/5 text-neutral-400'
                }`}
              >
                {t.roadIncline}
              </button>
              <button
                onClick={() => setRoadType('downhill')}
                className={`py-2 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center tracking-tight transition-all text-center border cursor-pointer select-none ${
                  roadType === 'downhill' 
                    ? 'bg-white border-white text-black font-black' 
                    : 'bg-neutral-900 border-white/5 hover:bg-white/5 text-neutral-400'
                }`}
              >
                {t.roadDownhill}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Manual Pedal Controls */}
        <div className={`p-4 bg-black border border-white/5 rounded-2xl space-y-4 relative ${autoDrive ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.dragLabel}</span>
            <span className="text-[9px] text-neutral-500 flex items-center gap-1 font-mono">
              <HelpCircle size={10} /> {t.dragKeyHelp}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* BRAKE PEDAL */}
            <button
              onMouseDown={() => { setBraking(true); setCruiseEnabled(false); }}
              onMouseUp={() => setBraking(false)}
              onMouseLeave={() => setBraking(false)}
              onTouchStart={(e) => { e.preventDefault(); setBraking(true); setCruiseEnabled(false); }}
              onTouchEnd={() => setBraking(false)}
              className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border relative select-none cursor-pointer active:scale-95 ${
                braking 
                  ? 'bg-red-500 border-red-400 text-white shadow-lg' 
                  : 'bg-[#121214] hover:bg-neutral-900 border-white/5 text-red-500 hover:text-red-400'
              }`}
            >
              <Snowflake size={22} className={braking ? 'animate-spin' : ''} />
              <span className="font-sans font-black text-sm tracking-wide">{t.brakePedal}</span>
              <span className="text-[9px] opacity-75 font-mono">{t.brakeDesc}</span>
            </button>

            {/* ACCELERATOR PEDAL */}
            <button
              onMouseDown={() => { setAccelerating(true); setCruiseEnabled(false); }}
              onMouseUp={() => setAccelerating(false)}
              onMouseLeave={() => setAccelerating(false)}
              onTouchStart={(e) => { e.preventDefault(); setAccelerating(true); setCruiseEnabled(false); }}
              onTouchEnd={() => setAccelerating(false)}
              className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border relative select-none cursor-pointer active:scale-95 ${
                accelerating 
                  ? 'bg-white border-white text-black font-black shadow-lg' 
                  : 'bg-[#121214] hover:bg-neutral-900 border-white/5 text-white hover:text-neutral-200'
              }`}
            >
              <Flame size={22} className={accelerating ? 'animate-pulse' : ''} />
              <span className="font-sans font-black text-sm tracking-wide">{t.accelPedal}</span>
              <span className="text-[9px] opacity-75 font-mono">{t.accelDesc}</span>
            </button>
          </div>
        </div>

        {/* Row 3: Cruise Control Lock */}
        <div className={`p-4 bg-black rounded-2xl border border-white/5 ${autoDrive ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-white/40 block uppercase tracking-widest font-mono">{t.cruiseTitle}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={cruiseEnabled} 
                onChange={(e) => setCruiseEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-450 after:border-neutral-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black" />
            </label>
          </div>

          <div className={`space-y-2 transition-all duration-300 ${cruiseEnabled ? 'opacity-100' : 'opacity-40'}`}>
            <div className="flex justify-between text-[11px] font-bold text-neutral-300 font-sans">
              <span>{t.cruiseTarget}</span>
              <span className="text-white font-mono text-xs">{cruiseTargetSpeed} km/h</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={cruiseTargetSpeed}
              disabled={!cruiseEnabled}
              onChange={(e) => setCruiseTargetSpeed(Number(e.target.value))}
              className="w-full h-1 bg-neutral-850 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[8px] text-neutral-500 font-mono">
              <span>10 km/h</span>
              <span>80 km/h</span>
              <span>150 km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
