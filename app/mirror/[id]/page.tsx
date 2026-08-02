'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe,
  Folder,
  File,
  Monitor,
  Tablet,
  Smartphone,
  Download,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Terminal,
  Sparkles,
  Check,
  Cpu,
} from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: string;
  children?: FileNode[];
}

interface Stats {
  html: number;
  css: number;
  images: number;
  fonts: number;
  js: number;
  totalFiles: number;
  totalSize: number;
}

interface Overview {
  id: string;
  url: string;
  hostname: string;
  techStack: string;
  stats: {
    pages: number;
    images: number;
    files: number;
    size: string;
  };
}

export default function MirrorDashboard() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Job status state
  const [status, setStatus] = useState<'downloading' | 'completed' | 'failed'>('downloading');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats>({
    html: 0,
    css: 0,
    images: 0,
    fonts: 0,
    js: 0,
    totalFiles: 0,
    totalSize: 0,
  });
  const [recentFiles, setRecentFiles] = useState<{ name: string; size: number }[]>([]);

  // UI state
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'phone'>('desktop');
  const [overviewData, setOverviewData] = useState<Overview | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [htmlPages, setHtmlPages] = useState<string[]>([]);
  const [previewPath, setPreviewPath] = useState<string>('index.html');
  const [scale, setScale] = useState(1);
  const [isFilesDrawerOpen, setIsFilesDrawerOpen] = useState(false);
  const [jobHostname, setJobHostname] = useState<string>('');
  const [jobUrl, setJobUrl] = useState<string>('');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/mirror/${id}/logs`);
      if (res.ok) {
        const data = await res.json();
        setCrawlLogs(data.logs || 'No logs recorded.');
      } else {
        setCrawlLogs('Failed to retrieve logs.');
      }
    } catch (err) {
      setCrawlLogs('Error retrieving logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Poll progress and establish EventSource SSE
  useEffect(() => {
    if (!id) return;

    const eventSource = new EventSource(`/api/mirror/${id}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setError(data.error || '');
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.recentFiles) {
          setRecentFiles(data.recentFiles);
        }
        if (data.hostname) {
          setJobHostname(data.hostname);
        }
        if (data.url) {
          setJobUrl(data.url);
        }

        if (data.status === 'completed') {
          eventSource.close();
          fetchDetails();
        } else if (data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Simulated progress logic for download phase
  useEffect(() => {
    if (status !== 'downloading') {
      if (status === 'completed') {
        setLoadingProgress(100);
      }
      return;
    }

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        const step = Math.max(1, Math.floor(remaining * 0.15));
        return prev + step;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [status]);

  // Extract previewable HTML pages from file tree
  useEffect(() => {
    if (fileTree.length > 0) {
      const getHtmlFiles = (nodes: FileNode[]): string[] => {
        const list: string[] = [];
        for (const node of nodes) {
          if (node.type === 'file') {
            const ext = node.name.split('.').pop()?.toLowerCase();
            if (ext === 'html' || ext === 'htm') {
              list.push(node.path);
            }
          } else if (node.type === 'directory' && node.children) {
            list.push(...getHtmlFiles(node.children));
          }
        }
        return list;
      };

      const found = getHtmlFiles(fileTree);
      // Sort: index.html always first, then alphabetical
      found.sort((a, b) => {
        if (a === 'index.html') return -1;
        if (b === 'index.html') return 1;
        return a.localeCompare(b);
      });
      setHtmlPages(found);
    }
  }, [fileTree]);

  // Adjust aspect scale dynamically for 15-inch laptop screen (1440px desktop mockup width)
  useEffect(() => {
    if (viewport !== 'desktop') {
      setScale(1);
      return;
    }

    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Desktop iframe native width is 1440px
        const newScale = containerWidth / 1445; // slight offset for border scrollbar scroll area
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    // Add small delay to account for layout settle
    const timer = setTimeout(updateScale, 150);

    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [viewport, loadingDetails]);

  // Track page changes inside the preview iframe & inject sleek styling
  const handleIframeLoad = (e: any) => {
    try {
      const iframeWindow = e.target.contentWindow;
      const currentPathname = iframeWindow.location.pathname;
      const prefix = `/api/mirror/${id}/preview/`;
      if (currentPathname.startsWith(prefix)) {
        let relative = currentPathname.slice(prefix.length);
        if (!relative) {
          relative = 'index.html';
        }
        setPreviewPath(relative);
      }

      // Inject custom scrollbar rules directly to avoid ugly native scrollbar clashes
      const iframeDoc = e.target.contentDocument || iframeWindow.document;
      if (iframeDoc) {
        const style = iframeDoc.createElement('style');
        style.innerHTML = `
          /* Custom thin scrollbar to match dark/sleek theme */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.35);
            border: 2px solid transparent;
            background-clip: padding-box;
          }
          body {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
          }
        `;
        iframeDoc.head.appendChild(style);
      }
    } catch (err) {
      // safe same-origin check
    }
  };

  // Removed terminal auto-scroll

  // Fetch final details once job is complete
  const fetchDetails = async () => {
    setLoadingDetails(true);
    try {
      const [overviewRes, filesRes] = await Promise.all([
        fetch(`/api/mirror/${id}/overview`),
        fetch(`/api/mirror/${id}/files`),
      ]);

      if (overviewRes.ok) {
        const overview = await overviewRes.json();
        setOverviewData(overview);
      }
      if (filesRes.ok) {
        const files = await filesRes.json();
        setFileTree(files);
      }
    } catch (err) {
      console.error('Failed to load finished job details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Helper to trigger ZIP download
  const handleDownloadZip = () => {
    window.location.href = `/api/download/${id}`;
  };

  // Files recursive tree explorer component
  const FileTreeNodeComponent = ({ node, level = 0 }: { node: FileNode; level: number }) => {
    const [isOpen, setIsOpen] = useState(level === 0); // Keep root folder open by default
    const isDir = node.type === 'directory';
    const isActiveFile = !isDir && node.path === previewPath;

    return (
      <div className="select-none">
        <div
          onClick={() => {
            if (isDir) {
              setIsOpen(!isOpen);
            } else {
              const ext = node.name.split('.').pop()?.toLowerCase();
              if (ext === 'html' || ext === 'htm') {
                setPreviewPath(node.path);
              }
            }
          }}
          style={{ paddingLeft: `${level * 12 + 10}px` }}
          className={`flex items-center gap-2.5 py-1.5 pr-3 rounded-lg text-xs transition-colors cursor-pointer group ${
            isDir 
              ? 'text-neutral-200 hover:bg-neutral-900/60 font-medium' 
              : isActiveFile
                ? 'text-white bg-neutral-900 font-semibold'
                : 'text-neutral-400 hover:bg-neutral-900/30'
          }`}
        >
          {isDir ? (
            <>
              <span className="text-neutral-600 w-3 flex justify-center text-[8px] transform transition-transform duration-200">
                {isOpen ? '▼' : '▶'}
              </span>
              <Folder className="w-4 h-4 text-neutral-400 fill-neutral-500/10" />
              <span className="truncate">{node.name}</span>
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="w-4 h-4 text-neutral-600" />
              <span className="flex-1 truncate">{node.name}</span>
              {node.size && (
                <span className="text-[10px] text-neutral-600 group-hover:text-neutral-500 transition-colors">
                  {node.size}
                </span>
              )}
            </>
          )}
        </div>
        {isDir && isOpen && node.children && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <FileTreeNodeComponent key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // RENDER PHASE 2: Error screen
  if (status === 'failed') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen px-4 text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900 flex items-center justify-center">
          <Shield className="w-6 h-6 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Mirroring Failed</h2>
          <p className="text-sm text-neutral-450 max-w-sm mx-auto">
            {error || 'An unknown error occurred during website mirroring.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="h-10 px-5 rounded-lg bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-sm text-white font-medium transition-colors cursor-pointer"
          >
            Go Back Home
          </button>
          <button
            onClick={() => {
              fetchLogs();
              setIsDiagnosticsOpen(true);
            }}
            className="h-10 px-5 rounded-lg bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-sm text-neutral-400 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            View Crawl Logs
          </button>
        </div>
      </div>
    );
  }

  // RENDER PHASE 3: Dashboard layout
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass border-b border-neutral-900/60 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-xl hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <Globe className="w-4.5 h-4.5 text-neutral-450" />
              <h1 className="font-semibold text-sm text-white truncate max-w-[150px] sm:max-w-xs md:max-w-sm">
                {jobHostname || overviewData?.hostname || 'mirrored-site'}
              </h1>
              {status === 'downloading' ? (
                <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-505" />
                  Mirroring {loadingProgress}%
                </span>
              ) : overviewData ? (
                <span className="text-[10px] bg-neutral-900 text-neutral-450 border border-neutral-850 px-2 py-0.5 rounded-full font-mono font-medium shrink-0">
                  {overviewData.techStack}
                </span>
              ) : null}
            </div>
          </div>

          {/* Viewport Selectors and Download Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-900 rounded-xl p-1 text-xs">
              <button
                onClick={() => setViewport('desktop')}
                title="Laptop 15\"
                className={`p-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                  viewport === 'desktop' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">15" Screen</span>
              </button>
              <button
                onClick={() => setViewport('tablet')}
                title="Tablet 10\"
                className={`p-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                  viewport === 'tablet' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">10" Tablet</span>
              </button>
              <button
                onClick={() => setViewport('phone')}
                title="Mobile 6\"
                className={`p-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                  viewport === 'phone' ? 'bg-neutral-900 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">6" Phone</span>
              </button>
            </div>

            <a
              href="https://github.com/krishsoni15/WebHarvest"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-350 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            >
              <svg
                className="w-3.5 h-3.5 fill-current text-neutral-400 group-hover:text-white transition-colors"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span className="hidden md:inline">Star on GitHub</span>
            </a>

            <button
              onClick={handleDownloadZip}
              className="bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:bg-neutral-100"
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:py-8">
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
            <p className="text-sm text-neutral-500">Retrieving offline site pages...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: Preview Mockup and Address Control Deck */}
            <div className="flex-1 w-full lg:max-w-[72%]">
              
              {/* Address Control Deck */}
              <div className="w-full max-w-4xl mx-auto mb-5 glass border border-neutral-900/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                {/* Localhost Address Indicator */}
                <div className="flex-1 w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-450 font-mono overflow-hidden">
                  <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="text-emerald-500/70 select-none">http://localhost:3000</span>
                  <span className="text-neutral-500 select-none">/api/mirror/{id}/preview/</span>
                  <span className="text-neutral-200 truncate">{previewPath}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Reload preview */}
                  <button
                    onClick={() => {
                      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                      if (iframe) iframe.src = iframe.src;
                    }}
                    title="Reload Preview"
                    className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  </button>

                  {/* Open page directly in localhost new tab */}
                  <button
                    onClick={() => window.open(`/api/mirror/${id}/preview/${previewPath}`, '_blank')}
                    title="Open page in new browser tab"
                    className="p-2 rounded-lg bg-neutral-955 hover:bg-neutral-900 border border-neutral-900 text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs cursor-pointer font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </button>
                </div>
              </div>

              {/* Device Frame Viewport Simulator */}
              <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
                {viewport === 'desktop' && (
                  <div className="w-full max-w-4xl flex flex-col items-center animate-fade-in">
                    {/* Screen Bezel Frame (15-inch aspect ratio) */}
                    <div 
                      ref={containerRef}
                      className="relative w-full aspect-[16/10] bg-neutral-950 border-[10px] border-neutral-900 rounded-t-3xl shadow-2xl overflow-hidden pulse-glow"
                    >


                      {/* Screen reflection glare overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.012] to-transparent pointer-events-none z-20" />

                      {/* Content Area Scaled to full 1440px desktop size */}
                      <div 
                        style={{
                          width: '1440px',
                          height: '900px',
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }}
                        className="absolute inset-0"
                      >
                        {status === 'downloading' && stats.html === 0 ? (
                          <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center text-center p-8 space-y-6 select-none font-sans">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="relative flex items-center justify-center">
                                <div className="absolute w-24 h-24 rounded-full border border-dashed border-emerald-500/20 animate-spin [animation-duration:20s]" />
                                <div className="w-16 h-16 rounded-full bg-emerald-950/20 border border-emerald-900/60 flex items-center justify-center animate-pulse">
                                  <Globe className="w-8 h-8 text-emerald-450" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-white text-sm font-semibold tracking-wide">
                                Downloading Website Resources...
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono">
                                Mirroring under ID: {id}
                              </p>
                            </div>
                            <div className="w-full max-w-xs space-y-1.5 mx-auto">
                              <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono">
                                <span>PROGRESS</span>
                                <span>{loadingProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-950 border border-neutral-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                  style={{ width: `${loadingProgress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <iframe
                            id="preview-iframe"
                            src={`/api/mirror/${id}/preview/${previewPath}`}
                            onLoad={handleIframeLoad}
                            className="w-full h-full bg-white border-0"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        )}
                      </div>
                    </div>

                    {/* Keyboard deck bottom base */}
                    <div className="w-[104%] h-4.5 bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 rounded-b-2xl border-t border-neutral-700 shadow-2xl relative z-10 flex justify-center">
                      <div className="w-24 h-2 bg-neutral-950 rounded-b-md shadow-inner" />
                    </div>
                  </div>
                )}

                {viewport === 'tablet' && (
                  <div className="relative w-full max-w-[460px] aspect-[3/4] bg-neutral-950 border-[12px] border-neutral-900 rounded-3xl shadow-2xl overflow-hidden pulse-glow animate-fade-in">
                    {/* Camera */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neutral-950 border border-neutral-800 z-20" />
                    {/* Content */}
                    {status === 'downloading' && stats.html === 0 ? (
                      <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center text-center p-6 space-y-6 select-none font-sans">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-20 h-20 rounded-full border border-dashed border-emerald-500/20 animate-spin [animation-duration:20s]" />
                            <div className="w-12 h-12 rounded-full bg-emerald-950/20 border border-emerald-900/60 flex items-center justify-center animate-pulse">
                              <Globe className="w-6 h-6 text-emerald-450" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-white text-xs font-semibold tracking-wide">
                            Downloading Site...
                          </p>
                          <p className="text-[9px] text-neutral-500 font-mono">
                            {loadingProgress}% Complete
                          </p>
                        </div>
                        <div className="w-full max-w-[180px] h-1 bg-neutral-950 border border-neutral-900 rounded-full overflow-hidden mx-auto">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                            style={{ width: `${loadingProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <iframe
                        id="preview-iframe-tablet"
                        src={`/api/mirror/${id}/preview/${previewPath}`}
                        onLoad={handleIframeLoad}
                        className="w-full h-full bg-white border-0"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                )}

                {viewport === 'phone' && (
                  <div className="relative w-full max-w-[300px] aspect-[9/19.5] bg-neutral-950 border-[10px] border-neutral-900 rounded-[38px] shadow-2xl overflow-hidden pulse-glow animate-fade-in">
                    {/* Speaker/Camera notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-900 rounded-full z-20 flex items-center justify-end px-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
                    </div>
                    {/* Content */}
                    {status === 'downloading' && stats.html === 0 ? (
                      <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center text-center p-6 space-y-6 select-none font-sans">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-16 h-16 rounded-full border border-dashed border-emerald-500/20 animate-spin [animation-duration:20s]" />
                            <div className="w-10 h-10 rounded-full bg-emerald-950/20 border border-emerald-900/60 flex items-center justify-center animate-pulse">
                              <Globe className="w-5 h-5 text-emerald-450" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-white text-xs font-semibold tracking-wide">
                            Mirroring...
                          </p>
                          <p className="text-[9px] text-neutral-500 font-mono">
                            {loadingProgress}%
                          </p>
                        </div>
                        <div className="w-full max-w-[120px] h-1 bg-neutral-950 border border-neutral-900 rounded-full overflow-hidden mx-auto">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                            style={{ width: `${loadingProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <iframe
                        id="preview-iframe-phone"
                        src={`/api/mirror/${id}/preview/${previewPath}`}
                        onLoad={handleIframeLoad}
                        className="w-full h-full bg-white border-0"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Sidebar Overview & File System Trigger Card */}
            <div className="w-full lg:w-[28%] space-y-6 shrink-0">
              {/* Site Details Card */}
              <div className="glass rounded-2xl p-5 border border-neutral-900 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-widest font-mono mb-2">
                    Site Overview
                  </h3>
                  <div className="bg-neutral-950 border border-neutral-900 p-3 rounded-xl flex items-center justify-between gap-3">
                    <div className="truncate pr-1">
                      <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Source Address</p>
                      <a 
                        href={jobUrl || overviewData?.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-white font-medium hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        <span className="truncate">{jobHostname || overviewData?.hostname || 'mirrored.site'}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-500 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Tech stack & stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950/60 border border-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">Pages</span>
                    <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                      {overviewData?.stats.pages ?? stats.html}
                    </span>
                  </div>
                  <div className="bg-neutral-950/60 border border-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">Images</span>
                    <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                      {overviewData?.stats.images ?? stats.images}
                    </span>
                  </div>
                  <div className="bg-neutral-950/60 border border-neutral-900 p-3 rounded-xl col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block">Download Size</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                        {overviewData?.stats.size ?? formatBytes(stats.totalSize)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          fetchLogs();
                          setIsDiagnosticsOpen(true);
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="View crawl logs / diagnostics"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleDownloadZip}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-neutral-800 text-white rounded-lg transition-colors cursor-pointer"
                        title="Download archive immediately"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible File Explorer Trigger Card */}
              <div className="glass rounded-2xl border border-neutral-900 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-widest font-mono">
                      File Structure
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                      {stats.totalFiles || fileTree.length} static files ready
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsFilesDrawerOpen(true)}
                    className="p-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                    title="Browse all directories and assets"
                  >
                    <Folder className="w-4.5 h-4.5" />
                  </button>
                </div>
                <button
                  onClick={() => setIsFilesDrawerOpen(true)}
                  className="w-full py-2 bg-white text-black text-xs font-bold rounded-xl shadow hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Browse File Tree
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over right drawer for files mapping */}
      {isFilesDrawerOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Backdrop blur overlay */}
          <div 
            onClick={() => setIsFilesDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in" 
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md transform transition-transform duration-300 ease-out translate-x-0">
              <div className="h-full flex flex-col bg-[#080808]/95 border-l border-neutral-900 shadow-2xl overflow-hidden glass">
                {/* Drawer Header */}
                <div className="px-5 py-4 border-b border-neutral-900/60 flex items-center justify-between bg-neutral-900/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-neutral-450 fill-neutral-500/10" />
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                      File Explorer
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsFilesDrawerOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-450 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Drawer File Tree */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {fileTree.length > 0 ? (
                    <div className="space-y-0.5">
                      {fileTree.map((node) => (
                        <FileTreeNodeComponent key={node.path} node={node} level={0} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-[11px] text-neutral-550 font-mono">
                      No files mapped.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Diagnostics Logs Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDiagnosticsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs animate-fade-in" 
          />

          <div className="relative w-full max-w-3xl bg-[#090909] border border-neutral-900 rounded-2xl shadow-2xl overflow-hidden glass flex flex-col h-[80vh] z-10">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-900/60 flex items-center justify-between bg-neutral-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-450" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Crawler Diagnostics Log
                </h3>
              </div>
              <button 
                onClick={() => setIsDiagnosticsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-450 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Monospace Log Viewer */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[10px] leading-relaxed text-neutral-350 bg-black/60 select-text scrollbar-thin">
              {loadingLogs ? (
                <div className="h-full flex items-center justify-center gap-2 text-neutral-500 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading logs...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all">{crawlLogs}</pre>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-neutral-900 bg-neutral-900/20 flex justify-end shrink-0">
              <button
                onClick={() => setIsDiagnosticsOpen(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
