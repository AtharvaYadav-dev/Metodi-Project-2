/**
 * @file main.cpp
 * @brief Main Entry Point for ESP32 Embedded Firmware (Phase 1)
 * @details Adheres strictly to non-blocking, bare-metal C++ embedded architecture.
 *          Modular logic is encapsulated inside include/state_machine.h and src/state_machine.cpp.
 */

#include <Arduino.h>
#include "state_machine.h"

// =============================================================================
// TELEMETRY & DEBUG LOGGING CONFIGURATION
// =============================================================================
static unsigned long s_lastTelemetryTime = 0;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 1000; ///< Emit telemetry every 1000ms

// =============================================================================
// SETUP ROUTINE (Bare-Metal Init)
// =============================================================================
void setup() {
    // 1. Initialize High-Speed Diagnostic Serial Interface
    Serial.begin(115200);

    // 2. Initialize State Machine and Sensor Subsystems
    stateMachineInit();

    Serial.println(F("=================================================="));
    Serial.println(F("  ESP32 FIRMWARE - PHASE 1 INITIALIZED            "));
    Serial.println(F("=================================================="));
}

// =============================================================================
// SUPER-LOOP (Zero Delays, Event-Driven)
// =============================================================================
void loop() {
    // 1. Service non-blocking state machine and sensor sampling
    stateMachineRun();

    // 2. Non-blocking Telemetry Reporter (Every 1000 ms)
    const unsigned long currentMillis = millis();
    if (currentMillis - s_lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        s_lastTelemetryTime = currentMillis;

        // Fetch rock-solid filtered readings
        const SystemState currentState = getCurrentState();
        const int batteryPercent       = getFilteredBatteryPercent();
        const int batteryRawAvg        = getRawBatteryAverage();

        // Print clean, formatted diagnostic telemetry
        Serial.printf("[DEBUG][%7lu ms] State: %-13s | Battery: %3d%% | ADC Raw (Avg): %4d\n",
                      currentMillis,
                      stateToString(currentState),
                      batteryPercent,
                      batteryRawAvg);
    }
}
