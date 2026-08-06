/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  Trash2, 
  Award, 
  Zap, 
  Play, 
  Square,
  ChevronsUpDown,
  Car,
  Bike
} from 'lucide-react';
import { TripRecord, VehicleType } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

interface TripHistoryProps {
  currentSpeed: number;
  activeLimit: number;
  vehicleType: VehicleType;
  isOverLimit: boolean;
  historyList: TripRecord[];
  onAddTrip: (trip: TripRecord) => void;
  onClearHistory: () => void;
  onDeleteTrip: (id: string) => void;
  locale: Locale;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  currentSpeed,
  activeLimit,
  vehicleType,
  isOverLimit,
  historyList,
  onAddTrip,
  onClearHistory,
  onDeleteTrip,
  locale
}) => {
  const t = TRANSLATIONS[locale];
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [recordMaxSpeed, setRecordMaxSpeed] = useState(0);
  const [recordSpeeds, setRecordSpeeds] = useState<number[]>([]);
  const [recordViolations, setRecordViolations] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'dist-desc' | 'dist-asc'>('date-desc');

  // Physics Ticker while recording (updates once a second)
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      setRecordSpeeds(prev => [...prev, currentSpeed]);
      if (currentSpeed > recordMaxSpeed) {
        setRecordMaxSpeed(currentSpeed);
      }
      if (isOverLimit) {
        setRecordViolations(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, currentSpeed, recordMaxSpeed, isOverLimit]);

  // Start trip log session
  const handleStartRecording = () => {
    setIsRecording(true);
    setStartTime(Date.now());
    setRecordMaxSpeed(currentSpeed);
    setRecordSpeeds([currentSpeed]);
    setRecordViolations(isOverLimit ? 1 : 0);
    setTimeElapsed(0);
  };

  // Terminate trip log session and compile record
  const handleStopRecording = () => {
    if (!startTime) return;
    setIsRecording(false);

    // Calculate details
    const endTime = Date.now();
    const duration = timeElapsed > 0 ? timeElapsed : 1;
    
    // Average speed
    const sum = recordSpeeds.reduce((a, b) => a + b, 0);
    const avg = recordSpeeds.length > 0 ? sum / recordSpeeds.length : currentSpeed;
    
    // Distance ticked = avg speed * hours
    const distanceVal = avg * (duration / 3600);

    const newTrip: TripRecord = {
      id: Math.random().toString(36).substr(2, 9),
      startTime,
      endTime,
      duration,
      distance: distanceVal > 0.01 ? distanceVal : 0.05,
      avgSpeed: Math.round(avg),
      maxSpeed: Math.round(recordMaxSpeed),
      violationsCount: recordViolations,
      vehicleType: vehicleType
    };

    onAddTrip(newTrip);
    setStartTime(null);
  };

  // Total driving metrics computations
  const totalTrips = historyList.length;
  const totalDistance = historyList.reduce((acc, t) => acc + t.distance, 0);
  const overallMaxSpeed = historyList.reduce((max, t) => Math.max(max, t.maxSpeed), 0);
  const totalViolations = historyList.reduce((acc, t) => acc + t.violationsCount, 0);
  const totalDuration = historyList.reduce((acc, t) => acc + t.duration, 0);

  // Overall Average Speed calculation weighted by trip duration
  const totalAverage = totalDuration > 0
    ? historyList.reduce((sum, t) => sum + (t.avgSpeed * t.duration), 0) / totalDuration
    : 0;

  // Pattern intelligence analysis summary localized directly
  const getSafetySummary = () => {
    if (totalTrips === 0) {
      return { 
        title: locale === 'vi' ? 'Chưa có thông số hành trình' : 'No Trip Data Recorded', 
        desc: locale === 'vi' ? 'Nhấn Bắt đầu hành trình trên để bắt đầu tích lũy dữ liệu an toàn.' : 'Tap "Start Flight/Trip" above to begin collecting safety profile analytics.', 
        level: 'neutral' 
      };
    }
    
    const violationRate = totalViolations / totalTrips;

    if (violationRate === 0) {
      return { 
        title: locale === 'vi' ? 'Lái Xe Chuẩn Mực 🎖️' : 'Prefect Driving Score 🎖️', 
        desc: locale === 'vi' ? 'Hành trình của bạn đạt trạng thái an toàn tuyệt hảo. Không hề ghi nhận bất kỳ cảnh báo quá tốc độ nào.' : 'Outstanding! Your speed records show superb compliance. No exceedings alert logged.', 
        level: 'excellent' 
      };
    } else if (violationRate < 0.8) {
      return { 
        title: locale === 'vi' ? 'An Toàn & Ổn Định 👍' : 'Safe & Compliant 👍', 
        desc: locale === 'vi' ? 'Dữ liệu di chuyển rất tốt. Đôi khi có trường hợp vượt giới hạn nhẹ nhưng biết chủ động giảm tốc kịp thời.' : 'Excellent drive log. Minor speed boundary blips found, but corrected immediately with prompt throttle release.', 
        level: 'good' 
      };
    } else if (violationRate < 2.5) {
      return { 
        title: locale === 'vi' ? 'Nhắc Nhở Cảnh Giác ⚠️' : 'Caution Advised ⚠️', 
        desc: locale === 'vi' ? 'Tần suất bíp cảnh báo của bạn bắt đầu tăng. Hãy luôn chú ý kỹ tới các mốc biển báo đô thị để lái xe ôn hòa hơn.' : 'Overspeed triggers count is rising. Restrict accelerator pedal action and observe speed regulation signs.', 
        level: 'warning' 
      };
    } else {
      return { 
        title: locale === 'vi' ? 'Nguy Cơ Phạt Nguội Quốc Gia Rất Cao 🚨' : 'Critical Fine Risk Detected 🚨', 
        desc: locale === 'vi' ? 'Số liệu chỉ ra hành trình liên tục phóng nhanh quá hạn cho phép. Bạn cần nhanh chóng điều chỉnh ga để tránh rủi ro bảo hiểm và phạt nguội.' : 'Violations tally indicates speeding. Immediate speed control needed to prevent severe traffic citations.', 
        level: 'critical' 
      };
    }
  };

  const adviceRule = getSafetySummary();

  // Sorting Handler
  const sortedHistory = [...historyList].sort((a, b) => {
    if (sortBy === 'date-desc') return b.startTime - a.startTime;
    if (sortBy === 'date-asc') return a.startTime - b.startTime;
    if (sortBy === 'dist-desc') return b.distance - a.distance;
    if (sortBy === 'dist-asc') return a.distance - b.distance;
    return 0;
  });

  // Humanize duration values
  const formatSecs = (secs: number) => {
    if (secs < 60) return locale === 'vi' ? `${secs} giây` : `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return remainder > 0 
      ? (locale === 'vi' ? `${mins}p ${remainder}s` : `${mins}m ${remainder}s`) 
      : (locale === 'vi' ? `${mins} phút` : `${mins} mins`);
  };

  return (
    <div className="p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-6 flex flex-col overflow-hidden">
      
      {/* Title Header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <History size={12} className="text-white" /> {t.tripHistoryHeader}
        </span>
        <span className="text-[9px] text-neutral-500 font-mono">
          {t.localSavedHistory} ({historyList.length})
        </span>
      </div>

      {/* Row 1: Active Trip Recording Controller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="p-4 bg-black border border-white/5 rounded-2xl flex flex-col justify-between min-h-[140px] md:col-span-1">
          <div>
            <span className="text-[9px] font-bold text-white/40 block uppercase tracking-widest font-mono">{t.tripRecorder}</span>
            <span className="text-[11px] font-bold text-neutral-200 block mt-0.5">TRIP RECORDER PANEL</span>
            
            {isRecording && (
              <div className="mt-2 flex items-center gap-1.5 text-red-500 font-bold text-[10px] animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                {t.recordingActive} {formatSecs(timeElapsed)}
              </div>
            )}
            {!isRecording && (
              <span className="text-[9px] text-neutral-500 block mt-2 font-mono leading-relaxed">
                {t.recordingHelp}
              </span>
            )}
          </div>

          <div className="pt-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="w-full bg-white text-black font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-200 cursor-pointer select-none border-none font-sans font-bold"
              >
                <Play size={11} fill="currentColor" /> {t.startTrip}
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-full bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-red-600 cursor-pointer select-none border-none font-sans animate-pulse"
              >
                <Square size={11} fill="currentColor" /> {t.endTrip}
              </button>
            )}
          </div>
        </div>

        {/* Live Trip status counters under recording state */}
        <div className="p-4 bg-black border border-white/5 rounded-2xl md:col-span-2 grid grid-cols-3 gap-2 items-center">
          <div className="text-center">
            <span className="text-[8px] text-neutral-500 uppercase tracking-wider block">{t.recordingSpeed}</span>
            <span className="text-lg font-mono font-black text-white block truncate">
              {Math.round(currentSpeed)} <span className="text-[9px] text-neutral-600 uppercase font-medium">km/h</span>
            </span>
          </div>

          <div className="text-center border-l border-white/5">
            <span className="text-[8px] text-neutral-500 uppercase tracking-wider block">{t.peakMaxSpeed}</span>
            <span className="text-lg font-mono font-black text-white block truncate">
              {isRecording ? Math.round(recordMaxSpeed) : '--'} <span className="text-[9px] text-neutral-600 uppercase font-medium">km/h</span>
            </span>
          </div>

          <div className="text-center border-l border-white/5">
            <span className="text-[8px] text-neutral-500 uppercase tracking-wider block">{t.overlimitBeeps}</span>
            <span className={`text-lg font-mono font-black block truncate ${recordViolations > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
              {isRecording ? recordViolations : '--'} <span className="text-[9px] text-neutral-600 uppercase font-medium">{t.times}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Stats driving pattern summary over time */}
      <div className="p-5 bg-black border border-white/5 rounded-2xl space-y-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          <Award size={13} className="text-white" /> {t.accumulatedMetricsHeader}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <span className="text-[8px] text-neutral-500 uppercase block font-mono">{t.totalKm}</span>
            <span className="text-lg font-mono font-black text-white block">
              {totalDistance.toFixed(2)} <span className="text-[9px] text-neutral-500 font-medium font-sans">Km</span>
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] text-neutral-500 uppercase block font-mono">{t.peakSpeed}</span>
            <span className="text-lg font-mono font-black text-white block">
              {overallMaxSpeed} <span className="text-[9px] text-neutral-500 font-medium font-sans">km/h</span>
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] text-neutral-500 uppercase block font-mono">{t.overallAvgSpeed}</span>
            <span className="text-lg font-mono font-black text-white block">
              {Math.round(totalAverage)} <span className="text-[9px] text-neutral-500 font-medium font-sans">km/h</span>
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] text-neutral-500 uppercase block font-mono">{t.speedingRate}</span>
            <span className="text-lg font-mono font-black text-white block">
              {totalTrips > 0 ? `${((totalViolations / totalTrips) * 10).toFixed(0)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Intelligence analysis commentary box */}
        <div className={`p-4 rounded-xl border flex gap-3 ${
          adviceRule.level === 'excellent' 
            ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-300'
            : adviceRule.level === 'good'
            ? 'bg-emerald-950/5 border-emerald-500/10 text-emerald-400'
            : adviceRule.level === 'warning'
            ? 'bg-amber-950/10 border-amber-500/20 text-amber-300'
            : 'bg-red-950/10 border-red-500/20 text-red-300'
        }`}>
          <div className="pt-0.5">
            <Zap size={15} />
          </div>
          <div className="font-sans space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider">{adviceRule.title}</div>
            <p className="text-[10px] leading-relaxed opacity-85 font-medium">{adviceRule.desc}</p>
          </div>
        </div>
      </div>

      {/* Row 3: Trip history table layout */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
            {t.tripHistoryLogs}
          </span>

          {/* Sort selection widgets */}
          <div className="flex items-center gap-1 px-2 py-1 bg-black border border-white/5 rounded-xl text-[9px] text-neutral-400 font-bold select-none whitespace-nowrap">
            <ChevronsUpDown size={9} />
            <span>{t.sortByLabel}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none focus:outline-none pr-1 pl-0.5 font-bold text-white cursor-pointer"
            >
              <option value="date-desc" className="bg-[#0F0F11]">{t.sortNewest}</option>
              <option value="date-asc" className="bg-[#0F0F11]">{t.sortOldest}</option>
              <option value="dist-desc" className="bg-[#0F0F11]">{t.sortLongest}</option>
              <option value="dist-asc" className="bg-[#0F0F11]">{t.sortShortest}</option>
            </select>
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="p-8 border border-dashed border-white/5 bg-black rounded-2xl text-center flex flex-col items-center justify-center space-y-1">
            <Calendar size={18} className="text-neutral-600" />
            <span className="text-xs font-bold text-neutral-405 block">{t.noHistory}</span>
            <p className="text-[9px] text-neutral-500 max-w-[280px]">{t.noHistoryHelp}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
            {sortedHistory.map((trip) => {
              const formattedDate = new Date(trip.startTime).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit'
              });

              return (
                <div 
                  key={trip.id}
                  className="p-3.5 bg-black border border-white/5 rounded-xl hover:border-white/10 transition-all flex items-center justify-between gap-4 font-mono text-[10px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-[#121214] border border-white/5 rounded-xl text-neutral-400 flex items-center justify-center shrink-0">
                      {trip.vehicleType === 'car' ? <Car size={13} /> : <Bike size={13} />}
                    </span>
                    <div className="space-y-0.5 text-left">
                      <span className="text-neutral-400 font-sans font-bold block">{formattedDate}</span>
                      <p className="text-[9px] text-neutral-500 leading-none">
                        {t.durationPrefix}: {formatSecs(trip.duration)} • {t.avgSpeedPrefix}: {trip.avgSpeed} km/h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-0.5">
                      <span className="text-xs font-bold text-white block">
                        {trip.distance.toFixed(2)} <span className="text-[8px] text-neutral-500 uppercase font-medium">Km</span>
                      </span>
                      <span className="text-[9px] font-black text-neutral-400 block font-mono">
                        Max: {trip.maxSpeed} km/h
                      </span>
                    </div>

                    <button
                      onClick={() => onDeleteTrip(trip.id)}
                      className="p-2 bg-neutral-900 border border-white/5 text-neutral-500 hover:text-red-400 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                      title={locale === 'vi' ? 'Xóa bản ghi' : 'Delete Log'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedHistory.length > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={onClearHistory}
              className="py-1.5 px-3 bg-[#121214] border border-white/5 text-[9px] font-bold text-neutral-400 hover:text-red-400 hover:border-red-500/20 rounded-lg transition-all cursor-pointer font-sans"
            >
              {t.clearHistoryBtn}
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
