/**
 * @file sketch.ino
 * @brief AeroTherm R&D - Phase 2 Hybrid EV Thermal Management System
 * @details Complete self-contained single-file firmware for Wokwi and Arduino IDE simulation.
 *          Features:
 *          - O(1) Circular Buffer Moving Average Filter (N=16) with out-of-range detection
 *          - Precision Discrete-Time PID Controller with Derivative-on-Measurement & Anti-Windup
 *          - 4-State Deterministic State Machine (IDLE, PASSIVE_AERO, ACTIVE_FLUID, SYSTEM_FAULT)
 *          - 10Hz structured JSON telemetry stream & bidirectional JSON command parser
 */

#include <Arduino.h>

// =============================================================================
// 1. PIN CONFIGURATION & HARDWARE CONSTANTS
// =============================================================================
constexpr int PIN_TEMP_SENSOR   = 34; // ADC1_CH6
constexpr int PIN_SPEED_INPUT   = 35; // ADC1_CH7
constexpr int PIN_FLAP_SERVO    = 18; // Flap PWM
constexpr int PIN_PUMP_RELAY    = 19; // Fluid Pump Relay
constexpr int PIN_CHILLER_PWM   = 21; // Peltier / Chiller PWM
constexpr int PIN_HEARTBEAT_LED = 2;  // Diagnostic LED

// Thermal Thresholds (°C)
constexpr float THERMAL_T1            = 40.0f;
constexpr float THERMAL_T2            = 65.0f;
constexpr float THERMAL_T_CRIT        = 110.0f;
constexpr float THERMAL_HYSTERESIS    = 1.5f;
constexpr float DEFAULT_SETPOINT      = 75.0f;
constexpr float SENSOR_MIN_VALID_TEMP = -20.0f;
constexpr float SENSOR_MAX_VALID_TEMP = 150.0f;

// Filter & PID Constants
constexpr size_t FILTER_WINDOW_SIZE = 16;
constexpr float  DEFAULT_PID_KP     = 2.5f;
constexpr float  DEFAULT_PID_KI     = 0.4f;
constexpr float  DEFAULT_PID_KD     = 0.8f;

// Loop Scheduler Intervals (ms)
constexpr unsigned long CONTROL_LOOP_INTERVAL_MS   = 50;   // 20Hz
constexpr unsigned long TELEMETRY_FAST_INTERVAL_MS = 100;  // 10Hz
constexpr unsigned long TELEMETRY_IDLE_INTERVAL_MS = 1000; // 1Hz

// =============================================================================
// 2. STATE MACHINE ENUMS & DATA STRUCTURES
// =============================================================================
enum SystemState : uint8_t {
    STATE_IDLE_MODE = 0,
    STATE_PASSIVE_AERO_COOLING = 1,
    STATE_ACTIVE_FLUID_LOOP = 2,
    STATE_SYSTEM_FAULT = 3
};

struct PidTerms {
    float p;
    float i;
    float d;
    float output;
};

// =============================================================================
// 3. O(1) CIRCULAR BUFFER FILTER
// =============================================================================
class SensorFilter {
public:
    SensorFilter() : head_(0), count_(0), runningSum_(0.0f), filteredVal_(25.0f), latestRaw_(25.0f), faultMsg_(nullptr) {
        for (size_t i = 0; i < FILTER_WINDOW_SIZE; ++i) buffer_[i] = 25.0f;
    }

    void init(float initialVal = 25.0f) {
        head_ = 0;
        count_ = FILTER_WINDOW_SIZE;
        runningSum_ = initialVal * FILTER_WINDOW_SIZE;
        filteredVal_ = initialVal;
        latestRaw_ = initialVal;
        faultMsg_ = nullptr;
        for (size_t i = 0; i < FILTER_WINDOW_SIZE; ++i) buffer_[i] = initialVal;
    }

