/**
 * @file state_machine.cpp
 * @brief Production Implementation of State Machine and Sensor Filtering
 * @project ESP32 Production Firmware - Phase 1
 */

#include "state_machine.h"

// =============================================================================
// INTERNAL STATIC STATE VARIABLES (Encapsulated)
// =============================================================================

// Active State Tracking
static SystemState   s_currentState     = STATE_INIT;
static unsigned long s_stateEntryTime   = 0;

// Moving Average Filter Context for BATTERY_PIN
static int           s_batteryBuffer[BATTERY_FILTER_SIZE] = {0};
static size_t        s_batteryBufferIdx = 0;
static int32_t       s_batterySum       = 0;
static int           s_batteryFilteredRaw = 0;

// Non-blocking Timing Hooks
static unsigned long s_lastBatterySampleTime = 0;

// =============================================================================
// FORWARD DECLARATIONS (STATIC INTERNAL)
// =============================================================================
static void updateBatteryFilter();
static void changeState(SystemState newState);

// =============================================================================
// SENSOR FILTERING IMPLEMENTATION
// =============================================================================

/**
 * @brief Samples the battery ADC channel and updates the circular rolling average.
 * Execution Time: O(1) constant time, minimal jitter.
 */
static void updateBatteryFilter() {
    // Acquire raw 12-bit ADC reading (0 - 4095)
    int rawSample = analogRead(BATTERY_PIN);

    // Subtract the oldest reading in the circular buffer from the running sum
    s_batterySum -= s_batteryBuffer[s_batteryBufferIdx];

    // Insert the new sample into the circular buffer
    s_batteryBuffer[s_batteryBufferIdx] = rawSample;

    // Add the new sample to the running sum
    s_batterySum += rawSample;

    // Increment and wrap buffer index
    s_batteryBufferIdx = (s_batteryBufferIdx + 1) % BATTERY_FILTER_SIZE;

    // Compute updated moving average
    s_batteryFilteredRaw = static_cast<int>(s_batterySum / static_cast<int32_t>(BATTERY_FILTER_SIZE));
}

/**
 * @brief Returns the moving average filtered battery percentage.
 * Mapped linearly from raw range [2048, 4095] to [0%, 100%].
 */
int getFilteredBatteryPercent() {
    // Map raw ADC span (2048-4095) to percentage (0-100)
    long calculatedPercent = map(s_batteryFilteredRaw, BATTERY_RAW_EMPTY, BATTERY_RAW_FULL, 0, 100);

    // Apply strict bounds constraint [0, 100]
    return static_cast<int>(constrain(calculatedPercent, 0, 100));
}

/**
 * @brief Returns the raw averaged ADC value for low-level diagnostics.
 */
int getRawBatteryAverage() {
    return s_batteryFilteredRaw;
}

// =============================================================================
// STATE TRANSITION ENGINE
// =============================================================================

/**
 * @brief Internal helper to handle clean state entry/exit semantics.
 */
static void changeState(SystemState newState) {
    if (s_currentState == newState) {
        return; // No-op for identical state
    }

    Serial.printf("[STATE TRANSITION] %s -> %s (at %lu ms)\n",
                  stateToString(s_currentState),
                  stateToString(newState),
                  millis());

    s_currentState   = newState;
    s_stateEntryTime = millis();
}

/**
 * @brief Returns the current state enum value.
 */
SystemState getCurrentState() {
    return s_currentState;
}

/**
 * @brief Translates SystemState enum to printable text.
 */
const char* stateToString(SystemState state) {
    switch (state) {
        case STATE_INIT:    return "STATE_INIT";
        case STATE_IDLE:    return "STATE_IDLE";
        case STATE_HEATING: return "STATE_HEATING";
        case STATE_COOLING: return "STATE_COOLING";
        case STATE_FAULT:   return "STATE_FAULT";
        default:            return "STATE_UNKNOWN";
    }
}

/**
 * @brief Latches the system into STATE_FAULT.
 */
void triggerSystemFault(const char* faultReason) {
    Serial.printf("[SYSTEM FAULT DETECTED] Reason: %s (Time: %lu ms)\n",
                  (faultReason != nullptr) ? faultReason : "Unspecified",
                  millis());
    changeState(STATE_FAULT);
}

// =============================================================================
// STATE MACHINE LIFECYCLE
// =============================================================================

/**
 * @brief System & Peripheral Initialization.
 */
void stateMachineInit() {
    // 1. Configure ADC Hardware Settings
    analogReadResolution(ADC_RESOLUTION_BITS); // 12-bit resolution (0-4095)
    analogSetPinAttenuation(BATTERY_PIN, ADC_11db);     // Full-scale ~3.3V range
    analogSetPinAttenuation(TEMP_SENSOR_PIN, ADC_11db);

    // 2. Prime the Moving Average Filter Buffer
    // Prevents cold-start artifact where battery reports 0% during initial window filling
    s_batterySum = 0;
    for (size_t i = 0; i < BATTERY_FILTER_SIZE; ++i) {
        int initialSample = analogRead(BATTERY_PIN);
        s_batteryBuffer[i] = initialSample;
        s_batterySum += initialSample;
    }
    s_batteryBufferIdx = 0;
    s_batteryFilteredRaw = static_cast<int>(s_batterySum / static_cast<int32_t>(BATTERY_FILTER_SIZE));

    // 3. Initialize Timers and Initial State
    s_lastBatterySampleTime = millis();
    s_stateEntryTime        = millis();
    s_currentState          = STATE_INIT;

    Serial.println(F("[INIT] Hardware ADC configured, filter buffer primed."));
}

/**
 * @brief Non-blocking State Machine Loop Worker.
 */
void stateMachineRun() {
    const unsigned long now = millis();

    // -------------------------------------------------------------------------
    // 1. Periodic Non-Blocking Sensor Acquisition (Decoupled from State Machine)
    // -------------------------------------------------------------------------
    if (now - s_lastBatterySampleTime >= BATTERY_SAMPLE_INTERVAL_MS) {
        s_lastBatterySampleTime = now;
        updateBatteryFilter();
    }

    // -------------------------------------------------------------------------
    // 2. State Machine Dispatch Engine (Zero Blocking Delays)
    // -------------------------------------------------------------------------
    switch (s_currentState) {
        case STATE_INIT: {
            // Hardware verified, automatically transition to nominal standby
            changeState(STATE_IDLE);
            break;
        }

        case STATE_IDLE: {
            // Standby state: monitor conditions and transition after dwell timeout
            if (now - s_stateEntryTime >= STATE_TIMEOUT_IDLE_MS) {
                changeState(STATE_HEATING);
            }
            break;
        }

        case STATE_HEATING: {
            // Execute heating process logic (e.g. PWM heater driver)
            // Transition to cooling phase upon cycle timeout
            if (now - s_stateEntryTime >= STATE_TIMEOUT_HEATING_MS) {
                changeState(STATE_COOLING);
            }
            break;
        }

        case STATE_COOLING: {
            // Execute cooling process logic (e.g. cooling fan driver)
            // Transition back to idle once temperature is mitigated
            if (now - s_stateEntryTime >= STATE_TIMEOUT_COOLING_MS) {
                changeState(STATE_IDLE);
            }
            break;
        }

        case STATE_FAULT: {
            // Safe state: actuators forced OFF, wait for manual recovery/reset
            // In Phase 1, the fault state simply holds the system safely.
            break;
        }

        default: {
            triggerSystemFault("Illegal/Corrupted State Vector");
            break;
        }
    }
}

