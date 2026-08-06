/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Navigation, 
  MapPin, 
  Settings2, 
  Volume2, 
  VolumeX, 
  Music, 
  Activity, 
  ShieldAlert, 
  Bike, 
  Car, 
  Play, 
  Sliders, 
  AlertTriangle,
  Github,
  Award,
  Globe,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  VehicleType, 
  LimitProfileType, 
  TripPoint, 
  TripStats, 
  AppSettings, 
  GPSCoords, 
  PresetLimit,
  CustomProfile,
  TripRecord
} from './types';
import { playSirenBeep, speakWarning, announceSystem } from './audio';
import { SpeedDial } from './components/SpeedDial';
import { Compass } from './components/Compass';
import { Simulator } from './components/Simulator';
import { StatsCard } from './components/StatsCard';
import { TripChart } from './components/TripChart';
import { MapView } from './components/MapView';
import { DrivingModes } from './components/DrivingModes';
import { TripHistory } from './components/TripHistory';
import { TRANSLATIONS, Locale } from './i18n';

// Vietnamese Law Speed Limit Presets
// Urban (Đô thị) - Outer city (Ngoài đô thị) - Highway (Cao tốc) - Custom (Tự chọn)
const PRESET_LIMITS: PresetLimit[] = [
  { id: 'urban', label: 'Ở Trong Đô Thị', motorbike: 50, car: 50, icon: '🏢' },
  { id: 'suburban', label: 'Ngoài Đô Thị', motorbike: 70, car: 80, icon: '🌳' },
  { id: 'highway', label: 'Đường Cao Tốc', motorbike: 0, car: 120, icon: '🛣️' }, // Motorbikes are banned on VN National Highways! Limit 0.
  { id: 'custom', label: 'Tùy Chọn Giới Hạn', motorbike: 60, car: 60, icon: '⚙️' }
];