    float update(float rawSample) {
        latestRaw_ = rawSample;
        if (isnan(rawSample)) {
            faultMsg_ = "ERR_SENSOR_INVALID_MATH_NAN";
            return filteredVal_;
        }
        if (rawSample < SENSOR_MIN_VALID_TEMP) {
            faultMsg_ = "ERR_SENSOR_DISCONNECTED_OR_OPEN_CIRCUIT";
            return filteredVal_;
        }
        if (rawSample > SENSOR_MAX_VALID_TEMP) {
            faultMsg_ = "ERR_SENSOR_OVER_RANGE_HIGH_SHORT";
            return filteredVal_;
        }
        faultMsg_ = nullptr;

        runningSum_ -= buffer_[head_];
        buffer_[head_] = rawSample;
        runningSum_ += rawSample;

        head_ = (head_ + 1) % FILTER_WINDOW_SIZE;
        if (count_ < FILTER_WINDOW_SIZE) count_++;

        filteredVal_ = runningSum_ / static_cast<float>(count_);
        return filteredVal_;
    }

    float getFiltered() const { return filteredVal_; }
    float getLatestRaw() const { return latestRaw_; }
    bool isFaulted() const { return faultMsg_ != nullptr; }
    const char* getFaultString() const { return faultMsg_ ? faultMsg_ : "OK"; }
    void resetFault() { faultMsg_ = nullptr; }

    static float adcToTemperature(int rawAdc) {
        if (rawAdc <= 5) return -30.0f;
        if (rawAdc >= 4090) return 160.0f;
        constexpr float ADC_OFFSET = 500.0f;
        constexpr float ADC_SPAN   = 3200.0f;
        constexpr float TEMP_SPAN  = 130.0f;
        float norm = (static_cast<float>(rawAdc) - ADC_OFFSET) / ADC_SPAN;
        return -10.0f + (norm * TEMP_SPAN);
    }

private:
    float buffer_[FILTER_WINDOW_SIZE];
    size_t head_;
    size_t count_;
    float runningSum_;
    float filteredVal_;
    float latestRaw_;
    const char* faultMsg_;
};

// =============================================================================
// 4. PRECISION PID CONTROLLER
// =============================================================================
class PidController {
public:
    PidController(float kp = DEFAULT_PID_KP, float ki = DEFAULT_PID_KI, float kd = DEFAULT_PID_KD, float sp = DEFAULT_SETPOINT)
        : kp_(kp), ki_(ki), kd_(kd), setpoint_(sp), integrator_(0.0f), lastMeas_(sp), isFirst_(true), p_(0.0f), i_(0.0f), d_(0.0f), out_(0.0f) {}

    float compute(float meas, float dt) {
        if (dt <= 0.0001f) return out_;
        float err = meas - setpoint_;

        p_ = kp_ * err;

        if (isFirst_) {
            lastMeas_ = meas;
            d_ = 0.0f;
            isFirst_ = false;
        } else {
            float dMeas = (meas - lastMeas_) / dt;
            d_ = kd_ * dMeas;
            lastMeas_ = meas;
        }

        float candidateI = integrator_ + (ki_ * err * dt);
        float tentative = p_ + candidateI + d_;

        bool satHigh = (tentative >= 100.0f) && (err > 0.0f);
        bool satLow  = (tentative <= 0.0f) && (err < 0.0f);

        if (!satHigh && !satLow) {
            integrator_ = candidateI;
        }
        if (integrator_ > 100.0f) integrator_ = 100.0f;
        if (integrator_ < 0.0f) integrator_ = 0.0f;
        i_ = integrator_;

        float unclamped = p_ + i_ + d_;
        if (unclamped > 100.0f) out_ = 100.0f;
        else if (unclamped < 0.0f) out_ = 0.0f;
        else out_ = unclamped;

        return out_;
    }

    void reset() {
        integrator_ = 0.0f;
        p_ = i_ = d_ = out_ = 0.0f;
        isFirst_ = true;
    }

