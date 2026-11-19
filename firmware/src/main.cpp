/**
 * @file main.cpp
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management Super-Loop
 * @details Strictly non-blocking bare-metal C++ firmware with 10Hz structured JSON
 *          telemetry and live bi-directional JSON command bridge.
 * 
 * Hardware Target: ESP32-WROOM-32 / STM32 / FreeRTOS compatible
 */

#include <Arduino.h>
#include "config.h"
#include "state_machine.h"

// =============================================================================
// GLOBAL INSTANCES & TIMERS
// =============================================================================
static ThermalStateMachine g_thermalSystem;

static unsigned long g_lastControlLoopMs = 0;
static unsigned long g_lastTelemetryMs   = 0;
static unsigned long g_lastHeartbeatMs   = 0;
static bool          g_heartbeatState    = false;

// Simulated or external speed input
static float g_vehicleSpeedKmh = 65.0f;

// Serial Command Line Buffer
static char g_serialBuffer[256];
static size_t g_serialIndex = 0;

// =============================================================================
// COMMAND PROCESSOR (Bi-directional Telemetry Bridge)
// =============================================================================
static void processJsonCommand(const char* json) {
    // 1. SET_PID command: {"cmd":"SET_PID","kp":2.5,"ki":0.4,"kd":0.8}
    if (strstr(json, "\"cmd\":\"SET_PID\"") != nullptr || strstr(json, "\"cmd\": \"SET_PID\"") != nullptr) {
        float kp = DEFAULT_PID_KP;
        float ki = DEFAULT_PID_KI;
        float kd = DEFAULT_PID_KD;

        const char* pKp = strstr(json, "\"kp\":");
        const char* pKi = strstr(json, "\"ki\":");
        const char* pKd = strstr(json, "\"kd\":");

        if (pKp) kp = atof(pKp + 5);
        if (pKi) ki = atof(pKi + 5);
        if (pKd) kd = atof(pKd + 5);

        g_thermalSystem.setPidGains(kp, ki, kd);
        Serial.printf("{\"status\":\"OK\",\"cmd\":\"SET_PID\",\"kp\":%.2f,\"ki\":%.2f,\"kd\":%.2f}\n", kp, ki, kd);
        return;
    }

    // 2. RESET_FAULT command: {"cmd":"RESET_FAULT"}
    if (strstr(json, "\"cmd\":\"RESET_FAULT\"") != nullptr || strstr(json, "\"cmd\": \"RESET_FAULT\"") != nullptr) {
        bool cleared = g_thermalSystem.resetFault();
        if (cleared) {
            Serial.println(F("{\"status\":\"OK\",\"cmd\":\"RESET_FAULT\",\"message\":\"Fault cleared successfully\"}"));
        } else {
            Serial.println(F("{\"status\":\"ERROR\",\"cmd\":\"RESET_FAULT\",\"message\":\"Safety interlock prevented reset (temp/sensor unsafe)\"}"));
        }
        return;
    }

    // 3. SET_SETPOINT command: {"cmd":"SET_SETPOINT","setpoint":75.0}
    if (strstr(json, "\"cmd\":\"SET_SETPOINT\"") != nullptr || strstr(json, "\"cmd\": \"SET_SETPOINT\"") != nullptr) {
        const char* pSp = strstr(json, "\"setpoint\":");
        if (pSp) {
            float sp = atof(pSp + 11);
            if (sp >= 40.0f && sp <= 95.0f) {
                g_thermalSystem.setSetpoint(sp);
                Serial.printf("{\"status\":\"OK\",\"cmd\":\"SET_SETPOINT\",\"setpoint\":%.1f}\n", sp);
                return;
            }
        }
        Serial.println(F("{\"status\":\"ERROR\",\"cmd\":\"SET_SETPOINT\",\"message\":\"Setpoint out of valid range [40, 95]\"}"));
        return;
    }

    // 4. INJECT_FAULT command: {"cmd":"INJECT_FAULT","type":"OVERTEMP"} or {"type":"DISCONNECT"}
    if (strstr(json, "\"cmd\":\"INJECT_FAULT\"") != nullptr || strstr(json, "\"cmd\": \"INJECT_FAULT\"") != nullptr) {
        if (strstr(json, "\"OVERTEMP\"")) {
            g_thermalSystem.injectFault("TEST_INJECTED_THERMAL_RUNAWAY_115C");
            Serial.println(F("{\"status\":\"OK\",\"cmd\":\"INJECT_FAULT\",\"type\":\"OVERTEMP\"}"));
        } else if (strstr(json, "\"DISCONNECT\"")) {
            g_thermalSystem.injectFault("TEST_INJECTED_SENSOR_DISCONNECT");
            Serial.println(F("{\"status\":\"OK\",\"cmd\":\"INJECT_FAULT\",\"type\":\"DISCONNECT\"}"));
        } else {
            g_thermalSystem.injectFault("TEST_INJECTED_GENERIC_FAULT");
            Serial.println(F("{\"status\":\"OK\",\"cmd\":\"INJECT_FAULT\",\"type\":\"GENERIC\"}"));
        }
        return;
    }

    // 5. SET_SPEED command: {"cmd":"SET_SPEED","speed":85.0}
    if (strstr(json, "\"cmd\":\"SET_SPEED\"") != nullptr || strstr(json, "\"cmd\": \"SET_SPEED\"") != nullptr) {
        const char* pSpd = strstr(json, "\"speed\":");
        if (pSpd) {
            g_vehicleSpeedKmh = atof(pSpd + 8);
            if (g_vehicleSpeedKmh < 0.0f) g_vehicleSpeedKmh = 0.0f;
            if (g_vehicleSpeedKmh > 200.0f) g_vehicleSpeedKmh = 200.0f;
            Serial.printf("{\"status\":\"OK\",\"cmd\":\"SET_SPEED\",\"speed\":%.1f}\n", g_vehicleSpeedKmh);
            return;
        }
    }

    // Ping check
    if (strstr(json, "\"cmd\":\"PING\"") != nullptr) {
        Serial.println(F("{\"status\":\"OK\",\"cmd\":\"PONG\",\"fw\":\"AEROTHERM_V2.0\"}"));
        return;
    }

    Serial.println(F("{\"status\":\"ERROR\",\"message\":\"Unrecognized command\"}"));
}

