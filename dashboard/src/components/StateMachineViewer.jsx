/**
 * @file StateMachineViewer.jsx
 * @brief Active State Machine Visual Pipeline & Energy Transition Inspector
 * @details Compact telemetry card design with GPU-accelerated transitions,
 *          clear interlock bounds, and zero layout shift.
 */

import React, { memo } from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

const StateMachineViewer = memo(function StateMachineViewer({
  currentState = 'IDLE_MODE',
  tempFilt = 25.0,
  auxKw = 0.0,
  kwhSaved = 0.0,
  fault = null
}) {
  const states = [
    {
      id: 'IDLE_MODE',
      label: 'S0: IDLE',
      tempRange: 'T < 40.0°C',
      description: 'Flaps 0°, Pump OFF, PWM 0%. 1Hz heartbeat.',
      color: 'blue'
    },
    {
      id: 'PASSIVE_AERO_COOLING',
      label: 'S1: PASSIVE AERO',
      tempRange: '40°C <= T < 65°C',
      description: 'Flaps 0°-90° ram scoop. Pump OFF (0W Aux).',
      color: 'emerald'
    },
    {
      id: 'ACTIVE_FLUID_LOOP',
      label: 'S2: FLUID LOOP',
      tempRange: '65°C <= T < 110°C',
      description: 'Pump ON (800V DC), PID PWM (Lock 75°C).',
      color: 'amber'
    },
    {
      id: 'SYSTEM_FAULT',
      label: 'S3: FAULT',
      tempRange: 'T >= 110°C / ERR',
      description: 'Kill PWM 0%, Flaps 90° fail-safe.',
      color: 'red'
    }
  ];

  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-800/80 bg-[#090C15] p-2.5 shadow-xl backdrop-blur-md min-h-0 flex-shrink-0">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-xs">
            DETERMINISTIC STATE PIPELINE &amp; ENERGY METRICS
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
            <Zap className="h-3 w-3" /> AUX SAVED: +{(auxKw || 0).toFixed(2)} kW
          </span>
          <span className="text-[10px] text-gray-400">
            ({(kwhSaved || 0).toFixed(3)} kWh)
          </span>
        </div>
      </div>

      {/* State Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2 flex-shrink-0">
        {states.map((st) => {
          const isActive = currentState === st.id;
          return (
            <div
              key={st.id}
              className={`rounded-lg p-2 border transition-all duration-200 relative overflow-hidden gpu-layer ${
                isActive
                  ? st.color === 'red'
                    ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950/60 ring-1 ring-red-500'
                    : st.color === 'emerald'
                    ? 'bg-emerald-950/40 border-emerald-400 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400'
                    : st.color === 'amber'
                    ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-950/50 ring-1 ring-amber-400'
                    : 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400'
                  : 'bg-[#0D111E]/70 border-gray-800/60 opacity-60'
              }`}
            >
              {isActive && (
                <div className="absolute top-1 right-1">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
                  </span>
                </div>
              )}
              <div className="font-mono text-[10.5px] font-bold truncate">
                <span className={isActive ? 'text-white' : 'text-gray-400'}>{st.label}</span>
              </div>
              <div className="font-mono text-[9.5px] text-cyan-300 font-semibold truncate">
                {st.tempRange}
              </div>
              <p className="font-mono text-[9px] text-gray-400 leading-tight truncate mt-0.5">
                {st.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Interlock Checklist Strip */}
      <div className="bg-[#0D111E]/80 rounded p-1.5 border border-gray-800/60 flex flex-wrap items-center justify-between text-[10px] font-mono gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 text-gray-300">
          <ShieldCheck className="h-3 w-3 text-cyan-400" />
          <span>BOUNDS:</span>
        </div>
        <span className={tempFilt >= 40.0 ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
          &gt;= 40°C [{tempFilt >= 40.0 ? 'TRIPPED' : 'CLEAR'}]
        </span>
        <span className={tempFilt >= 65.0 ? 'text-amber-400 font-bold' : 'text-gray-500'}>
          &gt;= 65°C [{tempFilt >= 65.0 ? 'TRIPPED' : 'CLEAR'}]
        </span>
        <span className={tempFilt >= 110.0 ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
          &gt;= 110°C [{tempFilt >= 110.0 ? 'CRITICAL' : 'SAFE'}]
        </span>
        <span className={fault ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
          SENSOR: [{fault ? 'FAULT' : 'NORMAL'}]
        </span>
      </div>
    </div>
  );
});

export default StateMachineViewer;
