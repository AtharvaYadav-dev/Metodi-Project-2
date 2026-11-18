/**
 * @file state_machine.h
 * @brief Non-blocking State Machine & Sensor Processing Interface
 * @project ESP32 Metodis Production Firmware - Phase 1
 * 
 * Hardware Target: ESP32-WROOM-32 / ESP32 SoC
 * Architecture: Event-driven, non-blocking cooperative loop
 */

#pragma once

#include <Arduino.h>

// =============================================================================
// 1. HARDWARE DEFINITIONS & ADC SPECIFICATIONS
// =============================================================================

/**
 * @brief GPIO Pin Allocations
 * NOTE: GPIO 34 and GPIO 35 belong to ADC1 (ADC1_CH6 and ADC1_CH7).
 * Unlike ADC2, ADC1 can be sampled continuously without Wi-Fi/Bluetooth DMA conflicts.
 * These pins are input-only (GPI) and do not feature internal software pull-up/pull-down resistors.
 */
constexpr int TEMP_SENSOR_PIN = 34;  ///< Analog input for Temperature sensor (ADC1_CH6)
constexpr int BATTERY_PIN     = 35;  ///< Analog input for Battery voltage divider (ADC1_CH7)

// ADC Configuration Parameters
constexpr uint8_t ADC_RESOLUTION_BITS   = 12;    ///< ESP32 Successive Approximation Register (SAR) ADC 12-bit mode
constexpr int     ADC_RAW_MAX           = 4095;  ///< Maximum quantized discrete level (2^12 - 1)
constexpr int     ADC_RAW_MIN           = 0;

// Battery Mapping Thresholds
constexpr int     BATTERY_RAW_EMPTY     = 2048;  ///< Raw ADC reading corresponding to 0% battery
constexpr int     BATTERY_RAW_FULL      = 4095;  ///< Raw ADC reading corresponding to 100% battery

// Filtering Parameters
constexpr size_t  BATTERY_FILTER_SIZE   = 10;    ///< Moving average window depth

// Timing Parameters
constexpr unsigned long BATTERY_SAMPLE_INTERVAL_MS = 50;  ///< Battery ADC sampling frequency: 20 Hz
constexpr unsigned long STATE_TIMEOUT_IDLE_MS      = 5000;///< IDLE state dwell duration before heating demonstration
constexpr unsigned long STATE_TIMEOUT_HEATING_MS   = 5000;///< Active heating cycle duration
constexpr unsigned long STATE_TIMEOUT_COOLING_MS   = 5000;///< Active cooling cycle duration

// =============================================================================
// 2. STATE MACHINE ENUMERATIONS
// =============================================================================

/**
 * @brief Core System Operational States
 */
enum SystemState : uint8_t {
    STATE_INIT = 0,   ///< Power-on self-test, peripheral init, filter pre-seeding
    STATE_IDLE,       ///< System quiescent; sensors active, awaiting heating demand
    STATE_HEATING,    ///< Thermal actuator active, closed-loop thermal control
    STATE_COOLING,    ///< Thermal mitigation / cool-down phase active
    STATE_FAULT       ///< Critical boundary violation or hardware error latch
};

// =============================================================================
// 3. PUBLIC API DECLARATIONS
// =============================================================================

/**
 * @brief Initializes GPIOs, configures ADC hardware resolution/attenuation,
 *        and primes the moving average filter buffers.
 */
void stateMachineInit();

/**
 * @brief Master non-blocking tick function. Must be called in every loop() pass.
 *        Executes sensor sampling, state transitions, and safety checks.
 */
void stateMachineRun();

/**
 * @brief Retrieves the rock-solid, filtered battery charge percentage.
 * @return Battery percentage clamped strictly between 0 and 100.
 */
int getFilteredBatteryPercent();

/**
 * @brief Retrieves the smoothed raw ADC 12-bit value (0-4095) for diagnostic calibration.
 * @return Smoothed raw ADC value.
 */
int getRawBatteryAverage();

/**
 * @brief Returns the current operational state of the system.
 * @return SystemState enum value.
 */
SystemState getCurrentState();

/**
 * @brief Helper utility to convert SystemState enum to a human-readable C-string.
 * @param state SystemState enum to inspect.
 * @return Constant string literal representing the state name.
 */
const char* stateToString(SystemState state);

/**
 * @brief Transitions the system into STATE_FAULT with an audit diagnostic reason.
 * @param faultReason Descriptive string logged to the diagnostic stream.
 */
void triggerSystemFault(const char* faultReason = nullptr);
