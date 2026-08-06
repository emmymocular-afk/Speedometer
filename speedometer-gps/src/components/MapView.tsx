/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  useMap, 
  useMapsLibrary,
  AdvancedMarker
} from '@vis.gl/react-google-maps';
import { 
  Map as MapIcon, 
  Navigation, 
  Route as RouteIcon, 
  AlertTriangle, 
  Sliders, 
  MapPin, 
  Play, 
  Square
} from 'lucide-react';
import { GPSCoords } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MapViewProps {
  currentSpeed: number;
  isOverLimit: boolean;
  activeLimit: number;
  onExternalSpeedUpdate: (speed: number, limitOverride: number | null) => void;
  gpsCoords: GPSCoords;
  vehicleType: 'car' | 'motorbike';
  locale: Locale;
}

// Inner traffic layer setup component
const TrafficLayerComponent: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (enabled) {
       if (!trafficLayerRef.current) {
         trafficLayerRef.current = new google.maps.TrafficLayer();
       }
       trafficLayerRef.current.setMap(map);
    } else {
       if (trafficLayerRef.current) {
         trafficLayerRef.current.setMap(null);
       }
    }

    return () => {
       if (trafficLayerRef.current) {
         trafficLayerRef.current.setMap(null);
       }
    };
  }, [map, enabled]);

  return null;
};

// Route compute lines component
interface RouteDisplayProps {
  origin: { lat: number; lng: number } | string;
  destination: { lat: number; lng: number } | string;
  onRouteCached: (path: google.maps.LatLng[], distanceMeters: number, durationMillis: number) => void;
}

