/**
 * @file physicsEngine.js
 * @brief Real-time Physics & Hardware-in-the-Loop (HIL) Simulator Engine
 * @details Implements exact numerical mirror of the C++ firmware:
 *          - O(1) Circular Buffer Filter (N=16)
 *          - Discrete PID Controller with Derivative-on-Measurement & Anti-Windup
 *          - Deterministic State Machine (IDLE, PASSIVE_AERO, ACTIVE_FLUID, SYSTEM_FAULT)
 *          - First-principles Thermal Dynamics Model for EV Battery Pack
 */

export const THERMAL_THRESHOLDS = {
  T1: 40.0,       // °C (IDLE to PASSIVE AERO boundary)
  T2: 65.0,       // °C (PASSIVE AERO to ACTIVE FLUID boundary)
  T_CRIT: 110.0,  // °C (Emergency shutdown boundary)
  HYSTERESIS: 1.5,// °C
  SETPOINT: 75.0, // °C
  MIN_VALID: -20.0,
  MAX_VALID: 150.0
};

export const SYSTEM_STATES = {
  IDLE_MODE: 'IDLE_MODE',
  PASSIVE_AERO_COOLING: 'PASSIVE_AERO_COOLING',
  ACTIVE_FLUID_LOOP: 'ACTIVE_FLUID_LOOP',
  SYSTEM_FAULT: 'SYSTEM_FAULT'
};

/**
 * Exact JS port of C++ SensorFilter (O(1) Moving Average)
 */
export class CircularBufferFilter {
  constructor(size = 16, initialVal = 25.0) {
    this.size = size;
    this.buffer = new Array(size).fill(initialVal);
    this.head = 0;
    this.count = size;
    this.runningSum = initialVal * size;
    this.filteredValue = initialVal;
    this.latestRaw = initialVal;
    this.fault = null;
  }

  reset(initialVal = 25.0) {
    this.buffer.fill(initialVal);
    this.head = 0;
    this.count = this.size;
    this.runningSum = initialVal * this.size;
    this.filteredValue = initialVal;
    this.latestRaw = initialVal;
    this.fault = null;
  }

  update(rawVal) {
    this.latestRaw = rawVal;

    if (isNaN(rawVal)) {
      this.fault = 'ERR_SENSOR_INVALID_MATH_NAN';
      return this.filteredValue;
    }
    if (rawVal < THERMAL_THRESHOLDS.MIN_VALID) {
      this.fault = 'ERR_SENSOR_DISCONNECTED_OR_OPEN_CIRCUIT';
      return this.filteredValue;
    }
    if (rawVal > THERMAL_THRESHOLDS.MAX_VALID) {
      this.fault = 'ERR_SENSOR_OVER_RANGE_HIGH_SHORT';
      return this.filteredValue;
    }

    this.fault = null;

    // O(1) circular buffer subtraction and addition
    this.runningSum -= this.buffer[this.head];
    this.buffer[this.head] = rawVal;
    this.runningSum += rawVal;

    this.head = (this.head + 1) % this.size;
    if (this.count < this.size) this.count++;

    this.filteredValue = this.runningSum / this.count;
    return this.filteredValue;
  }
}

/**
 * Exact JS port of C++ PidController with Derivative-on-Measurement & Anti-Windup
 */
export class PidController {
  constructor(kp = 2.5, ki = 0.4, kd = 0.8, setpoint = 75.0) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.setpoint = setpoint;

    this.integrator = 0.0;
    this.lastMeasurement = setpoint;
    this.isFirstRun = true;

