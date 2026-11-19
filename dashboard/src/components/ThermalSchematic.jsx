/**
 * @file ThermalSchematic.jsx
 * @brief Interactive 2D/2.5D Animated Thermal Schematic (Hero Visual)
 * @details High-performance 60fps Canvas renderer featuring:
 *          - Decoupled requestAnimationFrame loop (zero tear-down churn on React state updates)
 *          - Animated Venturi Flaps physically rotating 0° to 90°
 *          - Dynamic ram-air streamline particles reacting to vehicle speed and flap angle
 *          - Animated closed fluid loop with temperature-graded coolant lines and flow particles
 *          - 16-cell EV Battery Pack Heat Map with smooth thermal color interpolation
 *          - Rotating fluid pump impeller and spinning radiator fan blades
 */

import React, { useRef, useEffect, memo } from 'react';
import { Box } from 'lucide-react';

const ThermalSchematic = memo(function ThermalSchematic({ telemetry, onToggle3DView }) {
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const telemetryRef = useRef(telemetry);

  // Keep telemetryRef updated synchronously without triggering canvas loop teardown
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  // Particle memory across animation frames
  const airParticlesRef = useRef([]);
  const fluidParticlesRef = useRef([]);
  const rotationAngleRef = useRef(0);

  // Initialize particles once on mount
  useEffect(() => {
    const air = [];
    for (let i = 0; i < 48; i++) {
      air.push({
        x: Math.random() * 320,
        y: 65 + Math.random() * 240,
        baseY: 65 + Math.random() * 240,
        speedOffset: 0.8 + Math.random() * 0.5,
        length: 10 + Math.random() * 16,
        alpha: 0.3 + Math.random() * 0.5
      });
    }
    airParticlesRef.current = air;

    const fluid = [];
    for (let i = 0; i < 32; i++) {
      fluid.push({
        distance: i / 32.0 // normalized position along loop [0, 1]
      });
    }
    fluidParticlesRef.current = fluid;
  }, []);

  // Continuous 60fps render loop decoupled from React state updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let lastTimestamp = performance.now();

    const render = (now) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      const width = canvas.width;
      const height = canvas.height;

      // Extract current live telemetry safely from ref
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
      } = telemetryRef.current || {};

      // Clear Canvas
      ctx.fillStyle = '#080A10';
      ctx.fillRect(0, 0, width, height);

      // Subtle CAD grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 38;
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
        rotationAngleRef.current += dt * (3.5 + (pwm_pct / 100.0) * 7.5);
      }

      // =======================================================================
      // 1. VEHICLE AERODYNAMIC COWL & VENTURI FLAP MECHANISM
      // =======================================================================
      const cowlStartX = 40;
      const cowlYTop = 85;
      const cowlYBottom = 300;
      const venturiThroatX = 230;
      const venturiThroatYTop = 120;
      const venturiThroatYBottom = 265;

      ctx.save();
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.6)';
      ctx.lineWidth = 2;

      // Upper cowl duct
      ctx.beginPath();
      ctx.moveTo(cowlStartX, cowlYTop);
      ctx.bezierCurveTo(110, cowlYTop + 10, 170, venturiThroatYTop - 10, venturiThroatX, venturiThroatYTop);
      ctx.stroke();

      // Lower cowl duct
      ctx.beginPath();
      ctx.moveTo(cowlStartX, cowlYBottom);
      ctx.bezierCurveTo(110, cowlYBottom - 10, 170, venturiThroatYBottom + 10, venturiThroatX, venturiThroatYBottom);
      ctx.stroke();

      // Flap Hinge Point
      const hingeX = 135;
      const hingeY = cowlYTop + 22;
      const flapLength = 58;
      const flapRad = (flap_deg * Math.PI) / 180;

      const flapEndX = hingeX + Math.cos(flapRad) * flapLength;
      const flapEndY = hingeY + Math.sin(flapRad) * flapLength;

      // Upper Flap Blade
      ctx.lineWidth = 5;
      ctx.strokeStyle = fault ? '#EF4444' : (flap_deg > 0 ? '#06B6D4' : '#64748B');
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(flapEndX, flapEndY);
      ctx.stroke();

      // Flap Hinge Pin
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(hingeX, hingeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Flap linkage strut
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hingeX - 22, hingeY - 12);
      ctx.lineTo(hingeX + Math.cos(flapRad) * 26, hingeY + Math.sin(flapRad) * 26);
      ctx.stroke();

      // Lower Symmetrical Flap
      const lowerHingeY = cowlYBottom - 22;
      const lowerFlapEndY = lowerHingeY - Math.sin(flapRad) * flapLength;
      ctx.lineWidth = 5;
      ctx.strokeStyle = fault ? '#EF4444' : (flap_deg > 0 ? '#06B6D4' : '#64748B');
      ctx.beginPath();
      ctx.moveTo(hingeX, lowerHingeY);
      ctx.lineTo(flapEndX, lowerFlapEndY);
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(hingeX, lowerHingeY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // =======================================================================
      // 2. AIRFLOW STREAMLINE PARTICLES
      // =======================================================================
      ctx.save();
      const airSpeedFactor = (speed_kmh / 100.0) * 400 * dt;

      airParticlesRef.current.forEach((p) => {
        p.x += (airSpeedFactor + 0.3) * p.speedOffset;

        const isNearIntake = p.x > cowlStartX && p.x < venturiThroatX;
        if (isNearIntake) {
          if (flap_deg > 5) {
            const targetY = 192 + (p.baseY - 192) * 0.45;
            p.y += (targetY - p.y) * 0.08;
          } else {
            if (p.baseY < 192) p.y -= 2.0;
            else p.y += 2.0;
          }
        }

        if (p.x > 370) {
          p.x = 20 + Math.random() * 35;
          p.y = p.baseY;
        }

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
      // 3. RADIATOR & FANS
      // =======================================================================
      const radX = 255;
      const radY = 125;
      const radW = 28;
      const radH = 135;

      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.fillRect(radX, radY, radW, radH);
      ctx.strokeRect(radX, radY, radW, radH);

      // Fin slats
      ctx.strokeStyle = flap_deg > 0 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 1;
      for (let fy = radY + 5; fy < radY + radH - 3; fy += 5) {
        ctx.beginPath();
        ctx.moveTo(radX + 2, fy);
        ctx.lineTo(radX + radW - 2, fy);
        ctx.stroke();
      }

      // Fans
      const fanCenterX = radX + radW + 15;
      const fanCenterY1 = radY + 34;
      const fanCenterY2 = radY + 101;
      const fanRadius = 21;

      const drawFan = (cx, cy) => {
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx, cy, fanRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const fanRot = rotationAngleRef.current * (pwm_pct / 40.0 + 0.2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(fanRot);
        ctx.fillStyle = pwm_pct > 0 ? '#38BDF8' : '#64748B';
        for (let b = 0; b < 4; b++) {
          ctx.beginPath();
          ctx.ellipse(0, 9.5, 4, 9.5, 0, 0, Math.PI * 2);
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
      const pipeSupplyColor = '#00F5D4';
      const pipeReturnColor = getTempColor(temp_filt);

      ctx.save();
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // (A) Supply Line
      ctx.strokeStyle = pump ? 'rgba(0, 245, 212, 0.7)' : 'rgba(0, 245, 212, 0.25)';
      ctx.beginPath();
      ctx.moveTo(radX + radW + 28, radY + 105);
      ctx.lineTo(430, radY + 105);
      ctx.lineTo(460, 290);
      ctx.lineTo(530, 290);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(570, 290);
      ctx.lineTo(640, 290);
      ctx.lineTo(660, 265);
      ctx.lineTo(680, 265);
      ctx.stroke();

      // (B) Return Line
      ctx.strokeStyle = pump ? pipeReturnColor : 'rgba(100, 116, 139, 0.25)';
      ctx.beginPath();
      ctx.moveTo(920, 125);
      ctx.lineTo(940, 125);
      ctx.lineTo(940, 75);
      ctx.lineTo(radX + 14, 75);
      ctx.lineTo(radX + 14, radY);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = pump ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
      ctx.restore();

      // =======================================================================
      // 5. FLUID PARTICLES
      // =======================================================================
      if (pump) {
        ctx.save();
        const flowSpeed = (0.07 + (pwm_pct / 100.0) * 0.16) * dt;

        fluidParticlesRef.current.forEach((fp) => {
          fp.distance = (fp.distance + flowSpeed) % 1.0;
          const pos = getLoopCoordinates(fp.distance, radX, radY);

          ctx.fillStyle = pos.isReturn ? pipeReturnColor : '#A7F3D0';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // =======================================================================
      // 6. 800V ACTIVE FLUID CIRCULATION PUMP
      // =======================================================================
      const pumpX = 550;
      const pumpY = 290;
      const pumpRadius = 23;

      ctx.save();
      ctx.fillStyle = pump ? '#064E3B' : '#1E293B';
      ctx.strokeStyle = pump ? '#10B981' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pumpX, pumpY, pumpRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating Impeller
      ctx.save();
      ctx.translate(pumpX, pumpY);
      if (pump) ctx.rotate(rotationAngleRef.current * 3.0);
      ctx.strokeStyle = pump ? '#34D399' : '#64748B';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i * Math.PI / 3) * (pumpRadius - 3), Math.sin(i * Math.PI / 3) * (pumpRadius - 3));
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(pumpX, pumpY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pump ? '#34D399' : '#94A3B8';
      ctx.font = '9.5px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pump ? 'PUMP ACTIVE (800V)' : 'PUMP OFF (0W)', pumpX, pumpY + pumpRadius + 14);
      ctx.restore();

      // =======================================================================
      // 7. 2.5D EV BATTERY PACK (16 CELLS)
      // =======================================================================
      const packX = 670;
      const packY = 105;
      const packW = 250;
      const packH = 175;

      ctx.save();
      ctx.fillStyle = '#0D111E';
      ctx.strokeStyle = fault ? '#EF4444' : (state === 'ACTIVE_FLUID_LOOP' ? '#06B6D4' : '#334155');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(packX, packY, packW, packH, 6);
      ctx.fill();
      ctx.stroke();

      // Cold plate base
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(packX + 8, packY + packH - 10, packW - 16, 7);

      const cols = 4;
      const rows = 4;
      const cellPadX = 7;
      const cellPadY = 7;
      const cellW = (packW - 30 - (cols - 1) * cellPadX) / cols;
      const cellH = (packH - 32 - (rows - 1) * cellPadY) / rows;

      let maxT = -Infinity;
      let minT = Infinity;
      let hotspotMod = 'Mod-06';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = packX + 15 + c * (cellW + cellPadX);
          const cy = packY + 12 + r * (cellH + cellPadY);
          const modIdx = r * 4 + c + 1;

          const coreDist = Math.abs(c - 1.5) + Math.abs(r - 1.5);
          const coreOffset = (2.2 - coreDist * 0.85);
          const frontAir = ((3.0 - c) / 3.0) * (flap_deg / 90.0) * (speed_kmh / 120.0) * 3.2;
          const liquidChill = pump ? ((pwm_pct / 100.0) * (2.8 - (r + c) * 0.35)) : 0.0;
          const cellTemp = Math.max(-10, temp_filt + coreOffset - frontAir - liquidChill);

          if (cellTemp > maxT) {
            maxT = cellTemp;
            hotspotMod = `Mod-${String(modIdx).padStart(2, '0')}`;
          }
          if (cellTemp < minT) minT = cellTemp;

          const cellColor = getTempColor(cellTemp);

          ctx.fillStyle = cellColor;
          ctx.beginPath();
          ctx.roundRect(cx, cy, cellW, cellH, 3);
          ctx.fill();

          ctx.fillStyle = '#0F172A';
          ctx.fillRect(cx + 5, cy + 2.5, cellW - 10, 2.5);

          ctx.fillStyle = '#090A0F';
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${cellTemp.toFixed(0)}°`, cx + cellW / 2, cy + cellH / 2 + 3);
        }
      }
      ctx.restore();

      // Pack Thermal Matrix & Hotspot Badge
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = fault ? '#EF4444' : '#38BDF8';
      ctx.lineWidth = 1.2;
      const badgeW = 210;
      const badgeH = 24;
      const badgeX = packX + (packW - badgeW) / 2;
      const badgeY = packY - 28;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fault ? '#F87171' : '#E0F2FE';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const deltaT = Math.max(0, maxT - minT);
      ctx.fillText(`PACK: ${temp_filt.toFixed(1)}°C | ΔT: ${deltaT.toFixed(1)}° | HS: ${hotspotMod}`, badgeX + badgeW / 2, badgeY + 16);
      ctx.restore();

      // Top HUD Labels
      ctx.save();
      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VENTURI FLAPS: ${flap_deg}°`, cowlStartX, cowlYTop - 12);

      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`RADIATOR / FAN`, radX - 8, radY - 12);

      if (aux_kw > 0) {
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 10.5px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`⚡ PASSIVE SAVING: +${aux_kw.toFixed(2)} kW`, width - 15, 26);
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
  }, []);

  return (
    <div className="relative w-full rounded-xl border border-cyan-950/70 bg-[#090C15] p-2 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col flex-1 min-h-[190px] max-h-[310px]">
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-1 mb-1 px-1 text-xs flex-shrink-0 z-10 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
          <span className="font-heading font-semibold text-gray-200 tracking-wider text-[11px] sm:text-xs truncate">
            2D/2.5D AEROTHERM CHASSIS SCHEMATIC
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px] flex-shrink-0">
          <span className="hidden sm:inline">RAM: <strong className="text-cyan-300">{(telemetry?.speed_kmh || 0).toFixed(0)} km/h</strong></span>
          <span className="hidden md:inline">FLAP: <strong className="text-cyan-300">{telemetry?.flap_deg || 0}°</strong></span>
          <span>PUMP: <strong className={telemetry?.pump ? 'text-emerald-400' : 'text-gray-500'}>
            {telemetry?.pump ? 'ACTIVE' : 'STANDBY'}
          </strong></span>
          {onToggle3DView && (
            <button
              onClick={onToggle3DView}
              className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 flex items-center gap-1 font-semibold transition-colors whitespace-nowrap shadow-sm shadow-cyan-950/50"
            >
              <Box className="h-2.5 w-2.5" />
              SWITCH TO 3D
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport with strict sizing */}
      <div className="w-full flex justify-center bg-black/40 rounded-lg overflow-hidden border border-gray-900 flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          width={1000}
          height={370}
          className="w-full max-w-[1000px] h-auto object-contain cursor-crosshair"
        />
      </div>

      {/* Bottom Visual Legend */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-800/60 text-[10px] text-gray-400 px-1 font-mono flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
            <span>Venturi Flaps (0°-90°)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            <span>800V Fluid Pump</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            <span>16-Cell Heat Map</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" />
            <span>PID Chiller (0-100%)</span>
          </div>
        </div>

        {onToggle3DView && (
          <button
            onClick={onToggle3DView}
            className="px-2 py-0.5 rounded bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-cyan-300 flex items-center gap-1 font-semibold transition-colors whitespace-nowrap text-[10px]"
          >
            <Box className="h-2.5 w-2.5" />
            3D VIEW
          </button>
        )}
      </div>
    </div>
  );
});

export default ThermalSchematic;

function getTempColor(temp) {
  if (temp < 40.0) return '#06B6D4';
  if (temp < 65.0) {
    const ratio = (temp - 40.0) / 25.0;
    return ratio > 0.5 ? '#10B981' : '#0EA5E9';
  }
  if (temp < 85.0) {
    const ratio = (temp - 65.0) / 20.0;
    return ratio > 0.5 ? '#F59E0B' : '#EAB308';
  }
  if (temp < 110.0) {
    const ratio = (temp - 85.0) / 25.0;
    return ratio > 0.5 ? '#EF4444' : '#F97316';
  }
  return '#FF0054';
}

function getLoopCoordinates(dist, radX, radY) {
  if (dist < 0.25) {
    const t = dist / 0.25;
    return { x: 310 + t * 220, y: radY + 105 + t * 60, isReturn: false };
  } else if (dist < 0.50) {
    const t = (dist - 0.25) / 0.25;
    return { x: 530 + t * 150, y: 290 - t * 25, isReturn: false };
  } else if (dist < 0.75) {
    const t = (dist - 0.50) / 0.25;
    return { x: 680 + t * 240, y: 265 - t * 140, isReturn: true };
  } else {
    const t = (dist - 0.75) / 0.25;
    if (t < 0.8) {
      return { x: 920 - (t / 0.8) * (920 - radX - 14), y: 75, isReturn: true };
    } else {
      return { x: radX + 14, y: 75 + ((t - 0.8) / 0.2) * (radY - 75), isReturn: true };
    }
  }
}
