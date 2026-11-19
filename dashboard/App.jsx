/**
 * @file App.jsx
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management Console
 * @details Complete real-time visual digital twin and engineering telemetry dashboard
 *          featuring HIL physics simulation, WebSerial hardware bridging, 2D/2.5D
 *          animated thermal schematic, multi-trace oscilloscope, and fault testing suite.
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

  // Primary Telemetry State
  const [telemetry, setTelemetry] = useState(() => simRef.current.getTelemetryPacket());

  // Historical Telemetry for Oscilloscope Graph (Rolling buffer)
  const [history, setHistory] = useState([]);

  // Raw Serial Packets Log for Console Inspector
  const [serialLogs, setSerialLogs] = useState([]);

  // Sliders and Setpoint State
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

  // Master Uptime Clock
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

  // Helper to append telemetry sample to rolling history
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
      return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
    });

    // Append to serial inspector log
    const jsonString = JSON.stringify(packet);
    setSerialLogs((prev) => {
      const updated = [...prev, jsonString];
      return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
    });
  }, []);

  // HIL Physics Loop Timer (Runs at 20Hz = 50ms)
  useEffect(() => {
    if (mode !== 'HIL_SIMULATOR') return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000.0, 0.1);
      lastTime = now;

      const packet = simRef.current.step(dt);
      setTelemetry({ ...packet });
      appendTelemetryHistory(packet);
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
            return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
          });

          setSerialLogs((prev) => {
            const updated = [...prev, rawLine];
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
          });
        },
        (status, msg) => {
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

  // Command Bridge Transmitter (handles both HIL Simulator and WebSerial Hardware)
  const handleSendCommand = (cmdObj) => {
    if (mode === 'HARDWARE_BRIDGE' && serialBridgeRef.current.isConnected) {
      serialBridgeRef.current.sendCommand(cmdObj);
    } else {
      // Execute directly in HIL Simulator
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

  // Fault Injection Button Triggers
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
    <div className="min-h-screen bg-[#07090E] text-gray-200 p-3 md:p-6 space-y-4">
      {/* 1. Master Header Bar & Primary KPIs */}
      <HeaderBar
        mode={mode}
        setMode={setMode}
        serialStatus={serialStatus}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        telemetry={telemetry}
        uptimeStr={formatUptime(uptimeSeconds)}
      />

      {/* 2. Hero Visual: 2D/2.5D Animated Physical Chassis & Thermal Schematic */}
      <ThermalSchematic telemetry={telemetry} />

      {/* 3. Deterministic State Machine Architecture & Energy Badges */}
      <StateMachineViewer
        currentState={telemetry?.state}
        tempFilt={telemetry?.temp_filt}
        auxKw={telemetry?.aux_kw}
        kwhSaved={telemetry?.kwh_saved}
        fault={telemetry?.fault}
      />

      {/* 4. Real-Time Multi-Trace Telemetry Oscilloscope */}
      <TelemetryChart history={history} currentSetpoint={setpoint} />

      {/* 5. Live Control & Stress-Test Panel (Founder / Tier-1 Demo Console) */}
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

      {/* 6. Live Raw JSON Serial Telemetry Stream Inspector */}
      <SerialConsole
        logs={serialLogs}
        onSendCommand={handleSendCommand}
        isHardwareMode={mode === 'HARDWARE_BRIDGE'}
      />

      {/* Engineering Footer */}
      <footer className="border-t border-gray-800/80 pt-3 pb-6 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-gray-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          <span>AeroTherm Phase 2 EV Architecture // Production Bare-Metal Firmware + Digital Twin HIL</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Target: ESP32-WROOM-32 / STM32</span>
          <span>Baud: 115200 8-N-1</span>
          <span>Firmware: PlatformIO (C++17)</span>
        </div>
      </footer>
    </div>
  );
}