const RouteDisplayComponent: React.FC<RouteDisplayProps> = ({ origin, destination, onRouteCached }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Remove old polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin: typeof origin === 'string' ? origin : { location: origin },
      destination: typeof destination === 'string' ? destination : { location: destination },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
    .then(({ routes }) => {
      if (routes?.[0]) {
        const route = routes[0];
        const newPolylines = route.createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#00f0ff',
            strokeOpacity: 0.8,
            strokeWeight: 6
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (route.viewport) {
          map.fitBounds(route.viewport);
        }

        // Cache the detailed path coordinates for simulations
        if (route.path) {
          onRouteCached(route.path, route.distanceMeters || 0, route.durationMillis || 0);
        }
      }
    })
    .catch(err => {
      console.error('Không tìm thấy tuyến đường GPS:', err);
    });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, origin, destination]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  currentSpeed,
  isOverLimit,
  activeLimit,
  onExternalSpeedUpdate,
  gpsCoords,
  vehicleType,
  locale
}) => {
  const t = TRANSLATIONS[locale];
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ringroad3');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [customDest, setCustomDest] = useState<string>('');
  
  // Vietnam standard coordinates for presets localized
  const GPS_PRESETS = [
    { 
      id: 'hanoi_haiphong', 
      name: locale === 'vi' ? 'Cao Tốc Pháp Vân - Cầu Giẽ' : 'Pháp Vân - Cầu Giẽ Expressway', 
      limit: 120, 
      start: { lat: 20.9587, lng: 105.8584 }, 
      end: { lat: 20.2662, lng: 105.9554 },
      desc: locale === 'vi' ? 'Cao tốc trục Nam miền Bắc (120 km/h)' : 'South axis expressway (120 km/h)'
    },
    { 
      id: 'thanglong', 
      name: locale === 'vi' ? 'Đại lộ Thăng Long' : 'Thang Long Boulevard', 
      limit: 100, 
      start: { lat: 21.0116, lng: 105.7820 }, 
      end: { lat: 20.9922, lng: 105.4795 },
      desc: locale === 'vi' ? 'Cao tốc phía Tây Hà Nội (100 km/h)' : 'West Hanoi suburban highway (100 km/h)'
    },
    { 
      id: 'ringroad3', 
      name: locale === 'vi' ? 'Vành đai 3 Trên Cao' : 'Elevated Ring Road 3', 
      limit: 80, 
      start: { lat: 20.9984, lng: 105.7981 }, 
      end: { lat: 21.0371, lng: 105.7822 },
      desc: locale === 'vi' ? 'Cao tốc nội đô thành phố (80 km/h)' : 'Urban arterial ringway (80 km/h)'
    },
    { 
      id: 'hanoicity', 
      name: locale === 'vi' ? 'Hoàn Kiếm - Phố Cổ Hà Nội' : 'Hoan Kiem Lake - Old Quarter', 
      limit: 50, 
      start: { lat: 21.0285, lng: 105.8542 }, 
      end: { lat: 21.0340, lng: 105.8450 },
      desc: locale === 'vi' ? 'Đường đô thị chật hẹp (50 km/h)' : 'Dense city center streets (50 / 60 km/h)'
    }
  ];

  // Custom points
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number } | string>(GPS_PRESETS[2].start);
  const [routeDest, setRouteDest] = useState<{ lat: number; lng: number } | string>(GPS_PRESETS[2].end);
  const [routeSpeedLimit, setRouteSpeedLimit] = useState<number>(GPS_PRESETS[2].limit);
  
  // Simulated driver positions along route
  const [routePath, setRoutePath] = useState<google.maps.LatLng[]>([]);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [routeDuration, setRouteDuration] = useState<number>(0);
  const [simDriverIndex, setSimDriverIndex] = useState<number>(-1);
  const [isDrivingRoute, setIsDrivingRoute] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(0);

  // Auto limit warning for current route
  const resolvedRouteLimit = routeSpeedLimit;

  // Handle preset itinerary click
  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const preset = GPS_PRESETS.find(p => p.id === id);
    if (preset) {
      setRouteOrigin(preset.start);
      setRouteDest(preset.end);
      setRouteSpeedLimit(preset.limit);
      setIsDrivingRoute(false);
      setSimDriverIndex(-1);
      setSimSpeed(0);
      onExternalSpeedUpdate(0, null);
    }
  };

  const handleCustomPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customOrigin || !customDest) return;
    setRouteOrigin(customOrigin);
    setRouteDest(customDest);
    setRouteSpeedLimit(60); // Default speed limit for generic routing
    setIsDrivingRoute(false);
    setSimDriverIndex(-1);
    setSimSpeed(0);
    onExternalSpeedUpdate(0, null);
  };

  // Cache path coordinates and reset simulation values
  const handleRouteCached = (path: google.maps.LatLng[], dist: number, dur: number) => {
    setRoutePath(path);
    setRouteDistance(dist);
    setRouteDuration(dur);
    setSimDriverIndex(0);
  };

  // Simulated GPS route driving physics ticks
  useEffect(() => {
    if (!isDrivingRoute || routePath.length === 0 || simDriverIndex === -1) return;

    const interval = setInterval(() => {
        setSimDriverIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routePath.length) {
            setIsDrivingRoute(false);
            setSimSpeed(0);
            onExternalSpeedUpdate(0, null);
            return prevIndex;
          }

          // Simulate speed profile: accelerate, occasionally speeding above the planned route limits
          let currentTargetSpeed = resolvedRouteLimit - 10;
          
          // Add random speed patterns to simulate road behaviors
          const phase = nextIndex % 60;
          if (phase < 20) {
            // Normal accelerations
            currentTargetSpeed = resolvedRouteLimit - 8;
          } else if (phase >= 20 && phase < 40) {
            // EXCEEDING limit safety warning test phase!
            currentTargetSpeed = resolvedRouteLimit + 14; 
          } else {
            // Slow down
            currentTargetSpeed = resolvedRouteLimit - 25;
          }

          // Apply smooth acceleration physics
          setSimSpeed(prevSpeed => {
            let nextSpeed = prevSpeed + (currentTargetSpeed - prevSpeed) * 0.15;
            if (nextSpeed < 10) nextSpeed = 10;
            onExternalSpeedUpdate(nextSpeed, resolvedRouteLimit);
            return nextSpeed;
          });

          return nextIndex;
        });
    }, 1000); // Ticks every 1s (matching standard telemetry rates)

    return () => clearInterval(interval);
  }, [isDrivingRoute, routePath, simDriverIndex, resolvedRouteLimit]);

  const toggleRouteSimulate = () => {
    if (isDrivingRoute) {
      setIsDrivingRoute(false);
      setSimSpeed(0);
      onExternalSpeedUpdate(0, null);
    } else {
      if (routePath.length === 0) return;
      setSimDriverIndex(0);
      setIsDrivingRoute(true);
      setSimSpeed(30);
    }
  };

  // Center coordinates fallback
  const mapCenter = (isDrivingRoute && routePath[simDriverIndex]) 
    ? { lat: routePath[simDriverIndex].lat(), lng: routePath[simDriverIndex].lng() }
    : (gpsCoords.latitude && gpsCoords.longitude)
    ? { lat: gpsCoords.latitude, lng: gpsCoords.longitude }
    : { lat: 21.0285, lng: 105.8542 }; // Hanoi

  return (
    <div className="p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-6 flex flex-col overflow-hidden">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <MapIcon size={12} className="text-white" /> {t.mapHeader}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTrafficEnabled(!trafficEnabled)}
            className={`px-3 py-1 rounded-lg text-[9px] font-bold font-mono tracking-normal cursor-pointer select-none border transition-all ${
              trafficEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-black'
                : 'bg-black border-white/5 text-neutral-400'
            }`}
          >
            ● {t.trafficDensity}: {trafficEnabled ? t.trafficOn : t.trafficOff}
          </button>
        </div>
      </div>

      {/* Main Map Box Container */}
      <div className="relative h-[280px] w-full rounded-2xl overflow-hidden bg-black border border-white/5">
        
        {/* API PROVIDER REAL MAP */}
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={13}
              mapId="DASHBOARD_LIVE_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
              gestureHandling={'cooperative'}
              disableDefaultUI={true}
            >
              {/* Traffic conditions overlay */}
              <TrafficLayerComponent enabled={trafficEnabled} />

              {/* Draw Route Directions coordinates onto maps */}
              <RouteDisplayComponent 
                origin={routeOrigin} 
                destination={routeDest} 
                onRouteCached={handleRouteCached} 
              />

              {/* Normal static current user placement or simulated vehicle */}
              {isDrivingRoute && routePath[simDriverIndex] && (
                <AdvancedMarker position={{ lat: routePath[simDriverIndex].lat(), lng: routePath[simDriverIndex].lng() }}>
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 animate-ping opacity-60" />
                    <span className="relative flex items-center justify-center p-2 rounded-full bg-cyan-500 border-2 border-white shadow-xl text-black">
                      <Navigation size={14} className="transform rotate-45 animate-pulse" />
                    </span>
                  </div>
                </AdvancedMarker>
              )}

              {!isDrivingRoute && (gpsCoords.latitude && gpsCoords.longitude) && (
                <AdvancedMarker position={{ lat: gpsCoords.latitude, lng: gpsCoords.longitude }}>
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 animate-ping opacity-50" />
                    <span className="relative flex items-center justify-center p-1.5 rounded-full bg-emerald-500 border-2 border-white shadow-xl text-black">
                      <MapPin size={12} />
                    </span>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* MOCK VECTOR GRID MAP if API Provider token is blank */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-neutral-900 to-black select-none font-mono">
            <div className="max-w-[420px] space-y-4">
              <span className="inline-flex p-3 rounded-full bg-white/5 border border-white/10 text-white/40">
                <Sliders size={28} className="animate-pulse" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-neutral-200 uppercase tracking-widest font-sans">{t.bypassGpsWarn}</p>
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  {t.bypassGpsDesc}
                </p>
              </div>
              <div className="p-3 bg-[#121214] border border-white/5 rounded-xl text-[9px] text-neutral-400 text-left space-y-1.5 leading-normal">
                <span className="text-white block font-sans font-bold">{t.howToEnableMap}</span>
                <p>{t.howToStep1}</p>
                <p>{t.howToStep2}</p>
                <p>{t.howToStep3}</p>
              </div>
            </div>
          </div>
        )}

        {/* HUD Overlay HUD (Current velocity and limits) */}
        <div className="absolute top-3 left-3 bg-black/85 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md space-y-0.5 z-40 select-none shadow-xl">
          <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block font-sans">{t.currentGpsSpeed}</span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-black ${isOverLimit ? 'text-red-500' : 'text-white'}`}>
              {Math.round(currentSpeed)}
            </span>
            <span className="text-[8px] text-neutral-500 uppercase">km/h</span>
          </div>
        </div>

        {/* Route context alert */}
        <div className="absolute top-3 right-3 bg-black/85 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md font-sans text-[10px] space-y-1 tracking-tight z-40 shadow-xl max-w-[200px]">
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400 font-bold">{t.routeLimit}</span>
            <span className="font-mono font-black border border-white px-1.5 py-0.5 rounded-md bg-white text-black leading-none">{resolvedRouteLimit} km/h</span>
          </div>
          {isOverLimit && (
            <div className="text-red-400 font-black text-[9px] flex items-center gap-1 animate-pulse">
              <AlertTriangle size={10} /> {t.overLimitTrigger}
            </div>
          )}
        </div>
      </div>

      {/* Preset Route Selections */}
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-neutral-400 tracking-wider block font-sans uppercase">
          {t.presetItineraries}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {GPS_PRESETS.map((preset) => (
            <button
               key={preset.id}
               onClick={() => handleSelectPreset(preset.id)}
               className={`p-3 rounded-xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between min-h-[72px] ${
                 selectedPresetId === preset.id
                   ? 'bg-white border-white text-black font-black'
                   : 'bg-black border-white/5 text-neutral-400 hover:border-white/10 hover:text-white'
               }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[10px] font-bold tracking-tight block truncate pr-1">
                  {preset.name}
                </span>
                <span className={`text-[8px] font-mono border px-1 rounded ${
                  selectedPresetId === preset.id 
                    ? 'border-black text-black font-bold' 
                    : 'border-white/10 text-neutral-500'
                }`}>
                  {preset.limit} km/h
                </span>
              </div>
              <span className={`text-[8px] leading-tight font-medium ${selectedPresetId === preset.id ? 'text-black/65 font-semibold' : 'text-neutral-500'}`}>
                {preset.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Router search form */}
      <form onSubmit={handleCustomPlan} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1">
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wide">{t.originLabel}</label>
          <input
            type="text"
            placeholder={locale === 'vi' ? "Ví dụ: Hoàn Kiếm, Hà Nội" : "e.g., Hoan Kiem, Hanoi"}
            value={customOrigin}
            onChange={(e) => setCustomOrigin(e.target.value)}
            className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white placeholder-neutral-600 font-sans"
          />
        </div>
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wide">{t.destLabel}</label>
          <input
            type="text"
            placeholder={locale === 'vi' ? "Ví dụ: Sân bay Nội Bài" : "e.g., Noi Bai Airport"}
            value={customDest}
            onChange={(e) => setCustomDest(e.target.value)}
            className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white placeholder-neutral-600 font-sans"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full bg-white text-black font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-neutral-200 cursor-pointer select-none h-[34px] border-none font-sans"
          >
            <RouteIcon size={12} />
            {t.planRouteBtn}
          </button>
        </div>
      </form>

      {/* Speed Warnings alerts along planned route controls */}
      <div className="p-4 bg-black border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        <div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none block mb-1">
            {t.simRouteHeader}
          </span>
          <p className="text-[9px] text-neutral-500 leading-relaxed font-sans font-medium">
            {locale === 'vi' 
              ? `Cự ly ước tính: ${routeDistance ? (routeDistance / 1000).toFixed(1) : '--'} km • Hệ thống sẽ chạy ga tự động bám sát cung đường và tự động cảnh báo giọng nói/còi bíp nếu xe lao nhanh quá ${resolvedRouteLimit} km/h.` 
              : `Estimated distance: ${routeDistance ? (routeDistance / 1000).toFixed(1) : '--'} km • The autopilot system will cruise along the planned road vertices and trigger voice/acoustic notifications if speed crosses ${resolvedRouteLimit} km/h.`}
          </p>
        </div>
        <button
          onClick={toggleRouteSimulate}
          disabled={routePath.length === 0}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2 whitespace-nowrap cursor-pointer select-none transition-all ${
            routePath.length === 0
              ? 'bg-neutral-900 text-neutral-500 border border-white/5 cursor-not-allowed'
              : isDrivingRoute
              ? 'bg-red-500 text-white border-2 border-red-400 hover:bg-red-650'
              : 'bg-white text-black font-black hover:bg-neutral-200'
          }`}
        >
          {isDrivingRoute ? (
            <>
              <Square size={12} fill="currentColor" /> {t.endSimRoute}
            </>
          ) : (
            <>
              <Play size={12} fill="currentColor" /> {t.startSimRoute}
            </>
          )}
        </button>
      </div>

    </div>
  );
};
