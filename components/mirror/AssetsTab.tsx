'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Grid,
  List,
  Image as ImageIcon,
  Palette,
  FileCode,
  Type,
  Video,
  Music,
  FileText,
  Box,
  ExternalLink,
  Download,
  Eye,
  CheckCircle2,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface AssetItem {
  name: string;
  path: string;
  type: 'image' | 'svg' | 'css' | 'js' | 'font' | 'video' | 'audio' | 'document' | '3d' | 'other';
  size: string;
  url?: string;
  hash?: string;
  status?: string;
  previewUrl?: string;
  metadata?: {
    dimensions?: string;
    fontFamily?: string;
    modelFormat?: string;
  };
}

interface AssetsTabProps {
  id: string;
  assets: AssetItem[];
}

type AssetCategory =
  | 'all'
  | 'image'
  | 'svg'
  | 'css'
  | 'js'
  | 'font'
  | 'video'
  | 'audio'
  | 'document'
  | '3d';

export function AssetsTab({ id, assets = [] }: AssetsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lightboxImage, setLightboxImage] = useState<AssetItem | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory =
        selectedCategory === 'all' || asset.type === selectedCategory;
      const matchesSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.url && asset.url.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [assets, selectedCategory, searchQuery]);

  // Single asset direct download
  const handleDownloadSingle = (asset: AssetItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = document.createElement('a');
    link.href = asset.previewUrl || `/api/mirror/${id}/preview/${asset.path}`;
    link.download = asset.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection for an asset
  const toggleSelectAsset = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Select all visible / deselect all
  const handleSelectAllVisible = () => {
    if (selectedPaths.size === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredAssets.map((a) => a.path)));
    }
  };

  // Batch download selected assets
  const handleDownloadBatch = (itemsToDownload: AssetItem[]) => {
    if (itemsToDownload.length === 0) return;
    setIsBatchDownloading(true);

    itemsToDownload.forEach((asset, idx) => {
      setTimeout(() => {
        handleDownloadSingle(asset);
        if (idx === itemsToDownload.length - 1) {
          setIsBatchDownloading(false);
        }
      }, idx * 200);
    });
  };

  // Download all images/SVGs in currently filtered view
  const handleDownloadAllImages = () => {
    const visualItems = filteredAssets.filter(
      (a) => a.type === 'image' || a.type === 'svg'
    );
    handleDownloadBatch(visualItems.length > 0 ? visualItems : filteredAssets);
  };

  const selectedCount = selectedPaths.size;
  const selectedItems = useMemo(
    () => assets.filter((a) => selectedPaths.has(a.path)),
    [assets, selectedPaths]
  );

  return (
    <div className="space-y-3 pb-6">
      {/* Top Categories Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-3 shadow-xs">
        {/* Categories Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
          {[
            { id: 'all', label: 'All', icon: Layers },
            { id: 'image', label: 'Images', icon: ImageIcon },
            { id: 'svg', label: 'SVG', icon: Box },
            { id: 'css', label: 'CSS', icon: Palette },
            { id: 'js', label: 'JavaScript', icon: FileCode },
            { id: 'font', label: 'Fonts', icon: Type },
            { id: 'video', label: 'Video', icon: Video },
            { id: 'audio', label: 'Audio', icon: Music },
            { id: 'document', label: 'Documents', icon: FileText },
            { id: '3d', label: '3D', icon: Box },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 font-medium shrink-0 ${
                  isSelected
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Action Buttons & Grid/List Toggle */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Batch Download / Quick Action buttons */}
          <button
            type="button"
            onClick={handleDownloadAllImages}
            disabled={isBatchDownloading || filteredAssets.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            title="Download all images and vectors in the current view"
          >
            {isBatchDownloading ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download All Images</span>
          </button>

          {/* Search box */}
          <div className="relative flex-1 sm:w-56 min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-9 h-8 text-xs font-mono"
            />
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-muted/40 border border-border rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-sm text-xs cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-sm text-xs cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Selection Batch Action Bar (Visible when items selected) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-foreground text-background text-xs font-mono shadow-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedCount}</span>
            <span>{selectedCount === 1 ? 'asset selected' : 'assets selected'}</span>
            <button
              type="button"
              onClick={() => setSelectedPaths(new Set())}
              className="underline opacity-80 hover:opacity-100 ml-2 cursor-pointer text-[11px]"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadBatch(selectedItems)}
              disabled={isBatchDownloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-background text-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Assets Display */}
      {filteredAssets.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-border/70 bg-card/40 text-xs text-muted-foreground font-mono">
          No assets discovered matching this category or search term.
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredAssets.map((asset, idx) => {
            const isVisual = asset.type === 'image' || asset.type === 'svg';
            const isSelected = selectedPaths.has(asset.path);
            const previewUrl =
              asset.previewUrl || `/api/mirror/${id}/preview/${asset.path}`;

            return (
              <div
                key={idx}
                onClick={() => isVisual && setLightboxImage(asset)}
                className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between group relative select-none ${
                  isSelected
                    ? 'border-foreground bg-muted/30 shadow-xs'
                    : 'border-border bg-card hover:border-foreground/40'
                } ${isVisual ? 'cursor-pointer' : ''}`}
              >
                {/* Select Checkbox (Top Left) */}
                <button
                  type="button"
                  onClick={(e) => toggleSelectAsset(asset.path, e)}
                  className={`absolute top-3.5 left-3.5 z-10 w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-background/80 hover:bg-background border border-border text-muted-foreground opacity-0 group-hover:opacity-100'
                  }`}
                  title={isSelected ? 'Deselect asset' : 'Select asset for batch download'}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                </button>

                {/* Direct Download Button (Top Right) */}
                <button
                  type="button"
                  onClick={(e) => handleDownloadSingle(asset, e)}
                  className="absolute top-3.5 right-3.5 z-10 w-6 h-6 rounded-md bg-background/90 dark:bg-zinc-900/90 hover:bg-background border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                  title={`Direct download: ${asset.name}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Visual Thumbnail */}
                <div className="w-full aspect-square rounded-lg bg-muted/40 border border-border/40 overflow-hidden flex items-center justify-center relative mb-2">
                  {isVisual ? (
                    <img
                      src={previewUrl}
                      alt={asset.name}
                      loading="lazy"
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : asset.type === 'css' ? (
                    <Palette className="w-8 h-8 text-blue-500/70" />
                  ) : asset.type === 'js' ? (
                    <FileCode className="w-8 h-8 text-amber-500/70" />
                  ) : asset.type === 'font' ? (
                    <Type className="w-8 h-8 text-purple-500/70" />
                  ) : asset.type === 'video' ? (
                    <Video className="w-8 h-8 text-rose-500/70" />
                  ) : asset.type === '3d' ? (
                    <Box className="w-8 h-8 text-foreground/70" />
                  ) : (
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  )}

                  {isVisual && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                      <Eye className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <div
                    className="font-mono text-xs text-foreground font-semibold truncate"
                    title={asset.name}
                  >
                    {asset.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mt-1">
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-muted/60 border border-border/50 font-semibold text-foreground/80">
                      {asset.type}
                    </span>
                    <span>{asset.size}</span>
                  </div>
                  {asset.metadata?.fontFamily && (
                    <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                      {asset.metadata.fontFamily}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/40 font-mono text-xs shadow-xs">
          <div className="px-4 py-2.5 bg-muted/40 font-semibold text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="w-1/3">Filename</span>
            <span className="w-24">Type</span>
            <span className="w-24">Size</span>
            <span className="w-32 hidden sm:inline">Path</span>
            <span className="w-24 text-right">Actions</span>
          </div>

          {filteredAssets.map((asset, idx) => (
            <div
              key={idx}
              className="px-4 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="w-1/3 truncate text-foreground flex items-center gap-2">
                <span className="truncate" title={asset.name}>
                  {asset.name}
                </span>
              </div>
              <div className="w-24 uppercase text-muted-foreground text-[10px]">
                {asset.type}
              </div>
              <div className="w-24 text-muted-foreground">{asset.size}</div>
              <div className="w-32 text-muted-foreground/60 text-[10px] truncate hidden sm:inline" title={asset.path}>
                {asset.path}
              </div>
              <div className="w-24 text-right flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(asset)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Download asset"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <a
                  href={asset.previewUrl || `/api/mirror/${id}/preview/${asset.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Open asset"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox Dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-mono truncate flex items-center justify-between pr-4">
            <span className="truncate">{lightboxImage?.name}</span>
            {lightboxImage && (
              <button
                type="button"
                onClick={() => handleDownloadSingle(lightboxImage)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-foreground text-background font-semibold cursor-pointer shrink-0 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {lightboxImage && (
          <div className="py-2 flex flex-col items-center">
            <div className="max-h-[70vh] max-w-full overflow-hidden rounded-lg bg-black/5 dark:bg-black/40 border border-border p-2 flex items-center justify-center">
              <img
                src={lightboxImage.previewUrl || `/api/mirror/${id}/preview/${lightboxImage.path}`}
                alt={lightboxImage.name}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />
            </div>

            <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
              <span>Size: {lightboxImage.size}</span>
              <span className="truncate max-w-[200px]">Path: {lightboxImage.path}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(lightboxImage)}
                  className="text-foreground hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Download File</span>
                </button>
                <a
                  href={lightboxImage.previewUrl || `/api/mirror/${id}/preview/${lightboxImage.path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground hover:underline flex items-center gap-1"
                >
                  <span>Full Resolution</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