    this.pTerm = 0.0;
    this.iTerm = 0.0;
    this.dTerm = 0.0;
    this.output = 0.0;
  }

  reset() {
    this.integrator = 0.0;
    this.lastMeasurement = this.setpoint;
    this.isFirstRun = true;
    this.pTerm = 0.0;
    this.iTerm = 0.0;
    this.dTerm = 0.0;
    this.output = 0.0;
  }

  setGains(kp, ki, kd) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  setSetpoint(sp) {
    this.setpoint = sp;
  }

  compute(measurement, dt) {
    if (dt <= 0.0001) return this.output;

    // Cooling mode error: actual temp > setpoint demands more cooling PWM
    const error = measurement - this.setpoint;

    // 1. Proportional Term
    this.pTerm = this.kp * error;

    // 2. Derivative-on-Measurement (prevents setpoint step kicks)
    if (this.isFirstRun) {
      this.lastMeasurement = measurement;
      this.dTerm = 0.0;
      this.isFirstRun = false;
    } else {
      const dMeas = (measurement - this.lastMeasurement) / dt;
      this.dTerm = this.kd * dMeas;
      this.lastMeasurement = measurement;
    }

    // 3. Integral Calculation with Anti-Windup Clamping
    const candidateIntegrator = this.integrator + (this.ki * error * dt);
    const tentativeOutput = this.pTerm + candidateIntegrator + this.dTerm;

    const saturatedHigh = (tentativeOutput >= 100.0) && (error > 0.0);
    const saturatedLow  = (tentativeOutput <= 0.0) && (error < 0.0);

    if (!saturatedHigh && !saturatedLow) {
      this.integrator = candidateIntegrator;
    }

    // Clamp integrator bounds
    this.integrator = Math.max(0.0, Math.min(100.0, this.integrator));
    this.iTerm = this.integrator;

    // 4. Output Summation & Clamping [0, 100]%
    const unconstrained = this.pTerm + this.iTerm + this.dTerm;
    this.output = Math.max(0.0, Math.min(100.0, unconstrained));

    return this.output;
  }
}

/**
 * Complete EV Battery Thermal & Aerodynamic HIL Physics Simulation Model
 */
export class HilSimulator {
  constructor() {
    this.filter = new CircularBufferFilter(16, 28.0);
    this.pid = new PidController(2.5, 0.4, 0.8, 75.0);

    // Environment & Driver Inputs
    this.ambientTemp = 28.0;     // °C
    this.vehicleSpeedKmh = 85.0; // km/h
    this.batteryLoadKw = 35.0;   // kW
    this.setpoint = 75.0;        // °C

    // Internal Thermal Physics States
    this.trueCoreTemp = 32.0;    // Actual internal battery temperature (°C)
    this.coolantTemp = 30.0;     // Fluid loop temperature (°C)

    // Actuator & State Machine States
    this.state = SYSTEM_STATES.IDLE_MODE;
    this.flapAngleDeg = 0.0;
    this.pumpActive = false;
    this.pwmDutyPct = 0.0;
    this.auxPowerSavedKw = 0.0;
    this.cumulativeKwhSaved = 0.0;
    this.faultMessage = null;
    this.manualFault = null;

    // Noise and disturbance injection
    this.noiseBurstActive = false;
    this.disconnectActive = false;
    this.runawayActive = false;

    this.simTimeMs = 0;
  }

  setAmbientTemp(val) { this.ambientTemp = Number(val); }
  setVehicleSpeed(val) { this.vehicleSpeedKmh = Number(val); }
  setBatteryLoad(val) { this.batteryLoadKw = Number(val); }
  setSetpoint(val) {
    this.setpoint = Number(val);
    this.pid.setSetpoint(this.setpoint);
  }
  setPidGains(kp, ki, kd) {
    this.pid.setGains(Number(kp), Number(ki), Number(kd));
  }

  injectSensorDisconnect() {
    this.disconnectActive = true;
  }

  injectThermalRunaway() {
    this.runawayActive = true;
    this.trueCoreTemp = 115.0;
  }

  injectNoiseBurst(durationMs = 4000) {
    this.noiseBurstActive = true;
    setTimeout(() => { this.noiseBurstActive = false; }, durationMs);
  }

  resetFault(forceCooldown = true) {
    this.disconnectActive = false;
    this.runawayActive = false;
    this.noiseBurstActive = false;
    this.manualFault = null;
    this.faultMessage = null;

    // 1. If pack temperature was pushed into thermal runaway or critical bounds (> 100°C),
    // safely restore core temperature to normal operating setpoint
    if (forceCooldown || this.trueCoreTemp >= (THERMAL_THRESHOLDS.T_CRIT - 2.0)) {
      this.trueCoreTemp = Math.min(this.trueCoreTemp, this.setpoint || 75.0);
    }

    // 2. Completely reset circular buffer filter: clears fault flag & fills window with safe temperature
    this.filter.reset(this.trueCoreTemp);

    // 3. Reset PID controller integral/derivative terms to prevent windup bump
    this.pid.reset();

    // 4. Deterministically re-evaluate state & actuator outputs
    const cur = this.filter.filteredValue;
    if (cur < THERMAL_THRESHOLDS.T1) {
      this.state = SYSTEM_STATES.IDLE_MODE;
      this.flapAngleDeg = 0.0;
      this.pumpActive = false;
      this.pwmDutyPct = 0.0;
    } else if (cur < THERMAL_THRESHOLDS.T2) {
      this.state = SYSTEM_STATES.PASSIVE_AERO_COOLING;
      this.pumpActive = false;
      this.pwmDutyPct = 0.0;
      this.flapAngleDeg = Math.min(90.0, Math.max(0.0, ((cur - THERMAL_THRESHOLDS.T1) / 25.0) * 90.0));
    } else {
      this.state = SYSTEM_STATES.ACTIVE_FLUID_LOOP;
      this.pumpActive = true;
      this.pwmDutyPct = Math.min(100.0, Math.max(0.0, (cur - this.setpoint) * 5.0 + 35.0));
    }

    return true;
  }

