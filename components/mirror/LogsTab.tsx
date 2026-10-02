'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LogsTabProps {
  id: string;
  rawLogs: string;
}

export function LogsTab({ id, rawLogs }: LogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [copied, setCopied] = useState(false);
  const [streamedLogs, setStreamedLogs] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Poll logs endpoint for real-time updates
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/mirror/${id}/logs`);
        if (res.ok) {
          const data = await res.json();
          if (data.logs && !cancelled) {
            setStreamedLogs(data.logs);
          }
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  const effectiveLogs = (streamedLogs && streamedLogs.length > (rawLogs || '').length) ? streamedLogs : rawLogs;

  // Parse lines into structured log items
  const logEntries = useMemo(() => {
    if (!effectiveLogs) return [];
    return effectiveLogs
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => {
        let level: 'info' | 'warn' | 'error' = 'info';
        const lower = line.toLowerCase();
        if (lower.includes('error') || lower.includes('failed') || lower.includes('fatal')) {
          level = 'error';
        } else if (lower.includes('warn') || lower.includes('timeout') || lower.includes('retry')) {
          level = 'warn';
        }

        // Try extracting timestamp if present
        let timestamp = '';
        let text = line;
        const timeMatch = line.match(/^\[?(20\d\d-[0-9TZ:.-]+|\d{2}:\d{2}:\d{2})\]?\s*/);
        if (timeMatch) {
          timestamp = timeMatch[1];
          text = line.substring(timeMatch[0].length);
        }

        return { id: idx, raw: line, text, level, timestamp };
      });
  }, [effectiveLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logEntries.filter((entry) => {
      const matchesLevel =
        levelFilter === 'all' || entry.level === levelFilter;
      const matchesSearch = entry.raw.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logEntries, levelFilter, searchQuery]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `/api/mirror/${id}/logs?download=true`;
    a.download = `webharvest-mirror-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 border border-border/70 rounded-xl p-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crawl logs..."
            className="pl-9 h-8 text-xs font-mono"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'info', label: 'Info' },
            { id: 'warn', label: 'Warnings' },
            { id: 'error', label: 'Errors' },
          ].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevelFilter(l.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer font-medium ${
                levelFilter === l.id
                  ? 'bg-muted text-foreground border border-border font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs gap-1.5 px-2.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-foreground" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8 text-xs gap-1.5 px-2.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Logs</span>
          </Button>
        </div>
      </div>

      {/* Log Console Container — fills remaining space */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs text-muted-foreground font-mono shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-foreground" />
            <span>Crawler Engine Execution Log</span>
          </div>
          <span>{filteredLogs.length} lines</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1 bg-black/40">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs font-sans">
              No log messages found for this filter.
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isError = entry.level === 'error';
              const isWarn = entry.level === 'warn';

              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2.5 text-[11px] hover:bg-white/[0.03] px-1 py-0.5 rounded transition-colors ${
                    isError
                      ? 'text-destructive'
                      : isWarn
                      ? 'text-amber-400'
                      : 'text-foreground/80'
                  }`}
                >
                  {entry.timestamp && (
                    <span className="text-muted-foreground/60 shrink-0 select-none">
                      {entry.timestamp}
                    </span>
                  )}
                  <span
                    className={`font-semibold shrink-0 uppercase text-[10px] px-1 py-0.2 rounded border select-none ${
                      isError
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : isWarn
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border-border/60 bg-muted text-muted-foreground'
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="break-all">{entry.text}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
