'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  X,
  Minus,
  Maximize2,
  Copy,
  Check,
  Trash2,
  Search,
  ArrowDown,
} from 'lucide-react';

interface DraggableTerminalProps {
  open: boolean;
  onClose: () => void;
  logs: string;
  jobId: string;
  hostname?: string;
  isCrawling?: boolean;
  onClearLogs?: () => void;
}

export function DraggableTerminal({
  open,
  onClose,
  logs = '',
  jobId,
  hostname = 'target.com',
  isCrawling = false,
  onClearLogs,
}: DraggableTerminalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [internalCleared, setInternalCleared] = useState(false);
  const [streamedLogs, setStreamedLogs] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Drag state kept in refs to avoid re-renders during dragging
  const posRef = useRef({ x: -1, y: -1 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Initialize position once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && posRef.current.x === -1) {
      posRef.current = {
        x: Math.max(20, window.innerWidth - 680),
        y: Math.max(60, window.innerHeight - 520),
      };
    }
  }, []);

  // Direct DOM transform for zero-lag dragging
  const applyPosition = useCallback(() => {
    if (containerRef.current && !isMaximized) {
      containerRef.current.style.left = `${posRef.current.x}px`;
      containerRef.current.style.top = `${posRef.current.y}px`;
    }
  }, [isMaximized]);

  // Apply initial position when terminal opens
  useEffect(() => {
    if (open && !isMinimized && !isMaximized) {
      requestAnimationFrame(applyPosition);
    }
  }, [open, isMinimized, isMaximized, applyPosition]);

  // Mouse handlers using refs + rAF for perfectly smooth dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    posRef.current = {
      x: Math.max(10, Math.min(window.innerWidth - 320, e.clientX - dragOffsetRef.current.x)),
      y: Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y)),
    };
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.style.left = `${posRef.current.x}px`;
        containerRef.current.style.top = `${posRef.current.y}px`;
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    if (isMaximized) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isMaximized, handleMouseMove, handleMouseUp]);

  // Real-time log polling during active crawl
  useEffect(() => {
    if (!isCrawling || !open || !jobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/mirror/${jobId}/logs`);
        if (res.ok) {
          const data = await res.json();
          if (data.logs && !cancelled) {
            setStreamedLogs(data.logs);
          }
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isCrawling, open, jobId]);

  // Merge passed logs with streamed logs
  const effectiveLogs = (streamedLogs && streamedLogs.length > (logs || '').length) ? streamedLogs : logs;

  // Auto-scroll to bottom as new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isMinimized && open) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [effectiveLogs, autoScroll, isMinimized, open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInternalCleared(true);
    setStreamedLogs('');
    if (onClearLogs) onClearLogs();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!open) return null;

  const rawLogLines = internalCleared ? [] : effectiveLogs ? effectiveLogs.split('\n').filter(l => l.trim()) : [];
  const filteredLines = searchFilter
    ? rawLogLines.filter((line) => line.toLowerCase().includes(searchFilter.toLowerCase()))
    : rawLogLines;

  // Minimized pill
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        style={{
          left: `${posRef.current.x}px`,
          top: `${posRef.current.y}px`,
          position: 'fixed',
          zIndex: 9999,
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/95 border border-zinc-800 shadow-2xl text-zinc-200 text-xs font-mono cursor-grab select-none animate-in fade-in zoom-in-95"
        onMouseDown={handleMouseDown}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-semibold text-zinc-200">
          Terminal ({rawLogLines.length})
        </span>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors ml-1 cursor-pointer"
          title="Restore Terminal"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
          title="Close Terminal"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={
        isMaximized
          ? {
              position: 'fixed',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              zIndex: 9999,
              width: 'calc(100vw - 40px)',
              height: 'calc(100vh - 40px)',
            }
          : {
              position: 'fixed',
              left: `${posRef.current.x}px`,
              top: `${posRef.current.y}px`,
              width: '640px',
              maxWidth: 'calc(100vw - 32px)',
              height: '460px',
              maxHeight: 'calc(100vh - 64px)',
              zIndex: 9999,
            }
      }
      className="flex flex-col rounded-xl bg-zinc-950/95 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-md select-none"
    >
      {/* Title Bar (Drag Handle) */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between cursor-grab shrink-0 active:cursor-grabbing"
      >
        {/* macOS Style Traffic Dots */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer group"
            title="Close"
          >
            <X className="w-2 h-2 text-red-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center transition-colors cursor-pointer group"
            title="Minimize"
          >
            <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center transition-colors cursor-pointer group"
            title={isMaximized ? 'Restore size' : 'Maximize'}
          >
            <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Window Title */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 pointer-events-none">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200">
            webharvest: stream-logs
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            PID:{jobId.slice(0, 8)}
          </span>
          {isCrawling && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Copy Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Clear Terminal View"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar / Search Filter */}
      <div className="px-3 py-1.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center justify-between gap-2 text-xs font-mono shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3 h-3 absolute left-2 top-2 text-zinc-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter terminal logs..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded pl-7 pr-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
              autoScroll
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowDown className="w-2.5 h-2.5" />
            <span>Auto-scroll</span>
          </button>

          <span className="text-[10px] text-zinc-500">
            {filteredLines.length} {filteredLines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </div>

      {/* Terminal Monospace Content */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-300 space-y-0.5 bg-zinc-950/90 select-text min-h-0">
        {filteredLines.length === 0 ? (
          <div className="py-12 text-center text-zinc-600">
            {rawLogLines.length === 0
              ? 'No crawl logs recorded yet. Logs will stream in real-time as pages and assets are discovered.'
              : 'No log entries match the search filter.'}
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            let color = 'text-zinc-300';
            if (line.includes('[ERROR]') || line.toLowerCase().includes('failed') || line.toLowerCase().includes('error')) {
              color = 'text-rose-400';
            } else if (line.includes('[SUCCESS]') || line.toLowerCase().includes('completed') || line.toLowerCase().includes('saved')) {
              color = 'text-emerald-400';
            } else if (line.includes('[WARN]') || line.toLowerCase().includes('warning') || line.toLowerCase().includes('retry')) {
              color = 'text-amber-400';
            } else if (line.includes('[PLAYWRIGHT]') || line.includes('[BROWSER]')) {
              color = 'text-purple-400';
            } else if (line.includes('[FETCH]') || line.includes('[HTTP]')) {
              color = 'text-sky-400';
            } else if (line.includes('[PAGE]') || line.includes('[DISCOVERED]') || line.includes('[CRAWL]')) {
              color = 'text-indigo-400';
            } else if (line.includes('[AUTH]')) {
              color = 'text-amber-300';
            } else if (line.includes('[ASSETS]') || line.includes('[SAVED]')) {
              color = 'text-cyan-400';
            }

            return (
              <div key={idx} className={`font-mono flex items-start gap-2 hover:bg-zinc-900/60 px-1 py-0.5 rounded transition-colors ${color}`}>
                <span className="select-none text-zinc-600 text-[10px] w-6 text-right shrink-0">
                  {idx + 1}
                </span>
                <span className="break-all whitespace-pre-wrap flex-1">{line}</span>
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Terminal Status Footer */}
      <div className="px-3 py-1.5 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>Target: {hostname}</span>
          <span>•</span>
          <span>Status: {isCrawling ? 'Crawling Active' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-600">UTF-8</span>
          <span>•</span>
          <span className="text-emerald-500 font-semibold">WebHarvest V3</span>
        </div>
      </div>
    </div>
  );
}
