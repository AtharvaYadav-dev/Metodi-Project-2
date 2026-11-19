/**
 * @file pid_controller.cpp
 * @brief Discrete-Time Precision PID Controller Implementation
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#include "pid_controller.h"

PidController::PidController(float kp, float ki, float kd, float setpoint)
    : kp_(kp),
      ki_(ki),
      kd_(kd),
      setpoint_(setpoint),
      integrator_(0.0f),
      lastMeasurement_(setpoint),
      isFirstRun_(true),
      pTerm_(0.0f),
      iTerm_(0.0f),
      dTerm_(0.0f),
      output_(0.0f) {}

float PidController::compute(float measurement, float dt_seconds) {
    if (dt_seconds <= 0.0001f) {
        return output_;
    }

    // Cooling mode error: Positive when measurement exceeds target setpoint
    float error = measurement - setpoint_;

    // 1. Proportional Term
    pTerm_ = kp_ * error;

    // 2. Derivative-on-Measurement
    // Eliminates setpoint derivative kick while responding immediately to rate of temperature change.
    // In cooling mode, rising temperature (+dMeasurement) requires increased cooling effort (+D).
    if (isFirstRun_) {
        lastMeasurement_ = measurement;
        dTerm_ = 0.0f;
        isFirstRun_ = false;
    } else {
        float dMeasurement = (measurement - lastMeasurement_) / dt_seconds;
        dTerm_ = kd_ * dMeasurement;
        lastMeasurement_ = measurement;
    }

    // 3. Integral Calculation with Anti-Windup Clamping
    float candidateIntegrator = integrator_ + (ki_ * error * dt_seconds);
    float tentativeOutput = pTerm_ + candidateIntegrator + dTerm_;

    // Anti-windup conditional integration:
    // If output is already saturated at 100% and error > 0, stop integrating.
    // If output is at 0% and error < 0, stop integrating.
    bool saturatedHigh = (tentativeOutput >= PID_OUTPUT_MAX_PCT) && (error > 0.0f);
    bool saturatedLow  = (tentativeOutput <= PID_OUTPUT_MIN_PCT) && (error < 0.0f);

    if (!saturatedHigh && !saturatedLow) {
        integrator_ = candidateIntegrator;
    }

    // Hard bounds on the integrator itself
    if (integrator_ > PID_OUTPUT_MAX_PCT) {
        integrator_ = PID_OUTPUT_MAX_PCT;
    } else if (integrator_ < PID_OUTPUT_MIN_PCT) {
        integrator_ = PID_OUTPUT_MIN_PCT;
    }
    iTerm_ = integrator_;

    // 4. Output Summation & Actuator Clamping
    float unconstrained = pTerm_ + iTerm_ + dTerm_;
    if (unconstrained > PID_OUTPUT_MAX_PCT) {
        output_ = PID_OUTPUT_MAX_PCT;
    } else if (unconstrained < PID_OUTPUT_MIN_PCT) {
        output_ = PID_OUTPUT_MIN_PCT;
    } else {
        output_ = unconstrained;
    }

    return output_;
}

void PidController::reset() {
    integrator_ = 0.0f;
    pTerm_ = 0.0f;
    iTerm_ = 0.0f;
    dTerm_ = 0.0f;
    output_ = 0.0f;
    isFirstRun_ = true;
}

void PidController::setGains(float kp, float ki, float kd) {
    kp_ = kp;
    ki_ = ki;
    kd_ = kd;
}

void PidController::setSetpoint(float setpoint) {
    setpoint_ = setpoint;
}

PidTerms PidController::getTerms() const {
    return {pTerm_, iTerm_, dTerm_, output_};
}