  /**
   * Advances simulation by dt seconds (typically 0.05s = 50ms)
   */
  step(dt = 0.05) {
    this.simTimeMs += Math.round(dt * 1000);

    // --- 1. THERMAL DYNAMICS MODEL ---
    // Thermal mass of 55kWh battery pack (~110 kJ/°C)
    const thermalMass = 110.0;

    // Joule heating from internal resistance: Q_gen = I^2 * R
    // Under heavy load (e.g. 100kW), heat generation spikes non-linearly
    const heatGenKw = 0.045 * Math.pow(this.batteryLoadKw, 1.15) + (this.vehicleSpeedKmh * 0.015);

    // Natural ambient convection dissipation
    const deltaAmb = this.trueCoreTemp - this.ambientTemp;
    const naturalLossKw = 0.04 * deltaAmb;

    // Ram-Air Aerodynamic Venturi dissipation
    // Flap angle 0° to 90°. Streamline mass flow rate scales with speed & sin(flap)
    const flapRad = (this.flapAngleDeg * Math.PI) / 180.0;
    const aeroRamFlowFactor = (this.vehicleSpeedKmh / 100.0) * Math.sin(flapRad);
    const aeroCoolingKw = Math.max(0, 0.09 * aeroRamFlowFactor * deltaAmb);

    // Active Fluid Loop & Chiller dissipation
    let activeCoolingKw = 0.0;
    if (this.pumpActive) {
      const chillerMaxKw = 5.2; // 5.2 kW heat absorption capacity
      const pumpCoolingBase = 0.8; // Coolant convective loop
      activeCoolingKw = pumpCoolingBase + (this.pwmDutyPct / 100.0) * chillerMaxKw;
    }

    // Dynamic Runaway condition
    let externalHeatKw = 0.0;
    if (this.runawayActive) {
      externalHeatKw = 45.0; // Rapid thermal exothermic runaway
    }

    // Net Heat Rate (kW = kJ/s)
    const netHeatRateKw = heatGenKw + externalHeatKw - naturalLossKw - aeroCoolingKw - activeCoolingKw;

    // Integrate temperature
    this.trueCoreTemp += (netHeatRateKw / thermalMass) * dt;
    this.trueCoreTemp = Math.max(-15.0, Math.min(160.0, this.trueCoreTemp));

    // Coolant fluid temperature responds with lag to core and ambient
    if (this.pumpActive) {
      this.coolantTemp += ((this.trueCoreTemp - 8.0 - (this.pwmDutyPct * 0.15)) - this.coolantTemp) * (dt * 0.8);
    } else {
      this.coolantTemp += (this.ambientTemp - this.coolantTemp) * (dt * 0.2);
    }

    // --- 2. SENSOR ADC & NOISE INJECTION ---
    let rawReading = this.trueCoreTemp;

    if (this.disconnectActive) {
      rawReading = -38.5; // Disconnected ADC floating / grounded
    } else {
      // Gaussian / white electrical noise
      const normalNoise = (Math.random() - 0.5) * 0.8;
      // Occasional random EMI noise spike from inverter switching
      const emiSpike = (Math.random() < 0.06) ? (Math.random() - 0.5) * 3.5 : 0;
      // High-variance noise burst test
      const burst = this.noiseBurstActive ? (Math.random() - 0.5) * 8.0 : 0;

      rawReading += normalNoise + emiSpike + burst;
    }

    // --- 3. FILTERING (Exact C++ Circular Buffer) ---
    const filteredTemp = this.filter.update(rawReading);

    // --- 4. STATE MACHINE DETERMINISTIC EVALUATION ---
    // Safety Interlocks
    if (this.disconnectActive) {
      this.state = SYSTEM_STATES.SYSTEM_FAULT;
      this.faultMessage = 'ERR_SENSOR_DISCONNECTED_OR_OPEN_CIRCUIT';
    } else if (this.filter.fault) {
      this.state = SYSTEM_STATES.SYSTEM_FAULT;
      this.faultMessage = this.filter.fault;
    } else if (filteredTemp >= THERMAL_THRESHOLDS.T_CRIT) {
      this.state = SYSTEM_STATES.SYSTEM_FAULT;
      this.faultMessage = 'ERR_THERMAL_RUNAWAY_CRITICAL_T_EXCEEDED';
    }

    // State Transitions
    if (this.state === SYSTEM_STATES.SYSTEM_FAULT) {
      // Immediate Hardware Kill-Switch
      this.pwmDutyPct = 0.0;
      this.pumpActive = false;
      this.flapAngleDeg = 90.0; // Fail-safe full open cooling
      this.auxPowerSavedKw = 0.0;
    } else {
      switch (this.state) {
        case SYSTEM_STATES.IDLE_MODE:
          if (filteredTemp >= THERMAL_THRESHOLDS.T1) {
            this.state = SYSTEM_STATES.PASSIVE_AERO_COOLING;
          }
          break;

        case SYSTEM_STATES.PASSIVE_AERO_COOLING:
          if (filteredTemp < (THERMAL_THRESHOLDS.T1 - THERMAL_THRESHOLDS.HYSTERESIS)) {
            this.state = SYSTEM_STATES.IDLE_MODE;
          } else if (filteredTemp >= THERMAL_THRESHOLDS.T2) {
            this.state = SYSTEM_STATES.ACTIVE_FLUID_LOOP;
          }
          break;

        case SYSTEM_STATES.ACTIVE_FLUID_LOOP:
          if (filteredTemp < (THERMAL_THRESHOLDS.T2 - THERMAL_THRESHOLDS.HYSTERESIS)) {
            this.state = SYSTEM_STATES.PASSIVE_AERO_COOLING;
            this.pid.reset();
          }
          break;

        default:
          this.state = SYSTEM_STATES.IDLE_MODE;
          break;
      }

      // State Actions
      switch (this.state) {
        case SYSTEM_STATES.IDLE_MODE:
          this.flapAngleDeg = 0.0;
          this.pumpActive = false;
          this.pwmDutyPct = 0.0;
          this.auxPowerSavedKw = 0.0;
          this.faultMessage = null;
          break;

        case SYSTEM_STATES.PASSIVE_AERO_COOLING: {
          this.pumpActive = false; // Zero pump draw!
          this.pwmDutyPct = 0.0;

          const deltaRatio = Math.max(0.0, Math.min(1.0, 
            (filteredTemp - THERMAL_THRESHOLDS.T1) / (THERMAL_THRESHOLDS.T2 - THERMAL_THRESHOLDS.T1)
          ));
          this.flapAngleDeg = deltaRatio * 90.0;

          // Saved auxiliary pump (0.65 kW) + refrigeration compressor (1.85 kW * delta)
          this.auxPowerSavedKw = 0.65 + (1.85 * deltaRatio);
          this.cumulativeKwhSaved += (this.auxPowerSavedKw * (dt / 3600.0));
          this.faultMessage = null;
          break;
        }

        case SYSTEM_STATES.ACTIVE_FLUID_LOOP: {
          this.pumpActive = true;
          this.pwmDutyPct = this.pid.compute(filteredTemp, dt);
          this.flapAngleDeg = 45.0 + (45.0 * (this.pwmDutyPct / 100.0));
          this.auxPowerSavedKw = 0.0;
          this.faultMessage = null;
          break;
        }
      }
    }

    // Return structured snapshot matching C++ JSON schema
    return this.getTelemetryPacket();
  }

  getTelemetryPacket() {
    return {
      ts: this.simTimeMs,
      state: this.state,
      temp_raw: Number(this.filter.latestRaw.toFixed(2)),
      temp_filt: Number(this.filter.filteredValue.toFixed(2)),
      setpoint: Number(this.setpoint.toFixed(1)),
      speed_kmh: Math.round(this.vehicleSpeedKmh),
      flap_deg: Math.round(this.flapAngleDeg),
      pump: this.pumpActive,
      pwm_pct: Number(this.pwmDutyPct.toFixed(1)),
      pid: {
        p: Number(this.pid.pTerm.toFixed(1)),
        i: Number(this.pid.iTerm.toFixed(1)),
        d: Number(this.pid.dTerm.toFixed(1))
      },
      aux_kw: Number(this.auxPowerSavedKw.toFixed(2)),
      kwh_saved: Number(this.cumulativeKwhSaved.toFixed(4)),
      coolant_temp: Number(this.coolantTemp.toFixed(1)),
      battery_load_kw: this.batteryLoadKw,
      ambient_temp: this.ambientTemp,
      fault: this.faultMessage
    };
  }
}
