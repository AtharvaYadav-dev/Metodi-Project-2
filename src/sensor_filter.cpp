/**
 * @file sensor_filter.cpp
 * @brief Implementation of O(1) Circular Buffer Moving Average Filter
 * @project AeroTherm Phase 2 Hybrid EV Thermal Management System
 */

#include "sensor_filter.h"
#include <math.h>

SensorFilter::SensorFilter()
    : head_(0),
      count_(0),
      runningSum_(0.0f),
      filteredValue_(25.0f),
      latestRaw_(25.0f),
      faultType_(SensorFaultType::FAULT_NONE) {
    for (size_t i = 0; i < FILTER_WINDOW_SIZE; ++i) {
        buffer_[i] = 25.0f;
    }
}

void SensorFilter::init(float initialValue) {
    head_ = 0;
    count_ = FILTER_WINDOW_SIZE;
    runningSum_ = initialValue * static_cast<float>(FILTER_WINDOW_SIZE);
    filteredValue_ = initialValue;
    latestRaw_ = initialValue;
    faultType_ = SensorFaultType::FAULT_NONE;

    for (size_t i = 0; i < FILTER_WINDOW_SIZE; ++i) {
        buffer_[i] = initialValue;
    }
}

float SensorFilter::update(float rawTemp) {
    latestRaw_ = rawTemp;

    // 1. Diagnostic Boundary Validation
    if (isnan(rawTemp)) {
        faultType_ = SensorFaultType::FAULT_INVALID_NAN;
        return filteredValue_; // Preserve last known good state
    }

    if (rawTemp < SENSOR_MIN_VALID_TEMP) {
        faultType_ = SensorFaultType::FAULT_DISCONNECTED;
        return filteredValue_;
    }

    if (rawTemp > SENSOR_MAX_VALID_TEMP) {
        faultType_ = SensorFaultType::FAULT_OVER_RANGE_HIGH;
        return filteredValue_;
    }

    // 2. Clear transient faults if reading returned to physical safety bounds
    if (faultType_ == SensorFaultType::FAULT_DISCONNECTED || 
        faultType_ == SensorFaultType::FAULT_OVER_RANGE_HIGH ||
        faultType_ == SensorFaultType::FAULT_UNDER_RANGE_LOW) {
        faultType_ = SensorFaultType::FAULT_NONE;
    }

    // 3. O(1) Circular Buffer Moving Average Update
    // Subtract oldest sample at head pointer
    runningSum_ -= buffer_[head_];
    
    // Store new sample and add to running accumulator
    buffer_[head_] = rawTemp;
    runningSum_ += rawTemp;

    // Advance head circular index
    head_ = (head_ + 1) % FILTER_WINDOW_SIZE;

    if (count_ < FILTER_WINDOW_SIZE) {
        count_++;
    }

    // Compute exact moving average in O(1)
    filteredValue_ = runningSum_ / static_cast<float>(count_);
    return filteredValue_;
}

const char* SensorFilter::getFaultString() const {
    switch (faultType_) {
        case SensorFaultType::FAULT_NONE:
            return "OK";
        case SensorFaultType::FAULT_DISCONNECTED:
            return "ERR_SENSOR_DISCONNECTED_OR_OPEN_CIRCUIT";
        case SensorFaultType::FAULT_OVER_RANGE_HIGH:
            return "ERR_SENSOR_OVER_RANGE_HIGH_SHORT";
        case SensorFaultType::FAULT_UNDER_RANGE_LOW:
            return "ERR_SENSOR_UNDER_RANGE_LOW";
        case SensorFaultType::FAULT_INVALID_NAN:
            return "ERR_SENSOR_INVALID_MATH_NAN";
        default:
            return "ERR_UNKNOWN_FAULT";
    }
}

void SensorFilter::resetFault() {
    faultType_ = SensorFaultType::FAULT_NONE;
}

float SensorFilter::adcToTemperature(int rawAdc) {
    // Clamping to hardware 12-bit ADC boundary
    if (rawAdc <= 5) {
        // Disconnected pin / pulled down to 0V
        return -30.0f;
    }
    if (rawAdc >= 4090) {
        // Short to 3.3V / open fault
        return 160.0f;
    }

    // Calibrated automotive RTD/NTC curve:
    // Linearized transfer function between 0°C (ADC ~600) and 120°C (ADC ~3600)
    // T = (ADC - ADC_0C) * Slope + T_0C
    constexpr float ADC_OFFSET = 500.0f;
    constexpr float ADC_SPAN   = 3200.0f;
    constexpr float TEMP_SPAN  = 130.0f; // Range: -10°C to 120°C

    float normalized = (static_cast<float>(rawAdc) - ADC_OFFSET) / ADC_SPAN;
    float temp = -10.0f + (normalized * TEMP_SPAN);
    return temp;
}
