#!/usr/bin/env python3
"""
================================================================================
AEROTHERM R&D // PHASE 2 HYBRID EV THERMAL MANAGEMENT SYSTEM
DESKTOP DIGITAL TWIN & HIL SIMULATOR (PySide6 + PyQtGraph)
================================================================================
Hardware-in-the-Loop simulator executing exact C++ firmware mathematics:
- O(1) Circular Buffer Moving Average Filter (Window=16) with fault latching
- Precision Discrete PID Controller with Derivative-on-Measurement & Anti-Windup
- 4-State Deterministic State Machine (IDLE, PASSIVE AERO, ACTIVE FLUID, FAULT)
- Real-time Multi-Trace Telemetry Oscilloscope (Raw, Filtered, Setpoint, PWM)
"""

import sys
import math
import random
from collections import deque

try:
    from PySide6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QGridLayout, QLabel, QSlider, QPushButton, QFrame, QGroupBox
    )
    from PySide6.QtCore import QTimer, Qt
    from PySide6.QtGui import QFont, QColor
    import pyqtgraph as pg
except ImportError:
    print("[WARN] PySide6 or pyqtgraph not installed. Web dashboard (npm run dev) is primary.")

# ==============================================================================
# 1. MATHEMATICAL FIRMWARE MIRRORS
# ==============================================================================
class SensorFilter:
    """O(1) Circular Buffer Moving Average Filter with Out-of-Range Detection"""
    def __init__(self, size=16, init_val=25.0):
        self.size = size
        self.buffer = [init_val] * size
        self.head = 0
        self.count = size
        self.running_sum = init_val * size
        self.filtered = init_val
        self.latest_raw = init_val
        self.fault = None

    def update(self, raw_sample: float) -> float:
        self.latest_raw = raw_sample
        if math.isnan(raw_sample):
            self.fault = "ERR_SENSOR_INVALID_NAN"
            return self.filtered
        if raw_sample < -20.0:
            self.fault = "ERR_SENSOR_DISCONNECTED"
            return self.filtered
        if raw_sample > 150.0:
            self.fault = "ERR_SENSOR_OVER_RANGE"
            return self.filtered
        self.fault = None

        self.running_sum -= self.buffer[self.head]
        self.buffer[self.head] = raw_sample
        self.running_sum += raw_sample
        self.head = (self.head + 1) % self.size
        self.filtered = self.running_sum / self.size
        return self.filtered

class PidController:
    """Precision PID with Derivative-on-Measurement & Anti-Windup Clamping"""
    def __init__(self, kp=2.5, ki=0.4, kd=0.8, setpoint=75.0):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.setpoint = setpoint
        self.integrator = 0.0
        self.last_meas = setpoint
        self.is_first = True
        self.p_term = 0.0
        self.i_term = 0.0
        self.d_term = 0.0
        self.output = 0.0

    def compute(self, measurement: float, dt: float) -> float:
        if dt <= 0.0001:
            return self.output
        error = measurement - self.setpoint
        self.p_term = self.kp * error

        if self.is_first:
            self.last_meas = measurement
            self.d_term = 0.0
            self.is_first = False
        else:
            d_meas = (measurement - self.last_meas) / dt
            self.d_term = self.kd * d_meas
            self.last_meas = measurement

        cand_i = self.integrator + (self.ki * error * dt)
        tentative = self.p_term + cand_i + self.d_term

        # Anti-windup clamping
        sat_high = (tentative >= 100.0) and (error > 0.0)
        sat_low  = (tentative <= 0.0) and (error < 0.0)
        if not sat_high and not sat_low:
            self.integrator = cand_i

        self.integrator = max(0.0, min(100.0, self.integrator))
        self.i_term = self.integrator

        unclamped = self.p_term + self.i_term + self.d_term
        self.output = max(0.0, min(100.0, unclamped))
        return self.output

    def reset(self):
        self.integrator = 0.0
        self.p_term = self.i_term = self.d_term = self.output = 0.0
        self.is_first = True

