/**
 * @file sketch.ino
 * @brief ESP32 Metodis Production Firmware - Phase 1 (Single-File / Wokwi / Arduino IDE Ready)
 * @details Complete self-contained version for Arduino IDE and Wokwi simulation.
 *          Strictly non-blocking, zero delays, 12-bit ADC with Moving Average Filter.
 */

#include <Arduino.h>

// =============================================================================
// 1. HARDWARE DEFINITIONS & SENSOR CONSTANTS
// =============================================================================
const int TEMP_SENSOR_PIN = 34;  // Temperature sensor analog pin (ADC1_CH6)
const int BATTERY_PIN     = 35;  // Battery voltage divider analog pin (ADC1_CH7)

// ESP32 ADC Specs
const int ADC_RESOLUTION_BITS = 12;    // 12-bit ADC (0 - 4095)
const int BATTERY_RAW_EMPTY   = 2048;  // Mapped to 0% battery
const int BATTERY_RAW_FULL    = 4095;  // Mapped to 100% battery

// Filtering Specs
const int BATTERY_FILTER_SIZE = 10;    // Moving average window depth

// Timing Intervals (Strictly Non-Blocking via millis())
const unsigned long BATTERY_SAMPLE_INTERVAL_MS = 50;   // 20Hz sampling rate
const unsigned long TELEMETRY_INTERVAL_MS      = 1000; // Debug telemetry every 1000ms
const unsigned long STATE_TIMEOUT_IDLE_MS      = 5000; // Dwell duration in IDLE
const unsigned long STATE_TIMEOUT_HEATING_MS   = 5000; // Heating cycle duration
const unsigned long STATE_TIMEOUT_COOLING_MS   = 5000; // Cooling cycle duration

// =============================================================================
// 2. STATE MACHINE DEFINITIONS
// =============================================================================
enum SystemState {
    STATE_INIT,
    STATE_IDLE,
    STATE_HEATING,
    STATE_COOLING,
    STATE_FAULT
};

// State Machine Internal State
static SystemState   currentState     = STATE_INIT;
static unsigned long stateEntryTime   = 0;

// Moving Average Filter Context
static int           batteryBuffer[BATTERY_FILTER_SIZE] = {0};
static size_t        batteryBufferIdx   = 0;
static long          batteryRunningSum  = 0;
static int           batteryFilteredRaw = 0;

// Non-Blocking Timers
static unsigned long lastBatterySampleTime = 0;
static unsigned long lastTelemetryTime    = 0;

// =============================================================================
// 3. HELPER & UTILITY FUNCTIONS
// =============================================================================
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

void changeState(SystemState newState) {
    if (currentState == newState) return;

    Serial.print(F("[STATE TRANSITION] "));
    Serial.print(stateToString(currentState));
    Serial.print(F(" -> "));
    Serial.print(stateToString(newState));
    Serial.print(F(" (at "));
    Serial.print(millis());
    Serial.println(F(" ms)"));

    currentState   = newState;
    stateEntryTime = millis();
}

void triggerFault(const char* reason) {
    Serial.print(F("[FAULT] "));
    Serial.println(reason ? reason : "Unknown error");
    changeState(STATE_FAULT);
}

// =============================================================================
// 4. SENSOR FILTERING ENGINE (O(1) Circular Buffer Moving Average)
// =============================================================================
void updateBatteryFilter() {
    int rawSample = analogRead(BATTERY_PIN);

    // Subtract oldest sample, add new sample
    batteryRunningSum -= batteryBuffer[batteryBufferIdx];
    batteryBuffer[batteryBufferIdx] = rawSample;
    batteryRunningSum += rawSample;

    batteryBufferIdx = (batteryBufferIdx + 1) % BATTERY_FILTER_SIZE;
    batteryFilteredRaw = (int)(batteryRunningSum / BATTERY_FILTER_SIZE);
}

int getFilteredBatteryPercent() {
    // Map raw ADC range [2048, 4095] to [0%, 100%]
    long percent = map(batteryFilteredRaw, BATTERY_RAW_EMPTY, BATTERY_RAW_FULL, 0, 100);
    return (int)constrain(percent, 0, 100);
}

// =============================================================================
// 5. STATE MACHINE LOGIC (Zero Delays)
// =============================================================================
void stateMachineInit() {
    // 1. Configure Hardware ADC
    analogReadResolution(ADC_RESOLUTION_BITS);
    analogSetPinAttenuation(BATTERY_PIN, ADC_11db);
    analogSetPinAttenuation(TEMP_SENSOR_PIN, ADC_11db);

    // 2. Prime filter buffer to prevent cold-start percentage drop
    batteryRunningSum = 0;
    for (int i = 0; i < BATTERY_FILTER_SIZE; i++) {
        int sample = analogRead(BATTERY_PIN);
        batteryBuffer[i] = sample;
        batteryRunningSum += sample;
    }
    batteryBufferIdx = 0;
    batteryFilteredRaw = (int)(batteryRunningSum / BATTERY_FILTER_SIZE);

    // 3. Initialize state timers
    lastBatterySampleTime = millis();
    stateEntryTime        = millis();
    currentState          = STATE_INIT;

    Serial.println(F("[INIT] ADC configured & 10-sample moving average buffer pre-seeded."));
}

void stateMachineRun() {
    unsigned long now = millis();

    // 1. Decoupled Non-blocking Battery Sampling (20Hz)
    if (now - lastBatterySampleTime >= BATTERY_SAMPLE_INTERVAL_MS) {
        lastBatterySampleTime = now;
        updateBatteryFilter();
    }

    // 2. Non-blocking State Machine Switch-Case
    switch (currentState) {
        case STATE_INIT: {
            changeState(STATE_IDLE);
            break;
        }

        case STATE_IDLE: {
            if (now - stateEntryTime >= STATE_TIMEOUT_IDLE_MS) {
                changeState(STATE_HEATING);
            }
            break;
        }

        case STATE_HEATING: {
            if (now - stateEntryTime >= STATE_TIMEOUT_HEATING_MS) {
                changeState(STATE_COOLING);
            }
            break;
        }

        case STATE_COOLING: {
            if (now - stateEntryTime >= STATE_TIMEOUT_COOLING_MS) {
                changeState(STATE_IDLE);
            }
            break;
        }

        case STATE_FAULT: {
            // Safety state: hold safely
            break;
        }

        default: {
            triggerFault("Invalid State Vector");
            break;
        }
    }
}

// =============================================================================
// 6. SETUP & LOOP
// =============================================================================
void setup() {
    Serial.begin(115200);
    stateMachineInit();

    Serial.println(F("=================================================="));
    Serial.println(F("  ESP32 METODIS FIRMWARE - PHASE 1 INITIALIZED    "));
    Serial.println(F("=================================================="));
}

void loop() {
    // 1. Non-blocking state machine & filter tick
    stateMachineRun();

    // 2. Non-blocking Debug Telemetry (Every 1000ms)
    unsigned long currentMillis = millis();
    if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = currentMillis;

        int batteryPercent = getFilteredBatteryPercent();

        Serial.print(F("[DEBUG]["));
        Serial.print(currentMillis);
        Serial.print(F(" ms] State: "));
        Serial.print(stateToString(currentState));
        Serial.print(F(" | Battery: "));
        Serial.print(batteryPercent);
        Serial.print(F("% | ADC Raw (Avg): "));
        Serial.println(batteryFilteredRaw);
    }
}
