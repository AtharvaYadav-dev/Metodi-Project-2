/**
 * @file config.h
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management System
 * @details Master hardware pinouts, thermal thresholds, PID default gains,
 *          and deterministic timing parameters.
 * 
 * Target MCU: ESP32 / STM32 / FreeRTOS-compatible bare-metal
 * Standard: ISO 26262 ASIL-B / MISRA-C++ compliant design paradigms
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef ARDUINO
#include <Arduino.h>
#endif

// =============================================================================
// 1. HARDWARE GPIO PIN ALLOCATIONS
// =============================================================================

/**
 * @brief ADC Analog Inputs (ESP32 ADC1 exclusively to avoid Wi-Fi/DMA conflicts)
 * GPIO 34 = ADC1_CH6 (Primary Battery Pack Thermistor / RTD signal conditioning)
 * GPIO 35 = ADC1_CH7 (Vehicle CAN Speed simulation / Hall pulse analog input)
 */
constexpr int PIN_TEMP_SENSOR    = 34;
constexpr int PIN_SPEED_INPUT    = 35;

/**
 * @brief Actuator Outputs
 * GPIO 18 = Aerodynamic Venturi Flap Servo / Stepper PWM (LEDC CH 0, 50Hz)
 * GPIO 19 = Active Air Booster Blower Unit Relay / MOSFET (Active HIGH)
 * GPIO 21 = Active Thermal Air Channel High-Frequency PWM (LEDC CH 1, 5kHz)
 * GPIO 2  = On-board Heartbeat Diagnostic LED
 */
constexpr int PIN_FLAP_SERVO     = 18;
constexpr int PIN_BOOSTER_RELAY  = 19;
constexpr int PIN_BOOSTER_PWM    = 21;
constexpr int PIN_PUMP_RELAY     = PIN_BOOSTER_RELAY; // Backward-compatible alias
constexpr int PIN_CHILLER_PWM    = PIN_BOOSTER_PWM;   // Backward-compatible alias
constexpr int PIN_HEARTBEAT_LED  = 2;

// =============================================================================
// 2. PWM & ACTUATOR TIMING SPECIFICATIONS
// =============================================================================
constexpr uint32_t PWM_BOOSTER_FREQ_HZ = 5000;   ///< 5kHz prevents acoustic motor resonance
constexpr uint32_t PWM_CHILLER_FREQ_HZ = PWM_BOOSTER_FREQ_HZ; // Backward-compatible alias
constexpr uint8_t  PWM_RESOLUTION_BITS = 10;     ///< 10-bit resolution (0 - 1023 duty cycle)
constexpr uint32_t PWM_MAX_DUTY_RAW    = 1023;
constexpr uint32_t PWM_SERVO_FREQ_HZ   = 50;     ///< 50Hz standard RC servo frequency

// =============================================================================
// 3. THERMAL MANAGEMENT OPERATING THRESHOLDS
// =============================================================================
constexpr float THERMAL_T1            = 40.0f;  ///< IDLE to PASSIVE_AERO boundary (°C)
constexpr float THERMAL_T2            = 65.0f;  ///< PASSIVE_AERO to ACTIVE_AIR_BOOST boundary (°C)
constexpr float THERMAL_T_CRIT        = 110.0f; ///< Hardware emergency shutdown cutoff (°C)
constexpr float THERMAL_HYSTERESIS    = 1.5f;   ///< Anti-chatter state transition hysteresis (°C)
constexpr float DEFAULT_SETPOINT      = 75.0f;  ///< Target battery pack operating temp (°C)

// Sensor Diagnostic Boundary Limits
constexpr float SENSOR_MIN_VALID_TEMP = -20.0f; ///< Lower boundary: disconnected or shorted low
constexpr float SENSOR_MAX_VALID_TEMP = 150.0f; ///< Upper boundary: shorted high / thermal runaway

// Flap Mechanical Travel Limits (Degrees)
constexpr float FLAP_MIN_ANGLE_DEG    = 0.0f;   ///< Fully closed (minimum drag profile)
constexpr float FLAP_MAX_ANGLE_DEG    = 90.0f;  ///< Maximum aperture (full ram-air venturi)

// =============================================================================
// 4. PRECISION PID CONTROLLER DEFAULT GAINS & LIMITS
// =============================================================================
constexpr float DEFAULT_PID_KP        = 2.5f;   ///< Proportional gain
constexpr float DEFAULT_PID_KI        = 0.4f;   ///< Integral gain (anti-windup bounded)
constexpr float DEFAULT_PID_KD        = 0.8f;   ///< Derivative gain (derivative-on-measurement)
constexpr float PID_OUTPUT_MIN_PCT    = 0.0f;   ///< Minimum PWM actuation (0%)
constexpr float PID_OUTPUT_MAX_PCT    = 100.0f; ///< Maximum PWM actuation (100%)

// =============================================================================
// 5. DETERMINISTIC LOOP SCHEDULER FREQUENCIES
// =============================================================================
constexpr unsigned long SAMPLE_INTERVAL_MS        = 20;   ///< 50Hz ADC sampling & filtering
constexpr unsigned long CONTROL_LOOP_INTERVAL_MS  = 50;   ///< 20Hz PID calculation & State Machine
constexpr unsigned long TELEMETRY_FAST_INTERVAL_MS = 100;  ///< 10Hz JSON telemetry (active/fault)
constexpr unsigned long TELEMETRY_IDLE_INTERVAL_MS = 1000; ///< 1Hz heartbeat telemetry in IDLE
constexpr size_t        FILTER_WINDOW_SIZE        = 16;   ///< O(1) circular buffer depth
constexpr uint32_t      SERIAL_BAUD_RATE          = 115200;
