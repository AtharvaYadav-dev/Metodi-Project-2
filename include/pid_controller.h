/**
 * @file pid_controller.h
 * @brief Discrete-Time Precision PID Controller with Derivative-on-Measurement
 *        and Anti-Windup Clamping for EV Thermal Management.
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#pragma once

#include "config.h"

/**
 * @brief Structure containing individual PID debug terms for telemetry
 */
struct PidTerms {
    float p;      ///< Proportional contribution (%)
    float i;      ///< Integral contribution (%)
    float d;      ///< Derivative contribution (%)
    float output; ///< Total clamped output (0.0% to 100.0%)
};

/**
 * @brief Production-grade Discrete PID Controller
 * Features:
 *  - Derivative-on-Measurement: eliminates derivative kick on setpoint step changes
 *  - Integral Anti-Windup: conditional integration clamping to prevent actuator saturation windup
 *  - Configurable cooling mode: positive error when measurement exceeds setpoint
 */
class PidController {
public:
    PidController(float kp = DEFAULT_PID_KP, 
                  float ki = DEFAULT_PID_KI, 
                  float kd = DEFAULT_PID_KD,
                  float setpoint = DEFAULT_SETPOINT);

    /**
     * @brief Computes one discrete-time step of the PID algorithm
     * @param measurement Current filtered battery temperature (°C)
     * @param dt_seconds Elapsed time delta in seconds
     * @return Actuator PWM duty cycle strictly clamped to [0.0, 100.0] %
     */
    float compute(float measurement, float dt_seconds);

    /**
     * @brief Resets accumulated integrator and derivative memory
     */
    void reset();

    /**
     * @brief Reconfigures PID tuning gains on-the-fly (e.g., via JSON serial commands)
     */
    void setGains(float kp, float ki, float kd);

    /**
     * @brief Sets the target temperature setpoint (°C)
     */
    void setSetpoint(float setpoint);

    // Getters
    float getKp() const { return kp_; }
    float getKi() const { return ki_; }
    float getKd() const { return kd_; }
    float getSetpoint() const { return setpoint_; }
    float getOutput() const { return output_; }
    PidTerms getTerms() const;

private:
    float kp_;
    float ki_;
    float kd_;
    float setpoint_;

    float integrator_;
    float lastMeasurement_;
    bool isFirstRun_;

    float pTerm_;
    float iTerm_;
    float dTerm_;
    float output_;
};