    void setGains(float kp, float ki, float kd) { kp_ = kp; ki_ = ki; kd_ = kd; }
    void setSetpoint(float sp) { setpoint_ = sp; }
    float getSetpoint() const { return setpoint_; }
    PidTerms getTerms() const { return {p_, i_, d_, out_}; }

private:
    float kp_, ki_, kd_, setpoint_;
    float integrator_, lastMeas_;
    bool isFirst_;
    float p_, i_, d_, out_;
};

// =============================================================================
// 5. DETERMINISTIC THERMAL STATE MACHINE
// =============================================================================
class ThermalStateMachine {
public:
    ThermalStateMachine()
        : state_(STATE_IDLE_MODE), flapAngle_(0.0f), pump_(false), pwm_(0.0f), auxKw_(0.0f), faultMsg_(nullptr), manualFault_(false) {}

    void init() {
        filter_.init(25.0f);
        pid_.reset();
        state_ = STATE_IDLE_MODE;
        flapAngle_ = 0.0f;
        pump_ = false;
        pwm_ = 0.0f;
        auxKw_ = 0.0f;
        faultMsg_ = nullptr;
        manualFault_ = false;

        pinMode(PIN_PUMP_RELAY, OUTPUT);
        digitalWrite(PIN_PUMP_RELAY, LOW);
        pinMode(PIN_HEARTBEAT_LED, OUTPUT);
        digitalWrite(PIN_HEARTBEAT_LED, LOW);
    }

    void update(float rawTemp, float speedKmh, float dt) {
        float filt = filter_.update(rawTemp);

        if (manualFault_) {
            state_ = STATE_SYSTEM_FAULT;
        } else if (filter_.isFaulted()) {
            faultMsg_ = filter_.getFaultString();
            state_ = STATE_SYSTEM_FAULT;
        } else if (filt >= THERMAL_T_CRIT) {
            faultMsg_ = "ERR_THERMAL_RUNAWAY_CRITICAL_T_EXCEEDED";
            state_ = STATE_SYSTEM_FAULT;
        }

        if (state_ == STATE_SYSTEM_FAULT) {
            pwm_ = 0.0f;
            pump_ = false;
            flapAngle_ = 90.0f; // Fail-safe
            auxKw_ = 0.0f;
        } else {
            switch (state_) {
                case STATE_IDLE_MODE:
                    if (filt >= THERMAL_T1) state_ = STATE_PASSIVE_AERO_COOLING;
                    break;
                case STATE_PASSIVE_AERO_COOLING:
                    if (filt < (THERMAL_T1 - THERMAL_HYSTERESIS)) state_ = STATE_IDLE_MODE;
                    else if (filt >= THERMAL_T2) state_ = STATE_ACTIVE_FLUID_LOOP;
                    break;
                case STATE_ACTIVE_FLUID_LOOP:
                    if (filt < (THERMAL_T2 - THERMAL_HYSTERESIS)) {
                        state_ = STATE_PASSIVE_AERO_COOLING;
                        pid_.reset();
                    }
                    break;
                default:
                    state_ = STATE_IDLE_MODE;
                    break;
            }

            switch (state_) {
                case STATE_IDLE_MODE:
                    flapAngle_ = 0.0f;
                    pump_ = false;
                    pwm_ = 0.0f;
                    auxKw_ = 0.0f;
                    faultMsg_ = nullptr;
                    break;
                case STATE_PASSIVE_AERO_COOLING: {
                    pump_ = false;
                    pwm_ = 0.0f;
                    float delta = (filt - THERMAL_T1) / (THERMAL_T2 - THERMAL_T1);
                    if (delta < 0.0f) delta = 0.0f;
                    if (delta > 1.0f) delta = 1.0f;
                    flapAngle_ = delta * 90.0f;
                    auxKw_ = 0.65f + (1.85f * delta);
                    faultMsg_ = nullptr;
                    break;
                }
                case STATE_ACTIVE_FLUID_LOOP:
                    pump_ = true;
                    pwm_ = pid_.compute(filt, dt);
                    flapAngle_ = 45.0f + (45.0f * (pwm_ / 100.0f));
                    auxKw_ = 0.0f;
                    faultMsg_ = nullptr;
                    break;
            }
        }

        // Hardware actuation
        digitalWrite(PIN_PUMP_RELAY, pump_ ? HIGH : LOW);
    }

