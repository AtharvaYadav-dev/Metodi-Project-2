/**
 * @file TelemetryChart.jsx
 * @brief Real-Time Dual-Axis Multi-Trace Oscilloscope
 * @details High-performance memoized oscilloscope plotting Filtered Temp,
 *          Raw ADC Temp, Setpoint, and PID Duty % over a fixed sliding window.
 */

import React, { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

const TelemetryChart = memo(function TelemetryChart({ history = [], currentSetpoint = 75.0 }) {
  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-800/80 bg-[#090C15] p-2.5 shadow-xl backdrop-blur-md min-h-0 flex-shrink-0">
      {/* Chart Title and Status */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 mb-1 px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-xs">
            REAL-TIME TELEMETRY OSCILLOSCOPE (10 Hz STREAM)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] font-mono text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-cyan-400" /> Filt T
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-cyan-300" /> Raw ADC
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 border-t border-dashed border-amber-400" /> SP
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5 bg-purple-400" /> PWM %
          </span>
        </div>
      </div>

      {/* Recharts Container with strictly constrained height */}
      <div className="w-full h-44 md:h-48 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />

            {/* Left Y Axis: Temperature (°C) */}
            <YAxis
              yAxisId="temp"
              domain={[10, 125]}
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 9.5, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}°`}
            />

            {/* Right Y Axis: Actuator Duty (%) */}
            <YAxis
              yAxisId="pwm"
              orientation="right"
              domain={[0, 100]}
              stroke="#64748B"
              tick={{ fill: '#C084FC', fontSize: 9.5, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}%`}
            />

            <XAxis
              dataKey="time"
              stroke="#475569"
              tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'monospace' }}
              interval="preserveStartEnd"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Safety & Threshold Reference Lines */}
            <ReferenceLine
              yAxisId="temp"
              y={40.0}
              stroke="#0284C7"
              strokeDasharray="4 4"
              label={{ value: 'T1 40°C', fill: '#38BDF8', fontSize: 8.5, position: 'insideTopLeft' }}
            />
            <ReferenceLine
              yAxisId="temp"
              y={65.0}
              stroke="#D97706"
              strokeDasharray="4 4"
              label={{ value: 'T2 65°C', fill: '#FBBF24', fontSize: 8.5, position: 'insideTopLeft' }}
            />
            <ReferenceLine
              yAxisId="temp"
              y={110.0}
              stroke="#DC2626"
              strokeDasharray="3 3"
              label={{ value: 'KILL 110°C', fill: '#F87171', fontSize: 8.5, position: 'insideTopLeft' }}
            />

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
              opacity={0.6}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_filt"
              stroke="#06B6D4"
              strokeWidth={2}
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
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default TelemetryChart;

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-md border border-gray-700 bg-[#0F172A]/95 p-2 text-[10.5px] font-mono shadow-2xl backdrop-blur-md">
        <div className="text-gray-400 border-b border-gray-800 pb-0.5 mb-1 font-bold flex justify-between">
          <span>T: {label}s</span>
          <span className="text-cyan-400">{data.state}</span>
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
