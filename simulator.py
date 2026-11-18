#!/usr/bin/env python3
"""
================================================================================
ESP32 DIGITAL TWIN SIMULATOR // BARE-METAL ARCHITECTURE
================================================================================
Elite UI/UX Desktop Telemetry Dashboard built with PySide6 and PyQtGraph.
Simulates ESP32 12-bit ADC noise, O(1) Circular Buffer Filter, and State Machine.

Theme: SpaceX Telemetry / Cyberpunk Dark-Mode UI (#0D0D12 / #1A1A24)
"""

import sys
import random
import collections
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QSlider, QProgressBar, QPushButton, QFrame,
    QGroupBox, QCheckBox, QGraphicsDropShadowEffect
)
from PySide6.QtCore import QTimer, Qt, QTime
from PySide6.QtGui import QFont, QColor, QPalette
import pyqtgraph as pg

# Configure PyQtGraph global options for ultra-dark high-contrast rendering
pg.setConfigOption('background', '#0D0D12')
pg.setConfigOption('foreground', '#7D7D9A')
pg.setConfigOptions(antialias=True)

# ==============================================================================
# 1. CORE EMBEDDED LOGIC (Exact Mirror of ESP32 Firmware)
# ==============================================================================

class CircularMovingAverageFilter:
    """
    O(1) Moving Average Filter using a fixed circular buffer.
    Matches the C++ firmware implementation on ESP32.
    """
    def __init__(self, size: int = 10, seed_value: int = 3072):
        self.size = size
        self.buffer = [seed_value] * size
        self.index = 0
        self.running_sum = seed_value * size
        self.filtered_raw = seed_value

    def update(self, raw_sample: int) -> int:
        """Subtracts oldest sample and adds new one in constant time O(1)."""
        self.running_sum -= self.buffer[self.index]
        self.buffer[self.index] = raw_sample
        self.running_sum += raw_sample
        self.index = (self.index + 1) % self.size
        self.filtered_raw = int(self.running_sum / self.size)
        return self.filtered_raw

    def get_filtered_raw(self) -> int:
        return self.filtered_raw

    def get_battery_percent(self) -> int:
        """
        Maps raw ADC [2048, 4095] to [0%, 100%].
        Clamps strictly between 0 and 100%.
        """
        raw = self.filtered_raw
        if raw <= 2048:
            return 0
        elif raw >= 4095:
            return 100
        else:
            return int(((raw - 2048) / (4095 - 2048)) * 100)


# ==============================================================================
# 2. STATE MACHINE SPECIFICATION & PALETTE
# ==============================================================================

class SystemState:
    INIT = "STATE_INIT"
    IDLE = "STATE_IDLE"
    HEATING = "STATE_HEATING"
    COOLING = "STATE_COOLING"
    FAULT = "STATE_FAULT"

STATE_COLORS = {
    SystemState.INIT:    {"text": "#00B4D8", "bg": "#0D253A", "border": "#00B4D8", "glow": QColor(0, 180, 216, 120)},
    SystemState.IDLE:    {"text": "#FFBE0B", "bg": "#332B0D", "border": "#FFBE0B", "glow": QColor(255, 190, 11, 120)},
    SystemState.HEATING: {"text": "#FF0054", "bg": "#380816", "border": "#FF0054", "glow": QColor(255, 0, 84, 150)},
    SystemState.COOLING: {"text": "#00F5D4", "bg": "#0B2D29", "border": "#00F5D4", "glow": QColor(0, 245, 212, 140)},
    SystemState.FAULT:   {"text": "#FF1744", "bg": "#400810", "border": "#FF1744", "glow": QColor(255, 23, 68, 200)}
}

STATE_SEQUENCE = [SystemState.INIT, SystemState.IDLE, SystemState.HEATING, SystemState.COOLING]


# ==============================================================================
# 3. GLOBAL QT STYLE SHEET (Cyberpunk / SpaceX Telemetry Theme)
# ==============================================================================