    void injectFault(const char* reason) {
        manualFault_ = true;
        faultMsg_ = reason;
        state_ = STATE_SYSTEM_FAULT;
        pwm_ = 0.0f;
        pump_ = false;
        flapAngle_ = 90.0f;
    }

    bool resetFault() {
        if (filter_.getFiltered() >= (THERMAL_T_CRIT - 5.0f) || filter_.isFaulted()) return false;
        manualFault_ = false;
        faultMsg_ = nullptr;
        pid_.reset();
        float cur = filter_.getFiltered();
        if (cur < THERMAL_T1) state_ = STATE_IDLE_MODE;
        else if (cur < THERMAL_T2) state_ = STATE_PASSIVE_AERO_COOLING;
        else state_ = STATE_ACTIVE_FLUID_LOOP;
        return true;
    }

    SystemState getState() const { return state_; }
    const char* getStateName() const {
        switch (state_) {
            case STATE_IDLE_MODE: return "IDLE_MODE";
            case STATE_PASSIVE_AERO_COOLING: return "PASSIVE_AERO_COOLING";
            case STATE_ACTIVE_FLUID_LOOP: return "ACTIVE_FLUID_LOOP";
            case STATE_SYSTEM_FAULT: return "SYSTEM_FAULT";
            default: return "UNKNOWN";
        }
    }
    SensorFilter& getFilter() { return filter_; }
    PidController& getPid() { return pid_; }
    float getFlapAngle() const { return flapAngle_; }
    bool getPump() const { return pump_; }
    float getPwm() const { return pwm_; }
    float getAuxKw() const { return auxKw_; }
    const char* getFault() const { return faultMsg_; }

private:
    SystemState state_;
    SensorFilter filter_;
    PidController pid_;
    float flapAngle_;
    bool pump_;
    float pwm_;
    float auxKw_;
    const char* faultMsg_;
    bool manualFault_;
};

// =============================================================================
// 6. GLOBAL APPLICATION CONTEXT & SERIAL PARSER
// =============================================================================
static ThermalStateMachine g_sys;
static unsigned long g_lastLoopMs = 0;
static unsigned long g_lastTelemMs = 0;
static unsigned long g_lastBlinkMs = 0;
static bool g_blinkState = false;
static float g_speedKmh = 85.0f;
static char g_rxBuf[256];
static size_t g_rxIdx = 0;

static void parseCommand(const char* json) {
    if (strstr(json, "\"cmd\":\"SET_PID\"")) {
        float kp = DEFAULT_PID_KP, ki = DEFAULT_PID_KI, kd = DEFAULT_PID_KD;
        const char* pKp = strstr(json, "\"kp\":");
        const char* pKi = strstr(json, "\"ki\":");
        const char* pKd = strstr(json, "\"kd\":");
        if (pKp) kp = atof(pKp + 5);
        if (pKi) ki = atof(pKi + 5);
        if (pKd) kd = atof(pKd + 5);
        g_sys.getPid().setGains(kp, ki, kd);
        Serial.printf("{\"status\":\"OK\",\"cmd\":\"SET_PID\",\"kp\":%.2f,\"ki\":%.2f,\"kd\":%.2f}\n", kp, ki, kd);
    } else if (strstr(json, "\"cmd\":\"RESET_FAULT\"")) {
        bool ok = g_sys.resetFault();
        Serial.println(ok ? "{\"status\":\"OK\",\"cmd\":\"RESET_FAULT\"}" : "{\"status\":\"ERROR\",\"message\":\"Unsafe to reset\"}");
    } else if (strstr(json, "\"cmd\":\"SET_SETPOINT\"")) {
        const char* pSp = strstr(json, "\"setpoint\":");
        if (pSp) g_sys.getPid().setSetpoint(atof(pSp + 11));
        Serial.println("{\"status\":\"OK\",\"cmd\":\"SET_SETPOINT\"}");
    } else if (strstr(json, "\"cmd\":\"INJECT_FAULT\"")) {
        g_sys.injectFault("TEST_FAULT_INJECTED");
        Serial.println("{\"status\":\"OK\",\"cmd\":\"INJECT_FAULT\"}");
    }
}

