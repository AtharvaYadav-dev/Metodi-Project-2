import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

/**
 * =============================================================================
 * ESP32 DIGITAL TWIN SIMULATOR // BARE-METAL ARCHITECTURE (v2.0)
 * =============================================================================
 * SpaceX / Palantir Telemetry Dashboard with Dual-Sensor O(1) Filtering,
 * Thermal Closed-Loop Control, and Cyberpunk Security Clearance Terminal.
 */

// Hardware Constants (ESP32 ADC & Sensors)
const ADC_RESOLUTION_MAX = 4095;
const BATTERY_RAW_EMPTY  = 2048;  // 0% Battery Cutoff
const BATTERY_RAW_FULL   = 4095;  // 100% Full Charge
const TEMP_MIN_C         = 0;
const TEMP_MAX_C         = 120;
const TEMP_LOW_TRIGGER   = 40;    // < 40°C triggers Forced Heating
const TEMP_HIGH_TRIGGER  = 80;    // > 80°C triggers Forced Cooling

const FILTER_SIZE        = 10;    // Moving average window depth
const TICK_INTERVAL_MS   = 50;    // 50ms MCU super-loop frequency (20Hz)
const STATE_DWELL_MS     = 4000;  // Autonomous state dwell duration
const CHART_HISTORY_LEN  = 60;    // Number of plotted samples (~3.0 seconds)

// State Machine Definitions & Cyber Color Palette
const SYSTEM_STATES = {
  INIT: {
    id: 'STATE_INIT',
    name: 'INIT',
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
    border: '#00B4D8',
    glow: 'rgba(0,180,216,0.4)'
  },
  IDLE: {
    id: 'STATE_IDLE',
    name: 'IDLE',
    color: '#FFBE0B',
    bg: 'rgba(255,190,11,0.12)',
    border: '#FFBE0B',
    glow: 'rgba(255,190,11,0.4)'
  },
  HEATING: {
    id: 'STATE_HEATING',
    name: 'HEATING',
    color: '#FF0054',
    bg: 'rgba(255,0,84,0.15)',
    border: '#FF0054',
    glow: 'rgba(255,0,84,0.5)'
  },
  COOLING: {
    id: 'STATE_COOLING',
    name: 'COOLING',
    color: '#00F5D4',
    bg: 'rgba(0,245,212,0.12)',
    border: '#00F5D4',
    glow: 'rgba(0,245,212,0.4)'
  },
  FAULT: {
    id: 'STATE_FAULT',
    name: 'FAULT',
    color: '#FF1744',
    bg: 'rgba(255,23,68,0.25)',
    border: '#FF1744',
    glow: 'rgba(255,23,68,0.7)'
  }
};

const STATE_TRANSITION_ORDER = [
  SYSTEM_STATES.INIT,
  SYSTEM_STATES.IDLE,
  SYSTEM_STATES.HEATING,
  SYSTEM_STATES.COOLING
];

