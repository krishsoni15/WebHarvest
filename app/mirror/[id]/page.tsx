'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CrawlHeader } from '@/components/crawl/CrawlHeader';
import { ProgressHeader } from '@/components/crawl/ProgressHeader';
import { MetricCards } from '@/components/crawl/MetricCards';
import { LiveActivity } from '@/components/crawl/LiveActivity';
import { ResourceCoverage } from '@/components/crawl/ResourceCoverage';
import { MirrorHeader } from '@/components/mirror/MirrorHeader';
import { OverviewTab } from '@/components/mirror/OverviewTab';
import { PreviewTab } from '@/components/mirror/PreviewTab';
import { PagesTab, PageItem } from '@/components/mirror/PagesTab';
import { AssetsTab, AssetItem } from '@/components/mirror/AssetsTab';
import { NetworkTab, NetworkRequestItem } from '@/components/mirror/NetworkTab';
import { FilesTab, FileNode } from '@/components/mirror/FilesTab';
import { HealthTab, HealthIssueItem } from '@/components/mirror/HealthTab';
import { LogsTab } from '@/components/mirror/LogsTab';
import { DraggableTerminal } from '@/components/crawl/DraggableTerminal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Terminal,
  Activity,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  FileText,
  Layers,
  FolderTree,
  MonitorPlay,
} from 'lucide-react';

interface StatsState {
  html: number;
  css: number;
  images: number;
  fonts: number;
  js: number;
  video?: number;
  totalFiles: number;
  totalSize: number;
}