static void readSerialCommands() {
    while (Serial.available() > 0) {
        char c = static_cast<char>(Serial.read());
        if (c == '\n' || c == '\r') {
            if (g_serialIndex > 0) {
                g_serialBuffer[g_serialIndex] = '\0';
                processJsonCommand(g_serialBuffer);
                g_serialIndex = 0;
            }
        } else {
            if (g_serialIndex < sizeof(g_serialBuffer) - 1) {
                g_serialBuffer[g_serialIndex++] = c;
            } else {
                // Buffer overflow protection: reset index
                g_serialIndex = 0;
            }
        }
    }
}

// =============================================================================
// STRUCTURED JSON TELEMETRY EMITTER (10Hz / 1Hz)
// =============================================================================
static void emitTelemetry(unsigned long currentMs) {
    ThermalSystemSnapshot snap = g_thermalSystem.getSnapshot(currentMs);

    // Exact production JSON packet specified in AeroTherm engineering spec:
    // {"ts":12400,"state":"ACTIVE_AIR_BOOST","temp_raw":68.42,"temp_filt":68.15,"setpoint":75.0,"speed_kmh":85,"flap_deg":64,"boost_active":true,"pwm_pct":42.5,"pid":{"p":12.4,"i":25.1,"d":5.0},"fault":null}
    Serial.print(F("{\"ts\":"));
    Serial.print(snap.timestamp_ms);
    Serial.print(F(",\"state\":\""));
    Serial.print(g_thermalSystem.getStateName());
    Serial.print(F("\",\"temp_raw\":"));
    Serial.print(snap.temp_raw, 2);
    Serial.print(F(",\"temp_filt\":"));
    Serial.print(snap.temp_filtered, 2);
    Serial.print(F(",\"setpoint\":"));
    Serial.print(snap.setpoint, 1);
    Serial.print(F(",\"speed_kmh\":"));
    Serial.print(static_cast<int>(snap.vehicle_speed_kmh));
    Serial.print(F(",\"flap_deg\":"));
    Serial.print(static_cast<int>(snap.flap_angle_deg));
    Serial.print(F(",\"boost_active\":"));
    Serial.print(snap.boost_active ? F("true") : F("false"));
    Serial.print(F(",\"pump\":"));
    Serial.print(snap.pump_active ? F("true") : F("false"));
    Serial.print(F(",\"pwm_pct\":"));
    Serial.print(snap.pwm_duty_pct, 1);
    Serial.print(F(",\"pid\":{\"p\":"));
    Serial.print(snap.pid.p, 1);
    Serial.print(F(",\"i\":"));
    Serial.print(snap.pid.i, 1);
    Serial.print(F(",\"d\":"));
    Serial.print(snap.pid.d, 1);
    Serial.print(F("},\"aux_kw\":"));
    Serial.print(snap.aux_power_saved_kw, 2);
    Serial.print(F(",\"fault\":"));
    if (snap.fault_message != nullptr) {
        Serial.print(F("\""));
        Serial.print(snap.fault_message);
        Serial.print(F("\""));
    } else {
        Serial.print(F("null"));
    }
    Serial.println(F("}"));
}