export default function App() {
  // --- Localization Config ---
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('speed_app_locale');
    return (saved as Locale) || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('speed_app_locale', locale);
  }, [locale]);

  const t = TRANSLATIONS[locale];

  // --- Main Core States ---
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [limitProfile, setLimitProfile] = useState<LimitProfileType>('urban');
  const [customLimit, setCustomLimit] = useState<number>(60);
  
  // Speed metrics
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(true); // Default simulator ON for preview testability
  const [gpsStatus, setGpsStatus] = useState<'inactive' | 'searching' | 'active' | 'error'>('inactive');
  
  // Customizable Profiles Slate state (Loaded from localStorage)
  const [profiles, setProfiles] = useState<CustomProfile[]>(() => {
    const saved = localStorage.getItem('speed_app_custom_profiles');
    return saved ? JSON.parse(saved) : [
      { id: 'city', name: 'Nội thành (City Driving)', limit: 50, alertVolume: 80, icon: '🏢' },
      { id: 'suburban', name: 'Ngoại thành (Suburban Road)', limit: 80, alertVolume: 90, icon: '🌳' },
      { id: 'highway', name: 'Đường Cao Tốc (Expressway)', limit: 120, alertVolume: 100, icon: '🛣️' }
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>('city');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState<boolean>(false);
  const [routeSpeedLimitOverride, setRouteSpeedLimitOverride] = useState<number | null>(null);

  // Persistent Trip record history
  const [tripRecords, setTripRecords] = useState<TripRecord[]>(() => {
    const saved = localStorage.getItem('speed_app_trip_records');
    return saved ? JSON.parse(saved) : [];
  });

  // Save changes
  useEffect(() => {
    localStorage.setItem('speed_app_custom_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('speed_app_trip_records', JSON.stringify(tripRecords));
  }, [tripRecords]);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    voiceAlertEnabled: true,
    soundAlertEnabled: true,
    bufferLimit: 5, // Default buffer is +5 km/h (Under VN Traffic law, fine starts exactly from +5 km/h over limit)
    customLimit: 60,
    simulationActive: true
  });

  // GPS telemetries
  const [gpsCoords, setGpsCoords] = useState<GPSCoords>({
    latitude: null,
    longitude: null,
    altitude: null,
    heading: null,
    speed: null,
    accuracy: null
  });

  // History & Metrics tracking
  const [tripHistory, setTripHistory] = useState<TripPoint[]>([]);
  const [tripStats, setTripStats] = useState<TripStats>({
    maxSpeed: 0,
    avgSpeed: 0,
    distance: 0,
    violationsCount: 0,
    duration: 0
  });

  const [lastSpeechAnnouncedSpeed, setLastSpeechAnnouncedSpeed] = useState<number>(0);

  // References to preserve state variables in intervals
  const currentSpeedRef = useRef(0);
  const gpsWatchIdRef = useRef<number | null>(null);
  const totalDistanceRef = useRef(0);
  const totalDurationRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const violationsCountRef = useRef(0);
  const isCurrentlyViolatingRef = useRef(false);

  // Auto-detect driving modes based on current speed
  useEffect(() => {
    if (!autoDetectEnabled) return;
    
    let detectedId = 'city';
    if (currentSpeed >= 55 && currentSpeed < 90) {
      const found = profiles.find(p => p.id === 'suburban' || p.id === 'rural' || p.name.toLowerCase().includes('ngoại') || p.name.toLowerCase().includes('suburban') || p.name.toLowerCase().includes('rural'));
      detectedId = found ? found.id : (profiles[1]?.id || 'city');
    } else if (currentSpeed >= 90) {
      const found = profiles.find(p => p.id === 'highway' || p.name.toLowerCase().includes('cao tốc') || p.name.toLowerCase().includes('highway') || p.name.toLowerCase().includes('cruising'));
      detectedId = found ? found.id : (profiles[2]?.id || 'city');
    } else {
      const found = profiles.find(p => p.id === 'city' || p.name.toLowerCase().includes('nội') || p.name.toLowerCase().includes('city') || p.name.toLowerCase().includes('urban'));
      detectedId = found ? found.id : (profiles[0]?.id || 'city');
    }

    if (detectedId !== activeProfileId) {
      setActiveProfileId(detectedId);
    }
  }, [currentSpeed, autoDetectEnabled, profiles, activeProfileId]);

  // --- Calculate Speed limits dynamically ---
  const activeLimit = useMemo(() => {
    if (routeSpeedLimitOverride !== null) {
      return routeSpeedLimitOverride;
    }
    const currentProfile = profiles.find(p => p.id === activeProfileId);
    if (currentProfile) {
      return currentProfile.limit;
    }
    if (limitProfile === 'custom') {
      return customLimit;
    }
    const preset = PRESET_LIMITS.find(p => p.id === limitProfile);
    if (!preset) return 60;
    
    return vehicleType === 'car' ? preset.car : preset.motorbike;
  }, [routeSpeedLimitOverride, activeProfileId, profiles, limitProfile, customLimit, vehicleType]);

  // Special Check: Is motorbike chosen and expressway/highway is selected?
  // Legally under VN traffic laws, motorbikes are fully banned on highway tunnels/expressways (limits set to 0).
  const isMotorbikeBannedOnHighway = useMemo(() => {
    const isHighway = activeProfileId === 'highway' || limitProfile === 'highway' || activeLimit >= 120;
    return vehicleType === 'motorbike' && isHighway;
  }, [vehicleType, activeProfileId, limitProfile, activeLimit]);

  // Buffer offsets
  const alertThreshold = activeLimit + settings.bufferLimit;

  // Safe zones calculations
  const isOverLimit = useMemo(() => {
    if (isMotorbikeBannedOnHighway) {
      return currentSpeed > 0; // Trigger any speed as illegal ban violation
    }
    return currentSpeed > alertThreshold;
  }, [currentSpeed, alertThreshold, isMotorbikeBannedOnHighway]);

  const isNearingLimit = useMemo(() => {
    if (isMotorbikeBannedOnHighway) return false;
    return currentSpeed >= activeLimit && currentSpeed <= alertThreshold;
  }, [currentSpeed, activeLimit, alertThreshold, isMotorbikeBannedOnHighway]);


  // --- Speech and Siren Warning trigger loop ---
  useEffect(() => {
    if (currentSpeed < 1) return; // vehicle is stationary

    if (isOverLimit) {
      // 1. Alert with Beep Buzzer sound
      if (settings.soundAlertEnabled) {
        playSirenBeep(980, 0.25);
      }
      
      // 2. Alert with TTS Vocal Warnings
      if (settings.voiceAlertEnabled) {
        if (isMotorbikeBannedOnHighway) {
          // Special Vietnamese/English warning callback for highway bike ban
          speakWarning(currentSpeed, 0, 0, locale); // triggers distinct vocal alert
        } else {
          speakWarning(currentSpeed, activeLimit, settings.bufferLimit, locale);
        }
      }
    }
  }, [currentSpeed, isOverLimit, settings, activeLimit, isMotorbikeBannedOnHighway, locale]);

  // --- Coordinate distance tracking and statistics ticking (Runs once every 1 second) ---
  useEffect(() => {
    const trackerInterval = setInterval(() => {
      const speed = currentSpeedRef.current;
      
      // 1. Time ticking
      // We only tick the duration when active travel is happening
      if (speed > 0.5) {
        totalDurationRef.current += 1;
        
        // 2. Distance accrual
        // Distance in 1s increment is Speed in km/h divided by 3600 (seconds in an hour)
        const distanceTicked = speed / 3600;
        totalDistanceRef.current += distanceTicked;
      }

      // 3. Peak Max Speed updates
      if (speed > maxSpeedRef.current) {
        maxSpeedRef.current = speed;
      }

      // 4. Over Speed Violations counting
      // Trigger increments when user transitions from safe speed to exceeding speed limit
      const currentLimitToCheck = activeLimit;
      const bufferToCheck = settings.bufferLimit;
      const hasViolated = isMotorbikeBannedOnHighway ? speed > 0 : speed > (currentLimitToCheck + bufferToCheck);

      if (hasViolated) {
        if (!isCurrentlyViolatingRef.current) {
          violationsCountRef.current += 1;
          isCurrentlyViolatingRef.current = true;
        }
      } else {
        isCurrentlyViolatingRef.current = false;
      }

      // 5. Build trip statistics object
      const durationSeconds = totalDurationRef.current;
      const totalDist = totalDistanceRef.current;
      
      const averageSpeed = durationSeconds > 0 ? (totalDist / (durationSeconds / 3600)) : 0;

      setTripStats({
        maxSpeed: maxSpeedRef.current,
        avgSpeed: averageSpeed,
        distance: totalDist,
        violationsCount: violationsCountRef.current,
        duration: durationSeconds
      });

      // 6. Accumulate historical trends for chart line render (Max cap 150 indices)
      setTripHistory(prev => {
        const next = [...prev, {
          timestamp: Date.now(),
          speed: speed,
          limit: currentLimitToCheck
        }];
        if (next.length > 150) {
          return next.slice(next.length - 150);
        }
        return next;
      });

    }, 1000);

    return () => clearInterval(trackerInterval);
  }, [activeLimit, settings.bufferLimit, isMotorbikeBannedOnHighway]);

  // Synchronize ref speed with state speed
  useEffect(() => {
    currentSpeedRef.current = currentSpeed;
  }, [currentSpeed]);

  // --- Real Geolocation Controller (watchPosition hooks) ---
  useEffect(() => {
    // If simulation mode is checked in, we shut off active Geolocation tracking
    if (isSimulationMode) {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      setGpsStatus('inactive');
      return;
    }

    // Checking client API support
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('error');
      alert(locale === 'vi' ? 'Trình duyệt không hỗ trợ Geolocation/GPS API!' : 'Browser does not support Geolocation/GPS API!');
      return;
    }

    setGpsStatus('searching');
    announceSystem(
      locale === 'vi' 
        ? "Đang kích hoạt hệ thống đo định vị vệ tinh GPS! Vui lòng cấp quyền địa điểm."
        : "Activating satellite GPS positioning. Please grant location authorization.",
      locale
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsStatus('active');
        const coords = position.coords;
        
        // Convert speed from m/s to km/h (speed is nullable in watchPosition)
        let convertedSpeed = 0;
        if (coords.speed !== null && coords.speed > 0) {
          convertedSpeed = coords.speed * 3.6;
        }
        
        setGpsCoords({
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude,
          heading: coords.heading,
          speed: coords.speed,
          accuracy: coords.accuracy
        });

        setCurrentSpeed(convertedSpeed);
      },
      (error) => {
        console.error('Lỗi định vị dữ liệu GPS:', error);
        setGpsStatus('error');
        announceSystem(
          locale === 'vi'
            ? "Lỗi tìm kiếm tín hiệu định vị! Hãy kiểm tra cài đặt thiết bị."
            : "Location signal acquisition failed. Please check device configuration.",
          locale
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    gpsWatchIdRef.current = watchId;

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [isSimulationMode, locale]);

  // Voice announcement of profiles switcher
  const handleLimitProfileChange = (profile: LimitProfileType) => {
    setLimitProfile(profile);
    const label = profile === 'urban' ? t.presetUrban : profile === 'suburban' ? t.presetSuburban : profile === 'highway' ? t.presetHighway : t.presetCustom;
    if (settings.voiceAlertEnabled) {
      announceSystem(
        locale === 'vi'
          ? `Đã đổi chế độ sang ${label}`
          : `Switched driving mode to ${label}`,
        locale
      );
    }
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
    if (settings.voiceAlertEnabled) {
      announceSystem(
        locale === 'vi'
          ? `Chuyển sang đo tốc độ ${type === 'car' ? 'ô tô' : 'xe máy'}`
          : `Switched speed calculation to ${type === 'car' ? 'car' : 'motorcycle'}`,
        locale
      );
    }
  };

  const handleResetTrip = () => {
    totalDistanceRef.current = 0;
    totalDurationRef.current = 0;
    maxSpeedRef.current = 0;
    violationsCountRef.current = 0;
    isCurrentlyViolatingRef.current = false;
    currentSpeedRef.current = 0;
    
    setCurrentSpeed(0);
    setTripHistory([]);
    setTripStats({
      maxSpeed: 0,
      avgSpeed: 0,
      distance: 0,
      violationsCount: 0,
      duration: 0
    });

    if (settings.voiceAlertEnabled) {
      announceSystem(
        locale === 'vi'
          ? "Đã đặt lại toàn bộ thông số hành trình về không."
          : "Journey telemetry records have been reset to zero.",
        locale
      );
    }
  };

  const handleCustomLimitSlider = (val: number) => {
    setCustomLimit(val);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl relative text-white" id="speed-app-root">
      
      {/* 1. Header Banner of Dashboard Cockpit */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4" id="speed-app-header">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white text-black">
            <Navigation className="animate-spin text-black" size={24} style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-sans font-black tracking-tighter flex items-center gap-2 text-white">
              {locale === 'vi' ? 'BẢNG ĐIỀU KHIỂN GP TRACKER' : 'COCKPIT GPS SPEEDOMETER'} <span className="text-[10px] px-2 py-0.5 rounded bg-white text-black font-mono font-black uppercase tracking-wider">VIỆT NAM</span>
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              {locale === 'vi' 
                ? 'Đo vận tốc vệ tinh nâng cao • Tích hợp còi cảnh báo quá tốc độ & định vị trực tiếp' 
                : 'Advanced real-time satellite speed tracker • Acoustic limits warn & live route directions'}
            </p>
          </div>
        </div>
        
        {/* GPS vs Simulator Toggler & Language Switcher */}
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
          {/* Language Selection Toggle */}
          <div className="flex items-center gap-1 p-1 bg-black border border-white/5 rounded-2xl shadow-inner text-xs font-semibold">
            <button
              onClick={() => setLocale('vi')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                locale === 'vi' 
                  ? 'bg-white text-black font-black' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              onClick={() => setLocale('en')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                locale === 'en' 
                  ? 'bg-white text-black font-black' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* GPS Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-black border border-white/5 rounded-2xl shadow-inner text-xs font-semibold">
            <button
              onClick={() => setIsSimulationMode(false)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 pointer-events-auto cursor-pointer ${
                !isSimulationMode 
                  ? 'bg-white text-black font-black' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MapPin size={13} /> {locale === 'vi' ? 'Định vị GPS thật' : 'Live GPS Tracker'}
            </button>
            <button
              onClick={() => setIsSimulationMode(true)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 pointer-events-auto cursor-pointer ${
                isSimulationMode 
                  ? 'bg-[#121214] text-white font-bold border border-white/10 shadow-md' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders size={13} /> {locale === 'vi' ? 'Bộ Giả Lập 🎮' : 'Simulator Mode 🎮'}
            </button>
          </div>
        </div>
      </header>

      {/* Extreme Alert Notification Box (Renders when exceeding speed limit + buffer) */}
      {isOverLimit && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-3xl bg-[#0F0F11]/90 border border-red-500 shadow-xl flex items-center gap-3.5 backdrop-blur-md text-red-100 relative overflow-hidden"
          id="critical-alert-box"
        >
          {/* Animated red side bar */}
          <div className="absolute top-0 bottom-0 left-0 w-2 bg-red-500 animate-pulse" />
          <div className="p-2.5 rounded-2xl bg-red-500 text-black animate-bounce shrink-0 ml-1">
            <ShieldAlert size={22} className="stroke-[2.5]" />
          </div>
          <div className="flex-1 font-sans">
            <h4 className="font-black text-sm tracking-tight text-white uppercase flex items-center gap-1.5">
              <AlertTriangle size={15} /> {locale === 'vi' ? 'NGUY HIỂM: BẠN ĐANG VƯỢT QUÁ TỐC ĐỘ HẠN MỨC!' : 'CRITICAL WARNING: SPEED LIMIT VIOLATED!'}
            </h4>
            <p className="text-xs text-red-400 mt-1 font-medium">
              {isMotorbikeBannedOnHighway ? (
                <span>{locale === 'vi' ? '⚠️ Theo Luật giao thông Việt Nam, xe máy **BỊ CẤM HOÀN TOÀN** di chuyển vào đường Cao Tốc quốc gia! Vui lòng cho xe ra khỏi làn khẩn cấp ngay lập tức để tránh xử phạt nghiêm trọng.' : '⚠️ Under VN Road Traffic code, motorcycles are completely BANNED from expressways! Exit the highway immediately to avoid severe citations and towing.'}</span>
              ) : (
                <span>{locale === 'vi' ? `Vận tốc đạt **${Math.round(currentSpeed)} km/h**, vượt giới hạn **${activeLimit} km/h** của tuyến đường. Hãy giảm ga và chú ý quan sát biển báo!` : `Current velocity of **${Math.round(currentSpeed)} km/h** exceeds the allowed sector limit of **${activeLimit} km/h**. Release throttle immediately!`}</span>
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. Main Dashboard Panel Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN/WING (Speedometer Gauge + Primary Configuration Toggles) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Round Dial Display Panel */}
          <div className="flex flex-col">
            <SpeedDial 
              speed={currentSpeed} 
              limit={activeLimit} 
              vehicleType={vehicleType} 
              isOverLimit={isOverLimit}
              isNearingLimit={isNearingLimit}
              locale={locale}
            />
          </div>

          {/* Core Switch Settings Card: Vehicle Type & Audio controls */}
          <div className="p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-5">
            <span className="text-[10px] text-neutral-400 font-bold tracking-widest font-mono uppercase block pb-2 border-b border-white/5">
              {locale === 'vi' ? 'CẤU HÌNH HỆ THỐNG AN TOÀN' : 'SYSTEM DEFENSE CONTROLS'}
            </span>
            
            {/* Toggler 1: Motorbike vs Car */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 block">{t.vehicleType}:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleVehicleTypeChange('motorbike')}
                  className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border select-none ${
                    vehicleType === 'motorbike'
                      ? 'bg-white border-white text-black font-black'
                      : 'bg-black border-white/5 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Bike size={18} />
                  <span>{t.motorbike.toUpperCase()} 🏍️</span>
                </button>
                <button
                  onClick={() => handleVehicleTypeChange('car')}
                  className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border select-none ${
                    vehicleType === 'car'
                      ? 'bg-white border-white text-black font-black'
                      : 'bg-black border-white/5 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Car size={18} />
                  <span>{t.car.toUpperCase()} 🚗</span>
                </button>
              </div>
            </div>

            {/* Warning Alarm controls (Sound, Voice & Vietnamese laws buffer) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-black text-white border border-white/5">
                    <Volume2 size={14} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-neutral-200 block">
                      {locale === 'vi' ? 'Cảnh báo giọng nói (TTS)' : 'Vocal Assist Warning (TTS)'}
                    </span>
                    <span className="text-[10px] text-neutral-500 block font-mono">
                      {locale === 'vi' ? 'Phát bằng giọng nói tiếng Việt/tiếng Anh' : 'Speaks in English or Vietnamese voice'}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.voiceAlertEnabled}
                    onChange={(e) => setSettings({ ...settings, voiceAlertEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black" />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-black text-white border border-white/5">
                    <Music size={14} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-neutral-200 block">
                      {locale === 'vi' ? 'Còi tín hiệu bíp báo số' : 'Acoustic Alarm Buzzer'}
                    </span>
                    <span className="text-[10px] text-neutral-500 block font-mono">
                      {locale === 'vi' ? 'Âm bíp kép Sawtooth có tần số lớn' : 'Pitch-shifting dual-tone beep alerts'}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.soundAlertEnabled}
                    onChange={(e) => setSettings({ ...settings, soundAlertEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black" />
                </label>
              </div>

              {/* Legal Law Tolerances (Buffer config) Under VN Traffic Law Decree 100/2019/ND-CP */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-neutral-300">{t.bufferLabel}</span>
                  <span className="text-xs font-mono font-bold text-white">+{settings.bufferLimit} km/h</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0, 5, 10].map((b) => (
                    <button
                      key={`buffer-${b}`}
                      onClick={() => setSettings({ ...settings, bufferLimit: b })}
                      className={`py-2 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer select-none ${
                        settings.bufferLimit === b
                          ? 'bg-white border-white text-black font-black'
                          : 'bg-black border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      +{b} km/h {b === 5 ? '(VN ⚖️)' : ''}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] leading-relaxed text-neutral-500 font-mono">
                  {t.bufferDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Customizable Driving Modes setting panel */}
          <DrivingModes 
            currentSpeed={currentSpeed}
            activeProfileId={activeProfileId}
            onSelectProfile={setActiveProfileId}
            profiles={profiles}
            onUpdateProfiles={setProfiles}
            autoDetectEnabled={autoDetectEnabled}
            onToggleAutoDetect={setAutoDetectEnabled}
            locale={locale}
          />

        </div>

        {/* RIGHT COLUMN/WING (Speed limits Presets, Geolocation data, Simulators controls, Charts, Metrics) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Map View Integration */}
          <MapView 
            currentSpeed={currentSpeed}
            isOverLimit={isOverLimit}
            activeLimit={activeLimit}
            onExternalSpeedUpdate={(s, limitOverride) => {
              setCurrentSpeed(s);
              setRouteSpeedLimitOverride(limitOverride);
            }}
            gpsCoords={gpsCoords}
            vehicleType={vehicleType}
            locale={locale}
          />

          {/* Road profiles Selection (Speed limits signages) */}
          <div className="p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-4">
            <span className="text-[10px] text-neutral-400 font-bold tracking-widest font-mono uppercase block pb-2 border-b border-white/5">
              {t.roadLimitTitle}
            </span>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {PRESET_LIMITS.map((p) => {
                const isSelected = limitProfile === p.id;
                
                // Show standard speed limit signage
                let finalLimitText = '';
                if (p.id === 'custom') {
                  finalLimitText = `${customLimit}`;
                } else if (p.id === 'highway' && vehicleType === 'motorbike') {
                  finalLimitText = 'CẤM 🚫';
                } else {
                  finalLimitText = `${vehicleType === 'car' ? p.car : p.motorbike}`;
                }

                let labelName = '';
                if (p.id === 'urban') labelName = t.presetUrban;
                else if (p.id === 'suburban') labelName = t.presetSuburban;
                else if (p.id === 'highway') labelName = t.presetHighway;
                else labelName = t.presetCustom;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleLimitProfileChange(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer min-h-[110px] select-none ${
                      isSelected
                        ? 'bg-black border-white shadow-lg scale-[1.02]'
                        : 'bg-black border-white/5 text-neutral-400 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl mb-1.5 select-none">{p.icon}</span>
                    <span className="text-[10px] font-bold block mb-1 font-sans">{labelName}</span>
                    
                    {/* Limit badge sign styled like a traffic billboard */}
                    <div className={`text-[10px] font-mono font-black border rounded px-2 py-0.5 mt-auto tracking-normal ${
                      isSelected 
                        ? 'bg-white text-black border-white' 
                        : 'bg-[#121214] text-neutral-400 border-white/5'
                    }`}>
                      {p.id === 'highway' && vehicleType === 'motorbike' ? (
                        <span className="font-sans text-[8px] font-black tracking-wide text-red-500">{locale === 'vi' ? 'CẤM HẲN' : 'BANNED'}</span>
                      ) : (
                        <span>{finalLimitText} km/h</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slider triggers if "custom" (tùy chọn) limit profile is selected */}
            {limitProfile === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-2xl bg-black border border-white/5 space-y-2"
              >
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-neutral-300">{t.customLimitLabel}</span>
                  <span className="text-white font-mono font-bold text-sm bg-[#121214] px-2.5 py-0.5 rounded border border-white/5">
                    {customLimit} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="160"
                  step="5"
                  value={customLimit}
                  onChange={(e) => handleCustomLimitSlider(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[8px] font-mono text-neutral-500">
                  <span>20 km/h</span>
                  <span>90 km/h</span>
                  <span>160 km/h</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Simulator Console and physical controls */}
          <Simulator 
            isActive={isSimulationMode} 
            onSpeedUpdate={setCurrentSpeed}
            speedLimit={activeLimit}
            locale={locale}
          />

          {/* Geolocation status if "GPS thật" mode is active */}
          {!isSimulationMode && (
            <div className="p-5 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-4">
              <span className="text-[10px] text-neutral-400 font-bold tracking-widest font-mono uppercase block pb-2 border-b border-white/5">
                {locale === 'vi' ? 'TRẠNG THÁI TÍN HIỆU ĐỊNH VỊ' : 'SATELLITE GPS POSITIONING STATUS'}
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1 flex flex-col justify-center items-center p-4 bg-black rounded-2xl border border-white/5 text-center">
                  <Globe className={`mb-2 ${gpsStatus === 'active' ? 'text-white animate-spin' : gpsStatus === 'searching' ? 'text-neutral-400 animate-pulse' : 'text-neutral-600'}`} size={28} style={{ animationDuration: '6s' }} />
                  <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">{locale === 'vi' ? 'Trạng thái GPS' : 'GPS Status'}</span>
                  <span className={`text-[11px] font-black mt-1 uppercase ${
                    gpsStatus === 'active' 
                      ? 'text-emerald-400' 
                      : gpsStatus === 'searching' 
                      ? 'text-amber-500 animate-pulse'
                      : gpsStatus === 'error'
                      ? 'text-red-500'
                      : 'text-neutral-400'
                  }`}>
                    {gpsStatus === 'active' 
                      ? (locale === 'vi' ? 'Hoạt động ✅' : 'Fixed ✅') 
                      : gpsStatus === 'searching' 
                      ? (locale === 'vi' ? 'Tìm tín hiệu...' : 'Searching...') 
                      : gpsStatus === 'error'
                      ? (locale === 'vi' ? 'Lỗi định vị ❌' : 'GPS Error ❌')
                      : (locale === 'vi' ? 'Ngoại tuyến (OFF)' : 'Offline (OFF)')}
                  </span>
                </div>

                <div className="md:col-span-2 p-4 bg-black rounded-2xl border border-white/5 text-xs flex flex-col justify-between">
                  <div className="flex items-start gap-2.5 text-neutral-400">
                    <Info size={14} className="text-white shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      {gpsStatus === 'searching' ? (
                        <span>{locale === 'vi' ? 'Đang ping vị trí trình duyệt... Hãy kiểm tra thông báo cấp quyền địa điểm của trình duyệt trên thanh địa chỉ.' : 'Retrieving current browser location coordinates. Please grant geography credentials on the browser prompt.'}</span>
                      ) : gpsStatus === 'active' ? (
                        <span>{locale === 'vi' ? 'Hệ thống đang đồng bộ hóa vận tốc di chuyển từ chip GPS vệ tinh của thiết bị. Thử di chuyển thực tế để xem kim đồng hồ chạy.' : 'System successfully synced with device GPS receivers. Travel physically to observe dial needle updates.'}</span>
                      ) : gpsStatus === 'error' ? (
                        <span className="text-red-400 font-medium">{locale === 'vi' ? 'Hãy đảm bảo thiết bị của bạn đã bật Định Vị (Location Services), cấp quyền đọc định vị cho AI Studio, và chạy thiết bị ngoài trời.' : 'Verify Location Services are enabled on device settings, permissions are approved, and device is outdoors.'}</span>
                      ) : (
                        <span>{locale === 'vi' ? 'Chọn "Định vị GPS thật" ở góc trên cùng để kích hoạt đo tốc độ bằng vệ tinh. Bản đồ định vị sẽ tự động dò tìm.' : 'Engage "Live GPS Tracker" on top-right header to activate hardware satellite tracking.'}</span>
                      )}
                    </p>
                  </div>
                  {gpsStatus === 'active' && (
                    <div className="mt-3 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/10 px-2.5 py-1 rounded-lg border border-emerald-900/40">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {locale === 'vi' ? `Tín hiệu GPS ổn định (Sai số: ±${Math.round(gpsCoords.accuracy || 0)}m).` : `Locked satellite path bounds (Precision: ±${Math.round(gpsCoords.accuracy || 0)}m).`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compass Satellite position metrics */}
          <Compass coords={gpsCoords} locale={locale} />

          {/* Trip stats cards (Bento layout counters) */}
          <StatsCard stats={tripStats} onReset={handleResetTrip} locale={locale} />

          {/* Trip History Logger Logs & Analytics */}
          <TripHistory 
            currentSpeed={currentSpeed}
            activeLimit={activeLimit}
            vehicleType={vehicleType}
            isOverLimit={isOverLimit}
            historyList={tripRecords}
            onAddTrip={(trip) => setTripRecords(prev => [trip, ...prev])}
            onClearHistory={() => setTripRecords([])}
            onDeleteTrip={(id) => setTripRecords(prev => prev.filter(t => t.id !== id))}
            locale={locale}
          />

          {/* Speed trend history line chart graph */}
          <TripChart history={tripHistory} />

        </div>
      </div>

      {/* Decorative Cockpit footer element */}
      <footer className="mt-12 text-center text-[10px] font-mono text-neutral-600 tracking-wider space-y-2 pb-6">
        <p>{locale === 'vi' ? 'CHẾ TẠO CHO CÁC BUỔI LÁI XE AN TOÀN TRÊN ĐƯỜNG PHỐ VIỆT NAM' : 'CRAFTED SECURELY FOR LAW-COMPLIANT DRIVES ACROSS URBAN HIGHWAYS'}</p>
        <div className="flex items-center justify-center gap-2">
          <span>DECREE_100_COCKPIT_SYS</span>
          <span>•</span>
          <span>SPEEDTRACKER_v3.2</span>
        </div>
      </footer>
    </div>
  );
}