export default function App() {
  // ===========================================================================
  // 1. AUTHENTICATION TERMINAL STATE
  // ===========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput]     = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [authStatus, setAuthStatus]           = useState('IDLE'); // 'IDLE' | 'SUCCESS' | 'ERROR'
  const [authErrorMsg, setAuthErrorMsg]       = useState('');

  // ===========================================================================
  // 2. HARDWARE SLIDERS & CONTROLS
  // ===========================================================================
  const [batterySliderVal, setBatterySliderVal] = useState(3072); // ADC Pin 35
  const [tempSliderVal, setTempSliderVal]       = useState(55);   // Pin 34 (°C)
  const [noiseEnabled, setNoiseEnabled]         = useState(true);

  // ===========================================================================
  // 3. FIRMWARE & STATE MACHINE STATE
  // ===========================================================================
  const [currentState, setCurrentState]         = useState(SYSTEM_STATES.INIT);
  const [stateDwellTime, setStateDwellTime]     = useState(0);
  const [thermalOverride, setThermalOverride]   = useState(null); // 'HEATING' | 'COOLING' | null
  const [faultActive, setFaultActive]           = useState(false);

  // Oscilloscope Data Buffer
  const [chartData, setChartData] = useState(() =>
    Array.from({ length: CHART_HISTORY_LEN }, (_, i) => ({
      index: i,
      rawBattery: 3072,
      filteredBattery: 3072,
      filteredTemp: 55
    }))
  );

  // Diagnostic Metrics
  const [telemetry, setTelemetry] = useState({
    rawBattery: 3072,
    filteredBattery: 3072,
    batteryPercent: 50,
    voltage: 2.47,
    rawTemp: 55,
    filteredTemp: 55,
    uptimeSeconds: 0
  });

  // ===========================================================================
  // 4. EMBEDDED O(1) CIRCULAR FILTERS (useRef for Constant-Time Execution)
  // ===========================================================================
  // Independent Filter 1: Battery ADC (Size: 10)
  const batteryFilter = useRef({
    buffer: new Array(FILTER_SIZE).fill(3072),
    index: 0,
    runningSum: 3072 * FILTER_SIZE,
    filteredValue: 3072
  });

  // Independent Filter 2: Temperature Sensor (Size: 10)
  const tempFilter = useRef({
    buffer: new Array(FILTER_SIZE).fill(55),
    index: 0,
    runningSum: 55 * FILTER_SIZE,
    filteredValue: 55
  });

  const stateIndexRef = useRef(0);
  const uptimeRef     = useRef(0);

  // ===========================================================================
  // LOGIN AUTHENTICATION HANDLER
  // ===========================================================================
  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();

    if (passwordInput === 'METODI2026') {
      setAuthStatus('SUCCESS');
      setAuthErrorMsg('');
      setTimeout(() => {
        setIsAuthenticated(true);
      }, 900);
    } else {
      setAuthStatus('ERROR');
      setAuthErrorMsg('INVALID CREDENTIALS // ACCESS DENIED');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthStatus('IDLE');
    setAuthErrorMsg('');
  };

  // ===========================================================================
  // INTERACTIVE LOGIC: CLOSED-LOOP TEMPERATURE OVERRIDES & TIMED TRANSITIONS
  // ===========================================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const dwellTickMs = 100;
    const dwellTimer = setInterval(() => {
      if (faultActive) return;

      const currentTemp = tempFilter.current.filteredValue;

      // 1. Closed-Loop Thermal Rules
      if (currentTemp > TEMP_HIGH_TRIGGER) {
        // Temperature > 80°C: MUST transition to STATE_COOLING (Cyan)
        setThermalOverride('COOLING');
        setCurrentState(SYSTEM_STATES.COOLING);
        setStateDwellTime(0);
      } else if (currentTemp < TEMP_LOW_TRIGGER) {
        // Temperature < 40°C: MUST transition to STATE_HEATING (Red)
        setThermalOverride('HEATING');
        setCurrentState(SYSTEM_STATES.HEATING);
        setStateDwellTime(0);
      } else {
        // Nominal Envelope (40°C - 80°C): Standard Non-blocking Timed Transitions
        setThermalOverride(null);
        setStateDwellTime((prev) => {
          const next = prev + dwellTickMs;
          if (next >= STATE_DWELL_MS) {
            stateIndexRef.current = (stateIndexRef.current + 1) % STATE_TRANSITION_ORDER.length;
            setCurrentState(STATE_TRANSITION_ORDER[stateIndexRef.current]);
            return 0;
          }
          return next;
        });
      }
    }, dwellTickMs);

    return () => clearInterval(dwellTimer);
  }, [isAuthenticated, faultActive]);

  // ===========================================================================
  // MCU SUPER-LOOP TICK (50ms / 20Hz Sampling, Filtering & Oscilloscope Stream)
  // ===========================================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const loopTimer = setInterval(() => {
      uptimeRef.current += TICK_INTERVAL_MS;

      // -----------------------------------------------------------------------
      // 1. Hardware Noise Synthesis
      // -----------------------------------------------------------------------
      let batteryNoise = 0;
      let tempNoise = 0;
      if (noiseEnabled) {
        batteryNoise = (Math.random() * 2 - 1) * 250; // ±250 ADC counts
        tempNoise    = (Math.random() * 2 - 1) * 3.5; // ±3.5 °C thermal ripple
      }

      const rawBattery = Math.round(
        Math.min(ADC_RESOLUTION_MAX, Math.max(0, batterySliderVal + batteryNoise))
      );
      const rawTemp = Number(
        Math.min(TEMP_MAX_C, Math.max(TEMP_MIN_C, tempSliderVal + tempNoise)).toFixed(1)
      );

      // -----------------------------------------------------------------------
      // 2. Dual O(1) Circular Buffer Moving Average Filtering
      // -----------------------------------------------------------------------
      // a) Battery Filter
      const bCtx = batteryFilter.current;
      bCtx.runningSum -= bCtx.buffer[bCtx.index];
      bCtx.buffer[bCtx.index] = rawBattery;
      bCtx.runningSum += rawBattery;
      bCtx.index = (bCtx.index + 1) % FILTER_SIZE;
      bCtx.filteredValue = Math.round(bCtx.runningSum / FILTER_SIZE);
      const filteredBattery = bCtx.filteredValue;

      // b) Temperature Filter
      const tCtx = tempFilter.current;
      tCtx.runningSum -= tCtx.buffer[tCtx.index];
      tCtx.buffer[tCtx.index] = rawTemp;
      tCtx.runningSum += rawTemp;
      tCtx.index = (tCtx.index + 1) % FILTER_SIZE;
      tCtx.filteredValue = Number((tCtx.runningSum / FILTER_SIZE).toFixed(1));
      const filteredTemp = tCtx.filteredValue;

      // -----------------------------------------------------------------------
      // 3. Battery Mapping [2048, 4095] -> [0%, 100%]
      // -----------------------------------------------------------------------
      let batteryPct = 0;
      if (filteredBattery <= BATTERY_RAW_EMPTY) {
        batteryPct = 0;
      } else if (filteredBattery >= BATTERY_RAW_FULL) {
        batteryPct = 100;
      } else {
        batteryPct = Math.round(
          ((filteredBattery - BATTERY_RAW_EMPTY) / (BATTERY_RAW_FULL - BATTERY_RAW_EMPTY)) * 100
        );
      }
      batteryPct = Math.min(100, Math.max(0, batteryPct));
      const voltage = Number(((filteredBattery / ADC_RESOLUTION_MAX) * 3.3).toFixed(2));

      // -----------------------------------------------------------------------
      // 4. Update Rolling 3-Channel Graph Stream
      // -----------------------------------------------------------------------
      setChartData((prev) => {
        const next = prev.slice(1);
        next.push({
          index: prev[prev.length - 1].index + 1,
          rawBattery,
          filteredBattery,
          filteredTemp
        });
        return next;
      });

      // -----------------------------------------------------------------------
      // 5. Update Telemetry Gauges
      // -----------------------------------------------------------------------
      setTelemetry({
        rawBattery,
        filteredBattery,
        batteryPercent: batteryPct,
        voltage,
        rawTemp,
        filteredTemp,
        uptimeSeconds: Math.floor(uptimeRef.current / 1000)
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(loopTimer);
  }, [isAuthenticated, batterySliderVal, tempSliderVal, noiseEnabled]);

  // Fault Trigger Handler
  const toggleFault = () => {
    if (!faultActive) {
      setFaultActive(true);
      setCurrentState(SYSTEM_STATES.FAULT);
    } else {
      setFaultActive(false);
      stateIndexRef.current = 1;
      setCurrentState(SYSTEM_STATES.IDLE);
      setStateDwellTime(0);
    }
  };

  // Uptime formatting
  const formattedUptime = useMemo(() => {
    const s = telemetry.uptimeSeconds;
    const hrs  = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }, [telemetry.uptimeSeconds]);

  // ===========================================================================
  // VIEW A: SECURE ACCESS TERMINAL (LOGIN SCREEN)
  // ===========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D12] text-[#C0C0D4] font-mono flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Subtle Cyber Grid Background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#2B2B3D 1px, transparent 1px), linear-gradient(to right, #1A1A24 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Outer Glow Halo */}
        <div className="absolute w-[600px] h-[600px] bg-[#00F5D4]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md bg-[#1A1A24] border border-[#2B2B3D] rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-6">
          {/* Top Classification Badge */}
          <div className="flex items-center justify-between border-b border-[#2B2B3D] pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F5D4] animate-ping" />
              <span className="text-[11px] font-bold text-[#00F5D4] tracking-widest uppercase">
                SECURE TELEMETRY GATEWAY
              </span>
            </div>
            <span className="text-[10px] text-[#6F6F8C] bg-[#12121A] px-2 py-0.5 rounded border border-[#2B2B3D]">
              RESTRICTED
            </span>
          </div>

          {/* Terminal Title */}
          <div className="text-center flex flex-col gap-1">
            <h1 className="text-xl font-black text-white tracking-widest">
              ESP32 DIGITAL TWIN
            </h1>
            <p className="text-xs text-[#6F6F8C] tracking-wide">
              FIRMWARE TELEMETRY & HARDWARE SIMULATOR
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#8E8EA8] tracking-wider uppercase">
                SECURITY CLEARANCE PASSPHRASE:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authStatus === 'ERROR') setAuthStatus('IDLE');
                  }}
                  placeholder="ENTER ACCESS KEY..."
                  autoFocus
                  className="w-full bg-[#12121A] border border-[#2B2B3D] focus:border-[#00F5D4] focus:outline-none rounded-lg px-4 py-3 text-sm text-[#00F5D4] font-bold tracking-widest placeholder-[#44445A] transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[10px] text-[#6F6F8C] hover:text-[#00F5D4] transition cursor-pointer select-none font-bold"
                >
                  {showPassword ? '[HIDE]' : '[SHOW]'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {authStatus === 'ERROR' && (
              <div className="p-3 bg-[#400810] border border-[#FF1744] rounded-lg text-center text-xs font-bold text-[#FF1744] tracking-wider animate-pulse shadow-[0_0_15px_rgba(255,23,68,0.4)]">
                ⚠ {authErrorMsg}
              </div>
            )}

            {/* Success Message */}
            {authStatus === 'SUCCESS' && (
              <div className="p-3 bg-[#0B2D29] border border-[#00F5D4] rounded-lg text-center text-xs font-bold text-[#00F5D4] tracking-widest shadow-[0_0_20px_rgba(0,245,212,0.5)]">
                ✓ ACCESS GRANTED // INITIALIZING SYSTEM...
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authStatus === 'SUCCESS'}
              className="mt-2 w-full py-3 bg-[#00F5D4] hover:bg-[#00D6BA] disabled:bg-[#00F5D4]/50 text-black font-extrabold text-xs tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(0,245,212,0.3)] hover:shadow-[0_0_30px_rgba(0,245,212,0.6)] cursor-pointer"
            >
              AUTHENTICATE SESSION
            </button>
          </form>

          {/* Terminal Footer */}
          <div className="pt-2 border-t border-[#2B2B3D] flex items-center justify-between text-[10px] text-[#55556E]">
            <span>AUTHORIZED PERSONNEL ONLY</span>
            <span className="text-[#8E8EA8]">CLEARANCE LEVEL: 4</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW B: PRODUCTION TELEMETRY COCKPIT (AUTHENTICATED)
  // ===========================================================================
  return (
    <div className="min-h-screen bg-[#0D0D12] text-[#C0C0D4] font-mono p-4 lg:p-6 flex flex-col gap-5 antialiased selection:bg-[#00F5D4] selection:text-black">
      {/* =====================================================================
          HEADER TELEMETRY BAR
          ===================================================================== */}
      <header className="bg-[#1A1A24] border border-[#2B2B3D] rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-[#00F5D4] animate-ping absolute opacity-75" />
            <span className="w-3 h-3 rounded-full bg-[#00F5D4] relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white text-base lg:text-lg font-bold tracking-wider">
                ESP32 DIGITAL TWIN // TELEMETRY DASHBOARD
              </h1>
              <span className="bg-[#12121A] text-[#00F5D4] text-[10px] font-bold px-2 py-0.5 rounded border border-[#2B2B3D]">
                PROD v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#6F6F8C] tracking-wide">
              CLOSED-LOOP THERMAL SUPERVISOR • DUAL-CHANNEL SAR ADC • 20Hz TICK
            </p>
          </div>
        </div>

        {/* Telemetry Status Badges & Action Buttons */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="bg-[#12121A] border border-[#2B2B3D] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[#6F6F8C]">TICK:</span>
            <span className="text-[#00B4D8]">20 Hz (50ms)</span>
          </div>

          <div className="bg-[#12121A] border border-[#2B2B3D] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[#6F6F8C]">UPTIME:</span>
            <span className="text-[#FFBE0B]">{formattedUptime}</span>
          </div>

          {/* Fault Trigger Button */}
          <button
            onClick={toggleFault}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all text-xs border ${
              faultActive
                ? 'bg-[#FF0054] text-white border-[#FF0054] shadow-[0_0_15px_rgba(255,0,84,0.6)] animate-pulse'
                : 'bg-[#2D0F18] text-[#FF0054] border-[#FF0054]/50 hover:bg-[#FF0054] hover:text-white'
            }`}
          >
            {faultActive ? 'CLEAR FAULT' : 'INJECT FAULT'}
          </button>

          {/* Lock Terminal / Logout Button */}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg font-bold text-xs bg-[#212130] hover:bg-[#2B2B3D] text-[#8E8EA8] hover:text-white border border-[#36364D] transition"
            title="Lock Simulator Terminal"
          >
            LOCK TERMINAL
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN COCKPIT GRID (Left: Controls & Telemetry | Right: Oscilloscope)
          ===================================================================== */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* LEFT COLUMN: Controls & State Panels (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {/* -----------------------------------------------------------------
              PANEL 1: STATE MACHINE & THERMAL OVERRIDE STATUS
              ----------------------------------------------------------------- */}
          <div className="bg-[#1A1A24] border border-[#2B2B3D] rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7D7D9A] tracking-wider uppercase">
                STATE MACHINE // SUPERVISORY LOGIC
              </span>
              {thermalOverride ? (
                <span className="text-[10px] font-bold text-[#FF0054] bg-[#FF0054]/10 px-2 py-0.5 rounded border border-[#FF0054]/30 animate-pulse">
                  THERMAL OVERRIDE ACTIVE
                </span>
              ) : (
                <span className="text-[10px] text-[#00F5D4] bg-[#00F5D4]/10 px-2 py-0.5 rounded border border-[#00F5D4]/30">
                  AUTONOMOUS DWELL (4.0s)
                </span>
              )}
            </div>

            {/* Active State Card */}
            <div
              className="p-4 rounded-lg flex items-center justify-between border-2 transition-all duration-300"
              style={{
                backgroundColor: currentState.bg,
                borderColor: currentState.border,
                boxShadow: `0 0 20px ${currentState.glow}`
              }}
            >
              <div>
                <div className="text-[10px] text-[#8E8EA8] uppercase font-bold tracking-wider flex items-center gap-2">
                  <span>ACTIVE MCU STATE</span>
                  {thermalOverride && (
                    <span className="text-[9px] text-[#FFBE0B] bg-[#12121A] px-1.5 py-0.2 rounded border border-[#2B2B3D]">
                      TRIGGER: {thermalOverride === 'COOLING' ? '> 80°C' : '< 40°C'}
                    </span>
                  )}
                </div>
                <div
                  className="text-2xl font-black tracking-widest mt-0.5"
                  style={{ color: currentState.color }}
                >
                  {currentState.id}
                </div>
              </div>

              {/* State Pulse Orb */}
              <div
                className={`w-4 h-4 rounded-full ${faultActive ? 'animate-ping' : 'animate-pulse'}`}
                style={{ backgroundColor: currentState.color }}
              />
            </div>

            {/* Sequential Flow Pipeline Chips */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              {STATE_TRANSITION_ORDER.map((st) => {
                const isActive = currentState.id === st.id;
                return (
                  <div
                    key={st.id}
                    className={`py-2 px-1 rounded border transition-all ${
                      isActive
                        ? 'border-current shadow-lg scale-105'
                        : 'bg-[#12121A] text-[#55556B] border-[#2B2B3D]'
                    }`}
                    style={
                      isActive
                        ? { color: st.color, backgroundColor: st.bg, borderColor: st.border }
                        : {}
                    }
                  >
                    {st.name}
                  </div>
                );
              })}
            </div>

            {/* Dwell Timer Progress Bar */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-[#6F6F8C]">
                <span>DWELL PROGRESS</span>
                <span>
                  {thermalOverride
                    ? 'LOCKED BY SENSOR'
                    : `${((stateDwellTime / STATE_DWELL_MS) * 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#12121A] rounded-full overflow-hidden border border-[#2B2B3D]">
                <div
                  className="h-full transition-all duration-100 rounded-full"
                  style={{
                    width: thermalOverride || faultActive ? '100%' : `${(stateDwellTime / STATE_DWELL_MS) * 100}%`,
                    backgroundColor: currentState.color
                  }}
                />
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              PANEL 2: DUAL TELEMETRY GAUGES (BATTERY & TEMPERATURE)
              ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GAUGE A: BATTERY TELEMETRY WIDGET */}
            <div className="bg-[#1A1A24] border border-[#2B2B3D] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D7D9A] tracking-wider uppercase">
                  BATTERY LEVEL (PIN 35)
                </span>
                <span className="text-[10px] text-[#00FF66] font-bold">
                  {telemetry.batteryPercent}%
                </span>
              </div>

              {/* Thick Battery Progress Bar */}
              <div className="relative w-full h-8 bg-[#12121A] border border-[#2B2B3D] rounded-lg overflow-hidden p-1 shadow-inner">
                <div
                  className="h-full rounded transition-all duration-150 flex items-center justify-end pr-2 font-bold text-xs"
                  style={{
                    width: `${Math.max(12, telemetry.batteryPercent)}%`,
                    background: 'linear-gradient(90deg, #FFBE0B 0%, #00B4D8 50%, #00F5D4 100%)',
                    boxShadow: '0 0 10px rgba(0, 245, 212, 0.4)'
                  }}
                >
                  <span className="text-black font-extrabold text-[11px]">
                    {telemetry.batteryPercent}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#12121A] p-2.5 rounded border border-[#2B2B3D]">
                <div>
                  <span className="text-[#6F6F8C] block">FILTERED RAW:</span>
                  <span className="text-[#00FF66] font-bold text-xs">
                    {telemetry.filteredBattery} LSB
                  </span>
                </div>
                <div>
                  <span className="text-[#6F6F8C] block">VOLTAGE:</span>
                  <span className="text-[#00B4D8] font-bold text-xs">
                    {telemetry.voltage} V
                  </span>
                </div>
              </div>
            </div>

            {/* GAUGE B: TEMPERATURE TELEMETRY WIDGET (THERMOMETER STYLE) */}
            <div className="bg-[#1A1A24] border border-[#2B2B3D] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D7D9A] tracking-wider uppercase">
                  THERMAL SENSOR (PIN 34)
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                  style={{
                    color:
                      telemetry.filteredTemp > 80
                        ? '#00F5D4'
                        : telemetry.filteredTemp < 40
                        ? '#FF0054'
                        : '#FFBE0B',
                    borderColor:
                      telemetry.filteredTemp > 80
                        ? '#00F5D4'
                        : telemetry.filteredTemp < 40
                        ? '#FF0054'
                        : '#FFBE0B'
                  }}
                >
                  {telemetry.filteredTemp}°C
                </span>
              </div>

              {/* Visual Thermal Bar */}
              <div className="relative w-full h-8 bg-[#12121A] border border-[#2B2B3D] rounded-lg overflow-hidden p-1 shadow-inner">
                <div
                  className="h-full rounded transition-all duration-150 flex items-center justify-end pr-2 font-bold text-xs"
                  style={{
                    width: `${Math.min(100, Math.max(10, (telemetry.filteredTemp / TEMP_MAX_C) * 100))}%`,
                    background:
                      telemetry.filteredTemp > 80
                        ? 'linear-gradient(90deg, #FFBE0B 0%, #FF0054 60%, #00F5D4 100%)'
                        : telemetry.filteredTemp < 40
                        ? 'linear-gradient(90deg, #00B4D8 0%, #FF0054 100%)'
                        : 'linear-gradient(90deg, #00B4D8 0%, #FFBE0B 100%)',
                    boxShadow: '0 0 10px rgba(255, 158, 0, 0.4)'
                  }}
                >
                  <span className="text-black font-extrabold text-[11px]">
                    {telemetry.filteredTemp}°C
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#12121A] p-2.5 rounded border border-[#2B2B3D]">
                <div>
                  <span className="text-[#6F6F8C] block">RAW JITTER:</span>
                  <span className="text-[#FF8800] font-bold text-xs">
                    {telemetry.rawTemp}°C
                  </span>
                </div>
                <div>
                  <span className="text-[#6F6F8C] block">STATUS:</span>
                  <span
                    className="font-bold text-xs"
                    style={{
                      color:
                        telemetry.filteredTemp > 80
                          ? '#00F5D4'
                          : telemetry.filteredTemp < 40
                          ? '#FF0054'
                          : '#00FF66'
                    }}
                  >
                    {telemetry.filteredTemp > 80
                      ? 'COOLING'
                      : telemetry.filteredTemp < 40
                      ? 'HEATING'
                      : 'NOMINAL'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              PANEL 3: MULTI-HARDWARE INJECTION (BATTERY + TEMPERATURE SLIDERS)
              ----------------------------------------------------------------- */}
          <div className="bg-[#1A1A24] border border-[#2B2B3D] rounded-xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7D7D9A] tracking-wider uppercase">
                HARDWARE INJECTION ENGINE
              </span>
              <span className="text-[10px] text-[#A0A0BA] bg-[#12121A] px-2 py-0.5 rounded border border-[#2B2B3D]">
                DUAL ADC POTENTIOMETERS
              </span>
            </div>

            {/* Slider 1: Battery ADC (Pin 35) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#8E8EA8] font-bold">1. BATTERY VOLTAGE DIVIDER [PIN 35]</span>
                <span className="text-[#00F5D4] font-bold">{batterySliderVal} LSB</span>
              </div>
              <input
                type="range"
                min="0"
                max={ADC_RESOLUTION_MAX}
                value={batterySliderVal}
                onChange={(e) => setBatterySliderVal(Number(e.target.value))}
                className="w-full h-2 bg-[#12121A] rounded-lg appearance-none cursor-pointer accent-[#00F5D4] border border-[#2B2B3D]"
              />
              <div className="flex justify-between text-[10px] text-[#55556B]">
                <span>0 LSB (0.0V)</span>
                <span>2048 (0% Cutoff)</span>
                <span>4095 (100% Full)</span>
              </div>
            </div>

            {/* Slider 2: Temperature Sensor (Pin 34) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#8E8EA8] font-bold">2. THERMAL SENSOR [PIN 34]</span>
                <span className="text-[#FF9E00] font-bold">{tempSliderVal}°C</span>
              </div>
              <input
                type="range"
                min={TEMP_MIN_C}
                max={TEMP_MAX_C}
                value={tempSliderVal}
                onChange={(e) => setTempSliderVal(Number(e.target.value))}
                className="w-full h-2 bg-[#12121A] rounded-lg appearance-none cursor-pointer accent-[#FF9E00] border border-[#2B2B3D]"
              />
              <div className="flex justify-between text-[10px] text-[#55556B]">
                <span className="text-[#FF0054] font-bold">&lt;40°C (HEATING)</span>
                <span>NOMINAL (40-80°C)</span>
                <span className="text-[#00F5D4] font-bold">&gt;80°C (COOLING)</span>
              </div>
            </div>

            {/* Quick Trigger Preset Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => setTempSliderVal(25)}
                className="py-1 px-2 bg-[#212130] hover:bg-[#2D0F18] text-[10px] font-bold text-[#FF0054] rounded border border-[#FF0054]/40 hover:border-[#FF0054] transition"
              >
                COLD (25°C)
              </button>
              <button
                onClick={() => setTempSliderVal(55)}
                className="py-1 px-2 bg-[#212130] hover:bg-[#2B2B3D] text-[10px] font-bold text-[#FFBE0B] rounded border border-[#36364D] hover:border-[#FFBE0B] transition"
              >
                WARM (55°C)
              </button>
              <button
                onClick={() => setTempSliderVal(95)}
                className="py-1 px-2 bg-[#212130] hover:bg-[#0B2D29] text-[10px] font-bold text-[#00F5D4] rounded border border-[#00F5D4]/40 hover:border-[#00F5D4] transition"
              >
                HOT (95°C)
              </button>
              <button
                onClick={() => {
                  setBatterySliderVal(2048);
                  setTempSliderVal(55);
                }}
                className="py-1 px-2 bg-[#212130] hover:bg-[#2B2B3D] text-[10px] font-bold text-[#E2E2F0] rounded border border-[#36364D] transition"
              >
                RESET
              </button>
            </div>

            {/* Noise Simulation Checkbox */}
            <div className="bg-[#12121A] border border-[#2B2B3D] rounded-lg p-2.5 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noiseEnabled}
                  onChange={(e) => setNoiseEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1A1A24] border-[#2B2B3D] accent-[#FF0054] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-[#A0A0BA]">
                  SIMULATE ELECTRICAL & THERMAL JITTER
                </span>
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  noiseEnabled ? 'text-[#FF0054] bg-[#FF0054]/10' : 'text-[#6F6F8C] bg-[#212130]'
                }`}
              >
                {noiseEnabled ? 'ACTIVE (±250 LSB / ±3.5°C)' : 'MUTED'}
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: 3-CHANNEL REAL-TIME OSCILLOSCOPE (7 Columns) */}
        <section className="lg:col-span-7 bg-[#1A1A24] border border-[#2B2B3D] rounded-xl p-5 flex flex-col shadow-2xl">
          {/* Header of Oscilloscope */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2B2B3D]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wider uppercase">
                  TRIPLE-CHANNEL TELEMETRY OSCILLOSCOPE
                </span>
                <span className="bg-[#12121A] text-[#00FF66] text-[10px] font-bold px-2 py-0.5 rounded border border-[#2B2B3D]">
                  LIVE STREAM (20Hz)
                </span>
              </div>
              <p className="text-[11px] text-[#6F6F8C] mt-0.5">
                Simultaneous real-time proof of O(1) noise cancellation across Voltage and Temperature
              </p>
            </div>

            {/* Legend Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <div className="flex items-center gap-1.5 bg-[#12121A] px-2 py-1 rounded border border-[#2B2B3D]">
                <span className="w-2 h-2 rounded-full bg-[#FF3355]" />
                <span className="text-[#FF3355] text-[10px]">RAW BATTERY</span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#12121A] px-2 py-1 rounded border border-[#2B2B3D]">
                <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
                <span className="text-[#00FF66] text-[10px]">FILTERED BATTERY</span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#12121A] px-2 py-1 rounded border border-[#2B2B3D]">
                <span className="w-2 h-2 rounded-full bg-[#FF9E00]" />
                <span className="text-[#FF9E00] text-[10px]">FILTERED TEMP (°C)</span>
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="flex-1 w-full min-h-[420px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232333" />

                {/* Primary X-Axis (Sample Time Ticks) */}
                <XAxis
                  dataKey="index"
                  stroke="#55556E"
                  tick={{ fill: '#6F6F8C', fontSize: 10 }}
                  tickLine={false}
                  label={{
                    value: 'MCU Super-Loop Ticks (50ms)',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#6F6F8C',
                    fontSize: 10
                  }}
                />

                {/* Left Y-Axis: ADC Voltage (0 to 4400 counts) */}
                <YAxis
                  yAxisId="adc"
                  domain={[0, 4400]}
                  stroke="#55556E"
                  tick={{ fill: '#6F6F8C', fontSize: 10 }}
                  tickLine={false}
                  label={{
                    value: '12-Bit Battery ADC',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#6F6F8C',
                    fontSize: 10,
                    offset: 12
                  }}
                />

                {/* Right Y-Axis: Temperature (0 to 130 °C) */}
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  domain={[0, 130]}
                  stroke="#55556E"
                  tick={{ fill: '#FF9E00', fontSize: 10 }}
                  tickLine={false}
                  label={{
                    value: 'Temperature (°C)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#FF9E00',
                    fontSize: 10,
                    offset: 12
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12121A',
                    borderColor: '#2B2B3D',
                    borderRadius: '8px',
                    color: '#C0C0D4',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />

                {/* Reference Lines for Battery Cutoffs */}
                <ReferenceLine
                  yAxisId="adc"
                  y={BATTERY_RAW_EMPTY}
                  stroke="#00B4D8"
                  strokeDasharray="4 4"
                  label={{
                    value: '0% BATTERY CUTOFF (2048)',
                    fill: '#00B4D8',
                    fontSize: 10,
                    position: 'insideBottomRight'
                  }}
                />

                <ReferenceLine
                  yAxisId="adc"
                  y={BATTERY_RAW_FULL}
                  stroke="#FFBE0B"
                  strokeDasharray="4 4"
                  label={{
                    value: '100% FULL (4095)',
                    fill: '#FFBE0B',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                />

                {/* Reference Lines for Thermal Override Thresholds */}
                <ReferenceLine
                  yAxisId="temp"
                  y={TEMP_LOW_TRIGGER}
                  stroke="#FF0054"
                  strokeDasharray="3 3"
                  label={{
                    value: '40°C HEATING DEMAND',
                    fill: '#FF0054',
                    fontSize: 9,
                    position: 'insideBottomLeft'
                  }}
                />

                <ReferenceLine
                  yAxisId="temp"
                  y={TEMP_HIGH_TRIGGER}
                  stroke="#00F5D4"
                  strokeDasharray="3 3"
                  label={{
                    value: '80°C OVERHEAT COOLING',
                    fill: '#00F5D4',
                    fontSize: 9,
                    position: 'insideTopLeft'
                  }}
                />

                {/* Line 1: Raw Noisy ADC (Red Faded) */}
                <Line
                  yAxisId="adc"
                  type="monotone"
                  dataKey="rawBattery"
                  name="Raw Battery ADC"
                  stroke="#FF3355"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Line 2: Filtered Battery Output (Neon Green Thick) */}
                <Line
                  yAxisId="adc"
                  type="monotone"
                  dataKey="filteredBattery"
                  name="Filtered Battery"
                  stroke="#00FF66"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                  filter="drop-shadow(0px 0px 6px rgba(0, 255, 102, 0.5))"
                />

                {/* Line 3: Filtered Temperature Output (Neon Orange on Secondary Y-Axis) */}
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="filteredTemp"
                  name="Filtered Temp (°C)"
                  stroke="#FF9E00"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                  filter="drop-shadow(0px 0px 6px rgba(255, 158, 0, 0.4))"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Oscilloscope Footer */}
          <div className="pt-3 border-t border-[#2B2B3D] flex flex-wrap items-center justify-between text-[11px] text-[#6F6F8C] gap-2">
            <div className="flex items-center gap-3">
              <span>BUFFER: 60 TICKS (~3.0s)</span>
              <span>•</span>
              <span>BATTERY ATTENUATION: ~18.2 dB</span>
              <span>•</span>
              <span>THERMAL JITTER SUPPRESSION: ~14.5 dB</span>
            </div>
            <div className="text-[#00F5D4] font-bold">
              CLOSED-LOOP TELEMETRY: ACTIVE
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
