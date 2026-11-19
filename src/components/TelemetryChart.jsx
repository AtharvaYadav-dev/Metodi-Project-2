/**
 * @file TelemetryChart.jsx
 * @brief Real-Time Dual-Axis Multi-Trace Oscilloscope
 * @details Plots Raw Temp, Filtered Temp, Setpoint, and PID PWM Duty %
 *          with threshold reference lines for T1 (40°C), T2 (65°C), and T_CRIT (110°C).
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export default function TelemetryChart({ history, currentSetpoint = 75.0 }) {
  return (
    <div className="w-full rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-xl backdrop-blur-md">
      {/* Chart Title and Status */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-sm">
            REAL-TIME MULTI-TRACE TELEMETRY OSCILLOSCOPE (10 Hz STREAM)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-cyan-400" /> Filtered T
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-cyan-200" /> Raw ADC T
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-amber-400" /> Setpoint
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-400" /> PWM Duty
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />

            {/* Left Y Axis: Temperature (°C) */}
            <YAxis
              yAxisId="temp"
              domain={[10, 125]}
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}°C`}
            />

            {/* Right Y Axis: Actuator Duty (%) */}
            <YAxis
              yAxisId="pwm"
              orientation="right"
              domain={[0, 100]}
              stroke="#64748B"
              tick={{ fill: '#C084FC', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${v}%`}
            />

            <XAxis
              dataKey="time"
              stroke="#475569"
              tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }}
              interval="preserveStartEnd"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Safety & Threshold Reference Lines */}
            <ReferenceLine
              yAxisId="temp"
              y={40.0}
              stroke="#0284C7"
              strokeDasharray="4 4"
              label={{ value: 'T1 (40°C) AERO', fill: '#38BDF8', fontSize: 9, position: 'insideTopLeft' }}
            />
            <ReferenceLine
              yAxisId="temp"
              y={65.0}
              stroke="#D97706"
              strokeDasharray="4 4"
              label={{ value: 'T2 (65°C) PUMP', fill: '#FBBF24', fontSize: 9, position: 'insideTopLeft' }}
            />
            <ReferenceLine
              yAxisId="temp"
              y={110.0}
              stroke="#DC2626"
              strokeDasharray="3 3"
              label={{ value: 'T_CRIT (110°C) KILL', fill: '#F87171', fontSize: 9, position: 'insideTopLeft' }}
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
              opacity={0.65}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temp_filt"
              stroke="#06B6D4"
              strokeWidth={2.5}
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
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-gray-700 bg-[#0F172A]/95 p-2.5 text-xs font-mono shadow-2xl backdrop-blur-md">
        <div className="text-gray-400 border-b border-gray-800 pb-1 mb-1 font-bold">
          T: {label}s | State: <span className="text-cyan-400">{data.state}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="text-cyan-300">
            Filt Temp: <strong className="text-white">{data.temp_filt?.toFixed(2)}°C</strong>
          </div>
          <div className="text-cyan-400/80">
            Raw ADC: <strong className="text-white">{data.temp_raw?.toFixed(2)}°C</strong>
          </div>
          <div className="text-amber-400">
            Setpoint: <strong className="text-white">{data.setpoint?.toFixed(1)}°C</strong>
          </div>
          <div className="text-purple-400">
            PWM Duty: <strong className="text-white">{data.pwm_pct?.toFixed(1)}%</strong>
          </div>
          {data.pid && (
            <div className="col-span-2 text-[10px] text-gray-400 pt-1 border-t border-gray-800">
              PID Terms: P:{data.pid.p} | I:{data.pid.i} | D:{data.pid.d}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
