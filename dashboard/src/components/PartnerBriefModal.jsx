/**
 * @file PartnerBriefModal.jsx
 * @brief Industrial Engineering Specification, Technical Specs & NDA Governance Dossier
 * @details 100% Company-Agnostic, industrial automotive specification dossier.
 *          Contains zero live pitch scripts or coaching cue cards.
 *          Features:
 *          - Tab 1: System & Control Architecture (hybrid active-passive thermal concept & energy savings)
 *          - Tab 2: Technical Specifications & Live Operating Envelope (threshold compliance,
 *                   actuator dynamics, firmware signal conditioning, pinouts, and 10 Hz telemetry/command contracts)
 *          - Tab 3: NDA & IP Governance (strict delineation of Shared Simulation Scope vs. NDA-Protected Scope)
 *          - Dynamic live data binding with HIL simulator / WebSerial telemetry stream
 *          - Bounded scroll container (min-h-0 overflow-y-auto) preserving 100dvh viewport lock
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileText,
  Zap,
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  ChevronRight,
  Sliders,
  Radio,
  Clock,
  Terminal,
  Edit2,
  Fan,
  Droplets,
  Flame,
  Settings
} from 'lucide-react';

export default function PartnerBriefModal({
  isOpen,
  onClose,
  initialTab = 'ARCHITECTURE',
  ndaStatus = 'EXECUTED',
  setNdaStatus,
  partnerName = 'Partner / OEM',
  setPartnerName,
  telemetry = {},
  setpoint = 75.0,
  pidGains = { kp: 2.5, ki: 0.4, kd: 0.8 }
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'ARCHITECTURE');
  const [copied, setCopied] = useState(false);
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [localPartnerInput, setLocalPartnerInput] = useState(partnerName);

  // Sync initial tab when opened from different triggers (e.g. Header Tech Specs vs NDA & Specs)
  useEffect(() => {
    if (initialTab && isOpen) {
      if (initialTab === 'VALUE_PROP') {
        setActiveTab('ARCHITECTURE');
      } else if (initialTab === 'SCOPE_MATRIX') {
        setActiveTab('NDA_GOVERNANCE');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    setLocalPartnerInput(partnerName);
  }, [partnerName]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPartnerDisplay = partnerName || 'Partner / OEM';

  const handleSavePartner = (e) => {
    e?.preventDefault();
    if (setPartnerName && localPartnerInput.trim()) {
      setPartnerName(localPartnerInput.trim());
    }
    setIsEditingPartner(false);
  };

  const handleCopySummary = () => {
    const isBoosterOn = Boolean(telemetry?.boost_active ?? telemetry?.pump);
    const text = `AEROTHERM R&D // PHASE 2 HYBRID EV THERMAL MANAGEMENT SYSTEM
Technical Dossier & Engineering Specification
Document Scope: ${currentPartnerDisplay}
Confidentiality Status: ${ndaStatus === 'EXECUTED' ? 'Mutual NDA Executed & Authorized' : 'Pre-NDA Review / Confidential Evaluation'}

1. Architecture Overview:
- Topology: Staged Passive Aerodynamic (0°-90° Venturi Flaps) + Underbody Airflow Tunnel + Active Thermal Air Booster (PID PWM Control)
- Deterministic State Machine: S0 (Idle), S1 (Passive Aero), S2 (Active Air Boost), S3 (ASIL-B Fault)
- Energy Impact: Eliminates 1.5 kW - 2.8 kW auxiliary power load during aerodynamic cooling regime.

2. Live Operating Envelope Snapshot:
- Battery Core Temp: ${(telemetry?.temp_filt || 25.0).toFixed(1)}°C (Setpoint: ${setpoint.toFixed(0)}°C)
- Current State: ${telemetry?.state || 'IDLE_MODE'}
- Venturi Flaps: ${telemetry?.flap_deg || 0}° | Active Air Booster: ${isBoosterOn ? 'Active' : 'Standby'}
- Booster PWM Duty: ${(telemetry?.pwm_pct || 0).toFixed(1)}% | Aux Power Saved: +${(telemetry?.aux_kw || 0).toFixed(2)} kW

3. Hardware & Interface Parameters:
- Target Microcontroller: ESP32 / STM32 (PlatformIO C++17)
- Sampling Rate: 100 Hz Internal / 20 Hz HIL Control / 10 Hz Telemetry Stream
- Serial Bridge: UART 115200 Baud, 8-N-1 (WebSerial API compatible)

4. Confidentiality Governance:
- Shared Simulation Scope: High-level system architecture, state machine definitions, HIL digital twin, telemetry contract.
- NDA-Protected Scope: Production C++ firmware implementation, cell chemistry PID tables, CFD polar data, PCB Altium schematics.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const {
    state = 'IDLE_MODE',
    temp_filt = 25.0,
    temp_raw = 25.0,
    speed_kmh = 85,
    flap_deg = 0,
    boost_active,
    pump = false,
    pwm_pct = 0.0,
    aux_kw = 0.0,
    kwh_saved = 0.0,
    fault = null
  } = telemetry || {};

  const isBoosterActive = Boolean(boost_active !== undefined ? boost_active : pump);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-gray-700/80 bg-[#090C15] text-gray-200 shadow-2xl shadow-black/90 overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-800/90 bg-[#0C101C] p-3 px-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-md shadow-cyan-600/20 flex-shrink-0">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-sm tracking-wide text-white truncate">
                  AEROTHERM R&amp;D <span className="text-cyan-400">// ENGINEERING SPECIFICATION DOSSIER</span>
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[9px] font-semibold whitespace-nowrap">
                  PHASE 2 HYBRID EV
                </span>
                <span className="px-1.5 py-0.2 rounded bg-gray-800/80 border border-gray-700 text-gray-300 font-mono text-[9px] font-semibold whitespace-nowrap">
                  ASIL-B ISO 26262
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                <span>Deterministic State Machine &amp; HIL Simulation</span>
                <span>&bull;</span>
                <span className="text-gray-300 font-semibold truncate">
                  Target Partner: {currentPartnerDisplay}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopySummary}
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
              title="Copy engineering specification summary to clipboard"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'COPIED' : 'COPY SPEC'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Secondary Parameter Strip: Neutral Partner Label & Mutual NDA Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#06080E] border-b border-gray-800/80 p-2 px-4 text-xs font-mono flex-shrink-0">
          {/* Neutral Partner Label (Editable) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-400 text-[10px] flex items-center gap-1 flex-shrink-0">
              <FileText className="h-2.5 w-2.5 text-cyan-400" /> PARTNER / OEM:
            </span>
            {isEditingPartner ? (
              <form onSubmit={handleSavePartner} className="flex items-center gap-1">
                <input
                  type="text"
                  value={localPartnerInput}
                  onChange={(e) => setLocalPartnerInput(e.target.value)}
                  placeholder="Enter Partner / OEM label..."
                  className="px-2 py-0.5 bg-gray-900 border border-cyan-600 rounded text-cyan-200 text-[10px] font-mono focus:outline-none w-48"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-1.5 py-0.5 bg-cyan-600 text-white rounded text-[9px] font-bold"
                >
                  SAVE
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsEditingPartner(true)}
                className="px-2 py-0.5 rounded bg-gray-900/90 border border-gray-700 hover:border-cyan-600 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-colors group"
                title="Click to edit partner/organization label"
              >
                <span className="truncate max-w-[200px]">{currentPartnerDisplay}</span>
                <Edit2 className="h-2.5 w-2.5 text-gray-500 group-hover:text-cyan-400 ml-0.5" />
              </button>
            )}
          </div>

          {/* Mutual NDA Status Selector */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[10px] flex items-center gap-1">
              <Lock className="h-2.5 w-2.5 text-amber-400" /> GOVERNANCE:
            </span>
            <button
              onClick={() => setNdaStatus && setNdaStatus(ndaStatus === 'EXECUTED' ? 'UNDER_REVIEW' : 'EXECUTED')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                ndaStatus === 'EXECUTED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-950/50'
                  : 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm shadow-amber-950/50'
              }`}
              title="Toggle Mutual NDA status"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {ndaStatus === 'EXECUTED' ? 'MUTUAL NDA EXECUTED' : 'CONFIDENTIAL / IN REVIEW'}
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center border-b border-gray-800 bg-[#0C101C]/60 px-4 text-xs font-mono flex-shrink-0">
          {[
            { id: 'ARCHITECTURE', label: '1. SYSTEM ARCHITECTURE & EFFICIENCY', icon: Zap },
            { id: 'TECH_SPECS', label: '2. TECHNICAL SPECIFICATIONS (LIVE)', icon: Cpu },
            { id: 'NDA_GOVERNANCE', label: '3. NDA & IP GOVERNANCE', icon: Lock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Tab Body - Scrollable & Strictly Viewport Bounded */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          
          {/* TAB 1: SYSTEM ARCHITECTURE & EFFICIENCY */}
          {activeTab === 'ARCHITECTURE' && (
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-[#0C101C] border border-cyan-950/80">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-bold text-xs">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span>STAGED HYBRID PASSIVE-ACTIVE AIR THERMAL TOPOLOGY</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                  Conventional production EV thermal architectures continuously cycle heavy refrigeration compressors and high-parasitic auxiliary loops even under steady-state highway conditions, imposing a parasitic penalty of <strong>1.5 kW to 3.5 kW</strong>. AeroTherm Phase 2 implements a <strong>staged hybrid aerodynamic-active air architecture</strong> that leverages ambient ram-air aerodynamics through an underbody tunnel and battery-pack integrated channel before energizing active forced-air booster cooling.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>PARASITIC AUX REDUCTION</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] font-sans leading-normal">
                    Under moderate thermal loads and highway cruising speeds (40°C–65°C), dynamic underbody Venturi flaps deploy (0°–90°) to channel ram-air cooling across the pack surface. Active air booster draw is maintained at <strong>0W</strong>, saving up to <strong>2.8 kW</strong>.
                  </p>
                  <div className="pt-1 text-[10px] text-emerald-300 font-bold">
                    Range Extension: +3.8% to +6.2%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
                    <Activity className="h-3.5 w-3.5" />
                    <span>DETERMINISTIC PIPELINE</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] font-sans leading-normal">
                    Strict, deterministic 4-state Mealy/Moore state machine (<code className="text-cyan-300">S0 IDLE</code>, <code className="text-cyan-300">S1 PASSIVE AERO</code>, <code className="text-cyan-300">S2 ACTIVE AIR BOOST</code>, <code className="text-cyan-300">S3 FAULT</code>). Zero race conditions, 1.5°C hysteresis damping, and hardware-enforced fail-safe positions.
                  </p>
                  <div className="pt-1 text-[10px] text-cyan-300 font-bold">
                    ISO 26262 ASIL-B Determinism
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-purple-400 font-bold flex items-center gap-1.5 text-xs">
                    <Layers className="h-3.5 w-3.5" />
                    <span>ANTI-WINDUP PID REGULATION</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] font-sans leading-normal">
                    When temperature enters S2 (≥65°C), active air booster cooling engages. An anti-windup clamped PID controller regulates air booster actuator PWM duty cycle (0–100%) with derivative-on-measurement to lock pack temperature cleanly at setpoint without overshoot.
                  </p>
                  <div className="pt-1 text-[10px] text-purple-300 font-bold">
                    Overshoot: &lt; 0.8°C Steady-State
                  </div>
                </div>
              </div>

              {/* State Transition Matrix */}
              <div className="p-3 rounded-xl bg-[#080B14] border border-gray-800/80 space-y-2">
                <div className="text-gray-300 font-bold text-xs flex items-center justify-between border-b border-gray-800 pb-1.5">
                  <span>DETERMINISTIC STATE TRANSITION SPECIFICATION</span>
                  <span className="text-[9.5px] text-gray-500 font-mono">HYSTERESIS: 1.5°C</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-black/40 border border-cyan-900/60">
                    <div className="text-cyan-400 font-bold">S0: IDLE_MODE</div>
                    <div className="text-gray-400 text-[9px] mt-0.5">T &lt; 40.0°C</div>
                    <div className="text-gray-300 mt-1">Flaps: 0° (Sealed)</div>
                    <div className="text-gray-300">Booster: OFF (0W)</div>
                    <div className="text-gray-300">PWM: 0.0%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-emerald-900/60">
                    <div className="text-emerald-400 font-bold">S1: PASSIVE_AERO</div>
                    <div className="text-gray-400 text-[9px] mt-0.5">40.0°C ≤ T &lt; 65.0°C</div>
                    <div className="text-gray-300 mt-1">Flaps: 0°–90° Ram Air</div>
                    <div className="text-gray-300">Booster: OFF (0W)</div>
                    <div className="text-gray-300">PWM: 0.0%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-amber-900/60">
                    <div className="text-amber-400 font-bold">S2: ACTIVE_AIR_BOOST</div>
                    <div className="text-gray-400 text-[9px] mt-0.5">65.0°C ≤ T &lt; 110.0°C</div>
                    <div className="text-gray-300 mt-1">Flaps: 90° (Full Open)</div>
                    <div className="text-gray-300">Booster: ON (Channel Air)</div>
                    <div className="text-gray-300">PWM: PID Clamped 0–100%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-red-900/60">
                    <div className="text-red-400 font-bold">S3: SYSTEM_FAULT</div>
                    <div className="text-gray-400 text-[9px] mt-0.5">T ≥ 110.0°C / ERR</div>
                    <div className="text-gray-300 mt-1">Flaps: 90° Fail-Safe</div>
                    <div className="text-gray-300">Booster: Relay Opened</div>
                    <div className="text-gray-300">PWM: 0.0% Interlock Cut</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TECHNICAL SPECIFICATIONS (LIVE DYNAMIC DATA) */}
          {activeTab === 'TECH_SPECS' && (
            <div className="space-y-3.5 font-mono">
              
              {/* 1. Live Operating Envelope & Safety Threshold Table */}
              <div className="p-3 rounded-xl bg-[#0B101E] border border-cyan-900/80 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs">
                      1. LIVE OPERATING ENVELOPE &amp; ASIL THRESHOLD COMPLIANCE
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    state === 'SYSTEM_FAULT'
                      ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                      : (state === 'ACTIVE_AIR_BOOST' || state === 'ACTIVE_FLUID_LOOP')
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : state === 'PASSIVE_AERO_COOLING'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}>
                    CURRENT STATE: {state}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Flame className="h-3 w-3 text-cyan-400" /> FILTERED CORE TEMP
                    </span>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">{temp_filt.toFixed(1)}°C</div>
                    <span className="text-gray-500 text-[8.5px]">Raw ADC: {temp_raw.toFixed(1)}°C</span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Sliders className="h-3 w-3 text-amber-400" /> TARGET SETPOINT
                    </span>
                    <div className="text-amber-300 font-bold text-sm mt-0.5">{setpoint.toFixed(0)}°C</div>
                    <span className={temp_filt > setpoint ? 'text-amber-400 text-[8.5px]' : 'text-emerald-400 text-[8.5px]'}>
                      Δ: {(temp_filt - setpoint).toFixed(1)}°C
                    </span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Fan className="h-3 w-3 text-cyan-400" /> VENTURI FLAPS
                    </span>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">{flap_deg}°</div>
                    <span className="text-gray-500 text-[8.5px]">Aero Scoop: {flap_deg > 0 ? 'DEPLOYED' : 'SEALED'}</span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Wind className="h-3 w-3 text-purple-400" /> AIR BOOSTER / PWM
                    </span>
                    <div className="text-purple-300 font-bold text-sm mt-0.5">{pwm_pct.toFixed(1)}%</div>
                    <span className="text-gray-500 text-[8.5px]">Booster: {isBoosterActive ? 'ACTIVE' : 'STANDBY 0W'}</span>
                  </div>
                </div>

                {/* Threshold Compliance Matrix */}
                <div className="mt-2 border border-gray-800 rounded-lg overflow-hidden text-[9.5px]">
                  <table className="w-full text-left">
                    <thead className="bg-black/80 text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="p-1.5">THRESHOLD</th>
                        <th className="p-1.5">SPEC BOUND</th>
                        <th className="p-1.5">LIVE VALUE</th>
                        <th className="p-1.5">PHYSICAL ACTUATION</th>
                        <th className="p-1.5">COMPLIANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-300">
                      <tr className={temp_filt < 40 ? 'bg-cyan-950/20' : ''}>
                        <td className="p-1.5 font-bold text-cyan-400">T1 (IDLE / PASSIVE AERO)</td>
                        <td className="p-1.5">40.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">Flaps 0°, Booster 0W, PWM 0%</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt < 40 ? 'bg-cyan-900 text-cyan-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt < 40 ? 'ACTIVE (S0)' : 'PASSED'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 40 && temp_filt < 65 ? 'bg-emerald-950/20' : ''}>
                        <td className="p-1.5 font-bold text-emerald-400">T2 (AERO / ACTIVE AIR BOOST)</td>
                        <td className="p-1.5">65.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">Flaps 0°–90° Ram Scoop, Booster 0W</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt >= 40 && temp_filt < 65 ? 'bg-emerald-900 text-emerald-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt >= 40 && temp_filt < 65 ? 'ACTIVE (S1)' : temp_filt >= 65 ? 'PASSED' : 'STANDBY'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 65 && temp_filt < 110 ? 'bg-amber-950/20' : ''}>
                        <td className="p-1.5 font-bold text-amber-400">REGULATION BAND</td>
                        <td className="p-1.5">65.0°C – 110.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">Air Booster ON, PID PWM 0–100%</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt >= 65 && temp_filt < 110 ? 'bg-amber-900 text-amber-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt >= 65 && temp_filt < 110 ? 'ACTIVE (S2)' : temp_filt >= 110 ? 'EXCEEDED' : 'STANDBY'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 110 || fault ? 'bg-red-950/30' : ''}>
                        <td className="p-1.5 font-bold text-red-400">T_CRIT (SAFETY INTERLOCK)</td>
                        <td className="p-1.5">≥ 110.0°C / ERR</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">PWM 0%, Flaps 90° Fail-Safe Open</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt >= 110 || fault ? 'bg-red-900 text-red-200 font-bold animate-pulse' : 'bg-emerald-950 text-emerald-300'}`}>
                            {temp_filt >= 110 || fault ? 'INTERLOCK CUTOFF' : 'CLEAR (SAFE)'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Microcontroller Hardware Pinouts & Control Loop Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0D111E] border border-gray-800 space-y-2">
                  <div className="text-gray-200 font-bold text-[11px] border-b border-gray-800 pb-1 flex items-center justify-between">
                    <span>2. HARDWARE PINOUTS &amp; INTERFACES</span>
                    <span className="text-cyan-400 text-[9.5px]">ESP32 / STM32</span>
                  </div>
                  <table className="w-full text-left text-[9.5px] text-gray-300">
                    <thead className="text-gray-500 border-b border-gray-800">
                      <tr>
                        <th className="pb-1">PORT</th>
                        <th className="pb-1">FUNCTION</th>
                        <th className="pb-1">SIGNAL SPEC</th>
                        <th className="pb-1">FAIL-SAFE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 34</td>
                        <td>Battery NTC Thermistor</td>
                        <td>Analog 0–3.3V (12-bit ADC)</td>
                        <td>Fault &lt;-20°C / &gt;150°C</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 25</td>
                        <td>Active Air Booster PWM</td>
                        <td>20 kHz PWM (0–100% Duty)</td>
                        <td>0% (Kill-Switch)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 26</td>
                        <td>Venturi Flap Servo</td>
                        <td>50 Hz PWM (1–2 ms Pulse)</td>
                        <td>90° (Full Ram Cooling)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 27</td>
                        <td>Air Booster Power Relay</td>
                        <td>Active High Logic (3.3V)</td>
                        <td>LOW (De-energized)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">UART0</td>
                        <td>HIL / WebSerial Bridge</td>
                        <td>115200 Baud, 8-N-1</td>
                        <td>Watchdog Timeout</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-[#0D111E] border border-gray-800 space-y-2">
                  <div className="text-gray-200 font-bold text-[11px] border-b border-gray-800 pb-1 flex items-center justify-between">
                    <span>3. PID CONTROL LOOP PARAMETERS</span>
                    <span className="text-purple-400 text-[9.5px]">ANTI-WINDUP CLAMPED</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="p-1.5 rounded bg-black/40 border border-gray-800">
                      <span className="text-gray-400">PROPORTIONAL (Kp)</span>
                      <div className="text-purple-300 font-bold text-xs mt-0.5">{pidGains.kp.toFixed(2)}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-gray-800">
                      <span className="text-gray-400">INTEGRAL (Ki)</span>
                      <div className="text-purple-300 font-bold text-xs mt-0.5">{pidGains.ki.toFixed(2)}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-gray-800">
                      <span className="text-gray-400">DERIVATIVE (Kd)</span>
                      <div className="text-purple-300 font-bold text-xs mt-0.5">{pidGains.kd.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 space-y-1">
                    <div>
                      <strong className="text-cyan-300">Filter Window:</strong> 16-sample O(1) circular moving-average buffer, attenuating &gt;60 Hz electrical noise.
                    </div>
                    <div>
                      <strong className="text-cyan-300">Hysteresis:</strong> 1.5°C boundary damping to prevent rapid relay/flap cycling around thresholds.
                    </div>
                    <div>
                      <strong className="text-cyan-300">Derivative Mode:</strong> Derivative-on-measurement prevents setpoint step kick artifacts.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Firmware Loop Execution & Telemetry/Command Contract */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Outbound 10 Hz Telemetry Schema */}
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-1.5 text-[10px]">
                  <div className="text-gray-200 font-bold text-[10.5px] border-b border-gray-800 pb-1 flex items-center justify-between">
                    <span>4. OUTBOUND 10 Hz TELEMETRY SCHEMA</span>
                    <span className="text-emerald-400">JSON STREAM</span>
                  </div>
                  <pre className="p-2 rounded bg-black/80 border border-gray-800/80 text-cyan-300 font-mono text-[9px] overflow-x-auto leading-relaxed">
{`{
  "ts": ${(telemetry?.ts || 124500)},
  "state": "${state}",
  "temp_raw": ${temp_raw.toFixed(2)},
  "temp_filt": ${temp_filt.toFixed(2)},
  "setpoint": ${setpoint.toFixed(1)},
  "speed_kmh": ${speed_kmh},
  "flap_deg": ${flap_deg},
  "boost_active": ${isBoosterActive ? 'true' : 'false'},
  "pwm_pct": ${pwm_pct.toFixed(1)},
  "aux_kw": ${aux_kw.toFixed(2)},
  "kwh_saved": ${kwh_saved.toFixed(4)},
  "fault": ${fault ? `"${fault}"` : 'null'}
}`}
                  </pre>
                </div>

                {/* Inbound Hardware Control Command Contract */}
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-1.5 text-[10px]">
                  <div className="text-gray-200 font-bold text-[10.5px] border-b border-gray-800 pb-1 flex items-center justify-between">
                    <span>5. INBOUND SERIAL COMMAND CONTRACT</span>
                    <span className="text-purple-400">115200 8-N-1</span>
                  </div>
                  <div className="space-y-1 text-[9px] font-mono">
                    <div className="p-1.5 rounded bg-black/80 border border-gray-800 text-gray-300">
                      <span className="text-purple-300 font-bold">PID Tuning:</span>
                      <div className="text-gray-400">{`{"cmd": "SET_PID", "kp": 2.5, "ki": 0.4, "kd": 0.8}`}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/80 border border-gray-800 text-gray-300">
                      <span className="text-cyan-300 font-bold">Target Setpoint:</span>
                      <div className="text-gray-400">{`{"cmd": "SET_SETPOINT", "setpoint": 75.0}`}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/80 border border-gray-800 text-gray-300">
                      <span className="text-emerald-300 font-bold">Reset Fault Interlock:</span>
                      <div className="text-gray-400">{`{"cmd": "RESET_FAULT"}`}</div>
                    </div>
                    <div className="p-1.5 rounded bg-black/80 border border-gray-800 text-gray-300">
                      <span className="text-red-300 font-bold">Fault Injection:</span>
                      <div className="text-gray-400">{`{"cmd": "INJECT_FAULT", "type": "OVERTEMP" | "DISCONNECT"}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NDA & IP GOVERNANCE MATRIX */}
          {activeTab === 'NDA_GOVERNANCE' && (
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-[#0F1424] border border-amber-600/70">
                <div className="flex items-center justify-between border-b border-amber-700/60 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span className="font-bold text-amber-300 text-xs">
                      MUTUAL NDA &amp; INTELLECTUAL PROPERTY GOVERNANCE
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ndaStatus === 'EXECUTED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}>
                    STATUS: {ndaStatus === 'EXECUTED' ? 'MUTUAL NDA EXECUTED' : 'UNDER PRE-NDA REVIEW'}
                  </span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                  To protect proprietary automotive firmware, CFD aerodynamics, and electronics architectures, access to AeroTherm engineering assets is governed by strict scope boundaries for <strong>{currentPartnerDisplay}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Disclosable Scope */}
                <div className="p-3 rounded-xl bg-[#09151F] border border-cyan-800/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-cyan-900 pb-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                      <span>SHARED OVERVIEW / SIMULATION SCOPE</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                      DISCLOSABLE
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[10.5px] text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>High-level hybrid passive-active EV thermal management concept and topology</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Deterministic 4-state state machine definitions (S0–S3) and hysteresis boundaries</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Interactive browser-based HIL ODE digital twin and 3D visualizer</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>10 Hz JSON telemetry schema and serial command communication contract</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Simulated auxiliary energy savings curves and range extension estimates</span>
                    </li>
                  </ul>
                </div>

                {/* Protected Scope */}
                <div className="p-3 rounded-xl bg-[#1D0C15] border border-rose-900/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-950 pb-1.5">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                      <span>NDA-PROTECTED / RESTRICTED SCOPE</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                      NDA RESTRICTED
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[10.5px] text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Production bare-metal &amp; FreeRTOS C++ source firmware &amp; build systems</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Proprietary PID gain matrices and thermal capacitance tables for OEM chemistries</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Wind-tunnel CFD drag polar curves and Venturi flap camber geometries</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Electronic Altium schematics, high-voltage isolation designs, and production BOM</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Commercial R&amp;D licensing terms, milestone schedules, and supply agreements</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800/90 bg-[#0C101C] p-2.5 px-4 text-[10px] font-mono text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block" />
            <span>AeroTherm R&amp;D Engineering Specifications // Authorized Review ({currentPartnerDisplay})</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-sm"
          >
            RETURN TO CONSOLE
          </button>
        </div>
      </div>
    </div>
  );
}
