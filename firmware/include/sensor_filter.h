/**
 * @file sensor_filter.h
 * @brief O(1) Circular Buffer Moving Average Filter with Out-of-Range Detection
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#pragma once

#include "config.h"
#include <stddef.h>

/**
 * @brief Diagnostic classifications for temperature sensor health
 */
enum class SensorFaultType : uint8_t {
    FAULT_NONE = 0,
    FAULT_DISCONNECTED,     ///< Reading below minimum physical limit (< -20°C) or open circuit
    FAULT_OVER_RANGE_HIGH,  ///< Reading above maximum physical limit (> 150°C) or short circuit
    FAULT_UNDER_RANGE_LOW,  ///< Reading below acceptable operating range
    FAULT_INVALID_NAN       ///< Math error or unquantized ADC read
};

/**
 * @brief Production-grade O(1) Circular Buffer Filter
 * Maintains a running sum to compute the moving average in strict O(1) time complexity.
 */
class SensorFilter {
public:
    SensorFilter();

    /**
     * @brief Pre-seeds the circular buffer with an initial reference value
     * @param initialValue Baseline temperature (°C)
     */
    void init(float initialValue = 25.0f);

    /**
     * @brief Pushes a raw ADC temperature measurement into the filter
     * @param rawTemp Raw converted temperature in degrees Celsius
     * @return Filtered moving average temperature in degrees Celsius
     */
    float update(float rawTemp);

    /**
     * @brief Retrieves the current smoothed temperature
     */
    float getFiltered() const { return filteredValue_; }

    /**
     * @brief Retrieves the most recently ingested raw measurement
     */
    float getLatestRaw() const { return latestRaw_; }

    /**
     * @brief Returns true if an electrical or physical fault condition is detected
     */
    bool isFaulted() const { return faultType_ != SensorFaultType::FAULT_NONE; }

    /**
     * @brief Retrieves the active fault enumeration
     */
    SensorFaultType getFaultType() const { return faultType_; }

    /**
     * @brief Returns a human-readable diagnostic error string
     */
    const char* getFaultString() const;

    /**
     * @brief Clears latched sensor faults
     */
    void resetFault();

    /**
     * @brief Converts raw 12-bit ADC reading (0-4095) to calibrated temperature (°C)
     * Using calibrated Steinhart-Hart / NTC voltage divider or linear PT1000 curve.
     * @param rawAdc 12-bit integer reading
     * @return Calibrated temperature in degrees Celsius
     */
    static float adcToTemperature(int rawAdc);

private:
    float buffer_[FILTER_WINDOW_SIZE];
    size_t head_;
    size_t count_;
    float runningSum_;
    float filteredValue_;
    float latestRaw_;
    SensorFaultType faultType_;
};
