/**
 * @file ThermalSchematic.jsx
 * @brief Interactive 2D/2.5D Animated Thermal Schematic (Hero Visual)
 * @details 60fps Canvas renderer featuring:
 *          - Animated Venturi Flaps physically rotating 0° to 90°
 *          - Dynamic ram-air streamline particles reacting to vehicle speed and flap angle
 *          - Animated closed fluid loop with temperature-graded coolant lines and flow particles
 *          - 16-cell EV Battery Pack Heat Map with smooth thermal color interpolation
 *          - Rotating fluid pump impeller and spinning radiator fan blades
 */

import React, { useRef, useEffect } from 'react';

export default function ThermalSchematic({ telemetry }) {
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Particle memory across animation frames
  const airParticlesRef = useRef([]);
  const fluidParticlesRef = useRef([]);
  const rotationAngleRef = useRef(0);

  useEffect(() => {
    // Initialize 55 streamline air particles
    if (airParticlesRef.current.length === 0) {
      const air = [];
      for (let i = 0; i < 55; i++) {
        air.push({
          x: Math.random() * 320,
          y: 70 + Math.random() * 260,
          baseY: 70 + Math.random() * 260,
          speedOffset: 0.8 + Math.random() * 0.5,
          length: 12 + Math.random() * 18,
          alpha: 0.3 + Math.random() * 0.6
        });
      }
      airParticlesRef.current = air;
    }

    // Initialize 36 fluid loop particles
    if (fluidParticlesRef.current.length === 0) {
      const fluid = [];
      for (let i = 0; i < 36; i++) {
        fluid.push({
          distance: (i / 36.0) // normalized position along loop [0, 1]
        });
      }
      fluidParticlesRef.current = fluid;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let lastTimestamp = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      // Ensure canvas internal resolution matches display size
      const width = canvas.width;
      const height = canvas.height;

      // Extract current live telemetry
      const {
        temp_filt = 25.0,
        temp_raw = 25.0,
        speed_kmh = 0,
        flap_deg = 0,
        pump = false,
        pwm_pct = 0,
        state = 'IDLE_MODE',
        aux_kw = 0.0,
        fault = null
      } = telemetry || {};

      // Clear Canvas with sleek aerospace background
      ctx.fillStyle = '#080A10';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle CAD coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update rotation angle for pump & fans
      if (pump) {
        rotationAngleRef.current += dt * (4.0 + (pwm_pct / 100.0) * 8.0);
      }

      // =======================================================================
      // 1. VEHICLE AERODYNAMIC COWL & VENTURI FLAP MECHANISM
      // =======================================================================
      const cowlStartX = 40;
      const cowlYTop = 90;
      const cowlYBottom = 330;
      const venturiThroatX = 240;
      const venturiThroatYTop = 130;
      const venturiThroatYBottom = 290;

      // Draw Aero Diffuser Housing
      ctx.save();
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.6)';
      ctx.lineWidth = 2;

      // Upper cowl duct
      ctx.beginPath();
      ctx.moveTo(cowlStartX, cowlYTop);
      ctx.bezierCurveTo(120, cowlYTop + 10, 180, venturiThroatYTop - 10, venturiThroatX, venturiThroatYTop);
      ctx.stroke();

      // Lower cowl duct
      ctx.beginPath();
      ctx.moveTo(cowlStartX, cowlYBottom);
      ctx.bezierCurveTo(120, cowlYBottom - 10, 180, venturiThroatYBottom + 10, venturiThroatX, venturiThroatYBottom);
      ctx.stroke();

      // Flap Hinge Point
      const hingeX = 140;
      const hingeY = cowlYTop + 24;
      const flapLength = 65;
      const flapRad = (flap_deg * Math.PI) / 180;

      // Flap physical angle: 0° is horizontal (sealed along intake), 90° is angled down scooping air
      const flapEndX = hingeX + Math.cos(flapRad) * flapLength;
      const flapEndY = hingeY + Math.sin(flapRad) * flapLength;

      // Upper Flap Blade
      ctx.lineWidth = 6;
      ctx.strokeStyle = fault ? '#EF4444' : (flap_deg > 0 ? '#06B6D4' : '#64748B');
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(flapEndX, flapEndY);
      ctx.stroke();

      // Flap Hinge Pin
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(hingeX, hingeY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Flap mechanical hydraulic actuator linkage
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hingeX - 25, hingeY - 15);
      ctx.lineTo(hingeX + Math.cos(flapRad) * 30, hingeY + Math.sin(flapRad) * 30);
      ctx.stroke();

      // Lower Symmetrical Flap
      const lowerHingeY = cowlYBottom - 24;
      const lowerFlapEndY = lowerHingeY - Math.sin(flapRad) * flapLength;
      ctx.lineWidth = 6;
      ctx.strokeStyle = fault ? '#EF4444' : (flap_deg > 0 ? '#06B6D4' : '#64748B');
      ctx.beginPath();
      ctx.moveTo(hingeX, lowerHingeY);
      ctx.lineTo(flapEndX, lowerFlapEndY);
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(hingeX, lowerHingeY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // =======================================================================
      // 2. AIRFLOW STREAMLINE PARTICLES (RAM-AIR SPEED & FLAP DEFLECTION)
      // =======================================================================
      ctx.save();
      const airSpeedFactor = (speed_kmh / 100.0) * 450 * dt;

      airParticlesRef.current.forEach((p) => {
        // Move particle rightward
        p.x += (airSpeedFactor + 0.3) * p.speedOffset;

        // Path deflection based on flap opening
        const isNearIntake = p.x > cowlStartX && p.x < venturiThroatX;
        if (isNearIntake) {
          if (flap_deg > 5) {
            // Flaps open: funnel air particles into venturi throat (Venturi constriction acceleration)
            const targetY = 210 + (p.baseY - 210) * 0.45;
            p.y += (targetY - p.y) * 0.08;
          } else {
            // Flaps closed: deflect air up or down around aerodynamic cowl boundary layer
            if (p.baseY < 210) {
              p.y -= 2.2;
            } else {
              p.y += 2.2;
            }
          }
        }

        // Reset particle when it travels past radiator or off screen
        if (p.x > 380) {
          p.x = 20 + Math.random() * 40;
          p.y = p.baseY;
        }

        // Draw particle stream line
        const gradient = ctx.createLinearGradient(p.x - p.length, p.y, p.x, p.y);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
        gradient.addColorStop(1, `rgba(165, 243, 252, ${p.alpha})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.length, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      });
      ctx.restore();

      // =======================================================================
      // 3. RADIATOR & REFRIGERATION CHILLER CORE
      // =======================================================================
      const radX = 265;
      const radY = 135;
      const radW = 32;
      const radH = 150;

      // Radiator Core Fins
      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.fillRect(radX, radY, radW, radH);
      ctx.strokeRect(radX, radY, radW, radH);

      // Heat exchanger fin slats
      ctx.strokeStyle = flap_deg > 0 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1;
      for (let fy = radY + 6; fy < radY + radH - 4; fy += 6) {
        ctx.beginPath();
        ctx.moveTo(radX + 3, fy);
        ctx.lineTo(radX + radW - 3, fy);
        ctx.stroke();
      }

      // Radiator Cooling Fan Behind Core
      const fanCenterX = radX + radW + 16;
      const fanCenterY1 = radY + 38;
      const fanCenterY2 = radY + 112;
      const fanRadius = 24;

      const drawFan = (cx, cy) => {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx, cy, fanRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spinning fan blades
        const fanRot = rotationAngleRef.current * (pwm_pct / 40.0 + 0.2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(fanRot);
        ctx.fillStyle = pwm_pct > 0 ? '#38BDF8' : '#64748B';
        for (let b = 0; b < 4; b++) {
          ctx.beginPath();
          ctx.ellipse(0, 11, 4.5, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.rotate(Math.PI / 2);
        }
        ctx.restore();
      };

      drawFan(fanCenterX, fanCenterY1);
      drawFan(fanCenterX, fanCenterY2);
      ctx.restore();

      // =======================================================================
      // 4. CLOSED FLUID COOLING PIPING CIRCUIT
      // =======================================================================
      // Circuit path:
      // (1) Radiator Outlet: (330, 260) -> (480, 260)
      // (2) To Pump Inlet: (480, 260) -> (530, 310)
      // (3) Through Pump: (530, 310) -> (600, 310)
      // (4) Into Battery Cold Plate: (600, 310) -> (670, 260)
      // (5) Return from Battery: (910, 155) -> (910, 100) -> (300, 100) -> (300, 135)
      
      const pipeSupplyColor = '#00F5D4'; // Electric Cyan (Cold supply)
      const pipeReturnColor = getTempColor(temp_filt); // Dynamic temp return

      ctx.save();
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // (A) Supply Line (Cyan)
      ctx.strokeStyle = pump ? 'rgba(0, 245, 212, 0.7)' : 'rgba(0, 245, 212, 0.25)';
      ctx.beginPath();
      ctx.moveTo(radX + radW + 30, radY + 115); // Radiator outlet
      ctx.lineTo(440, radY + 115);
      ctx.lineTo(470, 315);
      ctx.lineTo(540, 315); // Into Pump
      ctx.stroke();

      // Pump to Battery inlet
      ctx.beginPath();
      ctx.moveTo(580, 315);
      ctx.lineTo(650, 315);
      ctx.lineTo(670, 290);
      ctx.lineTo(690, 290); // Battery cold plate inlet
      ctx.stroke();

      // (B) Return Line (Temperature-graded)
      ctx.strokeStyle = pump ? pipeReturnColor : 'rgba(100, 116, 139, 0.25)';
      ctx.beginPath();
      ctx.moveTo(930, 135); // Battery outlet
      ctx.lineTo(950, 135);
      ctx.lineTo(950, 80);
      ctx.lineTo(radX + 16, 80);
      ctx.lineTo(radX + 16, radY);
      ctx.stroke();

      // Inner glow line
      ctx.lineWidth = 3;
      ctx.strokeStyle = pump ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
      ctx.restore();

      // =======================================================================
      // 5. ANIMATED FLUID PARTICLES (CIRCULATING WHEN PUMP IS ACTIVE)
      // =======================================================================
      if (pump) {
        ctx.save();
        const flowSpeed = (0.08 + (pwm_pct / 100.0) * 0.18) * dt;

        fluidParticlesRef.current.forEach((fp) => {
          fp.distance = (fp.distance + flowSpeed) % 1.0;
          const pos = getLoopCoordinates(fp.distance, radX, radY, radW);

          ctx.fillStyle = pos.isReturn ? pipeReturnColor : '#A7F3D0';
          ctx.shadowColor = pos.isReturn ? pipeReturnColor : '#34D399';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // =======================================================================
      // 6. 800V ACTIVE FLUID CIRCULATION PUMP
      // =======================================================================
      const pumpX = 560;
      const pumpY = 315;
      const pumpRadius = 26;

      ctx.save();
      // Pump Housing
      ctx.fillStyle = pump ? '#064E3B' : '#1E293B';
      ctx.strokeStyle = pump ? '#10B981' : '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pumpX, pumpY, pumpRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating Impeller
      ctx.save();
      ctx.translate(pumpX, pumpY);
      if (pump) ctx.rotate(rotationAngleRef.current * 3.0);
      ctx.fillStyle = pump ? '#34D399' : '#64748B';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i * Math.PI / 3) * (pumpRadius - 4), Math.sin(i * Math.PI / 3) * (pumpRadius - 4));
        ctx.lineWidth = 3;
        ctx.strokeStyle = pump ? '#34D399' : '#64748B';
        ctx.stroke();
      }
      ctx.restore();

      // Pump Center Hub
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(pumpX, pumpY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pump Label
      ctx.fillStyle = pump ? '#34D399' : '#94A3B8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pump ? 'PUMP ACTIVE (800V)' : 'PUMP OFF (0W)', pumpX, pumpY + pumpRadius + 16);
      ctx.restore();

      // =======================================================================
      // 7. 2.5D EV BATTERY PACK (16 THERMAL CELLS HEAT MAP)
      // =======================================================================
      const packX = 680;
      const packY = 115;
      const packW = 260;
      const packH = 190;

      ctx.save();
      // Outer Battery Tray / Thermal Enclosure
      ctx.fillStyle = '#0D111E';
      ctx.strokeStyle = fault ? '#EF4444' : (state === 'ACTIVE_FLUID_LOOP' ? '#06B6D4' : '#334155');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(packX, packY, packW, packH, 8);
      ctx.fill();
      ctx.stroke();

      // Cold Plate Aluminum Heatsink Base
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(packX + 8, packY + packH - 12, packW - 16, 8);

      // Render 16 Individual Prismatic Thermal Cells (4x4 Matrix)
      const cols = 4;
      const rows = 4;
      const cellPadX = 8;
      const cellPadY = 8;
      const cellW = (packW - 32 - (cols - 1) * cellPadX) / cols;
      const cellH = (packH - 36 - (rows - 1) * cellPadY) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = packX + 16 + c * (cellW + cellPadX);
          const cy = packY + 14 + r * (cellH + cellPadY);

          // Simulate slight thermal gradient (inner cells hotter than outer edge)
          const coreDist = Math.abs(c - 1.5) + Math.abs(r - 1.5);
          const cellTemp = temp_filt + (2.5 - coreDist * 0.9);

          const cellColor = getTempColor(cellTemp);

          // Cell Body
          ctx.fillStyle = cellColor;
          ctx.shadowColor = cellColor;
          ctx.shadowBlur = fault ? 12 : 4;
          ctx.beginPath();
          ctx.roundRect(cx, cy, cellW, cellH, 4);
          ctx.fill();

          // Cell + / - Terminal busbar indicators
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(cx + 6, cy + 3, cellW - 12, 3);

          // Local Cell Temperature text
          ctx.fillStyle = '#090A0F';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${cellTemp.toFixed(0)}°`, cx + cellW / 2, cy + cellH / 2 + 3);
        }
      }
      ctx.restore();

      // Battery Core Readout Badge
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = fault ? '#EF4444' : '#38BDF8';
      ctx.lineWidth = 1.5;
      const badgeW = 160;
      const badgeH = 28;
      const badgeX = packX + (packW - badgeW) / 2;
      const badgeY = packY - 34;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fault ? '#F87171' : '#E0F2FE';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PACK CORE: ${temp_filt.toFixed(1)}°C (RAW: ${temp_raw.toFixed(1)}°C)`, badgeX + badgeW / 2, badgeY + 18);
      ctx.restore();

      // =======================================================================
      // 8. ON-CANVAS HUD LABELS & FLIGHT TELEMETRY ANNOTATIONS
      // =======================================================================
      ctx.save();
      // Flap Angle Indicator
      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VENTURI FLAPS: ${flap_deg}°`, cowlStartX, cowlYTop - 14);

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`RAM PRESSURE: ${(speed_kmh * 0.45).toFixed(0)} Pa`, cowlStartX, cowlYTop);

      // Radiator Core Annotation
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`RADIATOR / FAN`, radX - 10, radY - 14);
      ctx.fillStyle = '#64748B';
      ctx.fillText(`PWM: ${pwm_pct.toFixed(0)}%`, radX - 10, radY);

      // Passive Energy Savings Tag
      if (aux_kw > 0) {
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`⚡ PASSIVE AERO SAVING: +${aux_kw.toFixed(2)} kW`, width - 20, 30);
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [telemetry]);

  return (
    <div className="relative w-full rounded-xl border border-cyan-950/70 bg-[#090C15] p-3 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 mb-2 px-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-heading font-semibold text-gray-200 tracking-wider text-sm">
            2D/2.5D INTERACTIVE AEROTHERM PHYSICAL CHASSIS SCHEMATIC
          </span>
        </div>
        <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
          <span>RAM-AIR: <strong className="text-cyan-300">{telemetry?.speed_kmh || 0} km/h</strong></span>
          <span>FLAP: <strong className="text-cyan-300">{telemetry?.flap_deg || 0}°</strong></span>
          <span>PUMP: <strong className={telemetry?.pump ? 'text-emerald-400' : 'text-gray-500'}>
            {telemetry?.pump ? 'ENGAGED' : 'STANDBY'}
          </strong></span>
          <span>PWM: <strong className="text-purple-400">{telemetry?.pwm_pct || 0}%</strong></span>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="w-full flex justify-center bg-black/40 rounded-lg overflow-hidden border border-gray-900">
        <canvas
          ref={canvasRef}
          width={1000}
          height={420}
          className="w-full max-w-[1000px] h-auto object-contain cursor-crosshair"
        />
      </div>

      {/* Bottom Visual Legend */}
      <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-800/60 text-[11px] text-gray-400 px-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 inline-block" />
          <span>Venturi Flaps (0°-90° Ram Scoop)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
          <span>800V Fluid Pump (Zero aux draw in P1)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
          <span>Battery 16-Cell Dynamic Heat Map</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-400 inline-block" />
          <span>PID Chiller Actuation (0-100%)</span>
        </div>
      </div>
    </div>
  );
}

