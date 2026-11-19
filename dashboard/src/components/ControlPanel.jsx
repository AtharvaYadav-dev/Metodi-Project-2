/**
 * @file ControlPanel.jsx
 * @brief Live Control & Stress-Test Panel with Compact Segmented Tabs
 * @details Sliders for Ambient, Speed, Load, Setpoint;
 *          Live PID Gain Tuners (Kp, Ki, Kd);
 *          One-Click Fault Injection Testing Suite with zero runaway vertical height.
 */

import React, { useState, memo } from 'react';
import {
  Gauge,
  Zap,
  Sliders,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Flame,
  Radio,
  Layers
} from 'lucide-react';

const ControlPanel = memo(function ControlPanel({
  ambientTemp,
  setAmbientTemp,
  vehicleSpeed,
  setVehicleSpeed,
  batteryLoad,
  setBatteryLoad,
  setpoint,
  setSetpoint,
  pidGains,
  setPidGains,
  onInjectDisconnect,
  onInjectRunaway,
  onInjectNoise,
  onResetSystem,
  isFaulted,
  isHardwareMode
}) {
  const [activeTab, setActiveTab] = useState('ENV_LOAD'); // 'ENV_LOAD' | 'PID' | 'FAULTS' | 'ALL'

  const handleGainChange = (field, val) => {
    setPidGains({ ...pidGains, [field]: Number(val) });
  };

  const applyPidPreset = (kp, ki, kd) => {
    setPidGains({ kp, ki, kd });
  };

  const applyScenario = (spd, load, amb) => {
    setVehicleSpeed(spd);
    setBatteryLoad(load);
    setAmbientTemp(amb);
  };

  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-800/80 bg-[#090C15] p-2.5 shadow-xl backdrop-blur-md min-h-0 flex-shrink-0">
      {/* Header and Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-gray-800/80 pb-1.5 mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-xs">
            HIL CALIBRATION &amp; TEST CONTROLS
          </h3>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 text-[10px] font-mono bg-black/50 p-0.5 rounded border border-gray-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab('ENV_LOAD')}
            className={`px-2 py-0.5 rounded transition-all ${
              activeTab === 'ENV_LOAD'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            ENV &amp; LOAD
          </button>
          <button
            onClick={() => setActiveTab('PID')}
            className={`px-2 py-0.5 rounded transition-all ${
              activeTab === 'PID'
                ? 'bg-purple-600 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            PID TUNER
          </button>
          <button
            onClick={() => setActiveTab('FAULTS')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              activeTab === 'FAULTS'
                ? 'bg-rose-700 text-white font-bold'
                : isFaulted
                ? 'bg-red-950/90 text-red-300 border border-red-700 font-bold animate-pulse'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isFaulted && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping inline-block" />}
            FAULTS
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === 'ALL'
                ? 'bg-gray-700 text-cyan-300 font-bold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="View all control sections together"
          >
            <Layers className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Emergency Active Interlock Banner if Faulted */}
      {isFaulted && (
        <div className="mb-2 p-1.5 px-2 rounded-lg bg-red-950/85 border border-red-600 text-red-200 flex items-center justify-between gap-2 shadow-lg shadow-red-950/50 animate-pulse flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono min-w-0">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
            <span className="font-bold truncate">INTERLOCK TRIPPED</span>
          </div>
          <button
            onClick={onResetSystem}
            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center gap-1 shadow-md shadow-emerald-950/50 whitespace-nowrap transition-transform active:scale-95"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            RESET INTERLOCK
          </button>
        </div>
      )}

      {/* Main Tab Content Viewport with strictly bounded height */}
      <div className="w-full overflow-y-auto min-h-0 max-h-56 pr-1 space-y-2.5 text-xs font-mono">
        {/* ===================================================================
            SECTION 1: ENVIRONMENTAL & LOAD INPUTS
        =================================================================== */}
        {(activeTab === 'ENV_LOAD' || activeTab === 'ALL') && (
          <div className="bg-[#0D111E]/90 rounded-lg p-2.5 border border-gray-800/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-semibold border-b border-gray-800 pb-1">
              <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> DRIVE &amp; THERMAL LOAD</span>
              <span className="text-[10px] text-gray-500">DYNAMIC REAL-TIME</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Ambient Temp */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Ambient:</span>
                  <span className="text-cyan-300 font-bold">{ambientTemp.toFixed(0)}°C</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  step="1"
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Vehicle Speed */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Road Speed:</span>
                  <span className="text-cyan-300 font-bold">{vehicleSpeed.toFixed(0)} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={vehicleSpeed}
                  onChange={(e) => setVehicleSpeed(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Battery Load */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Pack Load:</span>
                  <span className="text-amber-400 font-bold">{batteryLoad.toFixed(0)} kW</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={batteryLoad}
                  onChange={(e) => setBatteryLoad(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Setpoint */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Target SP:</span>
                  <span className="text-emerald-400 font-bold">{setpoint.toFixed(0)}°C</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="1"
                  value={setpoint}
                  onChange={(e) => setSetpoint(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 pt-1 text-[9.5px]">
              <span className="text-gray-500">PRESETS:</span>
              <button
                onClick={() => applyScenario(35, 18, 24)}
                className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                City ECO (35km/h)
              </button>
              <button
                onClick={() => applyScenario(110, 48, 32)}
                className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Highway (110km/h)
              </button>
              <button
                onClick={() => applyScenario(170, 130, 38)}
                className="px-1.5 py-0.5 bg-amber-950/40 hover:bg-amber-900/60 rounded text-amber-300 border border-amber-800/60"
              >
                Track Sprint
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2: PRECISION PID CLOSED-LOOP TUNER
        =================================================================== */}
        {(activeTab === 'PID' || activeTab === 'ALL') && (
          <div className="bg-[#0D111E]/90 rounded-lg p-2.5 border border-gray-800/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-purple-300 font-semibold border-b border-gray-800 pb-1">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> PID CLOSED-LOOP GAIN TUNING</span>
              <span className="text-[10px] text-gray-500">ANTI-WINDUP BOUNDED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Kp */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Kp (Prop):</span>
                  <span className="text-purple-300 font-bold">{pidGains.kp.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={pidGains.kp}
                  onChange={(e) => handleGainChange('kp', e.target.value)}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              {/* Ki */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Ki (Integ):</span>
                  <span className="text-purple-300 font-bold">{pidGains.ki.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="2.0"
                  step="0.02"
                  value={pidGains.ki}
                  onChange={(e) => handleGainChange('ki', e.target.value)}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              {/* Kd */}
              <div>
                <div className="flex justify-between text-[10.5px] mb-0.5">
                  <span className="text-gray-400">Kd (Deriv):</span>
                  <span className="text-purple-300 font-bold">{pidGains.kd.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.05"
                  value={pidGains.kd}
                  onChange={(e) => handleGainChange('kd', e.target.value)}
                  className="w-full h-1 bg-gray-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 pt-1 text-[9.5px]">
              <span className="text-gray-500">PROFILES:</span>
              <button
                onClick={() => applyPidPreset(2.5, 0.4, 0.8)}
                className="px-1.5 py-0.5 bg-purple-950/40 hover:bg-purple-900/60 rounded text-purple-300 border border-purple-800/60"
              >
                Balanced OEM (2.5, 0.4, 0.8)
              </button>
              <button
                onClick={() => applyPidPreset(5.2, 0.85, 1.6)}
                className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Aggressive (5.2, 0.85, 1.6)
              </button>
              <button
                onClick={() => applyPidPreset(1.2, 0.15, 0.35)}
                className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Soft ECO (1.2, 0.15, 0.35)
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 3: FAULT INJECTION & INTERLOCK TESTING
        =================================================================== */}
        {(activeTab === 'FAULTS' || activeTab === 'ALL') && (
          <div className="bg-[#0D111E]/90 rounded-lg p-2.5 border border-gray-800/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-red-400 font-semibold border-b border-gray-800 pb-1">
              <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> HARDWARE SAFETY INTERLOCK TESTS</span>
              <span className="text-[10px] text-gray-500">&lt;1ms CUTOFF DEMO</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                onClick={onInjectDisconnect}
                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/70 text-red-300 rounded text-[10px] transition-colors"
              >
                <AlertTriangle className="h-3 w-3" />
                Sensor Disconnect (&lt;-20°)
              </button>

              <button
                onClick={onInjectRunaway}
                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/70 text-rose-200 rounded text-[10px] transition-colors"
              >
                <Flame className="h-3 w-3" />
                Thermal Runaway (115°C)
              </button>

              <button
                onClick={onInjectNoise}
                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 rounded text-[10px] transition-colors"
              >
                <Radio className="h-3 w-3" />
                Inject Noise Spikes
              </button>
            </div>

            {/* System Reset Button */}
            <div className="pt-1 border-t border-gray-800/60">
              <button
                onClick={onResetSystem}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] font-semibold transition-all ${
                  isFaulted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 animate-pulse'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                Reset System Safety Interlock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ControlPanel;