class DesktopThermalTwin(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("AeroTherm R&D // Phase 2 EV Thermal Twin Console")
        self.resize(1100, 780)
        self.setStyleSheet("background-color: #07090E; color: #D1D5DB; font-family: monospace;")

        self.filter = SensorFilter(16, 28.0)
        self.pid = PidController(2.5, 0.4, 0.8, 75.0)

        self.ambient_temp = 28.0
        self.speed_kmh = 85.0
        self.battery_load_kw = 35.0
        self.setpoint = 75.0
        self.core_temp = 32.0

        self.state = "IDLE_MODE"
        self.flap_deg = 0.0
        self.pump_active = False
        self.pwm_pct = 0.0
        self.aux_saved_kw = 0.0

        self.disconnect_injected = False
        self.runaway_injected = False

        self.history_len = 100
        self.buf_raw = deque(maxlen=self.history_len)
        self.buf_filt = deque(maxlen=self.history_len)
        self.buf_sp = deque(maxlen=self.history_len)
        self.buf_pwm = deque(maxlen=self.history_len)

        self.init_ui()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.sim_tick)
        self.timer.start(50) # 20 Hz tick

    def init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        # Header Title
        title_lbl = QLabel("AEROTHERM R&D // PHASE 2 HYBRID EV THERMAL MANAGEMENT (HIL CONSOLE)")
        title_lbl.setStyleSheet("font-size: 16px; font-weight: bold; color: #06B6D4; padding: 6px;")
        layout.addWidget(title_lbl)

        # KPI Panel
        kpi_row = QHBoxLayout()
        self.lbl_temp = QLabel("BATTERY: 28.0°C")
        self.lbl_state = QLabel("STATE: IDLE_MODE")
        self.lbl_flap = QLabel("FLAP: 0°")
        self.lbl_pump = QLabel("PUMP: STANDBY")
        self.lbl_pwm = QLabel("PWM: 0.0%")
        self.lbl_aux = QLabel("AUX SAVED: +0.00 kW")

        for lbl in (self.lbl_temp, self.lbl_state, self.lbl_flap, self.lbl_pump, self.lbl_pwm, self.lbl_aux):
            lbl.setStyleSheet("background: #090C15; border: 1px solid #1F2937; padding: 8px; border-radius: 6px; font-weight: bold;")
            kpi_row.addWidget(lbl)
        layout.addLayout(kpi_row)

        # Graph Viewport
        self.plot_widget = pg.PlotWidget()
        self.plot_widget.setBackground("#06080E")
        self.plot_widget.showGrid(x=True, y=True, alpha=0.3)
        self.plot_widget.setYRange(10, 125)
        self.curve_raw = self.plot_widget.plot(pen=pg.mkPen("#67E8F9", width=1, style=Qt.DotLine), name="Raw ADC Temp")
        self.curve_filt = self.plot_widget.plot(pen=pg.mkPen("#06B6D4", width=2.5), name="Filtered Temp")
        self.curve_sp = self.plot_widget.plot(pen=pg.mkPen("#F59E0B", width=1.5, style=Qt.DashLine), name="Setpoint")
        layout.addWidget(self.plot_widget)

        # Sliders & Buttons Panel
        controls_layout = QHBoxLayout()

        # Sliders
        sliders_box = QGroupBox("Physical Simulation Parameters")
        s_layout = QGridLayout(sliders_box)

        s_layout.addWidget(QLabel("Speed (km/h):"), 0, 0)
        self.sld_speed = QSlider(Qt.Horizontal)
        self.sld_speed.setRange(0, 200)
        self.sld_speed.setValue(85)
        self.sld_speed.valueChanged.connect(lambda v: setattr(self, 'speed_kmh', float(v)))
        s_layout.addWidget(self.sld_speed, 0, 1)

        s_layout.addWidget(QLabel("Battery Load (kW):"), 1, 0)
        self.sld_load = QSlider(Qt.Horizontal)
        self.sld_load.setRange(0, 180)
        self.sld_load.setValue(35)
        self.sld_load.valueChanged.connect(lambda v: setattr(self, 'battery_load_kw', float(v)))
        s_layout.addWidget(self.sld_load, 1, 1)

        s_layout.addWidget(QLabel("Setpoint (°C):"), 2, 0)
        self.sld_sp = QSlider(Qt.Horizontal)
        self.sld_sp.setRange(50, 90)
        self.sld_sp.setValue(75)
        self.sld_sp.valueChanged.connect(lambda v: (setattr(self, 'setpoint', float(v)), self.pid.__setattr__('setpoint', float(v))))
        s_layout.addWidget(self.sld_sp, 2, 1)

        controls_layout.addWidget(sliders_box)

        # Fault Injection Buttons
        fault_box = QGroupBox("Hardware Safety Interlock Tests")
        f_layout = QVBoxLayout(fault_box)

        btn_disc = QPushButton("Simulate Sensor Disconnect (< -20°C)")
        btn_disc.setStyleSheet("background: #7F1D1D; color: #FECACA; padding: 6px; font-weight: bold;")
        btn_disc.clicked.connect(self.inject_disconnect)
        f_layout.addWidget(btn_disc)

        btn_runaway = QPushButton("Inject Thermal Runaway (115°C)")
        btn_runaway.setStyleSheet("background: #881337; color: #FFE4E6; padding: 6px; font-weight: bold;")
        btn_runaway.clicked.connect(self.inject_runaway)
        f_layout.addWidget(btn_runaway)

        btn_reset = QPushButton("Reset System Safety Interlock")
        btn_reset.setStyleSheet("background: #065F46; color: #D1FAE5; padding: 8px; font-weight: bold;")
        btn_reset.clicked.connect(self.reset_system)
        f_layout.addWidget(btn_reset)

        controls_layout.addWidget(fault_box)
        layout.addLayout(controls_layout)

    def inject_disconnect(self):
        self.disconnect_injected = True

    def inject_runaway(self):
        self.runaway_injected = True
        self.core_temp = 115.0

    def reset_system(self):
        if self.core_temp >= 105.0:
            return
        self.disconnect_injected = False
        self.runaway_injected = False
        self.pid.reset()
        if self.core_temp < 40.0:
            self.state = "IDLE_MODE"
        elif self.core_temp < 65.0:
            self.state = "PASSIVE_AERO_COOLING"
        else:
            self.state = "ACTIVE_FLUID_LOOP"

    def sim_tick(self):
        dt = 0.05
        # Thermal model
        heat_gen = 0.045 * (self.battery_load_kw ** 1.15) + (self.speed_kmh * 0.015)
        nat_loss = 0.04 * (self.core_temp - self.ambient_temp)
        flap_rad = math.radians(self.flap_deg)
        aero_loss = max(0.0, 0.09 * (self.speed_kmh / 100.0) * math.sin(flap_rad) * (self.core_temp - self.ambient_temp))
        active_loss = (0.8 + (self.pwm_pct / 100.0) * 5.2) if self.pump_active else 0.0
        ext_heat = 45.0 if self.runaway_injected else 0.0

        net = heat_gen + ext_heat - nat_loss - aero_loss - active_loss
        self.core_temp += (net / 110.0) * dt
        self.core_temp = max(-15.0, min(160.0, self.core_temp))

        raw = -38.5 if self.disconnect_injected else (self.core_temp + random.uniform(-0.4, 0.4))
        filt = self.filter.update(raw)

        # State machine
        if self.disconnect_injected or self.filter.fault:
            self.state = "SYSTEM_FAULT"
        elif filt >= 110.0:
            self.state = "SYSTEM_FAULT"

        if self.state == "SYSTEM_FAULT":
            self.pwm_pct = 0.0
            self.pump_active = False
            self.flap_deg = 90.0
            self.aux_saved_kw = 0.0
        else:
            if self.state == "IDLE_MODE" and filt >= 40.0:
                self.state = "PASSIVE_AERO_COOLING"
            elif self.state == "PASSIVE_AERO_COOLING":
                if filt < (40.0 - 1.5):
                    self.state = "IDLE_MODE"
                elif filt >= 65.0:
                    self.state = "ACTIVE_FLUID_LOOP"
            elif self.state == "ACTIVE_FLUID_LOOP":
                if filt < (65.0 - 1.5):
                    self.state = "PASSIVE_AERO_COOLING"
                    self.pid.reset()

            if self.state == "IDLE_MODE":
                self.flap_deg = 0.0
                self.pump_active = False
                self.pwm_pct = 0.0
                self.aux_saved_kw = 0.0
            elif self.state == "PASSIVE_AERO_COOLING":
                self.pump_active = False
                self.pwm_pct = 0.0
                delta = max(0.0, min(1.0, (filt - 40.0) / 25.0))
                self.flap_deg = delta * 90.0
                self.aux_saved_kw = 0.65 + (1.85 * delta)
            elif self.state == "ACTIVE_FLUID_LOOP":
                self.pump_active = True
                self.pwm_pct = self.pid.compute(filt, dt)
                self.flap_deg = 45.0 + 45.0 * (self.pwm_pct / 100.0)
                self.aux_saved_kw = 0.0

        # Update HUD
        self.lbl_temp.setText(f"BATTERY: {filt:.1f}°C (RAW: {raw:.1f}°C)")
        self.lbl_state.setText(f"STATE: {self.state}")
        self.lbl_flap.setText(f"FLAP: {int(self.flap_deg)}°")
        self.lbl_pump.setText("PUMP: CIRCULATING" if self.pump_active else "PUMP: STANDBY")
        self.lbl_pwm.setText(f"PWM: {self.pwm_pct:.1f}%")
        self.lbl_aux.setText(f"AUX SAVED: +{self.aux_saved_kw:.2f} kW")

        # Update curves
        self.buf_raw.append(raw)
        self.buf_filt.append(filt)
        self.buf_sp.append(self.setpoint)
        self.curve_raw.setData(list(self.buf_raw))
        self.curve_filt.setData(list(self.buf_filt))
        self.curve_sp.setData(list(self.buf_sp))

def main():
    if 'QApplication' not in globals():
        return
    app = QApplication(sys.argv)
    win = DesktopThermalTwin()
    win.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main()
