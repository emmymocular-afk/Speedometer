/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AreaChart, TrendingUp, HelpCircle } from 'lucide-react';
import { TripPoint } from '../types';

interface TripChartProps {
  history: TripPoint[];
}

export const TripChart: React.FC<TripChartProps> = ({ history }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Take the last 40 data points to keep the chart clean and high-performance
  const chartData = useMemo(() => {
    if (history.length <= 40) return history;
    return history.slice(history.length - 40);
  }, [history]);

  // Find max speed in this dataset to scale the Y-axis (or default scale minimum of 100 km/h)
  const maxVal = useMemo(() => {
    let currentMax = 100;
    chartData.forEach(p => {
      if (p.speed > currentMax) currentMax = p.speed;
      if (p.limit > currentMax) currentMax = p.limit;
    });
    return Math.ceil((currentMax + 20) / 20) * 20; // round up to multiple of 20
  }, [chartData]);

  // Dimension setup for SVG coordinate mapping
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = useMemo(() => {
    if (chartData.length < 2) return [];

    return chartData.map((p, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * chartWidth;
      const y = paddingBottom + ((maxVal - p.speed) / maxVal) * chartHeight; // inverted Y in SVG
      // Invert Y coordinate mathematically: height - calculatedY maps from bottom up
      const correctedY = height - y;
      return { x, y: correctedY, speed: p.speed, limit: p.limit, timestamp: p.timestamp };
    });
  }, [chartData, maxVal, chartWidth, chartHeight, height]);

  // Calculate speed limit coordinates
  const limitPoints = useMemo(() => {
    if (chartData.length < 2) return [];

    return chartData.map((p, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * chartWidth;
      const y = paddingBottom + ((maxVal - p.limit) / maxVal) * chartHeight;
      const correctedY = height - y;
      return { x, y: correctedY };
    });
  }, [chartData, maxVal, chartWidth, chartHeight, height]);

  // Generate SVG Path definition for the outline stroke
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // Generate SVG Path definition for the glowing area gradient fill under line
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    const baseLineY = height - paddingBottom;
    return `${linePath} L ${endX} ${baseLineY} L ${startX} ${baseLineY} Z`;
  }, [points, linePath, height]);

  // Generate boundary limits path (stepped or simple line)
  const limitPath = useMemo(() => {
    if (limitPoints.length === 0) return '';
    return limitPoints.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [limitPoints]);

  // Grid ticks on Y Axis
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = maxVal / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(Math.round(step * i));
    }
    return ticks;
  }, [maxVal]);

  // Handle interactive hovering to map nearest data point
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (points.length === 0) return;
    
    const svgRect = e.currentTarget.getBoundingClientRect();
    // Translate mouse coordinate relative to SVG canvas
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;
    
    // Find nearest point along the X coordinate axis
    let nearestIdx = 0;
    let minDiff = Infinity;
    
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = idx;
      }
    });

    setHoveredIndex(nearestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="flex flex-col p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl overflow-hidden font-mono text-xs text-neutral-300">
      
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase mb-5 pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <AreaChart size={12} className="text-white" /> BIỂU ĐỒ TỐC ĐỘ HÀNH TRÌNH
        </span>
        <span className="text-[9px] text-normal text-neutral-400 hidden sm:inline">
          Cập nhật mỗi giây
        </span>
      </div>

      {chartData.length < 2 ? (
        <div className="h-[180px] w-full flex flex-col items-center justify-center text-center p-4 bg-black rounded-2xl border border-white/5 select-none">
          <TrendingUp size={24} className="text-white mb-2 animate-bounce" />
          <p className="text-xs font-bold text-neutral-200">Không có dữ liệu biểu đồ</p>
          <p className="text-[10px] text-neutral-500 mt-1.5 max-w-[340px]">
            Di chuyển thực tế với thiết bị hoặc kích hoạt chế độ **Giả lập (Simulator)** để bắt đầu vẽ biểu đồ vận tốc hành trình.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          {/* Chart Core Wrapper */}
          <div className="bg-black p-3 rounded-2xl border border-white/5">
            <svg 
              className="w-full h-auto overflow-visible select-none" 
              viewBox={`0 0 ${width} ${height}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Radiant gradient fill under speed outline */}
                <linearGradient id="chartGlowArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid rows */}
              {yTicks.map((tickValue, index) => {
                const ratio = tickValue / maxVal;
                const gridY = height - paddingBottom - ratio * chartHeight;
                return (
                  <g key={`grid-y-${index}`} className="opacity-10">
                    <line 
                      x1={paddingLeft} 
                      y1={gridY} 
                      x2={width - paddingRight} 
                      y2={gridY} 
                      stroke="#ffffff" 
                      strokeWidth="1"
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={gridY + 3} 
                      fill="#ffffff" 
                      fontSize="9" 
                      className="font-mono font-bold"
                      textAnchor="end"
                    >
                      {tickValue}
                    </text>
                  </g>
                );
              })}

              {/* Glowing filled area path */}
              <path 
                d={areaPath} 
                fill="url(#chartGlowArea)" 
                className="transition-all duration-300 ease-out"
              />

              {/* Limit line path (Dashed Amber/Red for maximum safety warning) */}
              <path 
                d={limitPath} 
                fill="none" 
                stroke="#ff4a4a" 
                strokeWidth="1.5" 
                strokeDasharray="3, 3" 
                className="transition-all duration-300 ease-out"
              />

              {/* Outlined speed path (Solid White for the clean premium Swiss dial aesthetic) */}
              <path 
                d={linePath} 
                fill="none" 
                stroke="#ffffff" 
                strokeWidth="2.5" 
                className="transition-all duration-300 ease-out"
              />

              {/* Hover Interactive Slice Line Indicator */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <g>
                  {/* Vertical rule overlay */}
                  <line 
                    x1={points[hoveredIndex].x} 
                    y1={paddingTop} 
                    x2={points[hoveredIndex].x} 
                    y2={height - paddingBottom} 
                    stroke="#ffffff" 
                    strokeWidth="1" 
                    strokeDasharray="2, 2" 
                    opacity="0.3" 
                  />
                  {/* Speed circle locator */}
                  <circle 
                    cx={points[hoveredIndex].x} 
                    cy={points[hoveredIndex].y} 
                    r="5" 
                    fill="#ffffff" 
                    stroke="#000000" 
                    strokeWidth="1.5" 
                  />
                  {/* Limit crosshairs locator on dashed line */}
                  <circle 
                    cx={points[hoveredIndex].x} 
                    cy={limitPoints[hoveredIndex].y} 
                    r="4" 
                    fill="#ff4a4a" 
                    stroke="#000000" 
                    strokeWidth="1.2" 
                  />
                </g>
              )}

              {/* Under-labels */}
              <g className="opacity-30">
                <text x={paddingLeft} y={height - 8} fill="#ffffff" fontSize="8" className="font-bold tracking-widest uppercase" textAnchor="start">Quá khứ</text>
                <text x={width - paddingRight} y={height - 8} fill="#ffffff" fontSize="8" className="font-bold tracking-widest uppercase" textAnchor="end">Hiện tại</text>
              </g>
            </svg>
          </div>

          {/* Dynamic Hover Tooltip Display Panel */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div className="absolute top-1 right-2 bg-black border border-white/10 shadow-xl rounded-xl px-4 py-2.5 text-[10px] space-y-1 backdrop-blur-md z-30 flex items-center gap-4 transition-all duration-150">
              <div>
                <span className="block text-white/40 font-bold uppercase text-[8px] tracking-wider">Tốc độ:</span>
                <span className="text-white font-black text-xs font-mono">
                  {Math.round(points[hoveredIndex].speed)} km/h
                </span>
              </div>
              <div className="border-l border-white/10 pl-4">
                <span className="block text-white/40 font-bold uppercase text-[8px] tracking-wider">Hạn mức:</span>
                <span className="text-red-400 font-black text-xs font-mono">
                  {Math.round(points[hoveredIndex].limit)} km/h
                </span>
              </div>
              <div className="border-l border-white/10 pl-4 hidden sm:block">
                <span className="block text-white/40 font-bold uppercase text-[8px] tracking-wider">Trạng thái:</span>
                <span className={`font-black uppercase tracking-wider text-[10px] ${points[hoveredIndex].speed > points[hoveredIndex].limit ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                  {points[hoveredIndex].speed > points[hoveredIndex].limit ? 'VI PHẠM ⚠️' : 'AN TOÀN'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
