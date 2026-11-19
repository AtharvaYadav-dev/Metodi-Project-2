/**
 * @file PartnerBriefModal.jsx
 * @brief OEM / Tier-1 Partner Pitch Brief & NDA Guardrail Modal
 * @details Tailored for executive OEM walkthroughs (e.g., Autoven, Tier-1 EV Powertrain leads).
 *          Provides:
 *          - Clear Mutual NDA status & disclosable vs protected IP scope matrix
 *          - Pitch Mode selector (Executive Demo vs Engineering Deep-Dive)
 *          - Quantitative OEM engineering value proposition (parasitic power savings, deterministic safety)
 *          - Presenter interactive walkthrough guide
 *          - Zero exposure of internal credentials or private secrets
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
  ExternalLink
} from 'lucide-react';

export default function PartnerBriefModal({
  isOpen,
  onClose,
  ndaStatus = 'EXECUTED',
  setNdaStatus,
  pitchMode = 'EXECUTIVE',
  setPitchMode
}) {
  const [activeTab, setActiveTab] = useState('VALUE_PROP'); // 'VALUE_PROP' | 'SCOPE_MATRIX' | 'TECH_SPECS' | 'WALKTHROUGH'
  const [copied, setCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = `AEROTHERM R&D // PHASE 2 HYBRID EV THERMAL MANAGEMENT ARCHITECTURE
Target Partner: Autoven & Global Tier-1 EV OEMs
Confidentiality: Mutual NDA Required for Production Code & Hardware Schematics

Key Engineering Value Proposition:
1. Passive Venturi Aerodynamic Cooling (0°-90°): Up to 2.2 kW auxiliary pump/chiller energy saved during highway cruising before fluid loop engagement.
2. Deterministic State Machine (S0-S3): Strict ASIL-B ISO 26262 fault boundary management with zero-blocking O(1) circular filter firmware.
3. Dual-Domain HIL Simulation: Browser-based physical ODE simulation + 115200 baud WebSerial hardware bench bridging.

NDA Scope:
- Disclosable: High-level topology, state machine definitions, digital twin UI.
- Protected: Private firmware source repository, PID chemistry calibration tables, CFD polar curves, PCB schematics.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-600/70 bg-[#090C15] text-gray-200 shadow-2xl shadow-black/90 overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-800/90 bg-[#0C101C] p-3 px-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-sm tracking-wide text-white">
                  AEROTHERM R&amp;D <span className="text-amber-400">// PARTNER &amp; OEM BRIEFING</span>
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700 text-amber-300 font-mono text-[9px] font-semibold">
                  CONFIDENTIAL // MUTUAL NDA REQUIRED
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[9px] font-semibold">
                  AUTOVEN &amp; TIER-1 ALIGNED
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Phase 2 Hybrid EV Thermal Management Architecture &bull; ASIL-B ISO 26262 Specification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Presenter Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#06080E] border-b border-gray-800/80 p-2 px-4 text-xs font-mono flex-shrink-0">
          {/* NDA Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[10px] flex items-center gap-1">
              <Lock className="h-2.5 w-2.5 text-amber-400" /> NDA STATUS:
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
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[10px]">PRESENTATION MODE:</span>
            <div className="flex items-center p-0.5 rounded bg-black/60 border border-gray-800">
              <button
                onClick={() => setPitchMode && setPitchMode('EXECUTIVE')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  pitchMode === 'EXECUTIVE'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                EXECUTIVE DEMO
              </button>
              <button
                onClick={() => setPitchMode && setPitchMode('DEEP_DIVE')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  pitchMode === 'DEEP_DIVE'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                ENGINEERING DEEP-DIVE
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center border-b border-gray-800 bg-[#0C101C]/60 px-4 text-xs font-mono flex-shrink-0">
          {[
            { id: 'VALUE_PROP', label: '1. OEM / AUTOVEN VALUE PROP', icon: Zap },
            { id: 'SCOPE_MATRIX', label: '2. DISCLOSURE & NDA MATRIX', icon: Lock },
            { id: 'TECH_SPECS', label: '3. TECHNICAL SPECS', icon: Cpu },
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

        {/* Main Tab Body - Scrollable & Flat */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: VALUE PROPOSITION */}
          {activeTab === 'VALUE_PROP' && (
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-xl bg-[#0C101C] border border-cyan-950/80">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-bold text-xs">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span>CORE VALUE FOR AUTOVEN &amp; TIER-1 EV POWERTRAIN TEAMS</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed font-sans">
                  Current commercial EV thermal loops continuously cycle high-voltage 800V coolant pumps and chillers even at highway cruising speeds, consuming between <strong>1.5 kW to 3.5 kW</strong> in parasitic auxiliary power. AeroTherm introduces a <strong>staged hybrid aerodynamic-fluid architecture</strong> that slashes parasitic losses before liquid cooling is engaged.
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
                    Interactive in-browser numerical ODE physics simulation + WebSerial 115200 hardware bridge. Tier-1 engineers can tune PID gains, sweep road speeds, and test fault injection live before flashing bench ECUs.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center justify-between text-[11px]">
                <span className="text-amber-200">
                  Target OEM Integration Stage: <strong>TRL-6 Demonstration &bull; Ready for Bench dyno &amp; mule-vehicle testing</strong>
                </span>
                <span className="text-gray-400 text-[10px]">Autoven Co-Development Ready</span>
              </div>
            </div>
          )}

          {/* TAB 2: DISCLOSURE & NDA MATRIX */}
          {activeTab === 'SCOPE_MATRIX' && (
            <div className="space-y-3 font-mono">
              <div className="p-2.5 rounded-lg bg-black/60 border border-gray-800 text-[10.5px] text-gray-400">
                This presentation environment is partitioned to allow public walkthroughs while protecting patentable control algorithms, production C++ firmware, and proprietary CAD geometries under our mutual confidentiality agreement.
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
                      <span>WebSerial 115200 command packet schema for hardware testing</span>
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
                      <span>OEM commercial R&amp;D licensing terms, milestone schedules &amp; royalty terms</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SPECIFICATIONS */}
          {activeTab === 'TECH_SPECS' && (
            <div className="space-y-3 font-mono">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800">
                  <div className="text-gray-400 text-[9.5px]">ARCHITECTURE</div>
                  <div className="text-white font-bold text-xs mt-0.5">400V / 800V DC</div>
                  <div className="text-cyan-400 text-[8.5px]">LFP, NMC, Solid-State</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800">
                  <div className="text-gray-400 text-[9.5px]">VENTURI ACTUATION</div>
                  <div className="text-cyan-300 font-bold text-xs mt-0.5">0°–90° Servo</div>
                  <div className="text-gray-400 text-[8.5px]">&lt;120 ms Full Sweep</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800">
                  <div className="text-gray-400 text-[9.5px]">FLUID CHILLER PUMP</div>
                  <div className="text-emerald-400 font-bold text-xs mt-0.5">0–100% PWM</div>
                  <div className="text-gray-400 text-[8.5px]">5.2 kW Heat Rejection</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0C101C] border border-gray-800">
                  <div className="text-gray-400 text-[9.5px]">SAFETY INTEGRITY</div>
                  <div className="text-amber-400 font-bold text-xs mt-0.5">ASIL-B ISO 26262</div>
                  <div className="text-gray-400 text-[8.5px]">Hardware Kill-Switch</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0D111E] border border-gray-800 space-y-2 text-[10.5px]">
                <div className="font-bold text-gray-200 border-b border-gray-800 pb-1 flex items-center justify-between">
                  <span>EMBEDDED SIGNAL PROCESSING &amp; TELEMETRY INTERFACES</span>
                  <span className="text-cyan-400">10 Hz DETERMINISTIC STREAM</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300">
                  <div>
                    <strong className="text-cyan-300">Signal Conditioning:</strong> Circular Buffer Filter ($N=16$, $O(1)$ complexity). Eliminates inverter EMI noise and voltage dips with zero dynamic allocation.
                  </div>
                  <div>
                    <strong className="text-cyan-300">Actuator Interfaces:</strong> Standard automotive CAN 2.0B / CAN-FD integration or standalone UART (115200 baud, 8-N-1) for test benches.
                  </div>
                  <div>
                    <strong className="text-cyan-300">PID Controller:</strong> Discrete PID with derivative-on-measurement damping, anti-windup clamping ($0–100\%$), and dynamic target tracking.
                  </div>
                  <div>
                    <strong className="text-cyan-300">Fail-Safe Routine:</strong> Sensor fault or $T \ge 110^\circ\text{C}$ forces flap servo to fail-safe $90^\circ$ cooling position and drops pump PWM to $0\%$.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRESENTER WALKTHROUGH SCRIPT */}
          {activeTab === 'WALKTHROUGH' && (
            <div className="space-y-3 font-mono">
              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-[10.5px] text-cyan-200">
                <strong>4-Step Partner Demonstration Script:</strong> Follow these steps during a live walkthrough with Autoven or OEM powertrain executives:
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
            <span>AeroTherm R&amp;D IP Protection Notice // Authorized OEM Partner Review</span>
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
