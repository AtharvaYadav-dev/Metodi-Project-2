# ESP32 Metodis Embedded Firmware & Digital Twin Simulator (Phase 1)

[![ESP32](https://img.shields.io/badge/Hardware-ESP32--WROOM--32-red.svg)](https://www.espressif.com/)
[![PlatformIO](https://img.shields.io/badge/Framework-PlatformIO%20%2F%20Arduino-orange.svg)](https://platformio.org/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Tailwind-blue.svg)](https://react.dev/)
[![PySide6](https://img.shields.io/badge/GUI-PySide6%20%2B%20PyQtGraph-green.svg)](https://wiki.qt.io/Qt_for_Python)

Production-grade, bare-metal C++ firmware for the ESP32 paired with real-time "SpaceX / Cyberpunk" Digital Twin telemetry dashboards (React web application and PySide6 native desktop GUI).

---

## 🚀 Key Features

### 1. Embedded C++ Firmware (`PlatformIO` / `Arduino`)
- **Strict Non-Blocking Execution**: Driven 100% by differential `millis()` timers with zero `delay()` calls.
- **$\mathcal{O}(1)$ Circular Buffer Filter**: Fixed-size 10-sample moving average filter executing in constant time with filter pre-seeding on boot.
- **Hardware Isolation**: Pin 34 (`TEMP_SENSOR_PIN`) and Pin 35 (`BATTERY_PIN`) run on **ADC1**, eliminating Wi-Fi/Bluetooth DMA conflicts.
- **Non-Blocking State Machine**: Robust state transitions (`STATE_INIT` ➔ `STATE_IDLE` ➔ `STATE_HEATING` ➔ `STATE_COOLING` ➔ `STATE_FAULT`).
- **Telemetry Streaming**: Real-time diagnostic logging at 115200 baud every 1000ms.

### 2. React Digital Twin Dashboard (`App.jsx`)
- **Cyberpunk Dark Theme**: Deep dark styling (`#0D0D12` / `#1A1A24`) with glassmorphic panels and glowing neon accents.
- **Secure Access Terminal**: Full-screen authentication portal with masked input, eye visibility toggle, and security clearance checks (`METODI2026`).
- **Interactive Dual Hardware Controls**:
  - Battery Slider (Pin 35: 0 to 4095 LSB) with $\pm 250$ counts electrical noise simulation.
  - Temperature Slider (Pin 34: 0°C to 120°C) with $\pm 3.5^\circ\text{C}$ thermal jitter.
- **Closed-Loop Supervisory Logic**:
  - Temperature $> 80^\circ\text{C}$ forces immediate transition to `STATE_COOLING` (Cyan).
  - Temperature $< 40^\circ\text{C}$ forces immediate transition to `STATE_HEATING` (Red).
  - Nominal ($40^\circ\text{C} - 80^\circ\text{C}$) dwells autonomously for 4.0 seconds.
- **Triple-Channel Real-Time Oscilloscope (`Recharts`)**:
  - Live 20 Hz streaming of Raw Battery Noise, Filtered Battery Voltage (Left Axis), and Filtered Temperature (Right Secondary Axis).

### 3. Native Desktop Simulator (`simulator.py`)
- High-performance PySide6 desktop dashboard featuring a real-time `pyqtgraph` oscilloscope.

---

## 📁 Repository Structure

```text
├── include/
│   └── state_machine.h          # Hardware pins, ADC specs, state machine interface
├── src/
│   ├── main.cpp                 # Main firmware super-loop & 1000ms telemetry
│   └── state_machine.cpp        # O(1) circular filter & state transition engine
├── App.jsx                      # React Digital Twin (Auth + Dual Gauges + Oscilloscope)
├── simulator.py                 # PySide6 + PyQtGraph desktop simulator
├── simulator.html               # Zero-install standalone browser dashboard
├── sketch.ino                   # 1-Click Wokwi Simulator & Arduino IDE portable build
├── platformio.ini               # PlatformIO environment & compiler flags
├── vite.config.js               # Vite development server configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── package.json                 # Web toolchain dependencies
└── PROJECT_COMPREHENSIVE_SUMMARY.txt # Complete technical engineering audit
```

---

## ⚡ Quick Start

### 1. Web Dashboard (React + Vite)
```bash
# Install dependencies
npm install

# Start live development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and authenticate using access key: `METODI2026`.

### 2. Standalone Zero-Install Browser Preview
Double-click `simulator.html` in your file explorer to open the dashboard directly in Chrome or Edge.

### 3. Python Native Desktop GUI
```bash
pip install PySide6 pyqtgraph
python simulator.py
```

### 4. ESP32 Firmware (PlatformIO)
- Open this folder in VS Code with the PlatformIO extension.
- Click the **Build** (`✓`) checkmark in the bottom status bar or run:
  ```bash
  pio run
  ```

---

## 🛡️ Security Access Key

The Digital Twin authentication passphrase is:
```text
METODI2026
```

---

## 📄 License
MIT License.
