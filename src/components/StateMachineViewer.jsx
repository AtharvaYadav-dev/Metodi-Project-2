/**
 * @file StateMachineViewer.jsx
 * @brief Active State Machine Visual Pipeline & Energy Transition Inspector
 * @details Highlights current operational state, transition threshold checklist,
 *          and auxiliary power savings telemetry.
 */

import React from 'react';
import { Activity, ShieldCheck, Zap, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function StateMachineViewer({
  currentState = 'IDLE_MODE',
  tempFilt = 25.0,
  auxKw = 0.0,
  kwhSaved = 0.0,
  fault = null
}) {
  const states = [
    {
      id: 'IDLE_MODE',
      label: 'STATE 0: IDLE_MODE',
      tempRange: 'T < 40.0°C',
      description: 'Flaps 0° sealed, Pump OFF, PWM 0%. 1Hz heartbeat telemetry.',
      color: 'blue'
    },
    {
      id: 'PASSIVE_AERO_COOLING',
      label: 'STATE 1: PASSIVE_AERO',
      tempRange: '40.0°C <= T < 65.0°C',
      description: 'Venturi flaps deploy 0°-90° based on speed & delta. Pump remains OFF (zero aux power draw).',
      color: 'emerald'
    },
    {
      id: 'ACTIVE_FLUID_LOOP',
      label: 'STATE 2: ACTIVE_FLUID_LOOP',
      tempRange: '65.0°C <= T < 110.0°C',
      description: 'Pump ON (800V DC), flaps modulated, closed-loop PID PWM 0-100% targeting 75°C.',
      color: 'amber'
    },
    {
      id: 'SYSTEM_FAULT',
      label: 'STATE 3: SYSTEM_FAULT',
      tempRange: 'T >= 110.0°C or SENSOR ERR',
      description: 'Hardware kill-switch: cut all PWM to 0%, force flaps to fail-safe 90°, emit priority alert.',
      color: 'red'
    }
  ];

  return (
    <div className="w-full rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-sm">
            DETERMINISTIC STATE MACHINE & AUXILIARY ENERGY METRICS
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> AUX POWER SAVED: +{auxKw.toFixed(2)} kW
          </span>
          <span className="text-xs font-mono text-gray-400">
            (Total: <strong className="text-emerald-300">{kwhSaved.toFixed(3)} kWh</strong>)
          </span>
        </div>
      </div>

      {/* State Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        {states.map((st) => {
          const isActive = currentState === st.id;
          return (
            <div
              key={st.id}
              className={`rounded-lg p-2.5 border transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? st.color === 'red'
                    ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/60 ring-1 ring-red-500'
                    : st.color === 'emerald'
                    ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400'
                    : st.color === 'amber'
                    ? 'bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-950/50 ring-1 ring-amber-400'
                    : 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                  : 'bg-[#0D111E]/70 border-gray-800/60 opacity-60'
              }`}
            >
              {isActive && (
                <div className="absolute top-1 right-1">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold mb-1">
                <span className={isActive ? 'text-white' : 'text-gray-400'}>{st.label}</span>
              </div>
              <div className="font-mono text-[10px] text-cyan-300 font-semibold mb-1">
                {st.tempRange}
              </div>
              <p className="font-mono text-[10px] text-gray-400 leading-tight">
                {st.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Transition Matrix Checklist */}
      <div className="bg-[#0D111E]/80 rounded-lg p-2.5 border border-gray-800/60 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
        <div className="flex items-center gap-1.5 text-gray-300">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>INTERLOCK BOUNDS:</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <span className={tempFilt >= 40.0 ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
            T &gt;= 40.0°C [{tempFilt >= 40.0 ? 'TRIPPED' : 'CLEAR'}]
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <span className={tempFilt >= 65.0 ? 'text-amber-400 font-bold' : 'text-gray-500'}>
            T &gt;= 65.0°C [{tempFilt >= 65.0 ? 'TRIPPED' : 'CLEAR'}]
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <span className={tempFilt >= 110.0 ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
            T &gt;= 110.0°C [{tempFilt >= 110.0 ? 'CRITICAL DANGER' : 'SAFE'}]
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={fault ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
            SENSOR: [{fault ? fault : 'CALIBRATED & NORMAL'}]
          </span>
        </div>
      </div>
    </div>
  );
}
