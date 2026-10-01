'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  ExternalLink,
  Code,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  FileCode,
  Folder,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Lock,
  Key,
  ShieldCheck,
  Shield,
  Zap,
  Sparkles,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  X,
  AlertCircle,
  Download,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectDashboardCard } from './ProjectDashboardCard';
import { AssetItem } from './AssetsTab';
import { FileNode } from './FilesTab';

interface PreviewTabProps {
  id: string;
  previewPath: string;
  onChangePreviewPath: (path: string) => void;
  hostname: string;
  url?: string;
  htmlPages?: string[];
  fileTree?: FileNode[];
  isCrawling?: boolean;
  totalSize?: string;
  filesCount?: number;
  pagesCount?: number;
  assetsCount?: number;
  techStack?: string;
  colors?: string[];
  assetsList?: AssetItem[];
  crawlLogs?: string;
  onBrowseFiles?: () => void;
  onBrowseAssets?: () => void;
  onOpenLogs?: () => void;
  onDownloadZip?: () => void;
  isDownloadingZip?: boolean;
}

export function PreviewTab({
  id,
  previewPath = 'index.html',
  onChangePreviewPath,
  hostname = 'example.com',
  url = '',
  htmlPages = ['index.html'],
  fileTree = [],
  isCrawling = false,
  totalSize = '0 B',
  filesCount = 0,
  pagesCount = 0,
  assetsCount = 0,
  techStack = 'Next.js (React)',
  colors = ['#e11d48', '#06b6d4', '#10b981', '#84cc16', '#a855f7'],
  assetsList = [],
  crawlLogs = '',
  onBrowseFiles = () => {},
  onBrowseAssets = () => {},
  onOpenLogs,
  onDownloadZip = () => {},
  isDownloadingZip = false,
}: PreviewTabProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'pages' | 'assets' | 'files'>('dashboard');
  const [viewport, setViewport] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('desktop');
  const [pageFilter, setPageFilter] = useState<'all' | 'dashboards' | 'apps' | 'auth'>('all');
  const [assetFilter, setAssetFilter] = useState<'all' | 'image' | 'css' | 'js' | 'font'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [pageSourceCode, setPageSourceCode] = useState<string>('');
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isWideView, setIsWideView] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPagesDrawerOpen, setIsPagesDrawerOpen] = useState(false);

  // Automatically select first valid page if previewPath is index.html but index.html is not in htmlPages
  useEffect(() => {
    if (htmlPages.length > 0 && (!previewPath || previewPath === 'index.html')) {
      if (!htmlPages.includes('index.html') && htmlPages[0]) {
        onChangePreviewPath(htmlPages[0]);
      }
    }
  }, [htmlPages, previewPath, onChangePreviewPath]);

  const cleanPath = previewPath.replace(/^\//, '') || 'index.html';
  const previewUrl = `/api/mirror/${id}/preview/${cleanPath}`;
  const displayCleanPath = cleanPath.startsWith(hostname + '/')
    ? cleanPath.slice(hostname.length + 1)
    : cleanPath;
  const displayUrl = `https://${hostname}/${displayCleanPath === 'index.html' ? '' : displayCleanPath}`;

  // Smooth reload helper that doesn't flash or unmount the iframe
  const handleReloadFrame = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.reload();
      } else {
        setKey((k) => k + 1);
      }
    } catch {
      setKey((k) => k + 1);
    }
  };

  // Auto-refresh iframe smoothly without blank flash if user specifically enabled auto-sync
  useEffect(() => {
    if (!isCrawling || !autoRefresh) return;
    const interval = setInterval(() => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.location.reload();
        }
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [isCrawling, autoRefresh]);

  // Fetch page source code whenever selected page changes or code tab is opened
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingSource(true);

    fetch(previewUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch page source');
        return res.text();
      })
      .then((text) => {
        if (!isCancelled) {
          setPageSourceCode(text);
          setIsLoadingSource(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPageSourceCode('<!-- Unable to load raw page source for this resource -->');
          setIsLoadingSource(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id, cleanPath, previewUrl]);

  const handleCopySource = () => {
    navigator.clipboard.writeText(pageSourceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenExternally = () => {
    window.open(previewUrl, '_blank');
  };

  // Categorize pages for fast navigation
  const dashboardPages = htmlPages.filter((p) => p.toLowerCase().includes('dashboard'));
  const appPages = htmlPages.filter(
    (p) =>
      p.toLowerCase().includes('apps/') ||
      p.toLowerCase().includes('calendar') ||
      p.toLowerCase().includes('chat') ||
      p.toLowerCase().includes('email') ||
      p.toLowerCase().includes('kanban')
  );
  const authPages = htmlPages.filter(
    (p) =>
      p.toLowerCase().includes('login') ||
      p.toLowerCase().includes('register') ||
      p.toLowerCase().includes('forgot-password') ||
      p.toLowerCase().includes('auth')
  );

  const pagesByFilter =
    pageFilter === 'dashboards'
      ? dashboardPages
      : pageFilter === 'apps'
      ? appPages
      : pageFilter === 'auth'
      ? authPages
      : htmlPages;

  const filteredPages = pagesByFilter.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to extract clean human-readable titles from captured paths
  const getPageDisplayName = (pagePath: string) => {
    const normalized = pagePath.replace(/\/index\.html$/i, '').replace(/\/index$/i, '').replace(/\.html$/i, '');
    const segments = normalized.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'Dashboard';
    if (last.toLowerCase() === 'analytics') return 'Analytics';
    if (last.toLowerCase() === 'crm') return 'CRM';
    if (last.toLowerCase() === 'ecommerce') return 'eCommerce';
    if (last.toLowerCase() === 'calendar') return 'Calendar';
    if (last.toLowerCase() === 'chat') return 'Chat';
    if (last.toLowerCase() === 'email') return 'Email';
    if (last.toLowerCase() === 'kanban') return 'Kanban';
    if (last.toLowerCase() === 'faq') return 'FAQ';
    if (last.toLowerCase() === 'pricing') return 'Pricing';
    if (last.toLowerCase() === 'landing-page') return 'Landing Page';
    if (last.toLowerCase() === 'login') return 'Login';
    if (last.toLowerCase() === 'register') return 'Register';
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  // Check if current page is an authentication portal
  const isLoginPortal =
    cleanPath.toLowerCase().includes('login') ||
    cleanPath.toLowerCase().includes('signin') ||
    (cleanPath.toLowerCase().includes('auth') && !cleanPath.toLowerCase().includes('author')) ||
    (pageSourceCode.toLowerCase().includes('sign-in to your account') && pageSourceCode.toLowerCase().includes('password'));

  const isCurrentlyOnDashboard =
    cleanPath.includes('dashboards') ||
    cleanPath.includes('apps/') ||
    cleanPath.includes('pricing') ||
    cleanPath.includes('faq');

  // Extract detected demo credentials
  const demoMatch = pageSourceCode.match(
    /(?:Email|User):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_-]+)\s*[/|,\s]+\s*Pass(?:word)?:\s*([^\s<"'\n]+)/i
  );
  const detectedEmail = demoMatch ? demoMatch[1] : (hostname.includes('pixinvent') || cleanPath.includes('vuexy') ? 'admin@vuexy.com' : 'admin@demo.com');
  const detectedPass = demoMatch ? demoMatch[2] : 'admin';

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStatusMsg, setLoginStatusMsg] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState(detectedEmail);
  const [authPassword, setAuthPassword] = useState(detectedPass);
  const [showPassword, setShowPassword] = useState(false);

  // Sync auth credentials when detected values change
  useEffect(() => {
    if (detectedEmail && (!authEmail || authEmail === 'admin@demo.com')) {
      setAuthEmail(detectedEmail);
    }
    if (detectedPass && (!authPassword || authPassword === 'admin')) {
      setAuthPassword(detectedPass);
    }
  }, [detectedEmail, detectedPass]);

  // Find the primary authenticated dashboard / app route to jump into upon authentication
  const getBestDashboardPage = () => {
    const candidates = [
      htmlPages.find((p) => p.includes('dashboards/analytics') || p.includes('dashboards-analytics')),
      htmlPages.find((p) => p.includes('dashboards/crm') || p.includes('dashboards-crm')),
      htmlPages.find((p) => p.includes('dashboards/ecommerce') || p.includes('dashboards-ecommerce')),
      htmlPages.find((p) => p.includes('dashboards/logistics')),
      htmlPages.find((p) => p.includes('dashboards/academy')),
      htmlPages.find((p) => p.includes('dashboards')),
      htmlPages.find((p) => p.includes('apps/calendar')),
      htmlPages.find((p) => p.includes('apps/chat')),
      htmlPages.find((p) => p.includes('apps/email')),
      htmlPages.find((p) => p.includes('apps/kanban')),
      htmlPages.find((p) => p.includes('apps/')),
      htmlPages.find(
        (p) =>
          !p.toLowerCase().includes('login') &&
          !p.toLowerCase().includes('register') &&
          !p.toLowerCase().includes('forgot-password') &&
          !p.toLowerCase().includes('auth') &&
          p !== 'index.html' &&
          !p.includes('top-20') &&
          !p.includes('blog')
      ),
      htmlPages.find((p) => !p.toLowerCase().includes('login') && p !== 'index.html'),
    ];
    return candidates.find(Boolean) || null;
  };

  const hasDashboardPages = Boolean(getBestDashboardPage());

  const handleUnlockPreviewSession = (emailToUse?: string) => {
    const finalEmail = emailToUse || authEmail || detectedEmail;
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.localStorage.setItem(
          'userData',
          JSON.stringify({
            id: 1,
            role: 'admin',
            fullName: 'Vuexy Administrator',
            username: 'admin',
            email: finalEmail,
          })
        );
        win.localStorage.setItem('accessToken', 'webharvest_demo_authenticated_token');
        setKey((k) => k + 1);
      }
    } catch {}
  };

  const handleAutoLoginHarvest = async (emailToUse?: string, passToUse?: string) => {
    const finalEmail = emailToUse || authEmail || detectedEmail;
    const finalPass = passToUse || authPassword || detectedPass;
    setIsLoggingIn(true);
    setLoginError(null);
    setLoginStatusMsg(`Authenticating as ${finalEmail}...`);

    try {
      // 1. Immediately inject auth credentials into localStorage & cookies
      handleUnlockPreviewSession(finalEmail);

      // 2. Dispatch background harvester to re-capture all dashboards with verified credentials
      const res = await fetch(`/api/mirror/${id}/auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, password: finalPass, autoDetect: false }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        const errMsg = data.error || 'Authentication rejected: Invalid user ID or password.';
        setLoginError(errMsg);
        setLoginStatusMsg(null);
        setIsLoggingIn(false);
        return;
      }

      // 3. Immediately transition the preview iframe to the authenticated dashboard!
      setLoginError(null);
      setLoginStatusMsg('Authenticated! Unlocking app dashboards...');
      const targetDashboard = getBestDashboardPage();
      if (targetDashboard && targetDashboard !== cleanPath) {
        onChangePreviewPath(targetDashboard);
      }

      setTimeout(() => {
        setIsLoggingIn(false);
        setLoginStatusMsg(null);
        setKey((k) => k + 1);
      }, 1000);
    } catch (err: any) {
      setLoginError(`Authentication error: ${err.message}`);
      setLoginStatusMsg(null);
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'webharvest:login_submit') {
        const userEmail = e.data.email || detectedEmail;
        handleUnlockPreviewSession(userEmail);
        const targetDashboard = getBestDashboardPage();
        if (targetDashboard && targetDashboard !== cleanPath) {
          onChangePreviewPath(targetDashboard);
        }
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [detectedEmail, htmlPages, cleanPath, onChangePreviewPath]);

  const lines = pageSourceCode.split('\n');

  const handleBrowseFiles = () => {
    setSidebarTab('pages');
    onBrowseFiles();
  };

  const handleBrowseAssets = () => {
    setSidebarTab('assets');
    onBrowseAssets();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-2.5 w-full h-full flex-1 min-h-0 relative overflow-hidden">
      {/* Main Browser / Code Frame */}
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-card flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300">
        {/* Browser Top Navigation Bar */}
        <div className="bg-muted/40 border-b border-border px-3 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0">
          {/* Back, Forward, Reload */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                try {
                  iframeRef.current?.contentWindow?.history.back();
                } catch {}
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  iframeRef.current?.contentWindow?.history.forward();
                } catch {}
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReloadFrame}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Reload frame"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Address Bar */}
          <div className="flex-1 max-w-lg mx-2 flex items-center justify-between gap-2 bg-background border border-border rounded-md px-2.5 py-1 text-xs font-mono text-foreground truncate">
            <div className="flex items-center gap-2 truncate flex-1">
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="truncate">{displayUrl}</span>
            </div>
            {isCrawling && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-foreground/10 text-foreground border border-border shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-ping" />
                <span>LIVE STREAM</span>
              </span>
            )}
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-1.5">
            {isCrawling && (
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`hidden md:flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                  autoRefresh
                    ? 'border-foreground/30 bg-muted text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                title={autoRefresh ? 'Auto-refresh is active' : 'Click to enable auto-refresh'}
              >
                <RotateCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                <span>Auto-sync</span>
              </button>
            )}
            {/* Toggle View: Preview vs Code */}
            <div className="flex items-center bg-background border border-border rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
                  viewMode === 'preview'
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
                  viewMode === 'code'
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>

            {/* Viewport Toggles (only in preview mode) */}
            {viewMode === 'preview' && (
              <div className="hidden sm:flex items-center bg-background border border-border rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    viewport === 'desktop'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Desktop (100% Widescreen)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('laptop')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    viewport === 'laptop'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Laptop (1024px MacBook)"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('tablet')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    viewport === 'tablet'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tablet (768px iPad)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`p-1 rounded text-xs cursor-pointer ${
                    viewport === 'mobile'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Mobile (390px Phone)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 hidden xl:inline">
                  {viewport === 'desktop' ? 'Full' : viewport === 'laptop' ? '1024px' : viewport === 'tablet' ? '768px' : '390px'}
                </span>
              </div>
            )}

            {/* Sidebar / View Toggle — single unified button */}
            <button
              type="button"
              onClick={() => {
                if (isWideView) {
                  // Exit wide view
                  setIsWideView(false);
                  setIsPagesDrawerOpen(false);
                  setIsSidebarCollapsed(false);
                } else if (isSidebarCollapsed) {
                  // Restore sidebar
                  setIsSidebarCollapsed(false);
                } else {
                  // Enter wide view (hide sidebar, expand preview)
                  setIsWideView(true);
                  setIsSidebarCollapsed(true);
                }
              }}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer border flex items-center gap-1 font-mono text-[11px] ${
                isWideView
                  ? 'border-foreground/40 bg-foreground text-background font-semibold'
                  : isSidebarCollapsed
                  ? 'border-foreground/30 bg-muted text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              title={isWideView ? 'Exit wide view, restore sidebar' : isSidebarCollapsed ? 'Show sidebar' : 'Full width preview'}
            >
              {isWideView ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Normal</span>
                </>
              ) : isSidebarCollapsed ? (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sidebar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Wide View</span>
                </>
              )}
            </button>

            {/* In Wide View: Drawer trigger for Pages & Dashboard */}
            {isWideView && (
              <button
                type="button"
                onClick={() => setIsPagesDrawerOpen(!isPagesDrawerOpen)}
                className={`p-1.5 rounded text-xs border transition-colors cursor-pointer flex items-center gap-1 font-mono text-[11px] ${
                  isPagesDrawerOpen
                    ? 'border-foreground/30 bg-muted text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
                title="Toggle Pages & Dashboard Drawer"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
                <span>Pages ({htmlPages.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenExternally}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Open standalone preview in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Content: Live Preview Frame OR Monospace Source Code */}
        <div className="bg-background flex-1 min-h-0 h-full overflow-hidden flex flex-col items-center justify-center">
          {/* Smart Interactive Authentication Bar (Shown on Login / Auth Portals) */}
          {isLoginPortal && viewMode === 'preview' && (
            <div className="w-full bg-zinc-950 border-b border-border/80 px-4 py-2 text-xs animate-in fade-in shrink-0">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Left: Lock Indicator & Guidance */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">Target Requires Authentication</span>
                      {detectedEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthEmail(detectedEmail);
                            setAuthPassword(detectedPass);
                          }}
                          className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition-colors cursor-pointer"
                          title="Click to fill detected demo credentials"
                        >
                          Demo Found: {detectedEmail} / {detectedPass}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Edit credentials below and press continue to enter and unlock internal dashboards.
                    </p>
                  </div>
                </div>

                {/* Right: In-line Editable Credentials and Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAutoLoginHarvest(authEmail, authPassword);
                    }}
                    placeholder="Username or Email"
                    className="bg-zinc-900 border border-border/80 rounded-md px-2.5 py-1.5 text-xs text-foreground font-mono w-44 focus:outline-hidden focus:border-foreground"
                  />

                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAutoLoginHarvest(authEmail, authPassword);
                      }}
                      placeholder="Password"
                      className="bg-zinc-900 border border-border/80 rounded-md pl-2.5 pr-7 py-1.5 text-xs text-foreground font-mono w-28 focus:outline-hidden focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleAutoLoginHarvest(authEmail, authPassword)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isLoggingIn ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{loginStatusMsg || 'Entering App...'}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Continue & Enter App →</span>
                      </>
                    )}
                  </button>

                  {hasDashboardPages && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = getBestDashboardPage();
                        if (target) {
                          handleUnlockPreviewSession(authEmail);
                          onChangePreviewPath(target);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
                      title="Directly bypass login screen into captured dashboards"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Bypass to Dashboard</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Session Status Bar (Shown when already inside a Dashboard / App) */}
          {isCurrentlyOnDashboard && !isLoginPortal && viewMode === 'preview' && (
            <div className="mx-3 my-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-foreground">Authenticated Session Active</span>
                <span className="font-mono text-[11px] text-emerald-400">({authEmail || detectedEmail})</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">Dashboards:</span>
                {(() => {
                  const seen = new Set<string>();
                  const candidates = [
                    htmlPages.find((p) => p.includes('dashboards/analytics')),
                    htmlPages.find((p) => p.includes('dashboards/crm')),
                    htmlPages.find((p) => p.includes('dashboards/ecommerce')),
                    htmlPages.find((p) => p.includes('apps/calendar')),
                    htmlPages.find((p) => p.includes('apps/chat')),
                    htmlPages.find((p) => p.includes('apps/email')),
                  ].filter(Boolean) as string[];

                  const uniqueList = candidates.filter((p) => {
                    const name = getPageDisplayName(p);
                    if (seen.has(name)) return false;
                    seen.add(name);
                    return true;
                  });

                  return uniqueList.map((dashPage, i) => {
                    const name = getPageDisplayName(dashPage);
                    const isActive = cleanPath === dashPage || cleanPath.includes(name.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onChangePreviewPath(dashPage)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-xs'
                            : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  });
                })()}
                <button
                  type="button"
                  onClick={() => {
                    const loginP = htmlPages.find((p) => p.includes('login')) || 'index.html';
                    onChangePreviewPath(loginP);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Relog
                </button>
              </div>
            </div>
          )}

          {viewMode === 'preview' ? (
            <div
              className={`w-full h-full flex-1 min-h-0 flex justify-center items-center bg-muted/20 ${
                viewport === 'desktop' ? 'p-0 overflow-hidden' : 'p-3 sm:p-4 overflow-auto'
              }`}
            >
              {viewport === 'desktop' ? (
                /* Desktop Monitor View: 100% full responsive matching remaining viewport */
                <div className="w-full h-full flex-1 min-h-0 overflow-hidden bg-white border-x-0 border-y border-border shadow-inner">
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title={`Mirror preview: ${hostname}`}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : viewport === 'laptop' ? (
                /* Laptop MacBook Chassis */
                <div className="flex flex-col items-center my-auto transition-all duration-300 w-full max-w-[1040px]">
                  {/* Laptop Top Display Lid */}
                  <div className="w-full h-[640px] rounded-t-2xl border-[10px] border-b-0 border-zinc-900 bg-zinc-900 shadow-2xl relative ring-1 ring-zinc-700/60 overflow-hidden flex flex-col">
                    {/* Top Screen Bezel with Webcam Dot */}
                    <div className="h-4 bg-zinc-900 flex items-center justify-center relative shrink-0">
                      <div className="w-2 h-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center">
                        <div className="w-0.5 h-0.5 rounded-full bg-emerald-500/80 animate-pulse" />
                      </div>
                    </div>
                    {/* Display Frame */}
                    <div className="flex-1 bg-white overflow-hidden relative">
                      <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        title={`Mirror preview: ${hostname}`}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                  </div>
                  {/* Laptop Base & Hinge */}
                  <div className="w-[102%] h-4 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 rounded-b-xl border-t border-zinc-600/70 shadow-2xl flex items-center justify-center relative">
                    <div className="w-16 h-1 bg-zinc-950/80 rounded-full" />
                  </div>
                </div>
              ) : viewport === 'tablet' ? (
                /* Tablet iPad Chassis */
                <div className="flex flex-col items-center my-auto transition-all duration-300">
                  <div className="w-[768px] max-w-full h-[650px] rounded-[30px] border-[12px] border-zinc-900 bg-zinc-900 shadow-2xl relative ring-1 ring-zinc-700/60 overflow-hidden flex flex-col">
                    {/* iPad Top Bezel with Camera Dot */}
                    <div className="h-3.5 bg-zinc-900 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
                    </div>
                    {/* Display Frame */}
                    <div className="flex-1 bg-white overflow-hidden relative">
                      <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        title={`Mirror preview: ${hostname}`}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                    {/* iPad Bottom Bezel with Home Indicator */}
                    <div className="h-3.5 bg-zinc-900 flex items-center justify-center shrink-0">
                      <div className="w-28 h-1 bg-zinc-600 rounded-full" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Mobile iPhone Pro Chassis */
                <div className="flex flex-col items-center my-auto transition-all duration-300">
                  <div className="w-[390px] max-w-full h-[700px] rounded-[46px] border-[12px] border-zinc-900 bg-zinc-900 shadow-2xl relative ring-1 ring-zinc-700/60 overflow-hidden flex flex-col">
                    {/* iPhone Dynamic Island Notch */}
                    <div className="h-6 bg-zinc-900 flex items-center justify-center shrink-0 pt-1">
                      <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end pr-2 shadow-inner ring-1 ring-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 ring-1 ring-zinc-800" />
                      </div>
                    </div>
                    {/* Display Frame */}
                    <div className="flex-1 bg-white overflow-hidden relative">
                      <iframe
                        ref={iframeRef}
                        src={previewUrl}
                        title={`Mirror preview: ${hostname}`}
                        className="w-full h-full border-0 bg-white"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                    {/* iPhone Bottom Home Swipe Bar */}
                    <div className="h-4 bg-zinc-900 flex items-center justify-center shrink-0">
                      <div className="w-28 h-1 bg-zinc-500/80 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col bg-card overflow-hidden">
              {/* Code Bar */}
              <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground">{cleanPath}</span>
                  <span>•</span>
                  <span>{lines.length} lines</span>
                  <span>•</span>
                  <span>{(new Blob([pageSourceCode]).size / 1024).toFixed(1)} KB</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySource}
                  className="h-7 text-xs gap-1.5 px-2.5 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-foreground" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy HTML</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Code Inspector with Line Numbers */}
              <div className="flex-1 min-h-0 overflow-auto flex font-mono text-xs leading-relaxed select-text bg-background">
                {isLoadingSource ? (
                  <div className="p-6 text-muted-foreground">Loading page source...</div>
                ) : (
                  <>
                    {/* Line numbers column */}
                    <div className="py-4 pl-3 pr-2 select-none text-muted-foreground/40 text-right bg-muted/10 border-r border-border shrink-0 min-w-[3rem]">
                      {lines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Code lines */}
                    <pre className="p-4 overflow-x-auto text-foreground/90 whitespace-pre flex-1">
                      {pageSourceCode}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right slim sidebar: 10-15% narrower horizontally with seamless in-place tabs */}
      {!isWideView && !isSidebarCollapsed && (
        <div className="w-full lg:w-[275px] xl:w-[295px] 2xl:w-[315px] shrink-0 flex flex-col space-y-2 h-full min-h-0 overflow-hidden">
          {/* View Switcher: Dashboard vs Pages vs Assets vs Files */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-xs shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => setSidebarTab('dashboard')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer text-center truncate ${
                sidebarTab === 'dashboard'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Dashboard"
            >
              Dash
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('pages')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer text-center truncate ${
                sidebarTab === 'pages'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`Captured Pages (${htmlPages.length})`}
            >
              Pages ({htmlPages.length})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('assets')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer text-center truncate ${
                sidebarTab === 'assets'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`Captured Assets (${assetsCount || assetsList.length})`}
            >
              Assets
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('files')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer text-center truncate ${
                sidebarTab === 'files'
                  ? 'bg-foreground text-background font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Files Directory"
            >
              Files
            </button>
          </div>

          {/* Tab 1: Dashboard */}
          {sidebarTab === 'dashboard' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
              <ProjectDashboardCard
                id={id}
                hostname={hostname}
                url={url}
                totalSize={totalSize}
                filesCount={filesCount}
                pagesCount={pagesCount || htmlPages.length}
                assetsCount={assetsCount}
                lastCapturedPage={cleanPath}
                techStack={techStack}
                colors={colors}
                assetsList={assetsList}
                crawlLogs={crawlLogs}
                onBrowseFiles={handleBrowseFiles}
                onBrowseAssets={handleBrowseAssets}
                onOpenLogs={onOpenLogs}
                onDownloadZip={onDownloadZip}
                isDownloadingZip={isDownloadingZip}
              />
            </div>
          )}

          {/* Tab 2: Pages */}
          {sidebarTab === 'pages' && (
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col justify-between shadow-lg flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-xs font-semibold text-foreground font-mono">
                    Captured Pages
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {htmlPages.length} {htmlPages.length === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                {/* Quick Category Filter Chips */}
                <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `All (${htmlPages.length})` },
                    { id: 'dashboards', label: `Dashboards (${dashboardPages.length})` },
                    { id: 'apps', label: `Apps (${appPages.length})` },
                    { id: 'auth', label: `Auth (${authPages.length})` },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPageFilter(cat.id as any)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer shrink-0 ${
                        pageFilter === cat.id
                          ? 'bg-foreground text-background font-bold shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search pages input */}
                <div className="relative mb-3 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search captured pages..."
                    className="w-full bg-background border border-border rounded-md pl-8 pr-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  />
                </div>

                {/* Pages list */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                  {filteredPages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No matching pages found
                    </div>
                  ) : (
                    filteredPages.map((page, idx) => {
                      const isSelected = cleanPath === page;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onChangePreviewPath(page)}
                          className={`w-full text-left p-2 rounded-md transition-colors text-xs font-mono flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-foreground text-background font-semibold'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{page}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Assets */}
          {sidebarTab === 'assets' && (
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col justify-between shadow-lg flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-xs font-semibold text-foreground font-mono">
                    Captured Assets
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {assetsList.length} items
                  </span>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'image', label: 'Images' },
                    { id: 'css', label: 'CSS' },
                    { id: 'js', label: 'JS' },
                    { id: 'font', label: 'Fonts' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAssetFilter(cat.id as any)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer shrink-0 ${
                        assetFilter === cat.id
                          ? 'bg-foreground text-background font-bold shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search assets input */}
                <div className="relative mb-3 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Search assets..."
                    className="w-full bg-background border border-border rounded-md pl-8 pr-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  />
                </div>

                {/* Assets list */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                  {assetsList.filter((a) => {
                    if (assetFilter !== 'all' && a.type !== assetFilter) return false;
                    if (assetSearchQuery) {
                      const q = assetSearchQuery.toLowerCase();
                      return a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q);
                    }
                    return true;
                  }).length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No assets found
                    </div>
                  ) : (
                    assetsList
                      .filter((a) => {
                        if (assetFilter !== 'all' && a.type !== assetFilter) return false;
                        if (assetSearchQuery) {
                          const q = assetSearchQuery.toLowerCase();
                          return a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map((asset, idx) => {
                        const isSelected = cleanPath === asset.path.replace(/^\//, '');

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (asset.path) {
                                onChangePreviewPath(asset.path.replace(/^\//, ''));
                              }
                            }}
                            className={`p-2 rounded-lg border transition-all text-xs font-mono flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-muted/80 border-foreground/40 text-foreground font-semibold'
                                : 'bg-muted/20 border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              {asset.type === 'image' && asset.previewUrl ? (
                                <div className="w-5 h-5 rounded bg-muted overflow-hidden shrink-0 border border-border">
                                  <img
                                    src={asset.previewUrl}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <Layers className="w-4 h-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="truncate">
                                <span className="block truncate text-foreground text-[11px]">
                                  {asset.name}
                                </span>
                                <span className="block text-[9px] text-muted-foreground">
                                  {asset.size} • {asset.type}
                                </span>
                              </div>
                            </div>

                            <a
                              href={`/api/mirror/${id}/preview/${asset.path.replace(/^\//, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                              title="Open asset externally"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Files */}
          {sidebarTab === 'files' && (
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col justify-between shadow-lg flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-xs font-semibold text-foreground font-mono">
                    Files Directory
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {filesCount || htmlPages.length + assetsList.length} files
                  </span>
                </div>

                {/* Search files input */}
                <div className="relative mb-3 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search all files..."
                    className="w-full bg-background border border-border rounded-md pl-8 pr-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  />
                </div>

                {/* Files tree / list */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                  {(() => {
                    const allItems: { name: string; path: string; isHtml: boolean }[] = [];
                    function collect(nodes: FileNode[]) {
                      for (const n of nodes) {
                        if (n.type === 'file') {
                          allItems.push({
                            name: n.name,
                            path: n.path.replace(/^\//, ''),
                            isHtml: n.name.endsWith('.html') || n.name.endsWith('.htm'),
                          });
                        }
                        if (n.children) collect(n.children);
                      }
                    }
                    if (fileTree && fileTree.length > 0) {
                      collect(fileTree);
                    } else {
                      htmlPages.forEach((p) =>
                        allItems.push({ name: p.split('/').pop() || p, path: p, isHtml: true })
                      );
                      assetsList.forEach((a) =>
                        allItems.push({
                          name: a.name,
                          path: a.path.replace(/^\//, ''),
                          isHtml: false,
                        })
                      );
                    }

                    const filtered = allItems.filter((item) => {
                      if (!fileSearchQuery) return true;
                      const q = fileSearchQuery.toLowerCase();
                      return item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 text-xs text-muted-foreground">
                          No files found
                        </div>
                      );
                    }

                    return filtered.map((file, idx) => {
                      const isSelected = cleanPath === file.path;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onChangePreviewPath(file.path)}
                          className={`w-full text-left p-1.5 rounded-md transition-colors text-xs font-mono flex items-center justify-between gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-foreground text-background font-semibold'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {file.isHtml ? (
                              <FileCode className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            )}
                            <span className="truncate">{file.path}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] uppercase font-bold shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Drawer for Pages when Wide View is active */}
      {isWideView && isPagesDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-card border-l border-border shadow-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Captured Pages</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {htmlPages.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPagesDrawerOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `All (${htmlPages.length})` },
              { id: 'dashboards', label: `Dashboards (${dashboardPages.length})` },
              { id: 'apps', label: `Apps (${appPages.length})` },
              { id: 'auth', label: `Auth (${authPages.length})` },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPageFilter(cat.id as any)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer shrink-0 ${
                  pageFilter === cat.id
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captured pages..."
              className="w-full bg-background border border-border rounded-md pl-8 pr-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredPages.map((page, idx) => {
              const isSelected = cleanPath === page;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChangePreviewPath(page);
                    setIsPagesDrawerOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md transition-colors text-xs font-mono flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-foreground text-background font-semibold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{page}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold shrink-0">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

