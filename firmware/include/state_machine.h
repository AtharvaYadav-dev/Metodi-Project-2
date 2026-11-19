/**
 * @file state_machine.h
 * @brief Non-Blocking Deterministic State Machine for AeroTherm EV Thermal Loop
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#pragma once

#include "config.h"
#include "sensor_filter.h"
#include "pid_controller.h"

/**
 * @brief Core System Operational States (Phase 2 Specification)
 */
enum SystemState : uint8_t {
    STATE_IDLE_MODE = 0,           ///< Temp < T1 (40°C): Flaps closed (0°), Pump OFF, PWM 0%
    STATE_PASSIVE_AERO_COOLING = 1,///< T1 <= Temp < T2: Flaps 0°-90° based on speed & delta, Pump OFF
    STATE_ACTIVE_FLUID_LOOP = 2,   ///< T2 <= Temp < T_CRIT: Pump ON, Flaps modulated, PID PWM 0-100%
    STATE_SYSTEM_FAULT = 3         ///< Temp >= T_CRIT or sensor fault: Kill PWM to 0%, Flaps 90° fail-safe
};

/**
 * @brief Comprehensive system status telemetry snapshot
 */
struct ThermalSystemSnapshot {
    uint32_t timestamp_ms;
    SystemState state;
    float temp_raw;
    float temp_filtered;
    float setpoint;
    float vehicle_speed_kmh;
    float flap_angle_deg;
    bool pump_active;
    float pwm_duty_pct;
    PidTerms pid;
    const char* fault_message;
    float aux_power_saved_kw;
};

/**
 * @brief Production Deterministic State Machine Class
 */
class ThermalStateMachine {
public:
    ThermalStateMachine();

    /**
     * @brief Hardware peripheral and sub-module initialization
     */
    void init();

    /**
     * @brief Master non-blocking deterministic step called at CONTROL_LOOP_INTERVAL_MS
     * @param rawTemp Latest raw temperature reading from sensor ADC (°C)
     * @param vehicleSpeedKmh Current vehicle road speed (km/h)
     * @param dt_seconds Elapsed time delta in seconds
     */
    void update(float rawTemp, float vehicleSpeedKmh, float dt_seconds);

    /**
     * @brief Injects an intentional test fault (HIL testing / founder demo)
     * @param reason Text description of fault
     */
    void injectFault(const char* reason);

    /**
     * @brief Resets latched system faults if conditions are safe
     * @return true if fault was cleared, false if unsafe to clear
     */
    bool resetFault();

    /**
     * @brief Updates PID tuning gains dynamically
     */
    void setPidGains(float kp, float ki, float kd);

    /**
     * @brief Updates temperature setpoint
     */
    void setSetpoint(float setpoint);

    // Telemetry and Status Getters
    SystemState getState() const { return currentState_; }
    const char* getStateName() const;
    ThermalSystemSnapshot getSnapshot(uint32_t timestamp_ms) const;
    SensorFilter& getFilter() { return filter_; }
    PidController& getPid() { return pid_; }

private:
    void executeIdleMode(float temp, float speed, float dt);
    void executePassiveAero(float temp, float speed, float dt);
    void executeActiveFluidLoop(float temp, float speed, float dt);
    void executeSystemFault();

    void applyHardwareActuation(float flapAngle, bool pumpState, float pwmDuty);

    SystemState currentState_;
    SensorFilter filter_;
    PidController pid_;

    float currentSpeedKmh_;
    float flapAngleDeg_;
    bool pumpActive_;
    float pwmDutyPct_;
    float auxPowerSavedKw_;
    const char* faultMessage_;
    bool manualFaultInjected_;
};
