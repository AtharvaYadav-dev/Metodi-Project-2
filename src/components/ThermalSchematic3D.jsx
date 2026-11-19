/**
 * @file ThermalSchematic3D.jsx
 * @brief 3D/Isometric EV Skateboard Chassis & Thermal Airflow Visualizer
 * @details Three.js WebGL visualizer featuring:
 *          - High-contrast brushed gunmetal & titanium silver EV skateboard chassis
 *          - Suspended charcoal rubber tires with alloy rims, ventilated brake discs & cyan calipers
 *          - Dynamic underbody Venturi aerodynamic flaps physically rotating 0° to 90°
 *          - Animated ram-air aerodynamic streamlines reacting to speed and flap angle
 *          - Dual-color thermal loop:
 *              * Glowing radiant amber/red battery thermal heat path (conductive busbars & heat flux)
 *              * Vivid neon cyan/blue cooling flow paths with circulating fluid particles
 *          - 16-cell EV battery pack matrix with dynamic localized temperature color interpolation
 *          - Dual-function ducting indicator (Active Ram Airflow vs Encapsulated Air Insulation)
 *          - Camera preset view buttons (ISO 3D, TOP-DOWN, FRONT AERO, SIDE PROFILE) & Auto-Orbit
 *          - Integrated, overlap-free 2D CAD cross-section view switcher
 */

import React, { useRef, useEffect, useState, memo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Compass,
  Eye,
  Wind,
  Droplets,
  Layers,
  Flame,
  Box
} from 'lucide-react';

