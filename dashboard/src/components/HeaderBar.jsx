/**
 * @file HeaderBar.jsx
 * @brief Master Header & High-Level KPI Telemetry Bar
 * @details Includes Dual Mode Switcher (HIL Simulator vs WebSerial Hardware Bridge),
 *          Aerospace Brand Identity, and Live Automotive Status Gauges.
 */

import React from 'react';
import {
  Cpu,
  Radio,
  Flame,
  Zap,
  Activity,
  Fan,
  Droplets,
  Gauge,
  ShieldCheck,
  AlertOctagon,
  Usb
} from 'lucide-react';

export default function HeaderBar({
  mode,
  setMode,
  serialStatus,
  onConnectSerial,
  onDisconnectSerial,
  telemetry,
  uptimeStr
}) {
  const {
    state = 'IDLE_MODE',
    temp_filt = 25.0,
    temp_raw = 25.0,
    setpoint = 75.0,
    flap_deg = 0,
    pump = false,
    pwm_pct = 0.0,
    aux_kw = 0.0,
    fault = null
  } = telemetry || {};

  const isFault = state === 'SYSTEM_FAULT' || !!fault;

  return (
    <header className="w-full space-y-3">
      {/* Top Brand & Mode Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-2xl backdrop-blur-md">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-lg text-white tracking-widest">
                AEROTHERM <span className="text-cyan-400">R&D</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold">
                PHASE 2 HYBRID EV
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400">
                ASIL-B ISO 26262
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400">
              Active Venturi Aerodynamics & Closed-Loop Precision Thermal Control
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher & Hardware Bridge */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Mode Toggle Buttons */}
          <div className="flex items-center p-1 rounded-lg bg-black/60 border border-gray-800">
            <button
              onClick={() => setMode('HIL_SIMULATOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                mode === 'HIL_SIMULATOR'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              HIL PHYSICS SIMULATOR
            </button>

            <button
              onClick={() => setMode('HARDWARE_BRIDGE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                mode === 'HARDWARE_BRIDGE'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Usb className="h-3.5 w-3.5" />
              WEBSERIAL HARDWARE BRIDGE
            </button>
          </div>

          {/* WebSerial Connect / Disconnect Action */}
          {mode === 'HARDWARE_BRIDGE' && (
            <div className="flex items-center gap-2">
              {serialStatus === 'CONNECTED' ? (
                <button
                  onClick={onDisconnectSerial}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 rounded font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                  DISCONNECT USB
                </button>
              ) : (
                <button
                  onClick={onConnectSerial}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-900/50 transition-colors"
                >
                  <Usb className="h-3.5 w-3.5" />
                  CONNECT USB SERIAL (115200)
                </button>
              )}
            </div>
          )}

          {/* Uptime clock */}
          <div className="px-2.5 py-1.5 rounded bg-black/40 border border-gray-800 text-gray-400 text-xs">
            CLOCK: <strong className="text-gray-200">{uptimeStr}</strong>
          </div>
        </div>
      </div>

      {/* Primary KPI Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 font-mono">
        {/* Metric 1: Battery Core Temp */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1">
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-cyan-400" /> BATTERY TEMP</span>
            <span className="text-[10px] text-gray-500">RAW: {temp_raw.toFixed(1)}°</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold tracking-tight ${
              isFault ? 'text-red-400' : temp_filt >= 65 ? 'text-amber-400' : 'text-cyan-300'
            }`}>
              {temp_filt.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">°C</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
            <span>SP: {setpoint.toFixed(0)}°C</span>
            <span className={temp_filt > setpoint ? 'text-amber-400' : 'text-emerald-400'}>
              Δ {(temp_filt - setpoint).toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Metric 2: Operational State */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="text-gray-400 text-[11px] mb-1 flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-purple-400" /> SYSTEM STATE
          </div>
          <div className="mt-1">
            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
              isFault
                ? 'bg-red-950/80 text-red-300 border border-red-700 animate-pulse'
                : state === 'ACTIVE_FLUID_LOOP'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600'
                : state === 'PASSIVE_AERO_COOLING'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
            }`}>
              {state}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1.5 truncate">
            {isFault ? 'EMERGENCY SHUTDOWN' : state === 'ACTIVE_FLUID_LOOP' ? 'PID FLUID ACTIVE' : 'ZERO PUMP DRAW'}
          </div>
        </div>

        {/* Metric 3: Venturi Flaps Angle */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="text-gray-400 text-[11px] mb-1 flex items-center gap-1">
            <Fan className="h-3.5 w-3.5 text-cyan-400" /> VENTURI FLAPS
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyan-300">{flap_deg}</span>
            <span className="text-xs text-gray-400">° ({(flap_deg / 90 * 100).toFixed(0)}%)</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {flap_deg === 0 ? 'SEALED (ECO)' : flap_deg >= 90 ? 'FAIL-SAFE (100%)' : 'RAM-AIR DRAFT'}
          </div>
        </div>

        {/* Metric 4: Coolant Pump */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="text-gray-400 text-[11px] mb-1 flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-blue-400" /> 800V FLUID PUMP
          </div>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
              pump ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-gray-800 text-gray-400'
            }`}>
              {pump ? 'CIRCULATING' : 'STANDBY (0W)'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1.5">
            {pump ? 'ACTIVE COOLING LOOP' : 'ZERO AUXILIARY DRAW'}
          </div>
        </div>

        {/* Metric 5: PID Thermal PWM */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="text-gray-400 text-[11px] mb-1 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-purple-400" /> PID PWM DUTY
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-purple-300">{pwm_pct.toFixed(1)}</span>
            <span className="text-xs text-gray-400">%</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            LOCKING AT {setpoint.toFixed(0)}°C
          </div>
        </div>

        {/* Metric 6: Passive Power Saved */}
        <div className="rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-lg">
          <div className="text-gray-400 text-[11px] mb-1 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> AUX POWER SAVED
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-400">+{aux_kw.toFixed(2)}</span>
            <span className="text-xs text-gray-400">kW</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 truncate">
            RAM COOLING VS PUMP
          </div>
        </div>
      </div>
    </header>
  );
}
