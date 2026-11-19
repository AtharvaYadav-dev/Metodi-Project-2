/**
 * @file HeaderBar.jsx
 * @brief Master Header & Compact KPI Telemetry Bar
 * @details Dual Mode Switcher (HIL Simulator vs WebSerial Hardware Bridge),
 *          Aerospace Brand Identity, and Live Automotive Status Tiles.
 */

import React, { memo } from 'react';
import {
  Cpu,
  Radio,
  Flame,
  Zap,
  Activity,
  Fan,
  Droplets,
  ShieldCheck,
  Usb
} from 'lucide-react';

const HeaderBar = memo(function HeaderBar({
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
    <header className="w-full space-y-1.5 flex-shrink-0">
      {/* Top Brand & Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 px-2.5 shadow-xl backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 flex-shrink-0">
            <Cpu className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-heading font-bold text-sm text-white tracking-widest leading-none">
                AEROTHERM <span className="text-cyan-400">R&D</span>
              </h1>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold">
                PHASE 2 EV
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-gray-800/80 text-gray-400">
                ASIL-B ISO 26262
              </span>
            </div>
          </div>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <div className="flex items-center p-0.5 rounded-md bg-black/60 border border-gray-800">
            <button
              onClick={() => setMode('HIL_SIMULATOR')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all ${
                mode === 'HIL_SIMULATOR'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Radio className="h-2.5 w-2.5" />
              HIL SIMULATOR
            </button>

            <button
              onClick={() => setMode('HARDWARE_BRIDGE')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all ${
                mode === 'HARDWARE_BRIDGE'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Usb className="h-2.5 w-2.5" />
              WEBSERIAL BRIDGE
            </button>
          </div>

          {mode === 'HARDWARE_BRIDGE' && (
            <div className="flex items-center gap-1">
              {serialStatus === 'CONNECTED' ? (
                <button
                  onClick={onDisconnectSerial}
                  className="px-2 py-0.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 rounded text-[10px] font-semibold flex items-center gap-1"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  DISCONNECT
                </button>
              ) : (
                <button
                  onClick={onConnectSerial}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-md shadow-emerald-900/50"
                >
                  <Usb className="h-2.5 w-2.5" />
                  CONNECT USB (115200)
                </button>
              )}
            </div>
          )}

          <div className="px-2 py-0.5 rounded bg-black/40 border border-gray-800 text-gray-400 text-[10px]">
            CLOCK: <strong className="text-gray-200">{uptimeStr}</strong>
          </div>
        </div>
      </div>

      {/* KPI Status Strip (6 compact cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 font-mono">
        {/* Metric 1: Battery Temp */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="flex items-center justify-between text-gray-400 text-[9.5px] mb-0.5">
            <span className="flex items-center gap-1"><Flame className="h-2.5 w-2.5 text-cyan-400" /> BATTERY TEMP</span>
            <span className="text-[8.5px] text-gray-500">{temp_raw.toFixed(1)}°</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold tracking-tight ${
              isFault ? 'text-red-400' : temp_filt >= 65 ? 'text-amber-400' : 'text-cyan-300'
            }`}>
              {temp_filt.toFixed(1)}
            </span>
            <span className="text-[9.5px] text-gray-400">°C</span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.2 flex justify-between">
            <span>SP: {setpoint.toFixed(0)}°</span>
            <span className={temp_filt > setpoint ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              Δ {(temp_filt - setpoint).toFixed(1)}°
            </span>
          </div>
        </div>

        {/* Metric 2: State */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="text-gray-400 text-[9.5px] mb-0.5 flex items-center gap-1">
            <Activity className="h-2.5 w-2.5 text-purple-400" /> SYSTEM STATE
          </div>
          <div className="mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold truncate max-w-full ${
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
          <div className="text-[8.5px] text-gray-500 mt-0.5 truncate">
            {isFault ? 'EMERGENCY CUTOFF' : state === 'ACTIVE_FLUID_LOOP' ? 'PID FLUID ACTIVE' : 'ZERO PUMP DRAW'}
          </div>
        </div>

        {/* Metric 3: Venturi Flaps */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="text-gray-400 text-[9.5px] mb-0.5 flex items-center gap-1">
            <Fan className="h-2.5 w-2.5 text-cyan-400" /> VENTURI FLAPS
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-cyan-300">{flap_deg.toFixed(0)}</span>
            <span className="text-[9.5px] text-gray-400">° ({(flap_deg / 90 * 100).toFixed(0)}%)</span>
          </div>
          <div className="text-[8.5px] text-gray-500 mt-0.5 truncate">
            {flap_deg === 0 ? 'SEALED (ECO)' : flap_deg >= 90 ? 'FAIL-SAFE (100%)' : 'RAM DRAFT'}
          </div>
        </div>

        {/* Metric 4: Pump */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="text-gray-400 text-[9.5px] mb-0.5 flex items-center gap-1">
            <Droplets className="h-2.5 w-2.5 text-blue-400" /> 800V FLUID PUMP
          </div>
          <div className="mt-0.5">
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
              pump ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-gray-800 text-gray-400'
            }`}>
              {pump ? 'CIRCULATING' : 'STANDBY (0W)'}
            </span>
          </div>
          <div className="text-[8.5px] text-gray-500 mt-0.5 truncate">
            {pump ? 'ACTIVE LOOP' : 'ZERO AUX DRAW'}
          </div>
        </div>

        {/* Metric 5: PWM */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="text-gray-400 text-[9.5px] mb-0.5 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-purple-400" /> PID PWM DUTY
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-purple-300">{pwm_pct.toFixed(1)}</span>
            <span className="text-[9.5px] text-gray-400">%</span>
          </div>
          <div className="text-[8.5px] text-gray-500 mt-0.5 truncate">
            LOCKING @ {setpoint.toFixed(0)}°C
          </div>
        </div>

        {/* Metric 6: Aux Saved */}
        <div className="rounded-lg border border-gray-800/80 bg-[#090C15] p-1.5 shadow-md">
          <div className="text-gray-400 text-[9.5px] mb-0.5 flex items-center gap-1">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" /> AUX SAVED
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-emerald-400">+{aux_kw.toFixed(2)}</span>
            <span className="text-[9.5px] text-gray-400">kW</span>
          </div>
          <div className="text-[8.5px] text-gray-500 mt-0.5 truncate">
            RAM VS PUMP
          </div>
        </div>
      </div>
    </header>
  );
});

export default HeaderBar;