// Utility: Maps temperature to smooth color gradient
function getTempColor(temp) {
  if (temp < 40.0) {
    // Deep Cyan
    return '#06B6D4';
  } else if (temp < 65.0) {
    // Cyan to Emerald
    const ratio = (temp - 40.0) / 25.0;
    return ratio > 0.5 ? '#10B981' : '#0EA5E9';
  } else if (temp < 85.0) {
    // Emerald to Amber
    const ratio = (temp - 65.0) / 20.0;
    return ratio > 0.5 ? '#F59E0B' : '#EAB308';
  } else if (temp < 110.0) {
    // Amber to Vivid Red
    const ratio = (temp - 85.0) / 25.0;
    return ratio > 0.5 ? '#EF4444' : '#F97316';
  } else {
    // Critical Crimson Runaway
    return '#FF0054';
  }
}

// Utility: Maps normalized loop distance [0, 1] to (x, y) along fluid circuit
function getLoopCoordinates(dist, radX, radY, radW) {
  // Total normalized segments:
  // 0.00 -> 0.25: Radiator out -> down to pump
  // 0.25 -> 0.50: Through pump into battery cold plate
  // 0.50 -> 0.75: Flowing across battery pack cold plate
  // 0.75 -> 1.00: Return conduit back to radiator top inlet
  if (dist < 0.25) {
    const t = dist / 0.25;
    return { x: 330 + t * 210, y: radY + 115 + t * 65, isReturn: false };
  } else if (dist < 0.50) {
    const t = (dist - 0.25) / 0.25;
    return { x: 540 + t * 150, y: 315 - t * 25, isReturn: false };
  } else if (dist < 0.75) {
    const t = (dist - 0.50) / 0.25;
    return { x: 690 + t * 240, y: 290 - t * 155, isReturn: true };
  } else {
    const t = (dist - 0.75) / 0.25;
    if (t < 0.8) {
      return { x: 930 - (t / 0.8) * (930 - radX - 16), y: 80, isReturn: true };
    } else {
      return { x: radX + 16, y: 80 + ((t - 0.8) / 0.2) * (radY - 80), isReturn: true };
    }
  }
}
