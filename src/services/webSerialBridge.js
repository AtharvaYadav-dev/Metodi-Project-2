/**
 * @file webSerialBridge.js
 * @brief WebSerial Hardware Bridge for ESP32/STM32 Live Telemetry & Command Link
 */

export class WebSerialBridge {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
    this.isConnected = false;
    this.onPacketCallback = null;
    this.onStatusCallback = null;
    this.buffer = '';
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async connect(baudRate = 115200, onPacket, onStatus) {
    if (!this.isSupported()) {
      throw new Error('WebSerial API is not supported in this browser. Please use Chrome/Edge.');
    }

    this.onPacketCallback = onPacket;
    this.onStatusCallback = onStatus;

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: Number(baudRate) });

      this.isConnected = true;
      if (this.onStatusCallback) this.onStatusCallback('CONNECTED', 'Hardware connected over USB Serial');

      // Setup writer
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Setup reader
      this.readLoop();
    } catch (err) {
      this.isConnected = false;
      if (this.onStatusCallback) this.onStatusCallback('ERROR', err.message);
      throw err;
    }
  }

  async readLoop() {
    while (this.port && this.port.readable && this.isConnected) {
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.handleIncomingChunk(value);
          }
        }
      } catch (error) {
        if (this.onStatusCallback) this.onStatusCallback('DISCONNECTED', error.message);
      } finally {
        this.reader.releaseLock();
      }
    }
  }

  handleIncomingChunk(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    // Keep uncompleted line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('{')) continue;

      try {
        const parsed = JSON.parse(trimmed);
        if (this.onPacketCallback) {
          this.onPacketCallback(parsed, trimmed);
        }
      } catch {
        // Non-JSON debug message or partial packet; ignore safely
      }
    }
  }

  async sendCommand(commandObj) {
    if (!this.writer || !this.isConnected) {
      throw new Error('Serial link is not connected.');
    }
    const jsonStr = JSON.stringify(commandObj) + '\n';
    await this.writer.write(jsonStr);
  }

  async disconnect() {
    this.isConnected = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
      }
      if (this.writer) {
        await this.writer.close();
      }
      if (this.port) {
        await this.port.close();
      }
    } catch (e) {
      // Ignore close errors during tear down
    } finally {
      this.port = null;
      this.reader = null;
      this.writer = null;
      if (this.onStatusCallback) this.onStatusCallback('DISCONNECTED', 'Hardware disconnected');
    }
  }
}
