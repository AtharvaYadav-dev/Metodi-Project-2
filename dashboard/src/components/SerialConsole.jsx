/**
 * @file SerialConsole.jsx
 * @brief Live Raw JSON Serial Stream Inspector & Command Bridge
 * @details High-performance non-janking terminal monitor with:
 *          - Strictly isolated container scrollTop (zero scrollIntoView layout thrashing)
 *          - Intelligent user-scroll detection (auto-pauses when user scrolls up)
 *          - Fixed-size memory sliding window (max 80 entries)
 *          - Explicit Auto-Scroll pin toggle
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Play, Pause, Copy, Send, Check, ArrowDownCircle } from 'lucide-react';

export default function SerialConsole({ logs = [], onSendCommand, isHardwareMode }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [inputCmd, setInputCmd] = useState('');
  const [copied, setCopied] = useState(false);
  const terminalBoxRef = useRef(null);

  // Monitor user scrolling inside terminal container
  const handleScroll = useCallback(() => {
    if (!terminalBoxRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalBoxRef.current;
    // Pinned if within 32px of the bottom edge
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 32;
    setIsUserNearBottom(isAtBottom);
  }, []);

  // Safe auto-scroll: strictly target container.scrollTop, NEVER call scrollIntoView()
  useEffect(() => {
    if (autoScroll && !isPaused && isUserNearBottom && terminalBoxRef.current) {
      terminalBoxRef.current.scrollTop = terminalBoxRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused, isUserNearBottom]);

  const scrollToBottom = () => {
    if (terminalBoxRef.current) {
      terminalBoxRef.current.scrollTop = terminalBoxRef.current.scrollHeight;
      setIsUserNearBottom(true);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputCmd.trim()) return;
    try {
      const parsed = JSON.parse(inputCmd);
      onSendCommand(parsed);
      setInputCmd('');
    } catch {
      alert('Invalid JSON syntax. Ensure command is valid JSON object.');
    }
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
    <div className="w-full flex flex-col rounded-xl border border-gray-800/80 bg-[#090C15] p-2.5 shadow-xl backdrop-blur-md min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <h3 className="font-heading font-semibold text-gray-200 tracking-wider text-xs">
            LIVE RAW JSON TELEMETRY STREAM (10 Hz)
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {/* Scroll status indicator / Pin button */}
          {!isUserNearBottom && autoScroll && (
            <button
              onClick={scrollToBottom}
              className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 flex items-center gap-1 text-[10px] animate-pulse"
              title="Click to jump to latest telemetry packet"
            >
              <ArrowDownCircle className="h-2.5 w-2.5" />
              PIN TO BOTTOM
            </button>
          )}

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 border text-[10px] transition-colors ${
              isPaused
                ? 'bg-amber-950/60 border-amber-600 text-amber-300 font-bold'
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {isPaused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>

          <button
            onClick={copyLatest}
            className="px-1.5 py-0.5 rounded bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-300 flex items-center gap-1 text-[10px] transition-colors"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? 'COPIED' : 'COPY'}
          </button>

          <label className="flex items-center gap-1 cursor-pointer text-gray-400 select-none text-[10px] ml-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-cyan-400 rounded h-3 w-3 cursor-pointer"
            />
            AUTO-SCROLL
          </label>
        </div>
      </div>

      {/* Terminal Viewport: strictly isolated overflow-y-auto with min-h-0 */}
      <div
        ref={terminalBoxRef}
        onScroll={handleScroll}
        className="w-full h-32 md:h-36 bg-black/60 rounded-md p-2 overflow-y-auto font-mono text-[10.5px] leading-relaxed border border-gray-900 shadow-inner min-h-0 overscroll-contain"
      >
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
                className={`py-0.25 truncate px-1 rounded transition-colors ${
                  isFault
                    ? 'text-red-400 font-bold bg-red-950/20'
                    : isState2
                    ? 'text-amber-300'
                    : isState1
                    ? 'text-emerald-300'
                    : 'text-cyan-300/90'
                }`}
              >
                <span className="text-gray-600 mr-1.5 select-none text-[9.5px]">
                  {`[${String(idx + 1).padStart(3, '0')}]`}
                </span>
                {raw}
              </div>
            );
          })
        )}
      </div>

      {/* Command Bridge Input CLI */}
      <div className="mt-2 pt-1.5 border-t border-gray-800/80 flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-1.5">
          <input
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            placeholder='JSON cmd: {"cmd":"SET_PID","kp":2.5,"ki":0.4,"kd":0.8}'
            className="flex-1 bg-black/50 border border-gray-700/80 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-[11px] flex items-center gap-1 font-semibold transition-colors flex-shrink-0"
          >
            <Send className="h-3 w-3" />
            TX
          </button>
        </form>

        {/* Quick Command Presets */}
        <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[9.5px] font-mono text-gray-400">
          <span className="text-gray-500">PAYLOADS:</span>
          <button
            onClick={() => onSendCommand({ cmd: 'SET_PID', kp: 2.5, ki: 0.4, kd: 0.8 })}
            className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-purple-300"
          >
            SET_PID (Balanced)
          </button>
          <button
            onClick={() => onSendCommand({ cmd: 'SET_SETPOINT', setpoint: 75.0 })}
            className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-amber-300"
          >
            SETPOINT 75°C
          </button>
          <button
            onClick={() => onSendCommand({ cmd: 'RESET_FAULT' })}
            className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-emerald-300"
          >
            RESET_FAULT
          </button>
          <button
            onClick={() => onSendCommand({ cmd: 'PING' })}
            className="px-1.5 py-0.5 bg-gray-800/80 hover:bg-gray-700 rounded border border-gray-700 text-cyan-300"
          >
            PING
          </button>
        </div>
      </div>
    </div>
  );
}
