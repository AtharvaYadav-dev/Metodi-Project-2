/**
 * @file App.jsx
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management Console
 * @details 100% Full-Flat Viewport-Locked Engineering Console (h-dvh w-screen overflow-hidden).
 *          Features:
 *          - Hero 3D Isometric EV Skateboard Chassis & Thermal Airflow Visualizer (Three.js WebGL)
 *          - Optional 1-click toggle to 2D CAD cross-section view
 *          - Real-Time Dual-Axis Telemetry Oscilloscope (10Hz sliding window)
 *          - Deterministic State Machine Pipeline & Auxiliary Energy Metrics
 *          - Multi-tab HIL Calibration & Fault Injection Controls
 *          - Isolated non-janking Raw JSON Telemetry Terminal
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeaderBar from './src/components/HeaderBar';
import ThermalSchematic3D from './src/components/ThermalSchematic3D';
import ThermalSchematic from './src/components/ThermalSchematic';
import TelemetryChart from './src/components/TelemetryChart';
import StateMachineViewer from './src/components/StateMachineViewer';
import ControlPanel from './src/components/ControlPanel';
import SerialConsole from './src/components/SerialConsole';

import { HilSimulator } from './src/services/physicsEngine';
import { WebSerialBridge } from './src/services/webSerialBridge';

export default function App() {
  // Operational Mode: 'HIL_SIMULATOR' (Default) or 'HARDWARE_BRIDGE'
  const [mode, setMode] = useState('HIL_SIMULATOR');

  // Hero Visualizer Mode: '3D' (Default) or '2D'
  const [visualMode, setVisualMode] = useState('3D');

  // HIL Physics Engine Instance
  const simRef = useRef(null);
  if (!simRef.current) {
    simRef.current = new HilSimulator();
  }

  // WebSerial Bridge Instance
  const serialBridgeRef = useRef(null);
  if (!serialBridgeRef.current) {
    serialBridgeRef.current = new WebSerialBridge();
  }

  const [serialStatus, setSerialStatus] = useState('DISCONNECTED');

  // Primary Telemetry State (Updated at 10Hz)
  const [telemetry, setTelemetry] = useState(() => simRef.current.getTelemetryPacket());

  // Fixed-size Ring Buffer for Real-Time Oscilloscope (Cap: 120 samples)
  const [history, setHistory] = useState([]);

  // Fixed-size Sliding Window for Serial Terminal (Cap: 60 entries)
  const [serialLogs, setSerialLogs] = useState([]);

  // Control Inputs
  const [ambientTemp, setAmbientTemp] = useState(28);
  const [vehicleSpeed, setVehicleSpeed] = useState(85);
  const [batteryLoad, setBatteryLoad] = useState(35);
  const [setpoint, setSetpoint] = useState(75.0);

  // PID Tuning Gains
  const [pidGains, setPidGains] = useState({
    kp: 2.5,
    ki: 0.4,
    kd: 0.8
  });

  // Uptime formatting
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Sync inputs to HIL physics simulator
  useEffect(() => {
    if (simRef.current) {
      simRef.current.setAmbientTemp(ambientTemp);
      simRef.current.setVehicleSpeed(vehicleSpeed);
      simRef.current.setBatteryLoad(batteryLoad);
      simRef.current.setSetpoint(setpoint);
      simRef.current.setPidGains(pidGains.kp, pidGains.ki, pidGains.kd);
    }
  }, [ambientTemp, vehicleSpeed, batteryLoad, setpoint, pidGains]);

  // Master Clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const formatUptime = (totalSec) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Helper to append telemetry sample into fixed-size ring buffers
  const appendTelemetryHistory = useCallback((packet) => {
    setHistory((prev) => {
      const timeLabel = (packet.ts / 1000.0).toFixed(1);
      const newEntry = {
        time: timeLabel,
        temp_raw: packet.temp_raw,
        temp_filt: packet.temp_filt,
        setpoint: packet.setpoint,
        pwm_pct: packet.pwm_pct,
        state: packet.state,
        pid: packet.pid
      };
      const updated = [...prev, newEntry];
      return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
    });

    const jsonString = JSON.stringify(packet);
    setSerialLogs((prev) => {
      const updated = [...prev, jsonString];
      return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
    });
  }, []);

  // HIL Physics Loop (Deterministic 20Hz step, throttled 10Hz UI push)
  useEffect(() => {
    if (mode !== 'HIL_SIMULATOR') return;

    let lastStepTime = performance.now();
    let lastUiPushTime = 0;

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastStepTime) / 1000.0, 0.1);
      lastStepTime = now;

      // 1. Step the internal physics ODE model at 20Hz (50ms)
      const packet = simRef.current.step(dt);

      // 2. Throttle React UI state updates to 10Hz (every 100ms) with requestAnimationFrame
      if (now - lastUiPushTime >= 100) {
        lastUiPushTime = now;
        requestAnimationFrame(() => {
          setTelemetry(packet);
          appendTelemetryHistory(packet);
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [mode, appendTelemetryHistory]);

  // WebSerial Hardware Connect Handler
  const handleConnectSerial = async () => {
    try {
      await serialBridgeRef.current.connect(
        115200,
        (packet, rawLine) => {
          setTelemetry(packet);
          setHistory((prev) => {
            const timeLabel = ((packet.ts || Date.now()) / 1000.0).toFixed(1);
            const newEntry = {
              time: timeLabel,
              temp_raw: packet.temp_raw,
              temp_filt: packet.temp_filt,
              setpoint: packet.setpoint,
              pwm_pct: packet.pwm_pct,
              state: packet.state,
              pid: packet.pid
            };
            const updated = [...prev, newEntry];
            return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
          });

          setSerialLogs((prev) => {
            const updated = [...prev, rawLine];
            return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
          });
        },
        (status) => {
          setSerialStatus(status);
        }
      );
    } catch (err) {
      alert(`WebSerial Connection Error: ${err.message}`);
    }
  };

  const handleDisconnectSerial = async () => {
    await serialBridgeRef.current.disconnect();
    setSerialStatus('DISCONNECTED');
  };

  // Command Bridge Transmitter
  const handleSendCommand = (cmdObj) => {
    if (mode === 'HARDWARE_BRIDGE' && serialBridgeRef.current.isConnected) {
      serialBridgeRef.current.sendCommand(cmdObj);
    } else {
      if (cmdObj.cmd === 'SET_PID') {
        const { kp, ki, kd } = cmdObj;
        setPidGains({
          kp: kp !== undefined ? kp : pidGains.kp,
          ki: ki !== undefined ? ki : pidGains.ki,
          kd: kd !== undefined ? kd : pidGains.kd
        });
      } else if (cmdObj.cmd === 'SET_SETPOINT') {
        if (cmdObj.setpoint !== undefined) setSetpoint(cmdObj.setpoint);
      } else if (cmdObj.cmd === 'RESET_FAULT') {
        simRef.current.resetFault();
      } else if (cmdObj.cmd === 'INJECT_FAULT') {
        if (cmdObj.type === 'OVERTEMP') simRef.current.injectThermalRunaway();
        else if (cmdObj.type === 'DISCONNECT') simRef.current.injectSensorDisconnect();
      }
    }
  };

  // Fault Injection Triggers
  const handleInjectDisconnect = () => {
    if (mode === 'HARDWARE_BRIDGE') {
      handleSendCommand({ cmd: 'INJECT_FAULT', type: 'DISCONNECT' });
    } else {
      simRef.current.injectSensorDisconnect();
    }
  };

  const handleInjectRunaway = () => {
    if (mode === 'HARDWARE_BRIDGE') {
      handleSendCommand({ cmd: 'INJECT_FAULT', type: 'OVERTEMP' });
    } else {
      simRef.current.injectThermalRunaway();
    }
  };

  const handleInjectNoise = () => {
    if (mode === 'HIL_SIMULATOR') {
      simRef.current.injectNoiseBurst();
    }
  };

  const handleResetSystem = () => {
    if (mode === 'HARDWARE_BRIDGE') {
      handleSendCommand({ cmd: 'RESET_FAULT' });
    } else {
      simRef.current.resetFault();
    }
  };

  const isFaulted = telemetry?.state === 'SYSTEM_FAULT' || !!telemetry?.fault;

  return (
      <div className="h-dvh max-h-dvh w-screen overflow-hidden flex flex-col bg-[#07090E] text-gray-200 p-2 md:p-2.5 space-y-1.5 select-none overscroll-none">
        {/* 1. Master Header & Compact KPI Telemetry Bar */}
        <HeaderBar
          mode={mode}
          setMode={setMode}
          serialStatus={serialStatus}
          onConnectSerial={handleConnectSerial}
          onDisconnectSerial={handleDisconnectSerial}
          telemetry={telemetry}
          uptimeStr={formatUptime(uptimeSeconds)}
        />

            {/* 2. Main Two-Column Viewport with 100% Flat Viewport Lock */}
            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              {/* LEFT COLUMN: Hero 3D Chassis / 2D Schematic + Real-Time Oscilloscope */}
              <div className="lg:col-span-7 flex flex-col min-h-0 gap-1.5 overflow-hidden">
                {/* Hero Visual: 3D EV Skateboard or 2D CAD with 1-Click Toggle */}
                {visualMode === '3D' ? (
                  <ThermalSchematic3D
                    telemetry={telemetry}
                    onToggle2DView={() => setVisualMode('2D')}
                    is3D={true}
                  />
                ) : (
                  <div className="relative flex-1 min-h-[220px] max-h-[380px] flex flex-col">
                    <ThermalSchematic telemetry={telemetry} />
                    <button
                      onClick={() => setVisualMode('3D')}
                      className="absolute top-2 right-2 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[10px] font-mono font-semibold transition-colors z-20"
                    >
                      SWITCH TO 3D ISOMETRIC
                    </button>
                  </div>
                )}

                {/* Real-Time Dual-Axis Oscilloscope */}
                <TelemetryChart history={history} currentSetpoint={setpoint} />
              </div>

              {/* RIGHT COLUMN: State Machine, Calibration Controls & Serial Inspector */}
                <div className="lg:col-span-5 flex flex-col min-h-0 gap-1.5 overflow-y-auto pr-1 overscroll-contain">
                  {/* Deterministic State Machine Architecture & Energy Metrics */}
                  <StateMachineViewer
                    currentState={telemetry?.state}
                    tempFilt={telemetry?.temp_filt}
                    auxKw={telemetry?.aux_kw}
                    kwhSaved={telemetry?.kwh_saved}
                    fault={telemetry?.fault}
                  />

                  {/* HIL Calibration & Fault Injection Controls (Segmented Tabs) */}
                  <ControlPanel
                    ambientTemp={ambientTemp}
                    setAmbientTemp={setAmbientTemp}
                    vehicleSpeed={vehicleSpeed}
                    setVehicleSpeed={setVehicleSpeed}
                    batteryLoad={batteryLoad}
                    setBatteryLoad={setBatteryLoad}
                    setpoint={setpoint}
                    setSetpoint={setSetpoint}
                    pidGains={pidGains}
                    setPidGains={setPidGains}
                    onInjectDisconnect={handleInjectDisconnect}
                    onInjectRunaway={handleInjectRunaway}
                    onInjectNoise={handleInjectNoise}
                    onResetSystem={handleResetSystem}
                    isFaulted={isFaulted}
                    isHardwareMode={mode === 'HARDWARE_BRIDGE'}
                  />

                  {/* Live Raw JSON Serial Telemetry Stream Inspector */}
                  <SerialConsole
                    logs={serialLogs}
                    onSendCommand={handleSendCommand}
                    isHardwareMode={mode === 'HARDWARE_BRIDGE'}
                  />
                </div>
            </main>

            {/* 3. Bottom Slim Engineering Footer */}
              <footer className="flex-shrink-0 border-t border-gray-800/80 pt-1 flex items-center justify-between text-[9.5px] font-mono text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span>AeroTherm Phase 2 EV Thermal Architecture // 3D Digital Twin &amp; HIL Engineering Console</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Target: ESP32 / STM32</span>
                  <span>Baud: 115200 8-N-1</span>
                  <span>Safety: ISO 26262 ASIL-B</span>
                </div>
              </footer>
          </div>
          );
}