void setup() {
    Serial.begin(115200);
    analogReadResolution(12);
    g_sys.init();
    Serial.println(F("{\"event\":\"BOOT\",\"system\":\"AEROTHERM_PHASE2\",\"status\":\"READY\"}"));
}

void loop() {
    const unsigned long now = millis();

    // Serial Command Reception
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (g_rxIdx > 0) {
                g_rxBuf[g_rxIdx] = '\0';
                parseCommand(g_rxBuf);
                g_rxIdx = 0;
            }
        } else if (g_rxIdx < sizeof(g_rxBuf) - 1) {
            g_rxBuf[g_rxIdx++] = c;
        }
    }

    // 20Hz Control Loop
    if (now - g_lastLoopMs >= CONTROL_LOOP_INTERVAL_MS) {
        float dt = (now - g_lastLoopMs) / 1000.0f;
        g_lastLoopMs = now;
        int rawAdc = analogRead(PIN_TEMP_SENSOR);
        float rawTemp = SensorFilter::adcToTemperature(rawAdc);
        g_sys.update(rawTemp, g_speedKmh, dt);
    }

    // Telemetry Streaming (10Hz active / 1Hz idle)
    unsigned long telemInterval = (g_sys.getState() == STATE_IDLE_MODE) ? TELEMETRY_IDLE_INTERVAL_MS : TELEMETRY_FAST_INTERVAL_MS;
    if (now - g_lastTelemMs >= telemInterval) {
        g_lastTelemMs = now;
        PidTerms pidTerms = g_sys.getPid().getTerms();

        Serial.print(F("{\"ts\":"));
        Serial.print(now);
        Serial.print(F(",\"state\":\""));
        Serial.print(g_sys.getStateName());
        Serial.print(F("\",\"temp_raw\":"));
        Serial.print(g_sys.getFilter().getLatestRaw(), 2);
        Serial.print(F(",\"temp_filt\":"));
        Serial.print(g_sys.getFilter().getFiltered(), 2);
        Serial.print(F(",\"setpoint\":"));
        Serial.print(g_sys.getPid().getSetpoint(), 1);
        Serial.print(F(",\"speed_kmh\":"));
        Serial.print((int)g_speedKmh);
        Serial.print(F(",\"flap_deg\":"));
        Serial.print((int)g_sys.getFlapAngle());
        Serial.print(F(",\"pump\":"));
        Serial.print(g_sys.getPump() ? F("true") : F("false"));
        Serial.print(F(",\"pwm_pct\":"));
        Serial.print(g_sys.getPwm(), 1);
        Serial.print(F(",\"pid\":{\"p\":"));
        Serial.print(pidTerms.p, 1);
        Serial.print(F(",\"i\":"));
        Serial.print(pidTerms.i, 1);
        Serial.print(F(",\"d\":"));
        Serial.print(pidTerms.d, 1);
        Serial.print(F("},\"aux_kw\":"));
        Serial.print(g_sys.getAuxKw(), 2);
        Serial.print(F(",\"fault\":"));
        if (g_sys.getFault()) {
            Serial.print(F("\""));
            Serial.print(g_sys.getFault());
            Serial.print(F("\""));
        } else {
            Serial.print(F("null"));
        }
        Serial.println(F("}"));
    }

    // LED Heartbeat
    unsigned long blinkPeriod = (g_sys.getState() == STATE_SYSTEM_FAULT) ? 80 : (g_sys.getState() == STATE_ACTIVE_FLUID_LOOP ? 200 : 500);
    if (now - g_lastBlinkMs >= blinkPeriod) {
        g_lastBlinkMs = now;
        g_blinkState = !g_blinkState;
        digitalWrite(PIN_HEARTBEAT_LED, g_blinkState ? HIGH : LOW);
    }
}