// =============================================================================
// ARDUINO SETUP ROUTINE (Bare-Metal Init)
// =============================================================================
void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    while (!Serial && millis() < 1000) {
        // Yield for native USB CDC enumeration if applicable
    }

    analogReadResolution(12);

    g_thermalSystem.init();

    Serial.println(F("{\"event\":\"SYSTEM_BOOT\",\"subsystem\":\"AEROTHERM_PHASE2\",\"status\":\"READY\"}"));
}

// =============================================================================
// ARDUINO NON-BLOCKING SUPER-LOOP
// =============================================================================
void loop() {
    const unsigned long currentMs = millis();

    // 1. Ingest Incoming Serial Commands (Non-blocking)
    readSerialCommands();

    // 2. Non-blocking Control Loop Execution (50ms = 20Hz deterministic rate)
    if (currentMs - g_lastControlLoopMs >= CONTROL_LOOP_INTERVAL_MS) {
        float dt_seconds = (currentMs - g_lastControlLoopMs) / 1000.0f;
        g_lastControlLoopMs = currentMs;

        // Sample physical ADC Pin 34
        int rawAdc = analogRead(PIN_TEMP_SENSOR);
        float rawTemp = SensorFilter::adcToTemperature(rawAdc);

        // Update State Machine & Signal Conditioning
        g_thermalSystem.update(rawTemp, g_vehicleSpeedKmh, dt_seconds);
    }

    // 3. Telemetry Streaming (10Hz in Active/Fault, 1Hz in Idle)
    unsigned long telemetryInterval = (g_thermalSystem.getState() == STATE_IDLE_MODE)
                                      ? TELEMETRY_IDLE_INTERVAL_MS
                                      : TELEMETRY_FAST_INTERVAL_MS;

    if (currentMs - g_lastTelemetryMs >= telemetryInterval) {
        g_lastTelemetryMs = currentMs;
        emitTelemetry(currentMs);
    }

    // 4. Optical Heartbeat Indicator (Flashing frequency signals health)
    unsigned long blinkInterval = 500; // Default 1Hz toggle in IDLE
    if (g_thermalSystem.getState() == STATE_ACTIVE_AIR_BOOST) {
        blinkInterval = 200; // 2.5Hz in active cooling
    } else if (g_thermalSystem.getState() == STATE_SYSTEM_FAULT) {
        blinkInterval = 80;  // Rapid 6.25Hz strobe in emergency fault
    }

    if (currentMs - g_lastHeartbeatMs >= blinkInterval) {
        g_lastHeartbeatMs = currentMs;
        g_heartbeatState = !g_heartbeatState;
        digitalWrite(PIN_HEARTBEAT_LED, g_heartbeatState ? HIGH : LOW);
    }
}
