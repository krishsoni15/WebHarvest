'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ArrowRight, Clock, Trash2, CheckCircle2, Layers, HardDrive, FileText, Image as ImageIcon, Info, Code2, Zap, ShieldCheck, Sparkles, X, AlertTriangle } from 'lucide-react';

interface RecentJob {
  id: string;
  url: string;
  hostname: string;
  addedAt: number;
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

        // Fetch fresh metadata/overview for each recent job
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
          addedAt: Date.now(),
        };
        const existing: RecentJob[] = JSON.parse(localStorage.getItem('webharvest_recent_jobs') || '[]');
        const updated = [newJob, ...existing.filter((j) => j.id !== data.id)].slice(0, 6);
        localStorage.setItem('webharvest_recent_jobs', JSON.stringify(updated));
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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white transition-all duration-300 shadow-lg hover:scale-102 active:scale-98 cursor-pointer"
            title="About WebHarvest architecture & tech stack"
          >
            <Info className="w-4 h-4 text-emerald-400" />
            <span>About WebHarvest</span>
          </button>

          <a
            href="https://github.com/krishsoni15/WebHarvest"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4.5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 hover:text-white transition-all duration-300 shadow-lg hover:scale-102 active:scale-98 group"
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
        </div>
      </header>

      {/* Premium Top Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-neutral-900/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-2xl flex flex-col items-center text-center space-y-8 z-10 my-auto">
        {/* Brand/Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-inner">
            <Globe className="w-7 h-7 text-white stroke-[1.5]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            WebHarvest
          </h1>
          <p className="text-neutral-400 text-sm">
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
                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono mt-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                          <span>100% Captured</span>
                        </div>
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
