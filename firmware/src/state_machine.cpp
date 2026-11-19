/**
 * @file state_machine.cpp
 * @brief Implementation of Deterministic State Machine for AeroTherm EV Thermal Loop
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#include "state_machine.h"
#include <math.h>

#ifdef ARDUINO
#include <Arduino.h>
#endif

ThermalStateMachine::ThermalStateMachine()
    : currentState_(STATE_IDLE_MODE),
      currentSpeedKmh_(0.0f),
      flapAngleDeg_(0.0f),
      boostActive_(false),
      pumpActive_(false),
      pwmDutyPct_(0.0f),
      auxPowerSavedKw_(0.0f),
      faultMessage_(nullptr),
      manualFaultInjected_(false) {}

void ThermalStateMachine::init() {
    filter_.init(25.0f);
    pid_.reset();
    currentState_ = STATE_IDLE_MODE;
    flapAngleDeg_ = 0.0f;
    boostActive_ = false;
    pumpActive_ = false;
    pwmDutyPct_ = 0.0f;
    auxPowerSavedKw_ = 0.0f;
    faultMessage_ = nullptr;
    manualFaultInjected_ = false;

#ifdef ARDUINO
    pinMode(PIN_BOOSTER_RELAY, OUTPUT);
    digitalWrite(PIN_BOOSTER_RELAY, LOW);

    pinMode(PIN_HEARTBEAT_LED, OUTPUT);
    digitalWrite(PIN_HEARTBEAT_LED, LOW);

    // Setup ESP32 LEDC PWM channels if compiling on ESP32
#if defined(ESP32)
    ledcSetup(0, PWM_SERVO_FREQ_HZ, PWM_RESOLUTION_BITS);
    ledcAttachPin(PIN_FLAP_SERVO, 0);

    ledcSetup(1, PWM_CHILLER_FREQ_HZ, PWM_RESOLUTION_BITS);
    ledcAttachPin(PIN_CHILLER_PWM, 1);
#else
    pinMode(PIN_FLAP_SERVO, OUTPUT);
    pinMode(PIN_CHILLER_PWM, OUTPUT);
#endif

#endif

    applyHardwareActuation(0.0f, false, 0.0f);
}

void ThermalStateMachine::update(float rawTemp, float vehicleSpeedKmh, float dt_seconds) {
    currentSpeedKmh_ = vehicleSpeedKmh;

    // 1. Ingest raw ADC sample through O(1) circular filter
    float filteredTemp = filter_.update(rawTemp);

    // 2. High-Priority Safety Interlock Checks (Sub-millisecond transition)
    if (manualFaultInjected_) {
        currentState_ = STATE_SYSTEM_FAULT;
    } else if (filter_.isFaulted()) {
        faultMessage_ = filter_.getFaultString();
        currentState_ = STATE_SYSTEM_FAULT;
    } else if (filteredTemp >= THERMAL_T_CRIT) {
        faultMessage_ = "ERR_THERMAL_RUNAWAY_CRITICAL_T_EXCEEDED";
        currentState_ = STATE_SYSTEM_FAULT;
    }

    // 3. Deterministic State Processing
    if (currentState_ == STATE_SYSTEM_FAULT) {
        executeSystemFault();
    } else {
        // State Transition Matrix with Anti-Chatter Hysteresis
        switch (currentState_) {
            case STATE_IDLE_MODE:
                if (filteredTemp >= THERMAL_T1) {
                    currentState_ = STATE_PASSIVE_AERO_COOLING;
                }
                break;

            case STATE_PASSIVE_AERO_COOLING:
                if (filteredTemp < (THERMAL_T1 - THERMAL_HYSTERESIS)) {
                    currentState_ = STATE_IDLE_MODE;
                } else if (filteredTemp >= THERMAL_T2) {
                    currentState_ = STATE_ACTIVE_FLUID_LOOP;
                }
                break;

            case STATE_ACTIVE_FLUID_LOOP:
                if (filteredTemp < (THERMAL_T2 - THERMAL_HYSTERESIS)) {
                    currentState_ = STATE_PASSIVE_AERO_COOLING;
                    pid_.reset(); // Reset integrator when falling back to passive aero
                }
                break;

            default:
                currentState_ = STATE_IDLE_MODE;
                break;
        }

        // Execute Active State Logic
        switch (currentState_) {
            case STATE_IDLE_MODE:
                executeIdleMode(filteredTemp, vehicleSpeedKmh, dt_seconds);
                break;

            case STATE_PASSIVE_AERO_COOLING:
                executePassiveAero(filteredTemp, vehicleSpeedKmh, dt_seconds);
                break;

            case STATE_ACTIVE_AIR_BOOST:
                executeActiveAirBoost(filteredTemp, vehicleSpeedKmh, dt_seconds);
                break;

            default:
                break;
        }
    }

    // 4. Physical Hardware Output Actuation
    applyHardwareActuation(flapAngleDeg_, boostActive_, pwmDutyPct_);
}

void ThermalStateMachine::executeIdleMode(float temp, float speed, float dt) {
    (void)temp;
    (void)speed;
    (void)dt;

    flapAngleDeg_ = 0.0f;     // Flaps fully sealed for aerodynamic efficiency
    boostActive_ = false;     // Zero blower energy consumption
    pumpActive_ = false;      // Backward-compatible alias
    pwmDutyPct_ = 0.0f;       // Zero thermal cooling PWM
    auxPowerSavedKw_ = 0.0f;  // Quiescent baseline
    faultMessage_ = nullptr;
}

void ThermalStateMachine::executePassiveAero(float temp, float speed, float dt) {
    (void)dt;

    boostActive_ = false;     // Crucial: Active booster remains OFF (zero aux power draw)
    pumpActive_ = false;      // Backward-compatible alias
    pwmDutyPct_ = 0.0f;       // No active forced-air draw

    // Dynamic Venturi Flap Modulation (0° - 90°)
    // Proportional to thermal delta between T1 (40°C) and T2 (65°C)
    float deltaRatio = (temp - THERMAL_T1) / (THERMAL_T2 - THERMAL_T1);
    if (deltaRatio < 0.0f) deltaRatio = 0.0f;
    if (deltaRatio > 1.0f) deltaRatio = 1.0f;

    // Vehicle speed ram-air scaling: higher speed delivers more dynamic pressure
    float speedRatio = (speed > 5.0f) ? (speed / 100.0f) : 0.05f;
    if (speedRatio > 1.0f) speedRatio = 1.0f;

    // Flap deploys proportionally with temperature demand
    flapAngleDeg_ = deltaRatio * FLAP_MAX_ANGLE_DEG;

    // Auxiliary Power Saved (kW):
    // Saved by eliminating active air booster (650W) and refrigeration compressor (1.8kW * deltaRatio)
    auxPowerSavedKw_ = 0.65f + (1.85f * deltaRatio);
    faultMessage_ = nullptr;
}

void ThermalStateMachine::executeActiveAirBoost(float temp, float speed, float dt) {
    (void)speed;

    boostActive_ = true; // Active air channel booster engaged
    pumpActive_ = true;  // Backward-compatible alias

    // Precision PID closed-loop control to lock temperature at target setpoint (75°C)
    pwmDutyPct_ = pid_.compute(temp, dt);

    // Flaps open dynamically to feed the integrated cooling channel
    // Modulates between 45° and 90° based on active cooling demand
    flapAngleDeg_ = 45.0f + (45.0f * (pwmDutyPct_ / 100.0f));

    // Active systems are drawing power, so passive savings = 0.0 kW
    auxPowerSavedKw_ = 0.0f;
    faultMessage_ = nullptr;
}

void ThermalStateMachine::executeSystemFault() {
    // Immediate Hardware Safety Kill-Switch:
    pwmDutyPct_ = 0.0f;                   // Cut all high-voltage PWM actuators immediately
    boostActive_ = false;                 // Cut active air booster
    pumpActive_ = false;                  // Cut backward-compatible alias
    flapAngleDeg_ = FLAP_MAX_ANGLE_DEG;   // Force Venturi flaps to 90° fail-safe cooling position
    auxPowerSavedKw_ = 0.0f;
}

void ThermalStateMachine::applyHardwareActuation(float flapAngle, bool boosterState, float pwmDuty) {
#ifdef ARDUINO
    // Actuate Active Air Booster Relay
    digitalWrite(PIN_BOOSTER_RELAY, boosterState ? HIGH : LOW);

#if defined(ESP32)
    // Servo Flap PWM (50Hz RC servo pulse width: 1ms (0°) to 2ms (90°))
    // 50Hz period = 20ms. 10-bit resolution = 1024 ticks. 1ms = ~51 ticks, 2ms = ~102 ticks.
    float pulseMs = 1.0f + (flapAngle / 90.0f) * 1.0f;
    uint32_t servoDuty = static_cast<uint32_t>((pulseMs / 20.0f) * PWM_MAX_DUTY_RAW);
    ledcWrite(0, servoDuty);

    // Thermal Air Booster PWM (5kHz, 0-1023)
    uint32_t boosterDuty = static_cast<uint32_t>((pwmDuty / 100.0f) * PWM_MAX_DUTY_RAW);
    ledcWrite(1, boosterDuty);
#elif defined(ARDUINO)
    // Generic Arduino analogWrite fallback
    analogWrite(PIN_FLAP_SERVO, static_cast<int>((flapAngle / 90.0f) * 255.0f));
    analogWrite(PIN_BOOSTER_PWM, static_cast<int>((pwmDuty / 100.0f) * 255.0f));
#endif

#else
    (void)flapAngle;
    (void)boosterState;
    (void)pwmDuty;
#endif
}

void ThermalStateMachine::injectFault(const char* reason) {
    manualFaultInjected_ = true;
    faultMessage_ = reason;
    currentState_ = STATE_SYSTEM_FAULT;
    executeSystemFault();
}

bool ThermalStateMachine::resetFault() {
    // Safety Interlock: Only allow reset if physical temperature is below safe threshold
    float currentTemp = filter_.getFiltered();
    if (currentTemp >= (THERMAL_T_CRIT - 5.0f)) {
        return false; // Temperature still dangerously high
    }

    if (filter_.isFaulted()) {
        return false; // Hardware sensor fault still active
    }

    manualFaultInjected_ = false;
    faultMessage_ = nullptr;
    pid_.reset();
    
    // Evaluate state immediately based on current safe temperature
    if (currentTemp < THERMAL_T1) {
        currentState_ = STATE_IDLE_MODE;
    } else if (currentTemp < THERMAL_T2) {
        currentState_ = STATE_PASSIVE_AERO_COOLING;
    } else {
        currentState_ = STATE_ACTIVE_FLUID_LOOP;
    }
    return true;
}

void ThermalStateMachine::setPidGains(float kp, float ki, float kd) {
    pid_.setGains(kp, ki, kd);
}

void ThermalStateMachine::setSetpoint(float setpoint) {
    pid_.setSetpoint(setpoint);
}

const char* ThermalStateMachine::getStateName() const {
    switch (currentState_) {
        case STATE_IDLE_MODE:
            return "IDLE_MODE";
        case STATE_PASSIVE_AERO_COOLING:
            return "PASSIVE_AERO_COOLING";
        case STATE_ACTIVE_AIR_BOOST:
            return "ACTIVE_AIR_BOOST";
        case STATE_SYSTEM_FAULT:
            return "SYSTEM_FAULT";
        default:
            return "UNKNOWN";
    }
}

ThermalSystemSnapshot ThermalStateMachine::getSnapshot(uint32_t timestamp_ms) const {
    ThermalSystemSnapshot snap;
    snap.timestamp_ms = timestamp_ms;
    snap.state = currentState_;
    snap.temp_raw = filter_.getLatestRaw();
    snap.temp_filtered = filter_.getFiltered();
    snap.setpoint = pid_.getSetpoint();
    snap.vehicle_speed_kmh = currentSpeedKmh_;
    snap.flap_angle_deg = flapAngleDeg_;
    snap.boost_active = boostActive_;
    snap.pump_active = pumpActive_;
    snap.pwm_duty_pct = pwmDutyPct_;
    snap.pid = pid_.getTerms();
    snap.fault_message = faultMessage_;
    snap.aux_power_saved_kw = auxPowerSavedKw_;
    return snap;
}
