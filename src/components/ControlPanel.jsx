/**
 * @file ControlPanel.jsx
 * @brief Live Control & Stress-Test Panel for Founder & Tier-1 Demos
 * @details Sliders for Ambient, Speed, Load, Setpoint;
 *          Live PID Gain Tuners (Kp, Ki, Kd);
 *          One-Click Fault Injection Testing Suite.
 */

import React from 'react';
import {
  Thermometer,
  Gauge,
  Zap,
  Sliders,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Flame,
  Radio
} from 'lucide-react';

export default function ControlPanel({
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
  const handleGainChange = (field, val) => {
    const updated = { ...pidGains, [field]: Number(val) };
    setPidGains(updated);
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
    <div className="w-full rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-sm">
            PHYSICS HIL SIMULATOR & PARAMETER CALIBRATION CONSOLE
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
          {isHardwareMode ? 'HARDWARE CONNECTED' : 'HIL ENGINE ACTIVE (50 Hz)'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ===================================================================
            COLUMN 1: VEHICLE & THERMAL LOAD SLIDERS
        =================================================================== */}
        <div className="space-y-3 bg-[#0D111E]/80 rounded-lg p-3 border border-gray-800/60">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-semibold border-b border-gray-800 pb-1">
            <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> ENVIRONMENTAL & LOAD INPUTS</span>
          </div>

          {/* Ambient Temp Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Ambient Temperature:</span>
              <span className="text-cyan-300 font-bold">{ambientTemp}°C</span>
            </div>
            <input
              type="range"
              min="-10"
              max="50"
              step="1"
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Vehicle Speed Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Vehicle Speed:</span>
              <span className="text-cyan-300 font-bold">{vehicleSpeed} km/h</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={vehicleSpeed}
              onChange={(e) => setVehicleSpeed(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Battery Power Load Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Battery Power Load:</span>
              <span className="text-amber-400 font-bold">{batteryLoad} kW</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="5"
              value={batteryLoad}
              onChange={(e) => setBatteryLoad(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Target Setpoint Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Target Setpoint:</span>
              <span className="text-emerald-400 font-bold">{setpoint}°C</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="1"
              value={setpoint}
              onChange={(e) => setSetpoint(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Driving Scenario Presets */}
          <div className="pt-1">
            <span className="text-[10px] text-gray-400 font-mono block mb-1">TEST PROFILES:</span>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              <button
                onClick={() => applyScenario(35, 18, 24)}
                className="px-1.5 py-1 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                City ECO
              </button>
              <button
                onClick={() => applyScenario(110, 48, 32)}
                className="px-1.5 py-1 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Highway
              </button>
              <button
                onClick={() => applyScenario(170, 130, 38)}
                className="px-1.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 rounded text-amber-300 border border-amber-800/60"
              >
                Track Sprint
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            COLUMN 2: PRECISION PID GAIN TUNERS
        =================================================================== */}
        <div className="space-y-3 bg-[#0D111E]/80 rounded-lg p-3 border border-gray-800/60">
          <div className="flex items-center justify-between text-xs font-mono text-purple-300 font-semibold border-b border-gray-800 pb-1">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> PRECISION PID CLOSED-LOOP TUNING</span>
          </div>

          {/* Kp Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Kp (Proportional Gain):</span>
              <span className="text-purple-300 font-bold">{pidGains.kp.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={pidGains.kp}
              onChange={(e) => handleGainChange('kp', e.target.value)}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          {/* Ki Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Ki (Integral Anti-Windup):</span>
              <span className="text-purple-300 font-bold">{pidGains.ki.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="2.0"
              step="0.02"
              value={pidGains.ki}
              onChange={(e) => handleGainChange('ki', e.target.value)}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          {/* Kd Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Kd (Derivative-on-Meas):</span>
              <span className="text-purple-300 font-bold">{pidGains.kd.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.05"
              value={pidGains.kd}
              onChange={(e) => handleGainChange('kd', e.target.value)}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          {/* PID Gain Presets */}
          <div className="pt-1">
            <span className="text-[10px] text-gray-400 font-mono block mb-1">TUNING PROFILES:</span>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              <button
                onClick={() => applyPidPreset(2.5, 0.4, 0.8)}
                className="px-1.5 py-1 bg-purple-950/40 hover:bg-purple-900/60 rounded text-purple-300 border border-purple-800/60"
              >
                Balanced
              </button>
              <button
                onClick={() => applyPidPreset(5.2, 0.85, 1.6)}
                className="px-1.5 py-1 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Aggressive
              </button>
              <button
                onClick={() => applyPidPreset(1.2, 0.15, 0.35)}
                className="px-1.5 py-1 bg-gray-800/80 hover:bg-gray-700 rounded text-gray-300 border border-gray-700"
              >
                Soft ECO
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================
            COLUMN 3: FAULT INJECTION & SAFETY INTERLOCK TESTING
        =================================================================== */}
        <div className="space-y-2.5 bg-[#0D111E]/80 rounded-lg p-3 border border-gray-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-red-400 font-semibold border-b border-gray-800 pb-1 mb-2">
              <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> HARDWARE SAFETY INTERLOCK TESTS</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mb-2">
              Trigger sub-millisecond safety kill-switch to demonstrate instant fail-safe flap deployment (90°) and 0% PWM shutoff.
            </p>

            <div className="space-y-1.5">
              <button
                onClick={onInjectDisconnect}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/70 text-red-300 rounded font-mono text-xs transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Simulate Sensor Disconnect (&lt; -20°C)
              </button>

              <button
                onClick={onInjectRunaway}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/70 text-rose-200 rounded font-mono text-xs transition-colors"
              >
                <Flame className="h-3.5 w-3.5" />
                Inject Thermal Runaway (115°C)
              </button>

              <button
                onClick={onInjectNoise}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 rounded font-mono text-xs transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Inject ADC Noise Spikes (Filter Test)
              </button>
            </div>
          </div>

          {/* System Reset Button */}
          <div className="pt-2 border-t border-gray-800/80">
            <button
              onClick={onResetSystem}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded font-mono text-xs font-semibold transition-all ${
                isFaulted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 animate-pulse'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset System Safety Interlock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