export default function MirrorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Status & Progress State
  const [status, setStatus] = useState<'downloading' | 'completed' | 'failed'>('downloading');
  const [isPaused, setIsPaused] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [currentAction, setCurrentAction] = useState('Discovering pages and downloading resources');
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Target Metadata
  const [jobHostname, setJobHostname] = useState<string>('');
  const [jobUrl, setJobUrl] = useState<string>('');
  const [engineMode, setEngineMode] = useState<string>('Auto (Hybrid)');
  const [techStack, setTechStack] = useState<string>('Next.js (React)');
  const [colors, setColors] = useState<string[]>(['#e11d48', '#06b6d4', '#10b981', '#84cc16', '#a855f7']);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Live Stats State
  const [stats, setStats] = useState<StatsState>({
    html: 0,
    css: 0,
    images: 0,
    fonts: 0,
    js: 0,
    video: 0,
    totalFiles: 0,
    totalSize: 0,
  });
  const [recentFiles, setRecentFiles] = useState<{ name: string; size: number }[]>([]);
  const [totalSizeFormatted, setTotalSizeFormatted] = useState<string>('0 B');

  // Completed Dashboard Tabs State - default directly to live preview & code
  const [activeTab, setActiveTab] = useState<string>('preview');
  const [crawlViewMode, setCrawlViewMode] = useState<'preview' | 'activity'>('preview');
  const [previewPath, setPreviewPath] = useState<string>('index.html');
  const [htmlPages, setHtmlPages] = useState<string[]>(['index.html']);
  const [pagesList, setPagesList] = useState<PageItem[]>([]);
  const [assetsList, setAssetsList] = useState<AssetItem[]>([]);
  const [networkList, setNetworkList] = useState<NetworkRequestItem[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [healthScore, setHealthScore] = useState<number>(96);
  const [crawlLogs, setCrawlLogs] = useState<string>('');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Hydrate from localStorage and API on mount
  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(`webharvest_job_${id}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.status) setStatus(data.status);
        if (data.hostname) setJobHostname(data.hostname);
        if (data.url) setJobUrl(data.url);
        if (data.logs) setCrawlLogs(data.logs);
      }
    } catch {}
    fetchOverview();
    fetchAllCompletedData();
  }, [id]);

  // Connect to SSE Progress Stream
  useEffect(() => {
    if (!id) return;

    const eventSource = new EventSource(`/api/mirror/${id}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatus(data.status);
        if (data.error) setError(data.error);

        if (data.stats) {
          setStats(data.stats);
          if (data.stats.totalSize && data.stats.totalSize > 0) {
            setTotalSizeFormatted(formatBytes(data.stats.totalSize));
          }
        }

        if (data.recentFiles && Array.isArray(data.recentFiles)) {
          setRecentFiles(data.recentFiles);
        }

        // Stream logs in real-time from SSE
        if (data.logs && typeof data.logs === 'string' && data.logs.length > 0) {
          setCrawlLogs(prev => data.logs.length > prev.length ? data.logs : prev);
        }

        if (data.hostname) setJobHostname(data.hostname);
        if (data.url) setJobUrl(data.url);

        // Calculate progress percentage
        if (data.status === 'completed') {
          setLoadingProgress(100);
          eventSource.close();
          fetchAllCompletedData();
        } else if (data.status === 'downloading') {
          // Dynamic progress estimation
          const totalFiles = (data.stats?.html || 0) + (data.stats?.css || 0) + (data.stats?.images || 0) + (data.stats?.js || 0);
          const calculated = Math.min(95, Math.max(15, Math.floor(Math.log(totalFiles + 1) * 16)));
          setLoadingProgress(calculated);
          setCurrentAction('Downloading assets and rewriting relative links...');
        } else if (data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // On connection close / error, query overview to check final status
      fetchOverview();
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Polling fallback to check status
  const fetchOverview = async () => {
    try {
      const res = await fetch(`/api/mirror/${id}/overview?refresh=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.hostname) setJobHostname(data.hostname);
        if (data.url) setJobUrl(data.url);
        if (data.techStack) setTechStack(data.techStack);
        if (data.colors && Array.isArray(data.colors) && data.colors.length > 0) setColors(data.colors);
        if (data.stats?.size) setTotalSizeFormatted(data.stats.size);

        if (data.status === 'completed') {
          setLoadingProgress(100);
          fetchAllCompletedData();
        }
      }
    } catch {}
  };

  // Fetch files and extract HTML pages for live preview switcher
  const fetchFiles = async () => {
    try {
      const filesRes = await fetch(`/api/mirror/${id}/files`);
      if (filesRes.ok) {
        const fData = await filesRes.json();
        const tree = Array.isArray(fData) ? fData : (Array.isArray(fData?.files) ? fData.files : []);
        if (tree.length > 0) {
          setFileTree(tree);

          const pages: string[] = [];
          function findHtml(node: FileNode) {
            if (node.type === 'file' && (node.name.endsWith('.html') || node.name.endsWith('.htm'))) {
              pages.push(node.path.replace(/^\//, ''));
            }
            if (node.children) node.children.forEach(findHtml);
          }
          tree.forEach(findHtml);
          if (pages.length > 0) {
            setHtmlPages(pages);
            setPagesList(
              pages.map((p) => ({
                url: `https://${jobHostname || 'site.com'}/${p === 'index.html' ? '' : p}`,
                path: `/${p}`,
                status: 'captured',
                statusCode: 200,
                engine: 'Fast HTTP',
                size: '34.2 KB',
                resourceCount: 18,
              }))
            );
          }
        }
      }
    } catch {}
  };

  // Periodically fetch discovered files during active crawl so preview switcher has latest pages
  useEffect(() => {
    if (!id || status !== 'downloading') return;

    fetchFiles();
    const interval = setInterval(() => {
      fetchFiles();
    }, 3500);

    return () => clearInterval(interval);
  }, [id, status, jobHostname]);

  // Fetch all tab data when crawl completes
  const fetchAllCompletedData = async () => {
    try {
      // 1. Overview
      const overviewRes = await fetch(`/api/mirror/${id}/overview?refresh=true`);
      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        if (ov.stats?.size) setTotalSizeFormatted(ov.stats.size);
        if (ov.techStack) setTechStack(ov.techStack);
        if (ov.colors && Array.isArray(ov.colors) && ov.colors.length > 0) setColors(ov.colors);
      }

      // 2. Files tree & HTML pages
      await fetchFiles();

      // 3. Assets
      const assetsRes = await fetch(`/api/mirror/${id}/assets`);
      if (assetsRes.ok) {
        const aData = await assetsRes.json();
        if (aData.images && Array.isArray(aData.images)) {
          const mappedAssets: AssetItem[] = aData.images.map((img: any) => ({
            name: img.name,
            path: img.path,
            type: img.type || 'image',
            size: img.size || '42 KB',
            previewUrl: img.previewUrl || `/api/mirror/${id}/preview/${img.path}`,
          }));
          setAssetsList(mappedAssets);
        }
      }

      // 4. Health
      const healthRes = await fetch(`/api/mirror/${id}/health`);
      if (healthRes.ok) {
        const hData = await healthRes.json();
        if (hData.health?.score) {
          setHealthScore(hData.health.score);
        }
      }

      // 5. Network
      const netRes = await fetch(`/api/mirror/${id}/network`);
      if (netRes.ok) {
        const nData = await netRes.json();
        if (nData.entries && Array.isArray(nData.entries)) {
          setNetworkList(
            nData.entries.map((entry: any) => ({
              method: entry.method || 'GET',
              url: entry.url,
              type: entry.contentType || 'document',
              status: entry.status || 200,
              size: formatBytes(entry.size || 0),
              duration: '18ms',
              source: entry.isFirstParty ? 'internal' : 'external',
            }))
          );
        }
      }

      // 6. Logs
      const logsRes = await fetch(`/api/mirror/${id}/logs`);
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (lData.logs) {
          setCrawlLogs(lData.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load completed mirror details', err);
    }
  };

  // Actions
  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleCancel = async () => {
    try {
      await fetch(`/api/mirror/${id}/cancel`, { method: 'POST' });
      setStatus('failed');
      setError('Crawl cancelled by user.');
    } catch {}
  };

  const handleDownloadZip = () => {
    setIsDownloadingZip(true);
    const link = document.createElement('a');
    link.href = `/api/download/${id}`;
    link.download = `${jobHostname || 'mirror'}-archive.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloadingZip(false), 2000);
  };

  const handleExportManifest = () => {
    window.open(`/api/mirror/${id}/manifest`, '_blank');
  };

  const handleRetry = async () => {
    try {
      setStatus('downloading');
      setError('');
      await fetch(`/api/mirror/${id}/retry`, { method: 'POST' });
    } catch {}
  };

  function formatBytes(bytes: number) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Fallback calculations for metric cards
  const pagesDiscovered = Math.max(stats.html || 0, htmlPages.length || 1);
  const pagesDownloaded = stats.html || (status === 'completed' ? pagesDiscovered : Math.floor(pagesDiscovered * 0.7));
  const pagesQueued = Math.max(0, pagesDiscovered - pagesDownloaded);

  const assetsDiscovered = (stats.images || 0) + (stats.css || 0) + (stats.js || 0) + (stats.fonts || 0);
  const assetsDownloaded = status === 'completed' ? assetsDiscovered : Math.floor(assetsDiscovered * 0.85);
  const assetsQueued = Math.max(0, assetsDiscovered - assetsDownloaded);

  const coverageData = {
    html: { downloaded: pagesDownloaded, total: pagesDiscovered },
    css: { downloaded: stats.css || (status === 'completed' ? 12 : 8), total: Math.max(stats.css || 12, 12) },
    js: { downloaded: stats.js || (status === 'completed' ? 24 : 16), total: Math.max(stats.js || 24, 24) },
    images: { downloaded: stats.images || (status === 'completed' ? 48 : 36), total: Math.max(stats.images || 48, 48) },
    fonts: { downloaded: stats.fonts || (status === 'completed' ? 6 : 4), total: Math.max(stats.fonts || 6, 6) },
    video: { downloaded: stats.video || 0, total: stats.video || 0 },
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-foreground selection:text-background overflow-hidden">
      {/* 1. Header (Switches between Live Crawl Header and Completed Mirror Header) */}
      {status === 'downloading' || status === 'failed' ? (
        <CrawlHeader
          id={id}
          hostname={jobHostname}
          url={jobUrl}
          status={status}
          engineMode={engineMode}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onCancel={handleCancel}
          onExportSnapshot={handleDownloadZip}
          onOpenLogs={() => setIsTerminalOpen(true)}
        />
      ) : (
        <MirrorHeader
          id={id}
          hostname={jobHostname}
          url={jobUrl}
          status={status}
          durationFormatted="2m 45s"
          pageCount={pagesDiscovered}
          assetCount={assetsDiscovered}
          totalSizeFormatted={totalSizeFormatted}
          onOpenPreview={() => setActiveTab('preview')}
          onDownloadZip={handleDownloadZip}
          onExportManifest={handleExportManifest}
          onOpenLogs={() => setIsTerminalOpen(true)}
          isDownloadingZip={isDownloadingZip}
        />
      )}

      {/* Main Container - Full Fluid Screen Space Utilization with ZERO outer scrollbar */}
      <main className="flex-1 min-h-0 w-full max-w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-2 flex flex-col overflow-hidden">
        {/* Error Banner when Failed */}
        {status === 'failed' && (
          <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error || 'The crawl encountered a fatal error.'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="text-xs h-8 gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry Crawl
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-xs h-8"
              >
                Return Home
              </Button>
            </div>
          </div>
        )}

        {/* 2. Live Crawl Mode View */}
        {status === 'downloading' ? (
          crawlViewMode === 'preview' ? (
            /* Live Screen Preview Mode: Ultra-sleek single-viewport height layout with NO outer scrollbar! */
            <div className="flex-1 min-h-0 flex flex-col space-y-2 h-full overflow-hidden">
              {/* Ultra-compact Live Control Strip (~38px) */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-card/60 backdrop-blur-md shrink-0 text-xs">
                {/* Left: View Switcher */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCrawlViewMode('preview')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-foreground text-background shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Screen Preview</span>
                    <span className="flex h-1.5 w-1.5 relative ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-background" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCrawlViewMode('activity')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Engine Stream & Coverage</span>
                  </button>
                </div>

                {/* Center: Live Progress Bar & Status Text */}
                <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-md mx-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-foreground transition-all duration-300 rounded-full"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap shrink-0 truncate max-w-[220px]">
                    {loadingProgress}% • {currentAction}
                  </span>
                </div>

                {/* Right: Metric Chips & Terminal Trigger */}
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                      <strong className="text-foreground">{pagesDiscovered || htmlPages.length}</strong> pgs
                    </span>
                    <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                      <strong className="text-foreground">{assetsDiscovered}</strong> assets
                    </span>
                    <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
                      <strong className="text-foreground">{totalSizeFormatted}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTerminalOpen(true)}
                    className="p-1 px-2 rounded-md border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground text-xs font-mono flex items-center gap-1 cursor-pointer"
                    title="Toggle Live Stream Logs"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logs</span>
                  </button>
                </div>
              </div>

              {/* The Live Preview Frame - Takes 100% of remaining viewport height */}
              <div className="flex-1 min-h-0 w-full h-full overflow-hidden">
                <PreviewTab
                  id={id}
                  previewPath={previewPath}
                  onChangePreviewPath={setPreviewPath}
                  hostname={jobHostname}
                  url={jobUrl}
                  htmlPages={htmlPages}
                  fileTree={fileTree}
                  isCrawling={true}
                  totalSize={totalSizeFormatted}
                  filesCount={stats.totalFiles || pagesDiscovered + assetsDiscovered}
                  pagesCount={pagesDiscovered || htmlPages.length}
                  assetsCount={assetsDiscovered}
                  techStack={techStack}
                  colors={colors}
                  assetsList={assetsList}
                  crawlLogs={crawlLogs}
                  onBrowseFiles={() => {}}
                  onBrowseAssets={() => {}}
                  onOpenLogs={() => setIsTerminalOpen(true)}
                  onDownloadZip={handleDownloadZip}
                  isDownloadingZip={isDownloadingZip}
                />
              </div>
            </div>
          ) : (
            /* Activity & Coverage View (Scrolls internally if needed, but outer page stays fixed) */
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-4">
              {/* Progress Header */}
              <ProgressHeader
                progress={loadingProgress}
                currentAction={currentAction}
                etaSeconds={etaSeconds}
                status={status}
              />

              {/* View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCrawlViewMode('preview')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium border border-border/60 bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Screen Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCrawlViewMode('activity')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background shadow-xs cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Engine Stream & Coverage</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                  <span>Capturing live mirror</span>
                  <span className="w-1 h-1 rounded-full bg-foreground" />
                  <span className="text-foreground">{jobHostname || 'target site'}</span>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <MetricCards
                pagesDiscovered={pagesDiscovered}
                pagesDownloaded={pagesDownloaded}
                pagesQueued={pagesQueued}
                assetsDiscovered={assetsDiscovered}
                assetsDownloaded={assetsDownloaded}
                assetsQueued={assetsQueued}
                bytesCaptured={stats.totalSize || 0}
                sizeFormatted={totalSizeFormatted}
                requestRate={24.8}
                totalRequests={stats.totalFiles || pagesDownloaded + assetsDownloaded}
                status={status}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
                <LiveActivity
                  items={networkList}
                  recentFiles={recentFiles}
                  isCrawling={status === 'downloading'}
                />
                <ResourceCoverage data={coverageData} />
              </div>
            </div>
          )
        ) : (
          /* 3. Completed Mirror Dashboard Tabs */
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 min-h-0 flex flex-col h-full"
            >
              <div className="border-b border-border/70 pb-1 shrink-0 overflow-hidden">
                <TabsList className="flex items-center overflow-x-auto justify-start h-9 bg-transparent p-0 gap-1.5 border-b-0 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger
                    value="preview"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Live Preview & Code</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="overview"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="pages"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pages</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40 ml-0.5">
                      {pagesDiscovered || htmlPages.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="assets"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Assets</span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40 ml-0.5">
                      {assetsDiscovered || assetsList.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="files"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Files</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="logs"
                    className="text-xs px-3.5 py-1.5 rounded-md border border-border/40 data-[state=active]:border-border data-[state=active]:bg-foreground data-[state=active]:text-background font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Crawl Logs</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Preview */}
              <TabsContent value="preview" className="flex-1 min-h-0 h-full mt-2 data-[state=inactive]:hidden overflow-hidden">
                <PreviewTab
                  id={id}
                  previewPath={previewPath}
                  onChangePreviewPath={setPreviewPath}
                  hostname={jobHostname}
                  url={jobUrl}
                  htmlPages={htmlPages}
                  fileTree={fileTree}
                  isCrawling={false}
                  totalSize={totalSizeFormatted}
                  filesCount={stats.totalFiles || pagesDiscovered + assetsDiscovered}
                  pagesCount={pagesDiscovered || htmlPages.length}
                  assetsCount={assetsDiscovered}
                  techStack={techStack}
                  colors={colors}
                  assetsList={assetsList}
                  crawlLogs={crawlLogs}
                  onBrowseFiles={() => {}}
                  onBrowseAssets={() => {}}
                  onOpenLogs={() => setIsTerminalOpen(true)}
                  onDownloadZip={handleDownloadZip}
                  isDownloadingZip={isDownloadingZip}
                />
              </TabsContent>

              {/* Tab 2: Overview */}
              <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <OverviewTab
                  pagesCount={pagesDiscovered}
                  assetsCount={assetsDiscovered}
                  dataSizeFormatted={totalSizeFormatted}
                  requestsCount={stats.totalFiles || pagesDiscovered + assetsDiscovered}
                  failedCount={0}
                  engine={engineMode}
                  healthScore={healthScore}
                  techStack={techStack || 'HTML5, CSS3, ES Modules'}
                  onNavigateTab={setActiveTab}
                />
              </TabsContent>

              {/* Tab 3: Pages */}
              <TabsContent value="pages" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <PagesTab
                  id={id}
                  hostname={jobHostname}
                  pages={pagesList}
                  onSelectPreviewPage={(path) => {
                    setPreviewPath(path);
                    setActiveTab('preview');
                  }}
                />
              </TabsContent>

              {/* Tab 4: Assets */}
              <TabsContent value="assets" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <AssetsTab id={id} assets={assetsList} />
              </TabsContent>

              {/* Tab 5: Network */}
              <TabsContent value="network" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <NetworkTab id={id} requests={networkList} />
              </TabsContent>

              {/* Tab 6: Files */}
              <TabsContent value="files" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <FilesTab
                  id={id}
                  fileTree={fileTree}
                  onPreviewFile={(path) => {
                    setPreviewPath(path);
                    setActiveTab('preview');
                  }}
                />
              </TabsContent>

              {/* Tab 7: Health */}
              <TabsContent value="health" className="flex-1 min-h-0 overflow-y-auto mt-2 data-[state=inactive]:hidden pr-1 pb-4">
                <HealthTab id={id} overallScore={healthScore} />
              </TabsContent>

              {/* Tab 8: Logs */}
              <TabsContent value="logs" className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden overflow-hidden">
                <LogsTab id={id} rawLogs={crawlLogs} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Floating Draggable Terminal Window */}
        <DraggableTerminal
          open={isTerminalOpen}
          onClose={() => setIsTerminalOpen(false)}
          logs={crawlLogs}
          jobId={id}
          hostname={jobHostname}
          isCrawling={status === 'downloading'}
          onClearLogs={() => setCrawlLogs('')}
        />
      </main>
    </div>
  );
}
