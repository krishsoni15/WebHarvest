'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ArrowRight, Clock, Trash2, CheckCircle2, Layers, HardDrive, FileText, Image as ImageIcon, Info, Code2, Zap, ShieldCheck, Sparkles, X, AlertTriangle, Loader2 } from 'lucide-react';

interface RecentJob {
  id: string;
  url: string;
  hostname: string;
  addedAt: number;
  status?: string;
  techStack?: string;
  size?: string;
  pages?: number;
  images?: number;
  files?: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [starCount, setStarCount] = useState<number | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/github-stars')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stars === 'number') {
          setStarCount(data.stars);
        }
      })
      .catch(() => {});

    // Load recent harvest history from localStorage and fetch real overview stats
    try {
      const saved = localStorage.getItem('webharvest_recent_jobs');
      if (saved) {
        const parsed: RecentJob[] = JSON.parse(saved);
        setRecentJobs(parsed);

        const refreshAllJobs = () => {
          parsed.forEach(async (job) => {
            try {
              const res = await fetch(`/api/mirror/${job.id}/overview`);
              if (res.ok) {
                const data = await res.json();
                setRecentJobs((prev) =>
                  prev.map((j) =>
                    j.id === job.id
                      ? {
                          ...j,
                          status: data.status,
                          techStack: data.techStack,
                          size: data.stats?.size,
                          pages: data.stats?.pages,
                          images: data.stats?.images,
                          files: data.stats?.files,
                        }
                      : j
                  )
                );
              }
            } catch {}
          });
        };

        refreshAllJobs();
        const interval = setInterval(refreshAllJobs, 3000);
        return () => clearInterval(interval);
      }
    } catch {}
  }, []);

  // Handle Esc key to close About Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAboutOpen) {
        setIsAboutOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAboutOpen]);

  const handleMirror = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mirror', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize website mirror');
      }

      // Save to recent jobs history
      try {
        const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
        const host = new URL(formattedUrl).hostname;
        const newJob: RecentJob = {
          id: data.id,
          url: formattedUrl,
          hostname: host,
          status: data.status || 'completed',
          techStack: data.techStack,
          size: data.stats?.size,
          pages: data.stats?.pages,
          images: data.stats?.images,
          files: data.stats?.files,
          addedAt: Date.now(),
        };
        const existing: RecentJob[] = JSON.parse(localStorage.getItem('webharvest_recent_jobs') || '[]');
        const updated = [newJob, ...existing.filter((j) => j.id !== data.id)].slice(0, 6);
        localStorage.setItem('webharvest_recent_jobs', JSON.stringify(updated));

        // Save complete mirror job state for serverless hydration
        localStorage.setItem(`webharvest_job_${data.id}`, JSON.stringify({
          ...newJob,
          ...data,
        }));
      } catch {}

      router.push(`/mirror/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please check the URL and try again.');
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('webharvest_recent_jobs');
    setRecentJobs([]);
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-screen px-4 overflow-hidden py-12">
      {/* Top Header/Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-white" />
          <span className="font-semibold text-white tracking-tight">WebHarvest</span>
        </div>

        <div className="flex items-center gap-3">
          {/* About Us Button */}
          <button
            onClick={() => setIsAboutOpen(true)}
            className="px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 hover:bg-neutral-900 text-xs text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>About WebHarvest</span>
          </button>

          {/* GitHub Star Button */}
          <a
            href="https://github.com/krishsoni15/WebHarvest"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 hover:bg-neutral-900 text-xs text-neutral-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="font-semibold text-white">GitHub</span>
            {starCount !== null && (
              <span className="text-neutral-500 text-[10px] font-mono border-l border-neutral-800 pl-2">
                ★ {starCount}
              </span>
            )}
          </a>
        </div>
      </header>

      {/* Premium Top Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-neutral-900/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <main className="max-w-2xl w-full text-center space-y-8 z-10 pt-10">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl mb-2">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            WebHarvest
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed font-normal">
            Paste any public website URL to capture & mirror
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleMirror} className="w-full space-y-4">
          <div className="relative flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={loading}
                required
                className="w-full h-14 pl-5 pr-5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all duration-300 shadow-inner text-base"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-14 px-6 rounded-xl bg-white text-black font-semibold hover:bg-neutral-250 active:scale-98 transition-all duration-200 shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Mirror Website
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-left px-1">
              {error}
            </p>
          )}
        </form>

        {/* Recent Harvests History Deck */}
        {recentJobs.length > 0 && (
          <div className="w-full pt-6 space-y-3 border-t border-neutral-900/80 animate-fade-in text-left">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-mono font-medium">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                RECENT HARVESTS ({recentJobs.length})
              </span>
              <button
                onClick={handleClearHistory}
                className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                title="Clear local history"
              >
                <Trash2 className="w-3 h-3" />
                Clear History
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentJobs.map((job) => (
                <a
                  key={job.id}
                  href={`/mirror/${job.id}`}
                  className="bg-neutral-950/90 hover:bg-neutral-900/80 border border-neutral-900 hover:border-neutral-800 p-3.5 rounded-xl flex flex-col justify-between transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-emerald-950/20"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 font-bold font-mono text-xs shrink-0">
                        {job.hostname.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {job.hostname}
                        </p>
                        {job.status === 'downloading' ? (
                          <div className="flex items-center gap-1.5 text-[9px] text-amber-400 font-mono mt-0.5 animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin shrink-0" />
                            <span>Capturing in progress...</span>
                          </div>
                        ) : job.status === 'failed' ? (
                          <div className="flex items-center gap-1.5 text-[9px] text-red-400 font-mono mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />
                            <span>Harvest Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                            <span>100% Captured</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>

                  {/* Real Stats & Technology Metadata Pill */}
                  <div className="pt-2 border-t border-neutral-900/80 flex items-center justify-between text-[9.5px] font-mono text-neutral-400">
                    <div className="flex items-center gap-2 text-neutral-400">
                      {job.size && (
                        <span className="flex items-center gap-1" title="Total Size">
                          <HardDrive className="w-2.5 h-2.5 text-neutral-500" />
                          {job.size}
                        </span>
                      )}
                      {job.pages !== undefined && (
                        <span className="flex items-center gap-1" title="Captured Pages">
                          <FileText className="w-2.5 h-2.5 text-neutral-500" />
                          {job.pages} pgs
                        </span>
                      )}
                      {job.images !== undefined && (
                        <span className="flex items-center gap-1" title="Assets">
                          <ImageIcon className="w-2.5 h-2.5 text-neutral-500" />
                          {job.images} img
                        </span>
                      )}
                    </div>

                    {job.techStack && (
                      <span className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-[8.5px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 truncate max-w-[120px]">
                        <Layers className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{job.techStack}</span>
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* About WebHarvest Modal Window */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0 z-0"
            onClick={() => setIsAboutOpen(false)}
          />

          <div className="relative z-10 max-w-2xl w-full glass border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden animate-scale-in text-left">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">About WebHarvest</h2>
                  <p className="text-xs text-neutral-400 font-mono">Next-Gen Website Harvesting & Design Extraction Engine</p>
                </div>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Architecture & Tech Stack Grid */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  Core Technology Stack
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-neutral-950 border border-neutral-900 p-2.5 rounded-xl">
                    <span className="text-[9px] text-neutral-500 block uppercase">Framework</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">Next.js 16</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-900 p-2.5 rounded-xl">
                    <span className="text-[9px] text-neutral-500 block uppercase">UI Engine</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">React 19</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-900 p-2.5 rounded-xl">
                    <span className="text-[9px] text-neutral-500 block uppercase">Styling</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">Tailwind CSS</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-900 p-2.5 rounded-xl">
                    <span className="text-[9px] text-neutral-500 block uppercase">Crawler</span>
                    <span className="text-white font-bold text-xs mt-0.5 block">GNU Wget</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Engine Features & Capabilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-neutral-950/80 border border-neutral-900 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      100% Offline Mirroring
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Recursively scrapes HTML, CSS, JavaScript, fonts, and images with automatic relative link rewriting.
                    </p>
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-900 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Tech Stack Detection
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Detects target platforms including WordPress, Next.js, React, Vue, Shopify, Wix, and Squarespace.
                    </p>
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-900 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Design Assets Drawer
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Extracts color palettes, image assets gallery, and structured file explorer tree in one workspace.
                    </p>
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-900 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Zero-Database Architecture
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Lightweight, zero-DB local-first architecture with instant ZIP export capability.
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Compatibility Guidelines */}
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  URL Compatibility & Guidelines
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Works 100% (Public Web)
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Landing pages, portfolios, blogs, documentation, e-commerce stores, and public web applications.
                    </p>
                  </div>

                  <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Auth & DRM Notice
                    </div>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Protected sites requiring login, paywalled dashboards, OAuth portals, and DRM streams (e.g. YouTube/Netflix) cannot be mirrored.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500 font-mono">
              <span>WebHarvest Engine v1.0</span>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-xs text-neutral-600 tracking-wide">
        &copy; {new Date().getFullYear()} WebHarvest. All rights reserved.
      </footer>
    </div>
  );
}
