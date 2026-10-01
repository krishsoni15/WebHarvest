'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export interface NetworkRequestItem {
  id?: string;
  method: string;
  url: string;
  type: string;
  status: number;
  size: string;
  duration?: string;
  source?: string;
  timing?: {
    dns?: number;
    connect?: number;
    ttfb?: number;
    download?: number;
  };
}

interface NetworkTabProps {
  id: string;
  requests: NetworkRequestItem[];
}

type NetworkFilter =
  | 'all'
  | 'documents'
  | 'scripts'
  | 'images'
  | 'fonts'
  | 'media'
  | 'api'
  | 'third-party'
  | 'failed';

export function NetworkTab({ id, requests = [] }: NetworkTabProps) {
  const [filter, setFilter] = useState<NetworkFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequestItem | null>(null);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        req.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.type.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filter === 'documents') {
        matchesFilter = req.type.includes('html') || req.type.includes('doc');
      } else if (filter === 'scripts') {
        matchesFilter = req.type.includes('script') || req.type.includes('js');
      } else if (filter === 'images') {
        matchesFilter = req.type.includes('image') || req.type.includes('img') || req.type.includes('svg');
      } else if (filter === 'fonts') {
        matchesFilter = req.type.includes('font') || req.type.includes('woff');
      } else if (filter === 'media') {
        matchesFilter = req.type.includes('video') || req.type.includes('audio');
      } else if (filter === 'api') {
        matchesFilter = req.type.includes('json') || req.type.includes('xhr') || req.type.includes('fetch');
      } else if (filter === 'third-party') {
        matchesFilter = req.source === 'external' || req.type.includes('cdn');
      } else if (filter === 'failed') {
        matchesFilter = req.status >= 400 || req.status === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [requests, filter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 border border-border/70 rounded-xl p-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter network requests by URL or type..."
            className="pl-9 h-8 text-xs font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'documents', label: 'Documents' },
            { id: 'scripts', label: 'Scripts' },
            { id: 'images', label: 'Images' },
            { id: 'fonts', label: 'Fonts' },
            { id: 'media', label: 'Media' },
            { id: 'api', label: 'API' },
            { id: 'third-party', label: 'Third-party' },
            { id: 'failed', label: 'Failed' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shrink-0 font-medium ${
                filter === f.id
                  ? 'bg-muted text-foreground border border-border font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] text-muted-foreground">
                <th className="py-2.5 px-3 w-16">Method</th>
                <th className="py-2.5 px-3">URL</th>
                <th className="py-2.5 px-3 w-28">Type</th>
                <th className="py-2.5 px-3 w-20">Status</th>
                <th className="py-2.5 px-3 w-24">Size</th>
                <th className="py-2.5 px-3 w-24">Duration</th>
                <th className="py-2.5 px-3 w-28">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-sans">
                    No network requests matched your current criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => {
                  const isOk = req.status >= 200 && req.status < 300;
                  const isRedirect = req.status >= 300 && req.status < 400;
                  const isError = req.status >= 400 || req.status === 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedRequest(req)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 text-muted-foreground font-medium">
                        {req.method}
                      </td>
                      <td className="py-2 px-3 max-w-md truncate text-foreground/90 group-hover:text-foreground">
                        {req.url}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground truncate">
                        {req.type}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            isOk
                              ? 'text-foreground font-semibold'
                              : isRedirect
                              ? 'text-muted-foreground font-semibold'
                              : 'text-destructive font-semibold'
                          }`}
                        >
                          {req.status || 'ERR'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{req.size}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {req.duration || '24ms'}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground/80">
                        {req.source || 'internal'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Timing / Inspector Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-mono truncate">
            <Activity className="w-4 h-4 text-foreground" />
            Request Details
          </DialogTitle>
          <DialogDescription className="text-xs truncate font-mono">
            {selectedRequest?.url}
          </DialogDescription>
        </DialogHeader>

        {selectedRequest && (
          <div className="py-3 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border/70 bg-background/50 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground block">Method</span>
                <span className="font-semibold text-foreground">{selectedRequest.method}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status</span>
                <span className="font-semibold text-foreground">{selectedRequest.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">MIME Type</span>
                <span className="text-foreground">{selectedRequest.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Transferred Size</span>
                <span className="text-foreground">{selectedRequest.size}</span>
              </div>
            </div>

            {/* Timing Breakdown */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase font-mono mb-2">
                Timing Breakdown
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">DNS Lookup</span>
                  <span>{selectedRequest.timing?.dns || 4} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Initial Connection</span>
                  <span>{selectedRequest.timing?.connect || 12} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Waiting (TTFB)</span>
                  <span>{selectedRequest.timing?.ttfb || 18} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Content Download</span>
                  <span>{selectedRequest.timing?.download || 8} ms</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