const ThermalSchematic3D = memo(function ThermalSchematic3D({
  telemetry,
  onToggle2DView,
  is3D = true
}) {
  const mountRef = useRef(null);
  const telemetryRef = useRef(telemetry);
  const [cameraView, setCameraView] = useState('ISO');
  const [autoRotate, setAutoRotate] = useState(false);
  const setViewRef = useRef(null);

  // Sync telemetry safely without tearing down WebGL context
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 320;

    // =========================================================================
    // 1. THREE.JS SCENE, CAMERA & RENDERER SETUP
    // =========================================================================
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.012);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 300);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // =========================================================================
    // 2. STUDIO 3-POINT LIGHTING RIG & GROUND BOUNCE
    // =========================================================================
    // (A) Boosted Ambient Light (prevents pitch-black shadows)
    const ambientLight = new THREE.AmbientLight(0x334155, 2.0);
    scene.add(ambientLight);

    // (B) Key Directional Light (Top-Front-Right: crisp metallic highlights)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(24, 32, 22);
    scene.add(keyLight);

    // (C) Fill Directional Light (Back-Left: cool sky tone)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    fillLight.position.set(-25, 20, -22);
    scene.add(fillLight);

    // (D) Underbody & Side Kicker / Rim Light (Cyan rim definition)
    const kickerLight = new THREE.DirectionalLight(0x06b6d4, 2.2);
    kickerLight.position.set(-18, -8, 24);
    scene.add(kickerLight);

    // (E) Rear Silhouette Rim Light (Amber tone for depth separation)
    const rearRimLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
    rearRimLight.position.set(22, -10, -22);
    scene.add(rearRimLight);

    // (F) Ground Bounce Point Light (illuminates underbody aero components)
    const groundBounceLight = new THREE.PointLight(0x06b6d4, 1.6, 20);
    groundBounceLight.position.set(0, -1.8, 0);
    scene.add(groundBounceLight);

    // (G) Battery Pack Core Point Lights (Cyan cooling glow & Amber thermal flux)
    const packCoolingLight = new THREE.PointLight(0x22d3ee, 2.8, 28);
    packCoolingLight.position.set(0, 0.6, 0);
    scene.add(packCoolingLight);

    const packHeatLight = new THREE.PointLight(0xfbbf24, 2.4, 24);
    packHeatLight.position.set(0, 1.8, 0);
    scene.add(packHeatLight);

    // (H) Subtle CAD floor grid (toned down so it never competes with the vehicle)
    const grid = new THREE.GridHelper(60, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -2.6;
    grid.material.opacity = 0.14;
    grid.material.transparent = true;
    scene.add(grid);

    // =========================================================================
    // 3. HIGH-CONTRAST EV SKATEBOARD CHASSIS PLATFORM
    // =========================================================================
    const chassisGroup = new THREE.Group();
    scene.add(chassisGroup);

    // (A) Structural Frame Rails (Brushed Gunmetal / Titanium Silver)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x78889b,
      metalness: 0.88,
      roughness: 0.25
    });
    const railGeo = new THREE.BoxGeometry(26, 1.2, 1.2);
    const railEdgeMat = new THREE.LineBasicMaterial({
      color: 0xcfd8dc,
      transparent: true,
      opacity: 0.42
    });

    const railLeft = new THREE.Mesh(railGeo, railMat);
    railLeft.position.set(0, 0, 7.2);
    railLeft.add(new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), railEdgeMat));
    chassisGroup.add(railLeft);

    const railRight = new THREE.Mesh(railGeo, railMat);
    railRight.position.set(0, 0, -7.2);
    railRight.add(new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), railEdgeMat));
    chassisGroup.add(railRight);

    // Front, Center & Rear Crossmembers
    const crossGeo = new THREE.BoxGeometry(1.2, 1.2, 14.4);
    const crossFront = new THREE.Mesh(crossGeo, railMat);
    crossFront.position.set(-12.4, 0, 0);
    crossFront.add(new THREE.LineSegments(new THREE.EdgesGeometry(crossGeo), railEdgeMat));
    chassisGroup.add(crossFront);

    const crossCenter = new THREE.Mesh(crossGeo, railMat);
    crossCenter.position.set(0, 0, 0);
    crossCenter.add(new THREE.LineSegments(new THREE.EdgesGeometry(crossGeo), railEdgeMat));
    chassisGroup.add(crossCenter);

    const crossRear = new THREE.Mesh(crossGeo, railMat);
    crossRear.position.set(12.4, 0, 0);
    crossRear.add(new THREE.LineSegments(new THREE.EdgesGeometry(crossGeo), railEdgeMat));
    chassisGroup.add(crossRear);

    // Suspension A-Arms / Wishbones connecting chassis rails to wheel hubs
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2
    });
    const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 8);
    armGeo.rotateX(Math.PI / 2);

    const armCoords = [
      { x: -10, y: 0.2, z: 7.8 },
      { x: -10, y: 0.2, z: -7.8 },
      { x: 10, y: 0.2, z: 7.8 },
      { x: 10, y: 0.2, z: -7.8 }
    ];
    armCoords.forEach((ac) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(ac.x, ac.y, ac.z);
      chassisGroup.add(arm);
    });

    // (B) 4 Wheels / Tires (Charcoal Rubber + Polished Alloy Rims + Brake Calipers)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark charcoal rubber (cleanly distinct from dark background)
      roughness: 0.82,
      metalness: 0.18
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Crisp silver/alloy
      metalness: 0.95,
      roughness: 0.15
    });
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.22
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Electric cyan performance caliper
      emissive: 0x083344,
      metalness: 0.8,
      roughness: 0.25
    });

    const tireGeo = new THREE.CylinderGeometry(2.4, 2.4, 1.5, 24);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(1.4, 1.4, 1.55, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const rotorGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.2, 16);
    rotorGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.35, 0.8, 0.6);

    const spokeGeo = new THREE.BoxGeometry(0.12, 1.25, 0.25);

    const wheels = [];
    const wheelPositions = [
      { x: -10, y: 0.2, z: 8.5 },
      { x: -10, y: 0.2, z: -8.5 },
      { x: 10, y: 0.2, z: 8.5 },
      { x: 10, y: 0.2, z: -8.5 }
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      // Rotating Hub Group
      const rotatingHub = new THREE.Group();

      // Tire
      const tire = new THREE.Mesh(tireGeo, tireMat);
      rotatingHub.add(tire);

      // Rim Face
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rotatingHub.add(rim);

      // Alloy Spokes (5-spoke design inside rim)
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.x = (s * 2 * Math.PI) / 5;
        spoke.position.x = pos.z > 0 ? 0.72 : -0.72;
        rotatingHub.add(spoke);
      }

      // Center Hub Cap (Cyan Accent)
      const hubGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.62, 12);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      rotatingHub.add(hub);

      wheelGroup.add(rotatingHub);

      // Stationary Brake Rotor (Ventilated Steel)
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.x = pos.z > 0 ? -0.5 : 0.5;
      wheelGroup.add(rotor);

      // Performance Brake Caliper
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(pos.z > 0 ? -0.5 : 0.5, 1.1, 0);
      wheelGroup.add(caliper);

      chassisGroup.add(wheelGroup);
      wheels.push(rotatingHub);
    });

    // (C) Front Radiator Core & Aero Intake Shroud
    const intakeMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Titanium silver shroud
      metalness: 0.85,
      roughness: 0.25
    });
    const radiatorGeo = new THREE.BoxGeometry(1.4, 3.8, 9);
    const radiatorMesh = new THREE.Mesh(radiatorGeo, intakeMat);
    radiatorMesh.position.set(-13.5, 1.2, 0);
    radiatorMesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(radiatorGeo),
      new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 })
    ));
    chassisGroup.add(radiatorMesh);

    // Front honeycomb aerodynamic grille
    const grillMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const grillMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 8.8), grillMat);
    grillMesh.position.set(-14.3, 1.2, 0);
    chassisGroup.add(grillMesh);

    // (D) Spinning Radiator Fan Rotors
    const fanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const fanGeo = new THREE.BoxGeometry(0.12, 2.3, 0.45);
    const fan1 = new THREE.Mesh(fanGeo, fanMat);
    fan1.position.set(-12.6, 1.2, 2.2);
    chassisGroup.add(fan1);

    const fan2 = new THREE.Mesh(fanGeo, fanMat);
    fan2.position.set(-12.6, 1.2, -2.2);
    chassisGroup.add(fan2);

    // (E) Dynamic Venturi Underbody Aero Flaps (0° to 90°)
    const flapMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0e7490,
      emissiveIntensity: 0.4
    });
    const flapGeo = new THREE.BoxGeometry(4.8, 0.25, 2.2);
    flapGeo.translate(2.4, 0, 0);
    const flapEdgeMat = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.75
    });

    const flapHingeLeft = new THREE.Group();
    flapHingeLeft.position.set(-8.5, -0.6, 6.0);
    const flapMeshLeft = new THREE.Mesh(flapGeo, flapMat);
    flapMeshLeft.add(new THREE.LineSegments(new THREE.EdgesGeometry(flapGeo), flapEdgeMat));
    flapHingeLeft.add(flapMeshLeft);
    chassisGroup.add(flapHingeLeft);

    const flapHingeRight = new THREE.Group();
    flapHingeRight.position.set(-8.5, -0.6, -6.0);
    const flapMeshRight = new THREE.Mesh(flapGeo, flapMat);
    flapMeshRight.add(new THREE.LineSegments(new THREE.EdgesGeometry(flapGeo), flapEdgeMat));
    flapHingeRight.add(flapMeshRight);
    chassisGroup.add(flapHingeRight);

    // =========================================================================
    // 4. 16-CELL BATTERY PACK MATRIX & ENCLOSURE
    // =========================================================================
    // Lower Pack Tray (Slate Brushed Aluminum Enclosure)
    const packTrayMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Clean brushed-aluminum housing
      metalness: 0.78,
      roughness: 0.26
    });
    const packTrayGeo = new THREE.BoxGeometry(15.2, 1.8, 11.2);
    const packTray = new THREE.Mesh(packTrayGeo, packTrayMat);
    packTray.position.set(0, 0.8, 0);
    packTray.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(packTrayGeo),
      new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 })
    ));
    chassisGroup.add(packTray);

    // Transparent Aerodynamic Encapsulation Shield (Crystal cyan clarity)
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.20,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.88,
      ior: 1.45
    });
    const shieldGeo = new THREE.BoxGeometry(15.4, 0.35, 11.4);
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 2.1, 0);
    shieldMesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(shieldGeo),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 })
    ));
    chassisGroup.add(shieldMesh);

    // 16 Individual Prismatic Cells (4x4 Grid with Edge Highlights)
    const cells = [];
    const cellGeo = new THREE.BoxGeometry(2.8, 1.4, 2.0);
    const cellEdgeGeo = new THREE.EdgesGeometry(cellGeo);
    const cellEdgeMat = new THREE.LineBasicMaterial({
      color: 0x075985,
      transparent: true,
      opacity: 0.6
    });

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cellMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.65,
          roughness: 0.25,
          metalness: 0.35
        });
        const cell = new THREE.Mesh(cellGeo, cellMat);

        const x = -4.8 + c * 3.2;
        const z = -3.3 + r * 2.2;
        cell.position.set(x, 1.2, z);

        // Edge silhouette
        cell.add(new THREE.LineSegments(cellEdgeGeo, cellEdgeMat));

        // Terminal Block (Polished copper/gold)
        const termGeo = new THREE.BoxGeometry(0.7, 0.22, 0.45);
        const termMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.9,
          roughness: 0.2
        });
        const term = new THREE.Mesh(termGeo, termMat);
        term.position.set(0, 0.78, 0);
        cell.add(term);

        chassisGroup.add(cell);
        cells.push({ mesh: cell, row: r, col: c });
      }
    }

    // =========================================================================
    // 5. DUAL-COLOR THERMAL & COOLANT LOOPS
    // =========================================================================
    // (A) Radiant Amber/Gold Internal Heat Conduction Busbars
    const heatBusbarMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.85,
      metalness: 0.85,
      roughness: 0.18
    });

    const heatBusbars = [];
    for (let c = 0; c < 3; c++) {
      const hx = -3.2 + c * 3.2;
      const barGeo = new THREE.BoxGeometry(0.35, 0.45, 8.4);
      const barMesh = new THREE.Mesh(barGeo, heatBusbarMat);
      barMesh.position.set(hx, 1.25, 0);
      chassisGroup.add(barMesh);
      heatBusbars.push(barMesh);
    }

    // (B) Electric Cyan Closed Coolant Loop Tubing
    const pipePoints = [
      new THREE.Vector3(-12.5, 0.8, 3.2),
      new THREE.Vector3(-6.0, 0.3, 5.0),
      new THREE.Vector3(0.0, 0.2, 5.0),
      new THREE.Vector3(7.0, 0.3, 3.0),
      new THREE.Vector3(7.0, 0.3, -3.0),
      new THREE.Vector3(0.0, 0.2, -5.0),
      new THREE.Vector3(-6.0, 0.3, -5.0),
      new THREE.Vector3(-12.5, 0.8, -3.2),
      new THREE.Vector3(-13.0, 2.2, 0.0)
    ];
    const pipeCurve = new THREE.CatmullRomCurve3(pipePoints, true);

    const pipeTubeGeo = new THREE.TubeGeometry(pipeCurve, 54, 0.35, 8, true);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.85,
      metalness: 0.35,
      roughness: 0.2
    });
    const pipeMesh = new THREE.Mesh(pipeTubeGeo, pipeMat);
    chassisGroup.add(pipeMesh);

    // 800V Fluid Circulation Pump Housing
    const pumpGeo = new THREE.CylinderGeometry(1.25, 1.25, 1.65, 16);
    const pumpMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x065f46,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.25
    });
    const pumpMesh = new THREE.Mesh(pumpGeo, pumpMat);
    pumpMesh.position.set(-4.0, 0.65, 5.2);
    chassisGroup.add(pumpMesh);

    // Coolant Fluid Flow Particles along Curve
    const fluidCount = 48;
    const fluidParticlesGeo = new THREE.BufferGeometry();
    const fluidPositions = new Float32Array(fluidCount * 3);
    const fluidProgress = new Float32Array(fluidCount);

    for (let i = 0; i < fluidCount; i++) {
      fluidProgress[i] = i / fluidCount;
      const pt = pipeCurve.getPointAt(fluidProgress[i]);
      fluidPositions[i * 3] = pt.x;
      fluidPositions[i * 3 + 1] = pt.y;
      fluidPositions[i * 3 + 2] = pt.z;
    }

    fluidParticlesGeo.setAttribute('position', new THREE.BufferAttribute(fluidPositions, 3));
    const fluidParticleMat = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.95,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const fluidParticles = new THREE.Points(fluidParticlesGeo, fluidParticleMat);
    chassisGroup.add(fluidParticles);

    // =========================================================================
    // 6. CRISP ICE-BLUE / WHITE-CYAN AERODYNAMIC STREAMLINES
    // =========================================================================
    const streamCount = 75;
    const streamPositions = new Float32Array(streamCount * 3);
    const streamVelocities = [];

    for (let i = 0; i < streamCount; i++) {
      streamPositions[i * 3] = -28 + Math.random() * 44;
      streamPositions[i * 3 + 1] = -1.2 + Math.random() * 5.2;
      streamPositions[i * 3 + 2] = -9.2 + Math.random() * 18.4;

      streamVelocities.push({
        baseX: streamPositions[i * 3],
        baseY: streamPositions[i * 3 + 1],
        baseZ: streamPositions[i * 3 + 2],
        speed: 0.85 + Math.random() * 0.5
      });
    }

    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
    const streamMat = new THREE.PointsMaterial({
      color: 0x7dd3fc, // Crisp ice-blue / white-cyan
      size: 0.8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const streamParticles = new THREE.Points(streamGeo, streamMat);
    scene.add(streamParticles);

    // =========================================================================
    // 7. CAMERA FRAMING & ORBIT CONTROLS (60-70% VIEWPORT FILL)
    // =========================================================================
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    // Framed closer: radius 29 (down from 46) so the skateboard prominently fills the viewport
    let spherical = {
      radius: 29,
      theta: Math.PI / 4.2,
      phi: Math.PI / 3.4
    };

    const updateCameraFromSpherical = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.lookAt(0, 0.4, 0);
    };
    updateCameraFromSpherical();

    // Preset View Handlers exposed via ref
    setViewRef.current = (viewKey) => {
      if (viewKey === 'ISO') {
        spherical.radius = 29;
        spherical.theta = Math.PI / 4.2;
        spherical.phi = Math.PI / 3.4;
      } else if (viewKey === 'TOP') {
        spherical.radius = 26;
        spherical.theta = 0.01;
        spherical.phi = 0.05;
      } else if (viewKey === 'FRONT') {
        spherical.radius = 23;
        spherical.theta = Math.PI;
        spherical.phi = Math.PI / 3.6;
      } else if (viewKey === 'SIDE') {
        spherical.radius = 25;
        spherical.theta = Math.PI / 2;
        spherical.phi = Math.PI / 2.3;
      }
      updateCameraFromSpherical();
      setCameraView(viewKey);
    };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      spherical.theta -= dx * 0.007;
      spherical.phi = Math.max(0.12, Math.min(Math.PI / 2.05, spherical.phi - dy * 0.007));
      updateCameraFromSpherical();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      spherical.radius = Math.max(14, Math.min(50, spherical.radius + e.deltaY * 0.03));
      updateCameraFromSpherical();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // =========================================================================
    // 8. 60 FPS RENDER & TELEMETRY SYNC LOOP
    // =========================================================================
    let animId = null;
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const telem = telemetryRef.current || {};
      const {
        temp_filt = 25.0,
        speed_kmh = 0,
        flap_deg = 0,
        pump = false,
        pwm_pct = 0,
        battery_load_kw = 35,
        fault = null
      } = telem;

      // 1. Wheel Rotation (Tied to road speed)
      const wheelRotSpeed = (speed_kmh / 3.6 / 0.3) * dt;
      wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed;
      });

      // 2. Radiator Fans (Tied to PWM %)
      const fanSpeed = dt * (pwm_pct > 0 ? 12.0 + (pwm_pct / 100) * 20.0 : 0);
      fan1.rotation.x += fanSpeed;
      fan2.rotation.x += fanSpeed;

      // 3. Venturi Flap Rotation (Physically rotates down 0° to 90°)
      const targetFlapRad = (flap_deg * Math.PI) / 180;
      flapHingeLeft.rotation.z += (targetFlapRad - flapHingeLeft.rotation.z) * 0.15;
      flapHingeRight.rotation.z += (targetFlapRad - flapHingeRight.rotation.z) * 0.15;

      // 4. Coolant Fluid Particles Movement
      if (pump) {
        fluidParticleMat.opacity = 0.95;
        const fluidSpeed = (0.08 + (pwm_pct / 100) * 0.18) * dt;
        const posAttr = fluidParticlesGeo.attributes.position;

        for (let i = 0; i < fluidCount; i++) {
          fluidProgress[i] = (fluidProgress[i] + fluidSpeed) % 1.0;
          const pt = pipeCurve.getPointAt(fluidProgress[i]);
          posAttr.setXYZ(i, pt.x, pt.y, pt.z);
        }
        posAttr.needsUpdate = true;
      } else {
        fluidParticleMat.opacity = 0.25;
      }

      // 5. Thermal Heat Busbars (Radiant gold/amber pulsing under electrical load)
      const heatFluxIntensity = Math.min(1.0, (battery_load_kw || 35) / 120.0);
      const isOvertemp = temp_filt >= 65.0;
      const heatColorHex = isOvertemp ? 0xef4444 : 0xfbbf24;
      heatBusbarMat.color.setHex(heatColorHex);
      heatBusbarMat.emissive.setHex(heatColorHex);
      heatBusbarMat.emissiveIntensity = 0.55 + heatFluxIntensity * 0.65;
      packHeatLight.color.setHex(heatColorHex);
      packHeatLight.intensity = 1.6 + heatFluxIntensity * 1.8;

      // 6. Dynamic 16-Cell Temperature Interpolation
      const cellColorHex = getThreeTempColor(temp_filt);
      packCoolingLight.color.setHex(cellColorHex);

      pipeMat.color.setHex(pump ? 0x22d3ee : 0x0284c7);
      pipeMat.emissive.setHex(pump ? 0x06b6d4 : 0x0284c7);
      pipeMat.emissiveIntensity = pump ? 0.85 : 0.2;

      pumpMat.emissive.setHex(pump ? 0x10b981 : 0x047857);

      cells.forEach(({ mesh, row, col }) => {
        const coreDist = Math.abs(col - 1.5) + Math.abs(row - 1.5);
        const cellTemp = temp_filt + (2.0 - coreDist * 0.7);
        const hex = getThreeTempColor(cellTemp);
        mesh.material.color.setHex(hex);
        mesh.material.emissive.setHex(hex);
        mesh.material.emissiveIntensity = fault ? 0.95 : cellTemp >= 65.0 ? 0.75 : 0.55;
      });

      // 7. Aerodynamic Airflow Streamlines
      const streamPosAttr = streamGeo.attributes.position;
      const airVelocity = (Math.max(15, speed_kmh) / 100.0) * 24.0 * dt;

      for (let i = 0; i < streamCount; i++) {
        let x = streamPosAttr.getX(i);
        let y = streamPosAttr.getY(i);
        let z = streamPosAttr.getZ(i);

        x += airVelocity * streamVelocities[i].speed;

        // Flow diversion around front intake and into Venturi scoops
        if (x > -16 && x < 8) {
          if (flap_deg > 5) {
            y += (-0.8 - y) * 0.08;
          } else {
            y += (y < 0 ? -1.5 : 1.5) * 0.04;
          }
        }

        if (x > 22) {
          x = -26 - Math.random() * 6;
          y = streamVelocities[i].baseY;
          z = streamVelocities[i].baseZ;
        }

        streamPosAttr.setXYZ(i, x, y, z);
      }
      streamPosAttr.needsUpdate = true;

      // 8. Auto-Rotation
      if (autoRotate && !isDragging) {
        spherical.theta += 0.003;
        updateCameraFromSpherical();
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    // =========================================================================
    // 9. RESIZE OBSERVER
    // =========================================================================
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW && newH) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();

      renderer.dispose();
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [autoRotate]);

  return (
    <div className="relative w-full flex-1 min-h-[190px] max-h-[310px] rounded-xl border border-cyan-950/70 bg-[#07090E] p-2 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
      {/* Top Banner Ribbon - Responsive, Wrap-Protected & Overlap-Free */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-1 mb-1 px-1 text-xs flex-shrink-0 z-10 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-[11px] sm:text-xs truncate">
            3D ISOMETRIC EV SKATEBOARD &amp; THERMAL AIRFLOW
          </h3>
        </div>

        {/* View Switcher & Ducting Badges */}
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] sm:text-[10px] flex-shrink-0">
          {/* Dual-Function Ducting Indicator */}
          <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${
            (telemetry?.flap_deg || 0) > 0
              ? 'bg-cyan-950/70 border-cyan-700 text-cyan-300 font-bold'
              : 'bg-gray-800/80 border-gray-700 text-gray-400'
          }`}>
            {(telemetry?.flap_deg || 0) > 0 ? 'RAM COOLING (OPEN)' : 'INSULATED (CLOSED)'}
          </span>

          {/* 3D / 2D Toggle Button (Seamless header integration) */}
          {onToggle2DView && (
            <button
              onClick={onToggle2DView}
              className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 flex items-center gap-1 font-semibold transition-colors whitespace-nowrap shadow-sm shadow-cyan-950/50"
            >
              <Box className="h-2.5 w-2.5" />
              SWITCH TO 2D CAD
            </button>
          )}
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full flex-1 min-h-0 bg-black/60 rounded-lg overflow-hidden border border-gray-900 cursor-grab active:cursor-grabbing relative"
      />

      {/* Bottom Floating Controls Overlay */}
      <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-800/60 text-[10px] text-gray-400 px-1 font-mono flex-shrink-0 z-10">
        {/* Camera Preset Angles */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500 mr-1">VIEW:</span>
          {['ISO', 'TOP', 'FRONT', 'SIDE'].map((v) => (
            <button
              key={v}
              onClick={() => setViewRef.current && setViewRef.current(v)}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                cameraView === v
                  ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {v}
            </button>
          ))}

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-1.5 py-0.5 rounded border ml-1 transition-colors ${
              autoRotate
                ? 'bg-purple-950 border-purple-600 text-purple-300 font-bold'
                : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            ORBIT
          </button>

          {/* Quick-switch to 2D CAD from camera angle toolbar */}
          {onToggle2DView && (
            <button
              onClick={onToggle2DView}
              className="px-1.5 py-0.5 rounded border ml-1.5 bg-gray-800/80 border-cyan-800/60 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/60 transition-colors flex items-center gap-1"
            >
              <Box className="h-2.5 w-2.5" /> 2D CAD
            </button>
          )}
        </div>

        {/* Dual-Color Path Legend */}
        <div className="flex items-center gap-2.5 text-[9.5px]">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block" />
            <span>Cyan Coolant ({telemetry?.pump ? 'Active' : 'Standby'})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
            <span>Amber Heat Flux</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300 inline-block" />
            <span>Air Streamlines</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ThermalSchematic3D;

function getThreeTempColor(temp) {
  if (temp < 40.0) return 0x38bdf8; // Sky / Teal
  if (temp < 65.0) return 0x10b981; // Emerald
  if (temp < 85.0) return 0xf59e0b; // Amber
  if (temp < 110.0) return 0xef4444; // Orange/Red
  return 0xff0054; // Critical Runaway Crimson
}
