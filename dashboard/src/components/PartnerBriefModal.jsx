/**
 * @file PartnerBriefModal.jsx
 * @brief OEM / Tier-1 Partner Pitch Brief, Live Technical Specs & NDA Guardrail Modal
 * @details 100% Company-Agnostic and tailored for executive & technical walkthroughs
 *          with any EV OEM, Tier-1 supplier, or engineering partner.
 *          Features:
 *          - Customizable partner/organization name field
 *          - Mutual NDA status toggle & Disclosable vs. Protected IP scope matrix
 *          - Presentation mode toggle (Executive Demo vs. Engineering Deep-Dive)
 *          - Interactive, live-synced Technical Specs & Operating Envelope view
 *          - Hardware pinouts, firmware signal conditioning, and telemetry contract
 *          - Step-by-step partner walkthrough script
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
  Edit2
} from 'lucide-react';

export default function PartnerBriefModal({
  isOpen,
  onClose,
  initialTab = 'VALUE_PROP',
  ndaStatus = 'EXECUTED',
  setNdaStatus,
  pitchMode = 'EXECUTIVE',
  setPitchMode,
  partnerName = 'Prospective OEM / Tier-1 Partner',
  setPartnerName,
  telemetry = {},
  setpoint = 75.0,
  pidGains = { kp: 2.5, ki: 0.4, kd: 0.8 }
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'VALUE_PROP');
  const [copied, setCopied] = useState(false);
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [localPartnerInput, setLocalPartnerInput] = useState(partnerName);

  // Sync initial tab when opened from different triggers (e.g. Header Tech Specs vs NDA Brief)
  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Keep local partner input synced with prop
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

  const currentPartnerDisplay = partnerName || 'Prospective OEM / Tier-1 Partner';

  const handleSavePartner = (e) => {
    e?.preventDefault();
    if (setPartnerName && localPartnerInput.trim()) {
      setPartnerName(localPartnerInput.trim());
    }
    setIsEditingPartner(false);
  };

  const handleCopySummary = () => {
    const text = `AEROTHERM R&D // PHASE 2 HYBRID EV THERMAL MANAGEMENT ARCHITECTURE
Partner Briefing Prepared For: ${currentPartnerDisplay}
Confidentiality Status: ${ndaStatus === 'EXECUTED' ? 'Mutual NDA Executed & Authorized' : 'Pre-NDA Walkthrough / Under Review'}
Presentation Scope: ${pitchMode === 'EXECUTIVE' ? 'Executive Overview' : 'Engineering Deep-Dive'}

Key Engineering Value Proposition:
1. Passive Venturi Aerodynamic Cooling (0°-90°): Up to 2.2 kW auxiliary pump/chiller energy saved during highway cruising before fluid loop engagement.
2. Deterministic State Machine (S0-S3): Strict ASIL-B ISO 26262 fault boundary management with zero-blocking O(1) circular filter firmware.
3. Dual-Domain HIL Simulation: Browser-based physical ODE simulation + 115200 baud WebSerial hardware bench bridging.

Live Operating Envelope Snapshot:
- Battery Core Temp: ${(telemetry?.temp_filt || 25.0).toFixed(1)}°C (Target Setpoint: ${setpoint.toFixed(0)}°C)
- Current State: ${telemetry?.state || 'IDLE_MODE'}
- Venturi Flaps: ${telemetry?.flap_deg || 0}° | Fluid Pump: ${telemetry?.pump ? 'Active' : 'Standby'}
- Chiller PWM Duty: ${(telemetry?.pwm_pct || 0).toFixed(1)}% | Aux Saved: +${(telemetry?.aux_kw || 0).toFixed(2)} kW

NDA Scope:
- Disclosable: High-level topology, state machine definitions, digital twin UI, telemetry schema.
- Protected: Private firmware source repository, PID chemistry calibration tables, CFD polar curves, PCB schematics.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const {
    state = 'IDLE_MODE',
    temp_filt = 25.0,
    temp_raw = 25.0,
    flap_deg = 0,
    pump = false,
    pwm_pct = 0.0,
    aux_kw = 0.0,
    kwh_saved = 0.0,
    speed_kmh = 85,
    fault = null
  } = telemetry || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-600/70 bg-[#090C15] text-gray-200 shadow-2xl shadow-black/90 overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-800/90 bg-[#0C101C] p-3 px-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-sm tracking-wide text-white truncate">
                  AEROTHERM R&amp;D <span className="text-amber-400">// OEM &amp; PARTNER BRIEFING</span>
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700 text-amber-300 font-mono text-[9px] font-semibold whitespace-nowrap">
                  CONFIDENTIAL // MUTUAL NDA REQUIRED
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[9px] font-semibold whitespace-nowrap">
                  OEM &amp; TIER-1 SPECIFICATION
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                <span>Phase 2 EV Thermal Architecture</span>
                <span>&bull;</span>
                <span>ASIL-B ISO 26262</span>
                <span>&bull;</span>
                <span className="text-amber-300/90 font-semibold truncate">
                  Prepared For: {currentPartnerDisplay}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopySummary}
              className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
              title="Copy executive partner brief to clipboard"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'COPIED' : 'COPY BRIEF'}
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

        {/* Interactive Presenter Control Strip & Customizable Partner Input */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#06080E] border-b border-gray-800/80 p-2 px-4 text-xs font-mono flex-shrink-0">
          {/* Customizable Partner / Organization Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-gray-400 text-[10px] flex items-center gap-1 flex-shrink-0">
              <FileText className="h-2.5 w-2.5 text-cyan-400" /> TARGET PARTNER:
            </span>
            {isEditingPartner ? (
              <form onSubmit={handleSavePartner} className="flex items-center gap-1">
                <input
                  type="text"
                  value={localPartnerInput}
                  onChange={(e) => setLocalPartnerInput(e.target.value)}
                  placeholder="Enter OEM / Partner name..."
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
                title="Click to customize partner name for presentation"
              >
                <span className="truncate max-w-[200px]">{currentPartnerDisplay}</span>
                <Edit2 className="h-2.5 w-2.5 text-gray-500 group-hover:text-cyan-400 ml-0.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* NDA Status Selector */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-[10px] flex items-center gap-1">
                <Lock className="h-2.5 w-2.5 text-amber-400" /> NDA:
              </span>
              <button
                onClick={() => setNdaStatus && setNdaStatus(ndaStatus === 'EXECUTED' ? 'UNDER_REVIEW' : 'EXECUTED')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                  ndaStatus === 'EXECUTED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-950/50'
                    : 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm shadow-amber-950/50'
                }`}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {ndaStatus === 'EXECUTED' ? 'MUTUAL NDA EXECUTED' : 'IN REVIEW / PRE-NDA'}
              </button>
            </div>

            {/* Presentation Mode Selector */}
            <div className="flex items-center gap-1">
              <div className="flex items-center p-0.5 rounded bg-black/60 border border-gray-800">
                <button
                  onClick={() => setPitchMode && setPitchMode('EXECUTIVE')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    pitchMode === 'EXECUTIVE'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  EXEC DEMO
                </button>
                <button
                  onClick={() => setPitchMode && setPitchMode('DEEP_DIVE')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    pitchMode === 'DEEP_DIVE'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  DEEP-DIVE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center border-b border-gray-800 bg-[#0C101C]/60 px-4 text-xs font-mono flex-shrink-0">
          {[
            { id: 'VALUE_PROP', label: '1. OEM VALUE PROP', icon: Zap },
            { id: 'SCOPE_MATRIX', label: '2. DISCLOSURE & NDA MATRIX', icon: Lock },
            { id: 'TECH_SPECS', label: '3. TECHNICAL SPECS (LIVE)', icon: Cpu },
            { id: 'WALKTHROUGH', label: '4. LIVE PITCH SCRIPT', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Tab Body - Scrollable & Bounded */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* TAB 1: VALUE PROPOSITION */}
          {activeTab === 'VALUE_PROP' && (
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-[#0C101C] border border-cyan-950/80">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-bold text-xs">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span>CORE VALUE PROPOSITION FOR {currentPartnerDisplay.toUpperCase()}</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                  Standard production EV thermal management systems continuously cycle high-voltage 800V coolant pumps and chillers even at steady-state highway cruising speeds, consuming between <strong>1.5 kW to 3.5 kW</strong> in parasitic auxiliary power. AeroTherm introduces a <strong>staged hybrid aerodynamic-fluid architecture</strong> that slashes parasitic losses before liquid cooling is engaged.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>PARASITIC AUX SAVINGS</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] leading-normal font-sans">
                    Modulates underbody Venturi aerodynamic flaps (0°–90°) using dynamic ram-air stagnation pressure. Delivers <strong>+1.8 kW to +2.4 kW</strong> continuous auxiliary energy savings, adding <strong>8–12%</strong> real-world highway driving range.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5 text-xs">
                    <Activity className="h-3.5 w-3.5" />
                    <span>DETERMINISTIC SAFETY (S0–S3)</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] leading-normal font-sans">
                    Zero dynamic memory allocation, non-blocking C++ state machine, and circular moving average filtering. Explicit thermal bounds with emergency hardware kill-switch (PWM cut to 0%, flaps to 90° fail-safe) conforming to <strong>ASIL-B ISO 26262</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0D1222] border border-gray-800/80 space-y-1.5">
                  <div className="text-purple-400 font-bold flex items-center gap-1.5 text-xs">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>ZERO-HARDWARE HIL DIGITAL TWIN</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] leading-normal font-sans">
                    Interactive in-browser numerical ODE physics simulation + WebSerial 115200 hardware bridge. Engineering teams can tune PID gains, sweep road speeds, and test fault injection live before flashing bench ECUs.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center justify-between text-[11px]">
                <span className="text-amber-200">
                  Target Partner Integration Stage: <strong>TRL-6 Demonstration &bull; Ready for Bench dyno &amp; mule-vehicle testing</strong>
                </span>
                <span className="text-gray-400 text-[10px]">OEM Co-Development Architecture</span>
              </div>
            </div>
          )}

          {/* TAB 2: DISCLOSURE & NDA MATRIX */}
          {activeTab === 'SCOPE_MATRIX' && (
            <div className="space-y-3 font-mono">
              <div className="p-2.5 rounded-lg bg-black/60 border border-gray-800 text-[10.5px] text-gray-400">
                This presentation environment is partitioned to allow initial partner evaluation while protecting patentable control algorithms, production C++ firmware, and proprietary CAD geometries under our mutual confidentiality agreement with {currentPartnerDisplay}.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Disclosable Scope */}
                <div className="p-3 rounded-xl bg-[#08151D] border border-cyan-800/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-cyan-900 pb-1.5">
                    <span className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                      DISCLOSABLE ARCHITECTURE SCOPE
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[9px]">
                      OPEN FOR DEMO
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[10.5px] text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>High-level hybrid passive aerodynamic &amp; active fluid loop topology</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Deterministic 4-state pipeline behavior (S0 IDLE &rarr; S1 AERO &rarr; S2 FLUID &rarr; S3 FAULT)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>PID setpoint regulation dynamics &amp; derivative-on-measurement damping</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>Real-time HIL digital twin visualizer &amp; simulated telemetry streaming</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>WebSerial 115200 command packet schema for hardware bench testing</span>
                    </li>
                  </ul>
                </div>

                {/* Protected Scope */}
                <div className="p-3 rounded-xl bg-[#1D0C12] border border-rose-800/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-900 pb-1.5">
                    <span className="text-rose-300 font-bold flex items-center gap-1.5 text-xs">
                      <Lock className="h-3.5 w-3.5 text-rose-400" />
                      PROTECTED NDA-RESTRICTED SCOPE
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px]">
                      NDA REQUIRED
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[10.5px] text-gray-300">
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Production bare-metal &amp; FreeRTOS C++ source code &amp; private Git repos</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Proprietary PID gain calibration matrices for specific OEM cell chemistries</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Full CFD wind-tunnel drag polar aerodynamic tables &amp; flap camber profiles</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Custom PCB Altium schematics, Gerber layouts &amp; production BOM costs</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span>Commercial R&amp;D licensing terms, milestone schedules &amp; volume royalty terms</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE TECHNICAL SPECIFICATIONS & OPERATING ENVELOPE */}
          {activeTab === 'TECH_SPECS' && (
            <div className="space-y-4 font-mono">
              {/* Live Operating Envelope & Threshold Verification Table */}
              <div className="p-3 rounded-xl bg-[#0B101E] border border-cyan-900/80 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs">
                      LIVE OPERATING ENVELOPE &amp; ASIL BOUNDARY VERIFICATION
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    state === 'SYSTEM_FAULT'
                      ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                      : state === 'ACTIVE_FLUID_LOOP'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : state === 'PASSIVE_AERO_COOLING'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}>
                    ACTIVE STATE: {state}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400">FILTERED CORE TEMP</span>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">{temp_filt.toFixed(1)}°C</div>
                    <span className="text-gray-500 text-[8.5px]">Raw ADC: {temp_raw.toFixed(1)}°C</span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400">TARGET SETPOINT</span>
                    <div className="text-amber-300 font-bold text-sm mt-0.5">{setpoint.toFixed(0)}°C</div>
                    <span className={temp_filt > setpoint ? 'text-amber-400 text-[8.5px]' : 'text-emerald-400 text-[8.5px]'}>
                      Δ: {(temp_filt - setpoint).toFixed(1)}°C
                    </span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400">VENTURI FLAPS</span>
                    <div className="text-cyan-300 font-bold text-sm mt-0.5">{flap_deg}°</div>
                    <span className="text-gray-500 text-[8.5px]">Air Scoop: {flap_deg > 0 ? 'DEPLOYED' : 'SEALED'}</span>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-gray-800">
                    <span className="text-gray-400">CHILLER PWM DUTY</span>
                    <div className="text-purple-300 font-bold text-sm mt-0.5">{pwm_pct.toFixed(1)}%</div>
                    <span className="text-gray-500 text-[8.5px]">Pump: {pump ? '800V ON' : 'STANDBY 0W'}</span>
                  </div>
                </div>

                {/* Threshold Compliance Matrix */}
                <div className="mt-2 border border-gray-800 rounded-lg overflow-hidden text-[9.5px]">
                  <table className="w-full text-left">
                    <thead className="bg-black/80 text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="p-1.5">THRESHOLD</th>
                        <th className="p-1.5">SPEC BOUND</th>
                        <th className="p-1.5">ACTIVE VALUE</th>
                        <th className="p-1.5">PHYSICAL ACTUATION</th>
                        <th className="p-1.5">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-300">
                      <tr className={temp_filt < 40 ? 'bg-cyan-950/20' : ''}>
                        <td className="p-1.5 font-bold text-cyan-400">T1 (IDLE / AERO)</td>
                        <td className="p-1.5">40.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">Flaps 0°, Pump 0W, PWM 0%</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt < 40 ? 'bg-cyan-900 text-cyan-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt < 40 ? 'ACTIVE (S0)' : 'PASSED'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 40 && temp_filt < 65 ? 'bg-emerald-950/20' : ''}>
                        <td className="p-1.5 font-bold text-emerald-400">T2 (AERO / FLUID)</td>
                        <td className="p-1.5">65.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">Flaps 0°–90° Ram Scoop, Pump 0W</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt >= 40 && temp_filt < 65 ? 'bg-emerald-900 text-emerald-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt >= 40 && temp_filt < 65 ? 'ACTIVE (S1)' : temp_filt >= 65 ? 'PASSED' : 'STANDBY'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 65 && temp_filt < 110 ? 'bg-amber-950/20' : ''}>
                        <td className="p-1.5 font-bold text-amber-400">REGULATION BAND</td>
                        <td className="p-1.5">65.0°C &ndash; 110.0°C</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">800V Pump ON, PID PWM 0–100%</td>
                        <td className="p-1.5">
                          <span className={`px-1 rounded ${temp_filt >= 65 && temp_filt < 110 ? 'bg-amber-900 text-amber-200' : 'bg-gray-800 text-gray-400'}`}>
                            {temp_filt >= 65 && temp_filt < 110 ? 'ACTIVE (S2)' : temp_filt >= 110 ? 'EXCEEDED' : 'STANDBY'}
                          </span>
                        </td>
                      </tr>
                      <tr className={temp_filt >= 110 || fault ? 'bg-red-950/30' : ''}>
                        <td className="p-1.5 font-bold text-red-400">T_CRIT (SHUTDOWN)</td>
                        <td className="p-1.5">&ge; 110.0°C / ERR</td>
                        <td className="p-1.5">{temp_filt.toFixed(1)}°C</td>
                        <td className="p-1.5">PWM 0%, Flaps 90° Fail-Safe</td>
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

              {/* Hardware Pinout & Embedded Architecture Spec Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0D111E] border border-gray-800 space-y-2">
                  <div className="text-gray-200 font-bold text-[11px] border-b border-gray-800 pb-1 flex items-center justify-between">
                    <span>MICROCONTROLLER HARDWARE PINOUTS</span>
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
                        <td>Battery NTC Sensor</td>
                        <td>Analog 0–3.3V (12-bit ADC)</td>
                        <td>Fault &lt;-20°C / &gt;150°C</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 25</td>
                        <td>Fluid Chiller PWM</td>
                        <td>20 kHz PWM (0–100%)</td>
                        <td>0% (Kill-Switch)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 26</td>
                        <td>Venturi Flap Servo</td>
                        <td>50 Hz PWM (1–2 ms Pulse)</td>
                        <td>90° (Full Cooling)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-cyan-300 font-bold">GPIO 27</td>
                        <td>800V Pump Relay</td>
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
                    <span>ACTIVE PID &amp; CONTROL LOOP TUNING</span>
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
                      <strong className="text-cyan-300">Filter Window:</strong> 16-sample O(1) circular buffer, attenuating &gt;60 Hz electrical noise.
                    </div>
                    <div>
                      <strong className="text-cyan-300">Hysteresis:</strong> 1.5°C boundary damping to prevent high-frequency relay / flap cycling.
                    </div>
                    <div>
                      <strong className="text-cyan-300">Derivative Mode:</strong> Derivative-on-measurement avoids setpoint step kick artifacts.
                    </div>
                  </div>
                </div>
              </div>

              {/* JSON Telemetry & Command Contract */}
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-1.5 text-[10px]">
                <div className="text-gray-200 font-bold text-[10.5px] border-b border-gray-800 pb-1 flex items-center justify-between">
                  <span>TELEMETRY PACKET SCHEMA (10 Hz STREAM)</span>
                  <span className="text-emerald-400">JSON CONTRACT</span>
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
  "pump": ${pump ? 'true' : 'false'},
  "pwm_pct": ${pwm_pct.toFixed(1)},
  "aux_kw": ${aux_kw.toFixed(2)},
  "kwh_saved": ${kwh_saved.toFixed(4)},
  "fault": ${fault ? `"${fault}"` : 'null'}
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: PRESENTER WALKTHROUGH SCRIPT */}
          {activeTab === 'WALKTHROUGH' && (
            <div className="space-y-3 font-mono">
              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-[10.5px] text-cyan-200">
                <strong>4-Step Partner Demonstration Script for {currentPartnerDisplay}:</strong> Follow these stages during a live screen-share or bench review:
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800 flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </span>
                  <div>
                    <div className="font-bold text-white text-[11px]">Cold Start / Urban Cruising (S0 IDLE)</div>
                    <p className="text-gray-400 text-[10px] font-sans mt-0.5">
                      Show that when core temperature is &lt;40°C, the fluid pump remains 100% OFF (0W auxiliary draw) and flaps remain closed (0°) to maintain aerodynamic efficiency and reduce vehicle drag.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800 flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </span>
                  <div>
                    <div className="font-bold text-white text-[11px]">Highway Speed Sweep &amp; Ram-Air Cooling (S1 PASSIVE AERO)</div>
                    <p className="text-gray-400 text-[10px] font-sans mt-0.5">
                      Increase vehicle speed to 85–110 km/h with temperature in the 40°C–65°C band. Point out that the Venturi flaps deploy proportionally (e.g. 45°–70°), demonstrating free ram-air cooling while the 800V liquid pump still draws 0W. Point to the &ldquo;AUX SAVED&rdquo; KPI tile showing +1.8 kW to +2.4 kW saved.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800 flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </span>
                  <div>
                    <div className="font-bold text-white text-[11px]">High Load Surge &amp; PID Setpoint Lock (S2 ACTIVE FLUID LOOP)</div>
                    <p className="text-gray-400 text-[10px] font-sans mt-0.5">
                      Ramp electrical load to 80–100 kW. Observe automatic transition to S2: the 800V fluid pump engages, and PID modulates PWM to lock battery temperature smoothly at 75°C without overshoot or thermal runaway.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800 flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-rose-950 border border-rose-700 text-rose-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    4
                  </span>
                  <div>
                    <div className="font-bold text-white text-[11px]">Hardware Safety Interlock Test &amp; Clean Recovery (S3 FAULT)</div>
                    <p className="text-gray-400 text-[10px] font-sans mt-0.5">
                      Click &ldquo;Inject Sensor Disconnect&rdquo; or &ldquo;Thermal Runaway&rdquo;. Demonstrate the immediate fail-safe response: actuator PWM drops to 0%, flaps pop to 90° fail-safe cooling, and emergency alarms trigger. Then click &ldquo;Reset System Safety Interlock&rdquo; to demonstrate instantaneous clean deterministic recovery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-800/90 bg-[#0C101C] p-2.5 px-4 text-[10px] font-mono text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
            <span>AeroTherm R&amp;D IP Protection Notice // Authorized Partner Review ({currentPartnerDisplay})</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors shadow-sm"
          >
            RETURN TO CONSOLE
          </button>
        </div>
      </div>
    </div>
  );
}
