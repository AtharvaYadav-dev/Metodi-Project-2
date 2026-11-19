/**
 * @file App.jsx
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management Console
 * @details High-performance real-time visual digital twin and engineering telemetry dashboard.
 *          Features:
 *          - Viewport-locked layout on desktop with zero runaway vertical growth (h-screen overflow-hidden)
 *          - Two-column ergonomic layout: Hero Visual & Chart (Left) + Pipeline, Controls, Terminal (Right)
 *          - Smooth independent scrolling in right pane without fighting telemetry updates
 *          - Strict fixed-size ring buffers (120 chart samples, 60 serial logs)
 *          - Throttled 10Hz telemetry updates with decoupled 60fps canvas animation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeaderBar from './src/components/HeaderBar';
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
      // Strict ring buffer cap: max 120 samples (~12 seconds of 10Hz data)
      const updated = [...prev, newEntry];
      return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
    });

    const jsonString = JSON.stringify(packet);
    setSerialLogs((prev) => {
      // Strict terminal log cap: max 60 entries (prevents DOM bloating)
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

      // 2. Throttle React UI state updates to 10Hz (every 100ms)
      // This eliminates 50% of React diffing and Recharts recalculations
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
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#07090E] text-gray-200 p-2 md:p-3 space-y-2 select-none">
      {/* 1. Fixed Header & Compact KPI Telemetry Bar */}
      <HeaderBar
        mode={mode}
        setMode={setMode}
        serialStatus={serialStatus}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        telemetry={telemetry}
        uptimeStr={formatUptime(uptimeSeconds)}
      />

      {/* 2. Main Two-Column Viewport with Locked Height & Independent Scrolling */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* LEFT COLUMN: Hero Physical Schematic + Real-Time Oscilloscope */}
        <div className="lg:col-span-7 flex flex-col min-h-0 gap-2 overflow-hidden">
          {/* Hero Visual 2D/2.5D Animated Chassis */}
          <ThermalSchematic telemetry={telemetry} />

          {/* Real-Time Dual-Axis Oscilloscope */}
          <TelemetryChart history={history} currentSetpoint={setpoint} />
        </div>

        {/* RIGHT COLUMN: State Machine, Calibration Controls & Serial Inspector */}
        <div className="lg:col-span-5 flex flex-col min-h-0 gap-2 overflow-y-auto pr-1 overscroll-contain">
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
      <footer className="flex-shrink-0 border-t border-gray-800/80 pt-1 flex items-center justify-between text-[10px] font-mono text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          <span>AeroTherm Phase 2 EV Thermal Architecture // 60fps Digital Twin &amp; HIL Console</span>
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