GLOBAL_QSS = """
QMainWindow {
    background-color: #0D0D12;
}

QWidget {
    color: #C0C0D4;
    font-family: Consolas, 'Courier New', monospace;
}

/* Glassmorphic Panels */
QFrame#panel {
    background-color: #1A1A24;
    border: 1px solid #2B2B3D;
    border-radius: 8px;
}

QFrame#panel:hover {
    border: 1px solid #3D3D58;
}

QGroupBox {
    background-color: #1A1A24;
    border: 1px solid #2B2B3D;
    border-radius: 8px;
    margin-top: 24px;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 1px;
    color: #7D7D9A;
    padding-top: 14px;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    left: 12px;
    padding: 2px 8px;
    background-color: #12121A;
    border: 1px solid #2B2B3D;
    border-radius: 4px;
    color: #00F5D4;
}

/* Cyber Slider */
QSlider::groove:horizontal {
    height: 8px;
    background: #12121A;
    border: 1px solid #2B2B3D;
    border-radius: 4px;
}

QSlider::sub-page:horizontal {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00B4D8, stop:1 #00F5D4);
    border-radius: 4px;
}

QSlider::handle:horizontal {
    background: #FFFFFF;
    border: 2px solid #00F5D4;
    width: 18px;
    margin-top: -6px;
    margin-bottom: -6px;
    border-radius: 9px;
}

QSlider::handle:horizontal:hover {
    background: #00F5D4;
    border: 2px solid #FFFFFF;
}

/* Telemetry Buttons */
QPushButton {
    background-color: #212130;
    border: 1px solid #36364D;
    border-radius: 6px;
    color: #E2E2F0;
    padding: 6px 14px;
    font-weight: bold;
    font-size: 11px;
}

QPushButton:hover {
    background-color: #2D2D42;
    border: 1px solid #00F5D4;
    color: #00F5D4;
}

QPushButton:pressed {
    background-color: #161622;
}

QPushButton#faultBtn {
    background-color: #2D0F18;
    border: 1px solid #FF0054;
    color: #FF0054;
}

QPushButton#faultBtn:hover {
    background-color: #FF0054;
    color: #FFFFFF;
}

/* Custom Styled Battery Bar */
QProgressBar {
    background-color: #12121A;
    border: 1px solid #2B2B3D;
    border-radius: 8px;
    text-align: center;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: bold;
}

QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #FFBE0B, stop:0.5 #00B4D8, stop:1 #00F5D4);
    border-radius: 7px;
}

/* Checkbox */
QCheckBox {
    spacing: 8px;
    color: #A0A0BA;
    font-size: 11px;
}

QCheckBox::indicator {
    width: 16px;
    height: 16px;
    background: #12121A;
    border: 1px solid #36364D;
    border-radius: 4px;
}

QCheckBox::indicator:checked {
    background: #00F5D4;
    border: 1px solid #00F5D4;
}
"""


# ==============================================================================
# 4. MAIN TELEMETRY WINDOW (PySide6)
# ==============================================================================

