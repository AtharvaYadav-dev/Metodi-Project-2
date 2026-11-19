/**
 * @file TelemetryChart.jsx
 * @brief Real-Time Dual-Axis Multi-Trace Oscilloscope
 * @details High-performance memoized oscilloscope plotting Filtered Temp,
 *          Raw ADC Temp, Setpoint, and PID Duty % over a fixed sliding window.
 *          Features 100% container fill via ResizeObserver and dynamic Y-axis auto-scaling.
 */

import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

const TelemetryChart = memo(function TelemetryChart({ history = [], currentSetpoint = 75.0 }) {
  const containerRef = useRef(null);
  const [chartDim, setChartDim] = useState({ width: 0, height: 0 });
  const [scaleMode, setScaleMode] = useState('AUTO'); // 'AUTO' | 'FULL'

  // Measure container dimensions continuously with ResizeObserver to fill 100% of available space
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setChartDim({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute dynamic smart Y-axis temperature domain or full range
  const tempDomain = useMemo(() => {
    if (scaleMode === 'FULL') return [0, 125];

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < history.length; i++) {
      const d = history[i];
      if (typeof d.temp_raw === 'number' && !isNaN(d.temp_raw)) {
        if (d.temp_raw < min) min = d.temp_raw;
        if (d.temp_raw > max) max = d.temp_raw;
      }
      if (typeof d.temp_filt === 'number' && !isNaN(d.temp_filt)) {
        if (d.temp_filt < min) min = d.temp_filt;
        if (d.temp_filt > max) max = d.temp_filt;
      }
      if (typeof d.setpoint === 'number' && !isNaN(d.setpoint)) {
        if (d.setpoint < min) min = d.setpoint;
        if (d.setpoint > max) max = d.setpoint;
      }
    }

    if (min === Infinity || max === -Infinity) {
      min = 25;
      max = currentSetpoint || 75;
    }

    // Pad domain by 3°C below and 5°C above, aligned to 5°C bounds
    const domainMin = Math.max(0, Math.floor((min - 3) / 5) * 5);
    const domainMax = Math.min(130, Math.ceil((max + 5) / 5) * 5);

    // Guarantee minimum 15°C visible span to avoid microscopic noise flutter
    if (domainMax - domainMin < 15) {
      return [Math.max(0, domainMin - 5), domainMin + 15];
    }

    return [domainMin, domainMax];
  }, [history, scaleMode, currentSetpoint]);

  return (
    <div className="w-full flex-1 min-h-[170px] flex flex-col rounded-xl border border-gray-800/80 bg-[#090C15] p-2 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Chart Title, Scale Toggle and Trace Legend */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-800/80 pb-1 mb-1 px-1 flex-shrink-0 gap-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-xs whitespace-nowrap">
            REAL-TIME TELEMETRY OSCILLOSCOPE (10 Hz STREAM)
          </h3>

          {/* Dynamic Scale Mode Switcher */}
          <div className="flex items-center bg-black/60 p-0.5 rounded border border-gray-800 text-[9.5px] font-mono ml-1">
            <button
              onClick={() => setScaleMode('AUTO')}
              className={`px-1.5 py-0.2 rounded transition-colors font-semibold ${
                scaleMode === 'AUTO'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Focus Y-axis tightly on active temperature band"
            >
              AUTO ({tempDomain[0]}–{tempDomain[1]}°C)
            </button>
            <button
              onClick={() => setScaleMode('FULL')}
              className={`px-1.5 py-0.2 rounded transition-colors font-semibold ${
                scaleMode === 'FULL'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Full automotive threshold range 0°C to 125°C"
            >
              FULL (0–125°C)
            </button>
          </div>
        </div>

        {/* Compact Trace Legend */}
        <div className="flex items-center gap-2.5 text-[9.5px] font-mono text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-gray-300">Filt T</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-cyan-300" />
            <span className="text-gray-400">Raw ADC</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-amber-400" />
            <span className="text-amber-300">SP ({currentSetpoint.toFixed(0)}°)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-purple-400 rounded-full" />
            <span className="text-purple-300">PWM %</span>
          </span>
        </div>
      </div>

      {/* ResizeObserver Chart Viewport: 100% height and width fill */}
      <div ref={containerRef} className="w-full flex-1 min-h-[140px] relative overflow-hidden">
        {chartDim.width > 0 && chartDim.height > 0 ? (
          <LineChart
            width={chartDim.width}
            height={chartDim.height}
            data={history}
            margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />

            {/* Left Y Axis: Temperature (°C) with dynamic domain */}
            <YAxis
              yAxisId="temp"
              domain={tempDomain}
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 9, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}°`}
              tickLine={false}
              width={34}
            />

            {/* Right Y Axis: Actuator Duty (0–100%) */}
            <YAxis
              yAxisId="pwm"
              orientation="right"
              domain={[0, 100]}
              stroke="#64748B"
              tick={{ fill: '#C084FC', fontSize: 9, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              width={34}
            />

            <XAxis
              dataKey="time"
              stroke="#475569"
              tick={{ fill: '#64748B', fontSize: 8.5, fontFamily: 'monospace' }}
              tickLine={false}
              minTickGap={28}
            />

            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

            {/* Safety & Threshold Reference Lines (Shown when within visible range) */}
            {tempDomain[0] <= 40.0 && tempDomain[1] >= 40.0 && (
              <ReferenceLine
                yAxisId="temp"
                y={40.0}
                stroke="#0284C7"
                strokeDasharray="4 4"
                label={{ value: 'T1 40°C', fill: '#38BDF8', fontSize: 8.5, position: 'insideTopLeft' }}
              />
            )}
            {tempDomain[0] <= 65.0 && tempDomain[1] >= 65.0 && (
              <ReferenceLine
                yAxisId="temp"
                y={65.0}
                stroke="#D97706"
                strokeDasharray="4 4"
                label={{ value: 'T2 65°C', fill: '#FBBF24', fontSize: 8.5, position: 'insideTopLeft' }}
              />
            )}
            {tempDomain[0] <= 110.0 && tempDomain[1] >= 110.0 && (
              <ReferenceLine
                yAxisId="temp"
                y={110.0}
                stroke="#DC2626"
                strokeDasharray="3 3"
                label={{ value: 'KILL 110°C', fill: '#F87171', fontSize: 8.5, position: 'insideTopLeft' }}
              />
            )}

            {/* Live Data Traces */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_raw"
              stroke="#67E8F9"
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
              opacity={0.65}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_filt"
              stroke="#06B6D4"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="setpoint"
              stroke="#F59E0B"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="pwm"
              type="monotone"
              dataKey="pwm_pct"
              stroke="#C084FC"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 font-mono text-[10px]">
            SYNCHRONIZING TELEMETRY STREAM...
          </div>
        )}
      </div>
    </div>
  );
});

export default TelemetryChart;

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const cleanLabel = String(label || '').replace(/s$/, '');
    return (
      <div className="rounded-md border border-gray-700 bg-[#0F172A]/95 p-2 text-[10.5px] font-mono shadow-2xl backdrop-blur-md">
        <div className="text-gray-400 border-b border-gray-800 pb-0.5 mb-1 font-bold flex justify-between gap-3">
          <span>T: {cleanLabel}s</span>
          <span className="text-cyan-400">{data.state || 'NOMINAL'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div className="text-cyan-300">
            Filt: <strong className="text-white">{(data.temp_filt || 0).toFixed(1)}°C</strong>
          </div>
          <div className="text-cyan-400/80">
            Raw: <strong className="text-white">{(data.temp_raw || 0).toFixed(1)}°C</strong>
          </div>
          <div className="text-amber-400">
            SP: <strong className="text-white">{(data.setpoint || 0).toFixed(0)}°C</strong>
          </div>
          <div className="text-purple-400">
            PWM: <strong className="text-white">{(data.pwm_pct || 0).toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
