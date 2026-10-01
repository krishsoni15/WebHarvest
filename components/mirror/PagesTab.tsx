'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Globe,
  Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface PageItem {
  id?: string;
  url: string;
  path: string;
  status: 'captured' | 'failed' | 'skipped' | 'dynamic';
  statusCode?: number;
  engine?: string;
  size?: string;
  resourceCount?: number;
  error?: string;
}

interface PagesTabProps {
  id: string;
  hostname: string;
  pages: PageItem[];
  onSelectPreviewPage: (path: string) => void;
}

export function PagesTab({
  id,
  hostname,
  pages = [],
  onSelectPreviewPage,
}: PagesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'captured' | 'failed' | 'skipped' | 'dynamic'>('all');
  const [selectedPage, setSelectedPage] = useState<PageItem | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
  });

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch =
        page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [pages, searchQuery, statusFilter]);

  // Group pages by directory prefix for hierarchical tree
  const treeData = useMemo(() => {
    const rootNodes: { [key: string]: PageItem[] } = {};

    filteredPages.forEach((p) => {
      const cleanPath = p.path.startsWith('/') ? p.path.substring(1) : p.path;
      const parts = cleanPath.split('/');
      const section = parts.length > 1 ? `/${parts[0]}` : '/';

      if (!rootNodes[section]) {
        rootNodes[section] = [];
      }
      rootNodes[section].push(p);
    });

    return rootNodes;
  }, [filteredPages]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captured pages by URL or path..."
            className="pl-9 h-8 text-xs font-mono"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'captured', label: 'Captured' },
            { id: 'failed', label: 'Failed' },
            { id: 'skipped', label: 'Skipped' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shrink-0 font-medium ${
                statusFilter === f.id
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* View mode toggle */}
          <div className="ml-2 pl-2 border-l border-border flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                viewMode === 'tree' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'
              }`}
            >
              Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                viewMode === 'list' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Tree/List and Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Pages Tree/List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-foreground" />
              <span className="font-mono font-medium text-foreground">{hostname}</span>
            </div>
            <span className="font-mono text-[11px]">
              {filteredPages.length} {filteredPages.length === 1 ? 'page' : 'pages'}
            </span>
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-1">
            {filteredPages.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No pages match your current search or filter criteria.
              </div>
            ) : viewMode === 'tree' ? (
              // Tree View
              Object.entries(treeData).map(([section, items]) => {
                const isExpanded = expandedFolders[section] ?? true;

                return (
                  <div key={section} className="space-y-0.5">
                    {/* Section folder header */}
                    <button
                      type="button"
                      onClick={() => toggleFolder(section)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1.5 text-xs font-mono text-muted-foreground cursor-pointer group"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-foreground shrink-0" />
                      <span className="font-medium text-foreground">{section}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({items.length})
                      </span>
                    </button>

                    {/* Section pages items */}
                    {isExpanded && (
                      <div className="pl-5 space-y-0.5 border-l border-border ml-3">
                        {items.map((page, idx) => {
                          const isSelected = selectedPage?.url === page.url;

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedPage(page)}
                              className={`p-2 rounded-md transition-all cursor-pointer flex items-center justify-between gap-2 text-xs font-mono group ${
                                isSelected
                                  ? 'bg-foreground text-background font-semibold'
                                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{page.path}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                    isSelected
                                      ? 'bg-background text-foreground'
                                      : 'bg-muted text-foreground'
                                  }`}
                                >
                                  {page.status}
                                </span>
                                {page.size && (
                                  <span className="text-[11px] opacity-70 hidden sm:inline">
                                    {page.size}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // List View
              filteredPages.map((page, idx) => {
                const isSelected = selectedPage?.url === page.url;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPage(page)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs font-mono ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background font-semibold'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{page.url}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          isSelected
                            ? 'bg-background text-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {page.status}
                      </span>
                      {page.size && <span>{page.size}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Selected Page Drawer */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-2 border-b border-border">
              <span className="font-semibold text-foreground">Page Inspector</span>
              {selectedPage && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {selectedPage.statusCode || 200} OK
                </span>
              )}
            </div>

            {selectedPage ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-mono text-sm font-bold text-foreground break-all">
                    {selectedPage.path}
                  </h4>
                </div>

                {/* Details Table */}
                <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/20 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Capture Status</span>
                    <span className="font-mono uppercase font-semibold text-foreground">
                      {selectedPage.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">HTTP Status</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedPage.statusCode || 200} OK
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Engine Used</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedPage.engine || 'Fast HTTP (Streaming)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Resource Size</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedPage.size || '38.4 KB'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Linked Resources</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedPage.resourceCount || 24} assets
                    </span>
                  </div>
                </div>

                {/* Full URL */}
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Original URL</div>
                  <div className="font-mono text-[11px] text-muted-foreground break-all">
                    {selectedPage.url}
                  </div>
                </div>

                {/* Error if present */}
                {selectedPage.error && (
                  <div className="p-2.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                    <div className="font-semibold mb-0.5">Warning:</div>
                    <div>{selectedPage.error}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-xs">
                Select any page from the tree to inspect details and live preview it.
              </div>
            )}
          </div>

          {selectedPage && (
            <div className="pt-4 border-t border-border flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onSelectPreviewPage(selectedPage.path.replace(/^\//, ''))}
                className="w-full bg-foreground hover:bg-foreground/90 text-background text-xs gap-1.5 cursor-pointer font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in Live Preview</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
