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
  RefreshCw,
  Image,
  FileText,
  FileCode,
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

  const [starCount, setStarCount] = useState<number | null>(null);
  const [origin, setOrigin] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetch('/api/github-stars')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stars === 'number') {
          setStarCount(data.stars);
        }
      })
      .catch(() => {});
  }, []);

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
  const [assets, setAssets] = useState<{ colors: string[]; images: Array<{ name: string; path: string; previewUrl: string; size: string }> } | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [isAssetsDrawerOpen, setIsAssetsDrawerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleCopyLogs = () => {
    if (!crawlLogs) return;
    navigator.clipboard.writeText(crawlLogs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch(`/api/mirror/${id}/assets`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error('Failed to load assets', err);
    } finally {
      setLoadingAssets(false);
    }
  };

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
  const logsContainerRef = useRef<HTMLDivElement>(null);

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
      // On SSE error (e.g. Vercel timeout), fetch overview to check if completed
      fetch(`/api/mirror/${id}/overview`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'completed') {
            setStatus('completed');
            setLoadingProgress(100);
            fetchDetails();
          } else if (data.status === 'failed') {
            setStatus('failed');
          }
        })
        .catch(() => {});
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Fallback Polling Effect for Serverless Environments (Vercel)
  useEffect(() => {
    if (!id || status !== 'downloading') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/mirror/${id}/overview`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' || data.status === 'failed') {
            setStatus(data.status);
            if (data.status === 'completed') {
              setLoadingProgress(100);
              fetchDetails();
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(checkStatus, 2500);
    return () => clearInterval(interval);
  }, [id, status]);

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

  // Poll assets periodically during download phase to show live previews in dashboard cards
  useEffect(() => {
    if (!id) return;
    
    const loadAssets = async () => {
      try {
        const res = await fetch(`/api/mirror/${id}/assets`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch {}
    };

    loadAssets(); // Fetch once immediately
    
    let timer: NodeJS.Timeout;
    if (status === 'downloading') {
      timer = setInterval(loadAssets, 4000);
    } else if (isAssetsDrawerOpen) {
      timer = setInterval(loadAssets, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [id, status, isAssetsDrawerOpen]);

  // Poll files dynamically when drawer is open
  useEffect(() => {
    if (!id) return;
    
    let timer: NodeJS.Timeout;
    
    const loadFiles = async () => {
      try {
        const res = await fetch(`/api/mirror/${id}/files`);
        if (res.ok) {
          const data = await res.json();
          setFileTree(data);
        }
      } catch {}
    };

    if (isFilesDrawerOpen) {
      loadFiles();
      if (status === 'downloading') {
        timer = setInterval(loadFiles, 3000);
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isFilesDrawerOpen, id, status]);

  // Poll logs continuously when status is downloading or diagnostics is open
  useEffect(() => {
    if (!id) return;
    
    fetchLogs(); // Initial fetch
    
    let timer: NodeJS.Timeout;
    if (status === 'downloading' || isDiagnosticsOpen) {
      timer = setInterval(fetchLogs, 2000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDiagnosticsOpen, id, status]);

  // Auto-scroll diagnostics logs to the bottom on update
  useEffect(() => {
    if (isDiagnosticsOpen && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [crawlLogs, isDiagnosticsOpen]);

  // Handle Esc key to close Terminal Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDiagnosticsOpen) {
        setIsDiagnosticsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiagnosticsOpen]);

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
  }, [viewport]);

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

      await fetchAssets();
    } catch (err) {
      console.error('Failed to load finished job details', err);
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
              } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
                setLightboxImage(`/api/mirror/${id}/preview/${node.path}`);
              } else {
                window.open(`/api/mirror/${id}/preview/${node.path}`, '_blank');
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
          <p className="text-sm text-neutral-400 max-w-sm mx-auto">
            {error || 'An unknown error occurred during website mirroring.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="h-10 px-5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm text-white font-medium transition-colors cursor-pointer"
          >
            Go Back Home
          </button>
          <button
            onClick={() => {
              fetchLogs();
              setIsDiagnosticsOpen(true);
            }}
            className="h-10 px-5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
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
              <Globe className="w-4.5 h-4.5 text-neutral-400" />
              <h1 className="font-semibold text-sm text-white truncate max-w-[150px] sm:max-w-xs md:max-w-sm">
                {jobHostname || overviewData?.hostname || 'mirrored-site'}
              </h1>
              {status === 'downloading' ? (
                <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mirroring
                </span>
              ) : overviewData?.techStack ? (
                <span className="text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full font-mono font-medium shrink-0">
                  {overviewData.techStack}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/krishsoni15/WebHarvest"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm font-medium px-4.5 py-2.5 rounded-full shadow-lg transition-all duration-300 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
            >
              <svg
                className="w-5 h-5 fill-current text-neutral-400 group-hover:text-white transition-colors"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span className="font-semibold tracking-tight">GitHub</span>
              <span className="h-4 w-px bg-neutral-800" />
              <span className="flex items-center gap-1 text-amber-400 group-hover:text-amber-300 transition-colors font-mono font-bold text-sm">
                <span className="text-[12px] select-none">★</span>{starCount !== null ? (starCount >= 1000 ? (starCount / 1000).toFixed(1) + 'k' : starCount) : '...'}
              </span>
            </a>

            {status === 'downloading' ? (
              <button
                disabled
                className="bg-neutral-950 border border-neutral-900 text-neutral-500 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 select-none opacity-50 cursor-not-allowed"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                Download ZIP
              </button>
            ) : (
              <button
                onClick={handleDownloadZip}
                className="bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:bg-neutral-100"
              >
                <Download className="w-3.5 h-3.5" />
                Download ZIP
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: Preview Mockup and Address Control Deck */}
            <div className="flex-1 w-full lg:max-w-[72%]">
              
              {/* Address Control Deck */}
              <div className="w-full max-w-4xl mx-auto mb-5 glass border border-neutral-900/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                {/* Localhost Address Indicator */}
                <div className="flex-1 w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] text-neutral-400 font-mono overflow-hidden">
                  <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="text-emerald-500/70 select-none">{origin}</span>
                  <span className="text-neutral-500 select-none">/api/mirror/{id}/preview/</span>
                  <span className="text-neutral-200 truncate">{previewPath}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Viewport Selectors (just icons) */}
                  <div className="flex items-center gap-0.5 bg-neutral-950 border border-neutral-900 rounded-lg p-0.5 text-xs mr-0.5">
                    <button
                      onClick={() => setViewport('desktop')}
                      title="Laptop 15\"
                      className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        viewport === 'desktop' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewport('tablet')}
                      title="Tablet 10\"
                      className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        viewport === 'tablet' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewport('phone')}
                      title="Mobile 6\"
                      className={`p-1.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                        viewport === 'phone' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Reload preview */}
                  <button
                    onClick={() => {
                      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                      if (iframe) iframe.src = iframe.src;
                    }}
                    title="Reload Preview"
                    className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Open page directly in localhost new tab */}
                  <button
                    onClick={() => window.open(`/api/mirror/${id}/preview/${previewPath}`, '_blank')}
                    title="Open page in new browser tab"
                    className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-neutral-400 hover:text-white transition-colors flex items-center gap-1 text-xs cursor-pointer font-medium"
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
                                  <Globe className="w-8 h-8 text-emerald-400" />
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
                              <Globe className="w-6 h-6 text-emerald-400" />
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
                              <Globe className="w-5 h-5 text-emerald-400" />
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
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Sidebar Project Dashboard */}
            <div className="w-full lg:w-[28%] space-y-6 shrink-0">
              {/* Site Details Card */}
              <div className="glass rounded-2xl p-5 border border-neutral-900 space-y-4.5 shadow-xl">
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono mb-2.5">
                    Project Dashboard
                  </h3>
                  
                  {/* Address & Meta card */}
                  <div className="bg-neutral-950 border border-neutral-900 p-3.5 rounded-xl space-y-3">
                    <div>
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
                    
                    <div className="pt-2.5 border-t border-neutral-900 grid grid-cols-2 gap-2 text-[10px] font-mono leading-none">
                      <div>
                        <span className="text-neutral-500 block uppercase tracking-wider text-[8px] mb-1">Total Size</span>
                        <span className="text-white font-bold text-xs">{overviewData?.stats.size ?? formatBytes(stats.totalSize)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase tracking-wider text-[8px] mb-1">Files Captured</span>
                        <span className="text-white font-bold text-xs">
                          {stats.totalFiles || fileTree.length || (stats.html + stats.css + stats.images + stats.fonts + stats.js)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono leading-none">
                      <span className="text-neutral-500 uppercase tracking-wider text-[8px]">Technology</span>
                      <span className="text-white font-bold bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-[8px]">
                        {overviewData?.techStack || (status === 'downloading' ? 'Detecting…' : 'Static Site')}
                      </span>
                    </div>

                    {assets?.colors && assets.colors.length > 0 && (
                      <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                        <span className="text-[8px] text-neutral-500 font-mono uppercase tracking-wider">Colors</span>
                        <div className="flex items-center gap-1">
                          {assets.colors.slice(0, 5).map((color) => (
                            <div 
                              key={color}
                              className="w-3.5 h-3.5 rounded-full border border-neutral-900 shadow-sm shrink-0"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Deck (Pages & Assets) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsFilesDrawerOpen(true)}
                    className="bg-neutral-950/60 border border-neutral-900 p-3.5 rounded-xl hover:border-neutral-800 hover:bg-neutral-900/40 transition-all text-left w-full group cursor-pointer flex flex-col justify-between min-h-[115px] relative overflow-hidden"
                  >
                    <div>
                      <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block group-hover:text-neutral-400 transition-colors">Pages</span>
                      <span className="text-2xl font-bold text-white font-mono mt-0.5 block">
                        {overviewData?.stats.pages ?? stats.html}
                      </span>
                    </div>

                    {recentFiles && recentFiles.length > 0 && (
                      <div className="text-[7.5px] font-mono text-neutral-400 truncate w-full my-1 leading-none select-none">
                        <span className="text-[6px] text-neutral-600 block uppercase tracking-wider mb-0.5">Last Captured</span>
                        <span className="text-white truncate block">{recentFiles[0].name.split('/').pop()}</span>
                      </div>
                    )}

                    <span className="text-[9px] text-neutral-500 group-hover:text-emerald-500 font-sans font-medium transition-colors mt-auto flex items-center justify-between w-full">
                      Browse Files
                      <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setIsAssetsDrawerOpen(true)}
                    className="bg-neutral-950/60 border border-neutral-900 p-3.5 rounded-xl hover:border-neutral-800 hover:bg-neutral-900/40 transition-all text-left w-full group cursor-pointer flex flex-col justify-between min-h-[115px] relative overflow-hidden"
                  >
                    <div>
                      <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block group-hover:text-neutral-400 transition-colors">Assets</span>
                      <span className="text-2xl font-bold text-white font-mono mt-0.5 block">
                        {overviewData?.stats.images ?? stats.images}
                      </span>
                    </div>

                    {assets?.images && assets.images.length > 0 ? (
                      <div className="flex items-center -space-x-1.5 overflow-hidden my-1">
                        {assets.images.slice(0, 3).map((img, idx) => (
                          <div 
                            key={img.path}
                            className="w-5.5 h-5.5 rounded-full border border-neutral-950 bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0 transparency-pattern"
                            style={{ zIndex: 10 - idx }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={img.previewUrl} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                        {assets.images.length > 3 && (
                          <div className="w-5.5 h-5.5 rounded-full border border-neutral-950 bg-neutral-900 flex items-center justify-center text-[7px] font-bold text-neutral-400 font-mono shrink-0 select-none" style={{ zIndex: 0 }}>
                            +{assets.images.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-5.5" />
                    )}

                    <span className="text-[9px] text-neutral-500 group-hover:text-emerald-500 font-sans font-medium transition-colors mt-auto flex items-center justify-between w-full">
                      Browse Assets
                      <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-1">
                  {status === 'downloading' ? (
                    <button 
                      onClick={handleDownloadZip}
                      className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                      title="Download current progress ZIP"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      Mirroring Site ({loadingProgress}%)
                    </button>
                  ) : (
                    <button 
                      onClick={handleDownloadZip}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      title="Download archive immediately"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP Archive
                    </button>
                  )}

                  {/* Live Mini Terminal Preview (3-4 lines) */}
                  <div 
                    onClick={() => {
                      fetchLogs();
                      setIsDiagnosticsOpen(true);
                    }}
                    className="bg-black/90 border border-neutral-900 hover:border-neutral-800 rounded-xl p-2.5 font-mono text-[9px] text-neutral-400 space-y-1 transition-all cursor-pointer group relative overflow-hidden select-none"
                    title="Click to expand full terminal modal"
                  >
                    <div className="flex items-center justify-between text-[7.5px] text-neutral-500 uppercase tracking-widest pb-1 border-b border-neutral-900/80 font-bold">
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${status === 'downloading' ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
                        System Logs
                      </span>
                      <span className="text-emerald-500 group-hover:underline flex items-center gap-0.5 text-[8px]">
                        Expand ↗
                      </span>
                    </div>

                    <div className="space-y-0.5 pt-0.5">
                      {crawlLogs ? (
                        crawlLogs.trim().split('\n').slice(-4).map((line, idx) => (
                          <div key={idx} className="break-all font-mono leading-tight text-emerald-400/90 truncate">
                            <span className="text-neutral-700 mr-1">$</span>
                            {line}
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-600 animate-pulse text-[8.5px] py-1">
                          <span className="text-neutral-700 mr-1">$</span>
                          {status === 'downloading' ? 'Initializing crawl engine stream...' : 'Click to view diagnostic logs'}
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (!isDiagnosticsOpen) fetchLogs();
                      setIsDiagnosticsOpen(!isDiagnosticsOpen);
                    }}
                    className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold ${
                      isDiagnosticsOpen 
                        ? 'bg-neutral-800 border border-neutral-700 text-white shadow-lg' 
                        : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                    title="Open terminal system logs modal"
                  >
                    <Terminal className="w-4 h-4 text-emerald-500 shrink-0" />
                    {isDiagnosticsOpen ? 'Close System Logs' : 'View System Logs'}
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* Terminal System Logs Modal Overlay (Laptop aspect ratio) */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0 z-0"
            onClick={() => setIsDiagnosticsOpen(false)}
          />

          {/* Terminal Window Container */}
          <div className="relative z-10 max-w-4xl w-full h-[540px] max-h-[85vh] glass border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Window Header / Title Bar */}
            <div className="bg-neutral-950/90 border-b border-neutral-900 px-4 py-3 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div 
                    onClick={() => setIsDiagnosticsOpen(false)}
                    className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 cursor-pointer transition-colors" 
                    title="Close"
                  />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 cursor-pointer transition-colors" title="Minimize" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 cursor-pointer transition-colors" title="Expand" />
                </div>
                <div className="h-4 w-px bg-neutral-800 mx-1" />
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-300">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SYSTEM DIAGNOSTICS LOGS</span>
                  <span className="text-neutral-600">—</span>
                  <span className="text-emerald-500/80">{jobHostname || id}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Refresh logs stream"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin text-emerald-400' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleCopyLogs}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy logs to clipboard"
                >
                  {copiedLogs ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <File className="w-3 h-3 text-neutral-400" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsDiagnosticsOpen(false)}
                  className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer text-xs"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Terminal Body Console */}
            <div className="flex-1 bg-neutral-950/95 p-4 overflow-y-auto font-mono text-xs text-neutral-300 space-y-1 scrollbar-thin select-text" ref={logsContainerRef}>
              <div className="text-neutral-600 text-[10px] pb-2 border-b border-neutral-900 mb-2 select-none flex items-center justify-between">
                <span>[LOG STREAM INITIALIZED — WEBHARVEST ENGINE]</span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${status === 'downloading' ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="capitalize text-emerald-400 font-bold">{status}</span>
                </span>
              </div>

              {crawlLogs ? (
                crawlLogs.trim().split('\n').map((line, idx) => (
                  <div key={idx} className="break-all font-mono leading-relaxed flex items-start gap-2 hover:bg-neutral-900/40 px-1 py-0.5 rounded">
                    <span className="text-neutral-700 select-none text-[10px] w-6 shrink-0 text-right font-mono">{idx + 1}</span>
                    <span className="text-emerald-500/60 select-none">$</span>
                    <span className={line.includes('ERROR') || line.includes('Failed') ? 'text-red-400 font-semibold' : line.includes('HTTP request sent') ? 'text-amber-400' : 'text-neutral-300'}>
                      {line}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600 space-y-2 select-none">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs">Connecting to system log stream...</p>
                </div>
              )}
            </div>

            {/* Terminal Footer */}
            <div className="bg-neutral-950 border-t border-neutral-900 px-4 py-2 flex items-center justify-between text-[10px] text-neutral-500 font-mono shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span>Lines: {crawlLogs ? crawlLogs.trim().split('\n').length : 0}</span>
                <span>•</span>
                <span>Job ID: {id}</span>
              </div>
              <div>Press <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-400 text-[9px]">Esc</kbd> to close</div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Slide-over right drawer for design assets */}
      {isAssetsDrawerOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Backdrop blur overlay */}
          <div 
            onClick={() => setIsAssetsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in" 
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md transform transition-transform duration-300 ease-out translate-x-0">
              <div className="h-full flex flex-col bg-[#080808]/95 border-l border-neutral-900 shadow-2xl overflow-hidden glass">
                {/* Drawer Header */}
                <div className="px-5 py-4 border-b border-neutral-900/60 flex items-center justify-between bg-neutral-900/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                      Design Assets
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsAssetsDrawerOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                  {loadingAssets ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                      <p className="text-[11px] text-neutral-500 font-mono">Analyzing mirrored design assets...</p>
                    </div>
                  ) : assets ? (
                    <>
                      {/* Color Palette */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Color Palette</h4>
                          <span className="text-[9px] text-neutral-500 font-mono">Click to copy</span>
                        </div>
                        {assets.colors && assets.colors.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2.5 bg-neutral-950 border border-neutral-900/80 p-3.5 rounded-xl">
                            {assets.colors.map((color) => {
                              const isCopied = copiedColor === color;
                              return (
                                <button
                                  key={color}
                                  onClick={() => {
                                    navigator.clipboard.writeText(color);
                                    setCopiedColor(color);
                                    setTimeout(() => setCopiedColor(null), 1500);
                                  }}
                                  className="flex flex-col items-center justify-center gap-1.5 focus:outline-none group cursor-pointer"
                                  title={`Copy ${color}`}
                                >
                                  <div 
                                    className="w-10 h-10 rounded-lg border border-neutral-800 shadow-md group-hover:scale-105 active:scale-95 transition-all relative flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: color }}
                                  >
                                    {isCopied && (
                                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center animate-fade-in">
                                        <Check className="w-4.5 h-4.5 text-white stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-neutral-400 font-mono select-all truncate max-w-full font-semibold">
                                    {isCopied ? 'Copied' : color}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-neutral-950 border border-neutral-900/80 p-4 rounded-xl text-center">
                            <p className="text-xs text-neutral-500">No color palette detected.</p>
                          </div>
                        )}
                      </div>

                      {/* Assets Gallery */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Assets Gallery ({assets.images.length})</h4>
                          <span className="text-[9px] text-neutral-500 font-mono">Click thumbnail to view</span>
                        </div>
                        {assets.images && assets.images.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {assets.images.map((img, idx) => {
                              const ext = img.name.split('.').pop()?.toLowerCase() || '';
                              const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
                              const isPdf = ext === 'pdf' || (img as any).type === 'pdf';
                              const isDoc = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'zip'].includes(ext) || (img as any).type === 'document';

                              return (
                                <div 
                                  key={img.path}
                                  className="bg-neutral-950 border border-neutral-900 hover:border-neutral-800 rounded-xl p-2 flex flex-col gap-1.5 group transition-all relative"
                                >
                                  {/* Thumbnail */}
                                  <div 
                                    onClick={() => setLightboxImage(img.previewUrl)}
                                    className="w-full aspect-square transparency-pattern border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:scale-[1.02] transition-all relative"
                                    title={isPdf ? "Inspect PDF" : isDoc ? "Inspect document" : isVideo ? "Inspect video" : "Inspect image"}
                                  >
                                    {/* Asset type number badge */}
                                    <span className="absolute top-1 left-1 bg-black/70 text-neutral-300 text-[7px] font-mono font-bold px-1.5 py-0.5 rounded z-10 select-none">
                                      {idx + 1}/{assets.images.length}
                                    </span>

                                    {isPdf ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-950/30 text-red-400 p-2">
                                        <FileText className="w-8 h-8 text-red-500 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[7.5px] font-mono font-bold text-red-400 uppercase tracking-tight">PDF DOCUMENT</span>
                                      </div>
                                    ) : isDoc ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/30 text-blue-400 p-2">
                                        <FileCode className="w-8 h-8 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[7.5px] font-mono font-bold text-blue-400 uppercase tracking-tight">{ext.toUpperCase()}</span>
                                      </div>
                                    ) : isVideo ? (
                                      <video 
                                        src={img.previewUrl} 
                                        className="max-w-[95%] max-h-[95%] object-contain group-hover:scale-105 transition-transform duration-300 rounded"
                                        muted
                                        playsInline
                                        loop
                                        onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                        onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                                      />
                                    ) : (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img 
                                        src={img.previewUrl} 
                                        alt="" 
                                        className="max-w-[90%] max-h-[90%] object-contain group-hover:scale-110 transition-transform duration-300"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 pr-6">
                                    <p className="text-[8px] text-neutral-300 truncate font-mono select-all font-medium leading-tight" title={img.name}>
                                      {img.name}
                                    </p>
                                    <p className="text-[7px] text-neutral-500 font-mono mt-0.5 leading-none">{img.size}</p>
                                  </div>
                                  
                                  {/* Download button - always visible */}
                                  <a
                                    href={`${img.previewUrl}?download=true`}
                                    download
                                    className="absolute top-2 right-2 p-1 text-neutral-400 hover:text-white rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer z-10"
                                    title="Download file"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                  </a>
                                  {/* Open in new tab - always visible */}
                                  <button
                                    onClick={() => window.open(img.previewUrl, '_blank')}
                                    className="absolute bottom-2 right-2 p-1 text-neutral-400 hover:text-white rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer z-10"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-neutral-950 border border-neutral-900/80 p-4 rounded-xl text-center">
                            <p className="text-xs text-neutral-500">No assets extracted.</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20 text-xs text-neutral-500">
                      No assets metadata available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white hover:text-neutral-300 text-2xl font-bold p-2 focus:outline-none cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
          
          <div 
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-2 rounded-2xl transparency-pattern border border-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/\.pdf(?:\?|$)/i.test(lightboxImage) ? (
              <iframe 
                src={lightboxImage} 
                className="w-full h-[80vh] rounded-lg border border-neutral-900 bg-white"
                title="PDF Document Preview"
              />
            ) : /\.(mp4|webm|ogg|mov)(?:\?|$)/i.test(lightboxImage) ? (
              <video 
                src={lightboxImage} 
                className="max-w-full max-h-[80vh] object-contain rounded-lg animate-scale-up"
                controls
                autoPlay
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={lightboxImage} 
                alt="Preview" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg animate-scale-up"
              />
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400 font-mono">
            <span>Click outside or press ✕ to close</span>
            <span>|</span>
            <a 
              href={lightboxImage} 
              target="_blank" 
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              Open in tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

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
                    <Folder className="w-4 h-4 text-neutral-400 fill-neutral-500/10" />
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                      File Explorer
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsFilesDrawerOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
                    <div className="text-center py-20 text-[11px] text-neutral-500 font-mono">
                      No files mapped.
                    </div>
                  )}
                </div>
              </div>
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
