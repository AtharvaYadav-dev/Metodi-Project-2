/**
 * @file SerialConsole.jsx
 * @brief Live Raw JSON Serial Stream Inspector & Command Bridge
 * @details Real-time 10Hz terminal monitor with JSON formatting,
 *          command transmission CLI, and quick payload buttons.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Pause, Trash2, Copy, Send, Check } from 'lucide-react';

export default function SerialConsole({ logs, onSendCommand, isHardwareMode }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [inputCmd, setInputCmd] = useState('');
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (autoScroll && !isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isPaused]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputCmd.trim()) return;
    try {
      const parsed = JSON.parse(inputCmd);
      onSendCommand(parsed);
      setInputCmd('');
    } catch {
      alert('Invalid JSON format. Please ensure command is valid JSON object.');
    }
  };

  const sendPreset = (cmdObj) => {
    onSendCommand(cmdObj);
  };

  const copyLatest = () => {
    if (logs.length > 0) {
      const latest = logs[logs.length - 1];
      navigator.clipboard.writeText(typeof latest === 'string' ? latest : JSON.stringify(latest));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-800/80 bg-[#090C15] p-3 shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-sm">
            LIVE RAW JSON SERIAL TELEMETRY STREAM (10 Hz / 115200 BAUD)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 rounded flex items-center gap-1 border ${
              isPaused
                ? 'bg-amber-950/40 border-amber-700 text-amber-300'
                : 'bg-gray-800/80 border-gray-700 text-gray-300'
            }`}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>

          <button
            onClick={copyLatest}
            className="px-2 py-0.5 rounded bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-300 flex items-center gap-1"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'COPIED' : 'COPY'}
          </button>

          <label className="flex items-center gap-1 cursor-pointer text-gray-400 select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-cyan-400 rounded h-3.5 w-3.5 cursor-pointer"
            />
            AUTO-SCROLL
          </label>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="w-full h-44 bg-black/60 rounded-lg p-2.5 overflow-y-auto font-mono text-[11px] leading-relaxed border border-gray-900 shadow-inner">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">Awaiting telemetry packets...</div>
        ) : (
          logs.map((log, idx) => {
            const raw = typeof log === 'string' ? log : JSON.stringify(log);
            const isFault = raw.includes('"fault":"ERR') || raw.includes('"fault": "ERR');
            const isState2 = raw.includes('ACTIVE_FLUID_LOOP');
            const isState1 = raw.includes('PASSIVE_AERO_COOLING');
            return (
              <div
                key={idx}
                className={`py-0.5 truncate hover:bg-white/5 px-1 rounded transition-colors ${
                  isFault
                    ? 'text-red-400 font-bold bg-red-950/20'
                    : isState2
                    ? 'text-amber-300'
                    : isState1
                    ? 'text-emerald-300'
                    : 'text-cyan-300/90'
                }`}
              >
                <span className="text-gray-600 mr-2 select-none">
                  {`[${String(idx + 1).padStart(4, '0')}]`}
                </span>
                {raw}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Command Bridge Input CLI */}
      <div className="mt-2.5 pt-2 border-t border-gray-800/80">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            placeholder='Type JSON command, e.g. {"cmd":"SET_PID","kp":2.5,"ki":0.4,"kd":0.8} or {"cmd":"RESET_FAULT"}'
            className="flex-1 bg-black/50 border border-gray-700/80 rounded px-3 py-1.5 text-xs font-mono text-cyan-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-xs flex items-center gap-1.5 font-semibold transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            TRANSMIT
          </button>
        </form>

        {/* Quick Command Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-mono text-gray-400">
          <span className="text-gray-500">QUICK PAYLOADS:</span>
          <button
            onClick={() => sendPreset({ cmd: 'SET_PID', kp: 2.5, ki: 0.4, kd: 0.8 })}
            className="px-2 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-purple-300"
          >
            SET_PID (Balanced)
          </button>
          <button
            onClick={() => sendPreset({ cmd: 'SET_SETPOINT', setpoint: 75.0 })}
            className="px-2 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-amber-300"
          >
            SET_SETPOINT (75°C)
          </button>
          <button
            onClick={() => sendPreset({ cmd: 'RESET_FAULT' })}
            className="px-2 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-emerald-300"
          >
            RESET_FAULT
          </button>
          <button
            onClick={() => sendPreset({ cmd: 'PING' })}
            className="px-2 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-cyan-300"
          >
            PING
          </button>
        </div>
      </div>
    </div>
  );
}