class DigitalTwinSimulator(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("ESP32 DIGITAL TWIN // TELEMETRY DASHBOARD")
        self.resize(1340, 840)
        self.setMinimumSize(1100, 700)

        # Firmware Components
        self.filter = CircularMovingAverageFilter(size=10, seed_value=3072)
        self.current_state = SystemState.INIT
        self.state_step_index = 0
        self.fault_active = False
        self.fault_blink_toggle = False

        # Metrics & History Buffers
        self.history_len = 200
        self.x_data = list(range(self.history_len))
        self.raw_data = collections.deque([3072] * self.history_len, maxlen=self.history_len)
        self.filtered_data = collections.deque([3072] * self.history_len, maxlen=self.history_len)

        # Non-blocking State Machine Timer
        self.state_countdown_ms = 3000
        self.state_timer_interval_ms = 3000

        # UI Setup
        self.setStyleSheet(GLOBAL_QSS)
        self.init_ui()

        # Firmware Super-Loop Timer (50ms = 20Hz Tick)
        self.super_loop_timer = QTimer(self)
        self.super_loop_timer.timeout.connect(self.super_loop_tick)
        self.super_loop_timer.start(50)

        # State Machine Auto-Transition Timer (3000ms = 3.0s)
        self.state_timer = QTimer(self)
        self.state_timer.timeout.connect(self.advance_state_machine)
        self.state_timer.start(self.state_timer_interval_ms)

        # 400ms Blinking Timer for FAULT Mode
        self.blink_timer = QTimer(self)
        self.blink_timer.timeout.connect(self.blink_fault_tick)
        self.blink_timer.start(400)

        # Uptime Tracking
        self.uptime_ms = 0

    # --------------------------------------------------------------------------
    # UI CONSTRUCTION
    # --------------------------------------------------------------------------
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(14)

        # 1. Header Bar
        main_layout.addWidget(self.build_header_bar())

        # 2. Main Workspace (Left Control Panels, Right Dual-Trace Scope)
        content_layout = QHBoxLayout()
        content_layout.setSpacing(14)

        # Left Column (Panels)
        left_col = QVBoxLayout()
        left_col.setSpacing(14)
        left_col.addWidget(self.build_state_machine_panel(), stretch=2)
        left_col.addWidget(self.build_battery_telemetry_panel(), stretch=2)
        left_col.addWidget(self.build_hardware_sim_panel(), stretch=2)
        content_layout.addLayout(left_col, stretch=4)

        # Right Column (Real-time Graph)
        right_col = QVBoxLayout()
        right_col.setSpacing(14)
        right_col.addWidget(self.build_oscilloscope_panel(), stretch=1)
        content_layout.addLayout(right_col, stretch=6)

        main_layout.addLayout(content_layout)

        # Initialize State Card Style
        self.update_state_display()

    # --------------------------------------------------------------------------
    # HEADER BAR
    # --------------------------------------------------------------------------
    def build_header_bar(self) -> QWidget:
        header = QFrame()
        header.setObjectName("panel")
        header.setFixedHeight(64)
        layout = QHBoxLayout(header)
        layout.setContentsMargins(18, 0, 18, 0)

        # Status Orb & Title
        title_box = QHBoxLayout()
        title_box.setSpacing(12)

        self.heartbeat_led = QLabel("●")
        self.heartbeat_led.setStyleSheet("color: #00F5D4; font-size: 20px;")
        title_box.addWidget(self.heartbeat_led)

        title_vbox = QVBoxLayout()
        title_vbox.setSpacing(1)
        title_main = QLabel("ESP32 DIGITAL TWIN // PRODUCTION TELEMETRY")
        title_main.setStyleSheet("font-size: 15px; font-weight: bold; color: #FFFFFF; letter-spacing: 1.5px;")
        title_sub = QLabel("HARDWARE-ACCURATE BARE-METAL FIRMWARE SIMULATOR | ADC1_CH7 | 12-BIT SAR")
        title_sub.setStyleSheet("font-size: 9px; color: #6F6F8C; letter-spacing: 0.8px;")
        title_vbox.addWidget(title_main)
        title_vbox.addWidget(title_sub)
        title_box.addLayout(title_vbox)

        layout.addLayout(title_box)
        layout.addStretch()

        # Telemetry Metadata Readouts
        meta_box = QHBoxLayout()
        meta_box.setSpacing(20)

        self.lbl_tick_rate = QLabel("TICK: 20 Hz (50ms)")
        self.lbl_tick_rate.setStyleSheet("color: #00B4D8; font-size: 11px; font-weight: bold;")
        meta_box.addWidget(self.lbl_tick_rate)

        self.lbl_uptime = QLabel("UPTIME: 00:00:00")
        self.lbl_uptime.setStyleSheet("color: #FFBE0B; font-size: 11px; font-weight: bold;")
        meta_box.addWidget(self.lbl_uptime)

        # Fault Injection Button
        self.btn_fault = QPushButton("INJECT FAULT", objectName="faultBtn")
        self.btn_fault.setCursor(Qt.PointingHandCursor)
        self.btn_fault.clicked.connect(self.toggle_fault_injection)
        meta_box.addWidget(self.btn_fault)

        layout.addLayout(meta_box)
        return header

    # --------------------------------------------------------------------------
    # PANEL 1: STATE MACHINE VISUALIZER
    # --------------------------------------------------------------------------
    def build_state_machine_panel(self) -> QGroupBox:
        box = QGroupBox("NON-BLOCKING STATE MACHINE VISUALIZER")
        layout = QVBoxLayout(box)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        # Prominent State Hero Card
        self.state_card = QFrame()
        self.state_card.setFixedHeight(64)
        self.state_card.setStyleSheet("border-radius: 6px; background-color: #0D253A; border: 2px solid #00B4D8;")
        card_layout = QHBoxLayout(self.state_card)
        card_layout.setContentsMargins(14, 0, 14, 0)

        state_card_lbl = QLabel("CURRENT SYSTEM STATE:")
        state_card_lbl.setStyleSheet("color: #8E8EA8; font-size: 10px; font-weight: bold;")
        card_layout.addWidget(state_card_lbl)

        self.lbl_current_state = QLabel("STATE_INIT")
        self.lbl_current_state.setStyleSheet("color: #00B4D8; font-size: 20px; font-weight: bold; letter-spacing: 2px;")
        card_layout.addWidget(self.lbl_current_state, alignment=Qt.AlignRight)
        layout.addWidget(self.state_card)

        # Visual State Progression Pipeline
        pipeline_box = QHBoxLayout()
        pipeline_box.setSpacing(4)
        self.state_chips = {}

        states = [SystemState.INIT, SystemState.IDLE, SystemState.HEATING, SystemState.COOLING]
        for idx, st in enumerate(states):
            chip = QLabel(st.replace("STATE_", ""))
            chip.setAlignment(Qt.AlignCenter)
            chip.setFixedHeight(24)
            chip.setStyleSheet("background: #14141F; border: 1px solid #2B2B3D; border-radius: 4px; color: #585872; font-size: 9px; font-weight: bold;")
            pipeline_box.addWidget(chip, stretch=1)
            self.state_chips[st] = chip

            if idx < len(states) - 1:
                arrow = QLabel("➔")
                arrow.setAlignment(Qt.AlignCenter)
                arrow.setStyleSheet("color: #38384E; font-size: 9px;")
                pipeline_box.addWidget(arrow)

        layout.addLayout(pipeline_box)

        # Non-blocking dwell timer progress bar
        dwell_box = QHBoxLayout()
        dwell_lbl = QLabel("STATE DWELL PROGRESS:")
        dwell_lbl.setStyleSheet("color: #6C6C88; font-size: 9px;")
        dwell_box.addWidget(dwell_lbl)

        self.state_dwell_bar = QProgressBar()
        self.state_dwell_bar.setFixedHeight(8)
        self.state_dwell_bar.setTextVisible(False)
        self.state_dwell_bar.setRange(0, 3000)
        self.state_dwell_bar.setValue(0)
        self.state_dwell_bar.setStyleSheet("""
            QProgressBar { background-color: #12121A; border: none; border-radius: 4px; }
            QProgressBar::chunk { background-color: #00B4D8; border-radius: 4px; }
        """)
        dwell_box.addWidget(self.state_dwell_bar)
        layout.addLayout(dwell_box)

        return box

    # --------------------------------------------------------------------------
    # PANEL 2: BATTERY TELEMETRY PANEL
    # --------------------------------------------------------------------------
    def build_battery_telemetry_panel(self) -> QGroupBox:
        box = QGroupBox("BATTERY TELEMETRY & FILTERED MONITOR")
        layout = QVBoxLayout(box)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        # Thick Hero Battery Percentage Bar
        self.battery_bar = QProgressBar()
        self.battery_bar.setFixedHeight(38)
        self.battery_bar.setRange(0, 100)
        self.battery_bar.setValue(50)
        self.battery_bar.setFormat("BATTERY: %p%")
        layout.addWidget(self.battery_bar)

        # Telemetry Metric Grid
        grid = QGridLayout()
        grid.setHorizontalSpacing(12)
        grid.setVerticalSpacing(6)

        def make_metric(title: str, default_val: str, color: str = "#00F5D4"):
            lbl_title = QLabel(title)
            lbl_title.setStyleSheet("color: #6F6F8C; font-size: 9px;")
            lbl_val = QLabel(default_val)
            lbl_val.setStyleSheet(f"color: {color}; font-size: 13px; font-weight: bold;")
            return lbl_title, lbl_val

        t1, self.lbl_raw_filtered = make_metric("FILTERED RAW ADC", "3072", "#00FF66")
        t2, self.lbl_voltage      = make_metric("EQUIV VOLTAGE", "2.47 V", "#00B4D8")
        t3, self.lbl_filter_depth = make_metric("WINDOW DEPTH", "10 SAMPLES", "#FFBE0B")
        t4, self.lbl_noise_atten  = make_metric("NOISE REJECTION", "~18.2 dB", "#FF0054")

        grid.addWidget(t1, 0, 0); grid.addWidget(self.lbl_raw_filtered, 1, 0)
        grid.addWidget(t2, 0, 1); grid.addWidget(self.lbl_voltage, 1, 1)
        grid.addWidget(t3, 2, 0); grid.addWidget(self.lbl_filter_depth, 3, 0)
        grid.addWidget(t4, 2, 1); grid.addWidget(self.lbl_noise_atten, 3, 1)

        layout.addLayout(grid)
        return box

    # --------------------------------------------------------------------------
    # PANEL 3: SIMULATED HARDWARE (NOISY ADC SLIDER)
    # --------------------------------------------------------------------------
    def build_hardware_sim_panel(self) -> QGroupBox:
        box = QGroupBox("SIMULATED HARDWARE INJECTION [GPIO 35]")
        layout = QVBoxLayout(box)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        # Slider Value Readout
        slider_header = QHBoxLayout()
        slider_title = QLabel("BASE VOLTAGE DIVIDER SLIDER (ADC 0-4095):")
        slider_title.setStyleSheet("color: #8E8EA8; font-size: 10px; font-weight: bold;")
        slider_header.addWidget(slider_title)

        self.lbl_slider_val = QLabel("3072")
        self.lbl_slider_val.setStyleSheet("color: #00F5D4; font-size: 14px; font-weight: bold;")
        slider_header.addWidget(self.lbl_slider_val, alignment=Qt.AlignRight)
        layout.addLayout(slider_header)

        # Slider for Pin 35
        self.adc_slider = QSlider(Qt.Horizontal)
        self.adc_slider.setRange(0, 4095)
        self.adc_slider.setValue(3072)
        self.adc_slider.valueChanged.connect(self.on_slider_changed)
        layout.addWidget(self.adc_slider)

        # Preset Quick-Buttons
        btn_box = QHBoxLayout()
        btn_box.setSpacing(6)

        presets = [
            ("EMPTY (2048)", 2048),
            ("NOMINAL (3072)", 3072),
            ("FULL (4095)", 4095),
            ("CRITICAL (1500)", 1500)
        ]
        for label, val in presets:
            btn = QPushButton(label)
            btn.setCursor(Qt.PointingHandCursor)
            btn.clicked.connect(lambda _, v=val: self.adc_slider.setValue(v))
            btn_box.addWidget(btn)

        layout.addLayout(btn_box)

        # Noise simulation controls
        noise_row = QHBoxLayout()
        self.chk_noise = QCheckBox("SIMULATE ESP32 ADC HARDWARE NOISE (±200 COUNTS)")
        self.chk_noise.setChecked(True)
        noise_row.addWidget(self.chk_noise)

        self.lbl_noise_status = QLabel("ACTIVE")
        self.lbl_noise_status.setStyleSheet("color: #FF0054; font-weight: bold; font-size: 10px;")
        noise_row.addWidget(self.lbl_noise_status, alignment=Qt.AlignRight)
        layout.addLayout(noise_row)

        return box

    # --------------------------------------------------------------------------
    # PANEL 4: REAL-TIME OSCILLOSCOPE (PyQtGraph)
    # --------------------------------------------------------------------------
    def build_oscilloscope_panel(self) -> QGroupBox:
        box = QGroupBox("REAL-TIME DUAL-TRACE TELEMETRY OSCILLOSCOPE")
        layout = QVBoxLayout(box)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(8)

        # Plot Widget
        self.plot_widget = pg.PlotWidget()
        self.plot_widget.setYRange(0, 4300, padding=0.03)
        self.plot_widget.setXRange(0, self.history_len, padding=0.0)
        self.plot_widget.showGrid(x=True, y=True, alpha=0.18)

        # Custom Axis Styling
        axis_pen = pg.mkPen(color='#323246', width=1)
        self.plot_widget.getAxis('left').setPen(axis_pen)
        self.plot_widget.getAxis('bottom').setPen(axis_pen)
        self.plot_widget.getAxis('left').setTextPen('#7D7D9A')
        self.plot_widget.getAxis('bottom').setTextPen('#7D7D9A')
        self.plot_widget.getAxis('left').setLabel("ADC 12-Bit Counts", color='#A0A0BA', size='9pt')
        self.plot_widget.getAxis('bottom').setLabel("Super-Loop Samples (50ms)", color='#A0A0BA', size='9pt')

        # Reference Threshold Lines
        # 1. Battery 0% Threshold = 2048
        line_empty = pg.InfiniteLine(pos=2048, angle=0, pen=pg.mkPen(color='#00B4D8', width=1, style=Qt.DashLine))
        self.plot_widget.addItem(line_empty)
        label_empty = pg.TextItem("0% BATTERY CUTOFF (2048)", color='#00B4D8', anchor=(0, 1))
        label_empty.setPos(5, 2048)
        self.plot_widget.addItem(label_empty)

        # 2. Battery 100% Threshold = 4095
        line_full = pg.InfiniteLine(pos=4095, angle=0, pen=pg.mkPen(color='#FFBE0B', width=1, style=Qt.DashLine))
        self.plot_widget.addItem(line_full)
        label_full = pg.TextItem("100% FULL CHARGE (4095)", color='#FFBE0B', anchor=(0, 0))
        label_full.setPos(5, 4095)
        self.plot_widget.addItem(label_full)

        # Trace 1: Raw Noisy ADC (Red Faded)
        self.curve_raw = self.plot_widget.plot(
            pen=pg.mkPen(color=(255, 60, 80, 140), width=1.4),
            name="Raw Noisy Input"
        )

        # Trace 2: O(1) Circular Filtered Output (Neon Green Thick)
        self.curve_filtered = self.plot_widget.plot(
            pen=pg.mkPen(color='#00FF66', width=2.8),
            name="Filtered Output"
        )

        layout.addWidget(self.plot_widget)

        # Legend Bar Below Graph
        legend_row = QHBoxLayout()
        legend_row.setContentsMargins(8, 0, 8, 0)

        # Red Raw Legend
        leg_raw = QLabel("■ CH1: RAW NOISY ADC (SLIDER + NOISE ±200)")
        leg_raw.setStyleSheet("color: #FF3355; font-size: 10px; font-weight: bold;")
        legend_row.addWidget(leg_raw)

        # Green Filtered Legend
        leg_filt = QLabel("■ CH2: O(1) CIRCULAR FILTERED (WINDOW=10)")
        leg_filt.setStyleSheet("color: #00FF66; font-size: 10px; font-weight: bold;")
        legend_row.addWidget(leg_filt)

        legend_row.addStretch()

        self.lbl_fps = QLabel("STREAM: 20 Hz (STABLE)")
        self.lbl_fps.setStyleSheet("color: #6C6C88; font-size: 10px;")
        legend_row.addWidget(self.lbl_fps)

        layout.addLayout(legend_row)
        return box

    # --------------------------------------------------------------------------
    # EVENT HANDLERS & SIMULATION TIMERS
    # --------------------------------------------------------------------------
    def on_slider_changed(self, val: int):
        self.lbl_slider_val.setText(str(val))

    def toggle_fault_injection(self):
        self.fault_active = not self.fault_active
        if self.fault_active:
            self.current_state = SystemState.FAULT
            self.btn_fault.setText("CLEAR FAULT")
            self.btn_fault.setStyleSheet("background-color: #FF0054; color: #FFFFFF;")
        else:
            self.current_state = SystemState.IDLE
            self.state_step_index = 1
            self.btn_fault.setText("INJECT FAULT")
            self.btn_fault.setStyleSheet("")
        self.update_state_display()

    def advance_state_machine(self):
        """Advances state automatically if not latched in FAULT."""
        if self.fault_active:
            return

        self.state_step_index = (self.state_step_index + 1) % len(STATE_SEQUENCE)
        self.current_state = STATE_SEQUENCE[self.state_step_index]
        self.update_state_display()
        self.state_dwell_bar.setValue(0)

    def blink_fault_tick(self):
        """Provides dynamic neon pulsing or alarm blinking during FAULT."""
        if self.current_state == SystemState.FAULT:
            self.fault_blink_toggle = not self.fault_blink_toggle
            color = "#FF1744" if self.fault_blink_toggle else "#2A0810"
            self.state_card.setStyleSheet(f"border-radius: 6px; background-color: {color}; border: 2px solid #FF1744;")
        else:
            # Heartbeat LED tick
            self.heartbeat_led.setVisible(not self.heartbeat_led.isVisible())

    def update_state_display(self):
        """Updates the visual cards and pipeline chips to reflect active state."""
        state = self.current_state
        palette = STATE_COLORS.get(state, STATE_COLORS[SystemState.INIT])

        self.lbl_current_state.setText(state)
        self.lbl_current_state.setStyleSheet(f"color: {palette['text']}; font-size: 20px; font-weight: bold; letter-spacing: 2px;")
        self.state_card.setStyleSheet(f"border-radius: 6px; background-color: {palette['bg']}; border: 2px solid {palette['border']};")

        # Update Pipeline Chips
        for st_name, chip in self.state_chips.items():
            if st_name == state:
                p = STATE_COLORS[st_name]
                chip.setStyleSheet(f"background: {p['bg']}; border: 1.5px solid {p['border']}; border-radius: 4px; color: {p['text']}; font-size: 9px; font-weight: bold;")
            else:
                chip.setStyleSheet("background: #14141F; border: 1px solid #2B2B3D; border-radius: 4px; color: #585872; font-size: 9px; font-weight: bold;")

    # --------------------------------------------------------------------------
    # SUPER-LOOP ENGINE (50ms Non-blocking Tick)
    # --------------------------------------------------------------------------
    def super_loop_tick(self):
        # 1. Update Uptime Counter
        self.uptime_ms += 50
        sec = self.uptime_ms // 1000
        mins = sec // 60
        hours = mins // 60
        self.lbl_uptime.setText(f"UPTIME: {hours:02d}:{mins%60:02d}:{sec%60:02d}")

        # 2. Update State Dwell Progress Bar
        if not self.fault_active:
            cur_dwell = (self.uptime_ms % self.state_timer_interval_ms)
            self.state_dwell_bar.setValue(cur_dwell)

        # 3. Simulate Hardware Noise on ADC Pin 35
        base_slider_val = self.adc_slider.value()
        if self.chk_noise.isChecked():
            # Add uniform random noise (+/- 200 counts)
            noise = random.randint(-200, 200)
            raw_adc_noisy = max(0, min(4095, base_slider_val + noise))
            self.lbl_noise_status.setText("ACTIVE (±200)")
            self.lbl_noise_status.setStyleSheet("color: #FF0054; font-weight: bold; font-size: 10px;")
        else:
            raw_adc_noisy = base_slider_val
            self.lbl_noise_status.setText("DISABLED")
            self.lbl_noise_status.setStyleSheet("color: #7D7D9A; font-weight: bold; font-size: 10px;")

        # 4. Feed Sample to O(1) Circular Buffer Filter
        filtered_raw = self.filter.update(raw_adc_noisy)
        battery_pct = self.filter.get_battery_percent()

        # 5. Append to Rolling Oscilloscope Data Buffers
        self.raw_data.append(raw_adc_noisy)
        self.filtered_data.append(filtered_raw)

        # 6. Update PyQtGraph Curves
        self.curve_raw.setData(self.x_data, list(self.raw_data))
        self.curve_filtered.setData(self.x_data, list(self.filtered_data))

        # 7. Update Telemetry UI Readouts
        self.battery_bar.setValue(battery_pct)
        self.lbl_raw_filtered.setText(str(filtered_raw))
        
        # Calculate equivalent pin voltage: 0-4095 maps to 0.0V - 3.3V
        voltage = (filtered_raw / 4095.0) * 3.3
        self.lbl_voltage.setText(f"{voltage:.2f} V")


# ==============================================================================
# 5. APPLICATION ENTRY POINT
# ==============================================================================
def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # Modern Dark Palette Fallback
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(13, 13, 18))
    palette.setColor(QPalette.WindowText, QColor(220, 220, 240))
    app.setPalette(palette)

    window = DigitalTwinSimulator()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
