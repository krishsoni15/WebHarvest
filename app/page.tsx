'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { URLInput } from '@/components/landing/URLInput';
import { CapturePresets, PresetKey } from '@/components/landing/CapturePresets';
import {
  CaptureConfigDialog,
  CrawlConfigState,
} from '@/components/capture/CaptureConfigDialog';
import { Footer } from '@/components/landing/Footer';
import { RecentJobsModal, RecentJob } from '@/components/landing/RecentJobsModal';
import { SlidersHorizontal } from 'lucide-react';
import { ProductionAdvisoryBanner } from '@/components/landing/ProductionAdvisoryBanner';
import { ProductionPreStartModal } from '@/components/landing/ProductionPreStartModal';
import { DotGridBackground } from '@/components/reactbits/DotGridBackground';
import { HeroBreathingGradient } from '@/components/landing/HeroBreathingGradient';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { HeroScrollIndicator } from '@/components/landing/HeroScrollIndicator';

export default function Home() {
  const router = useRouter();

  // Core URL State
  const [url, setUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('full');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isProductionHost, setIsProductionHost] = useState(false);
  const [isPreStartModalOpen, setIsPreStartModalOpen] = useState(false);

  // Crawl Configuration State - Zero-decision smart deep crawl defaults
  const [config, setConfig] = useState<CrawlConfigState>({
    scopeMode: 'full',
    crawlDepth: 'auto',
    maxPages: 50000,
    maxAssets: 50000,
    maxSizeGb: 'No limit',
    maxDurationMin: 60,
    crawlMode: 'auto',
    domainPolicy: 'same-hostname',
    followInternalLinks: true,
    discoverSitemap: true,
    captureExternalAssets: true,
    followExternalPages: false,
    blockDestructiveActions: true,
    captureRules: {
      html: true,
      css: true,
      js: true,
      images: true,
      fonts: true,
      video: true,
      audio: false,
      documents: true,
      threed: false,
      apiMetadata: true,
      screenshots: true,
      sourceMaps: false,
    },
  });

  // Modal State
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isRecentJobsOpen, setIsRecentJobsOpen] = useState(false);

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  // Load Recent Jobs & Check Production Environment on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('webharvest_recent_jobs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentJobs(parsed);
        }
      }
    } catch { }

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('onrender.com') || (!host.includes('localhost') && !host.includes('127.0.0.1'))) {
        setIsProductionHost(true);
      }
    }
  }, []);

  const handleSelectPreset = (preset: PresetKey) => {
    setSelectedPreset(preset);

    if (preset === 'quick') {
      setConfig((prev) => ({
        ...prev,
        scopeMode: 'single-page',
        crawlDepth: 0,
        maxPages: 1,
        crawlMode: 'fast',
      }));
    } else if (preset === 'website') {
      setConfig((prev) => ({
        ...prev,
        scopeMode: 'tree',
        crawlDepth: 'auto',
        maxPages: 500,
        crawlMode: 'auto',
      }));
    } else if (preset === 'full') {
      setConfig((prev) => ({
        ...prev,
        scopeMode: 'full',
        crawlDepth: 'auto',
        maxPages: 50000,
        maxAssets: 50000,
        crawlMode: 'auto',
      }));
    }
  };

  const handleStartCapture = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    let skipModal = false;
    try {
      skipModal = localStorage.getItem('webharvest_skip_prod_modal') === 'true';
    } catch { }

    if (isProductionHost && !skipModal) {
      setIsPreStartModalOpen(true);
    } else {
      executeCapture();
    }
  };

  const executeCapture = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    let target = trimmedUrl;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }

    setIsLoading(true);
    setServerError(null);
    try {
      const response = await fetch('/api/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          preset: selectedPreset === 'custom' ? undefined : selectedPreset,
          mode: config.crawlMode,
          scopeConfig: {
            mode: config.scopeMode,
            maxDepth: config.crawlDepth === 'auto' ? 5 : config.crawlDepth,
            includeSubdomains: config.domainPolicy === 'include-subdomains',
            followExternalPages: config.followExternalPages,
            blockDestructiveActions: config.blockDestructiveActions,
          },
          captureRules: config.captureRules,
          limits: {
            maxPages: config.maxPages,
            maxAssets: config.maxAssets,
          },
          maxPages: config.maxPages,
          maxAssets: config.maxAssets,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start capture');
      }

      // Record in recent jobs
      const newJob: RecentJob = {
        id: data.id,
        url: target,
        hostname: new URL(target).hostname,
        addedAt: Date.now(),
        status: 'downloading',
      };

      const updated = [newJob, ...recentJobs.filter((j) => j.id !== data.id)].slice(0, 10);
      setRecentJobs(updated);
      try {
        localStorage.setItem('webharvest_recent_jobs', JSON.stringify(updated));
      } catch { }

      // Navigate immediately to live crawl dashboard
      window.location.href = `/mirror/${data.id}`;
    } catch (err: any) {
      setServerError(err.message || 'Capture initialization error');
      setIsLoading(false);
    }
  };

  const handleClearJobs = () => {
    setRecentJobs([]);
    try {
      localStorage.removeItem('webharvest_recent_jobs');
    } catch { }
  };

  const handleDeleteJob = (id: string) => {
    const updated = recentJobs.filter((j) => j.id !== id);
    setRecentJobs(updated);
    try {
      localStorage.setItem('webharvest_recent_jobs', JSON.stringify(updated));
    } catch { }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased relative overflow-x-hidden">
      {/* Full-bleed Architectural Blueprint Grid */}
      <div className="pointer-events-none fixed inset-0 bg-blueprint-grid -z-20 opacity-80" />

      {/* Full-bleed Interactive Dot Canvas across entire screen */}
      <DotGridBackground
        isFixed={true}
        dotSize={1.25}
        gap={24}
      />

      {/* ✨ Serin-style Breathing Animated Gradient Background (Curved Horizon Arc) */}
      <HeroBreathingGradient />

      {/* Navbar */}
      <Navbar
        onOpenRecent={() => setIsRecentJobsOpen(true)}
        recentCount={recentJobs.length}
        onOpenConfig={() => setIsConfigDialogOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Clean Hero */}
        <Hero />

        {/* Crisp URL Input */}
        <URLInput
          url={url}
          onChange={(val) => {
            setUrl(val);
            if (serverError) setServerError(null);
          }}
          onSubmit={handleStartCapture}
          isLoading={isLoading}
          errorMessage={serverError}
        />

        {/* Free Cloud Environment Advisory Banner (Shown on Render / Production) */}
        <ProductionAdvisoryBanner />

        {/* 4 Clean Presets */}
        <CapturePresets
          selectedPreset={selectedPreset}
          onSelect={handleSelectPreset}
          onConfigureCustom={() => setIsConfigDialogOpen(true)}
        />

        {/* Simple Configure Link */}
        <div className="w-full max-w-4xl mx-auto mt-3 mb-2 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsConfigDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Advanced options</span>
          </button>
        </div>

        {/* ✨ Serin-style Floating Down Chevron Scroll Indicator (Lifted 1% up with breathing clearance) */}
        <HeroScrollIndicator />



        {/* Section: What Traditional Tools Lack vs What WebHarvest Solves & Real-World Use Cases */}
        <ScrollReveal delayMs={30}>
          <UseCasesSection />
        </ScrollReveal>

        {/* Section: Detailed Responsive System Architecture, Flow Chart & Tech Behind It */}
        <ScrollReveal delayMs={60}>
          <ArchitectureSection />
        </ScrollReveal>
      </main>

      {/* Footer */}
      <Footer />

      {/* Clean Configuration Dialog */}
      <CaptureConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        targetUrl={url}
        onChangeTargetUrl={setUrl}
        config={config}
        onChangeConfig={(newCfg) => {
          setConfig(newCfg);
          setSelectedPreset('custom');
        }}
        onStartCapture={handleStartCapture}
      />

      {/* Recent Jobs Modal */}
      <RecentJobsModal
        open={isRecentJobsOpen}
        onOpenChange={setIsRecentJobsOpen}
        jobs={recentJobs}
        onClearJobs={handleClearJobs}
        onDeleteJob={handleDeleteJob}
      />

      {/* Production Environment Pre-Start Advisory Modal */}
      <ProductionPreStartModal
        isOpen={isPreStartModalOpen}
        onClose={() => setIsPreStartModalOpen(false)}
        onConfirmCloudStart={() => {
          setIsPreStartModalOpen(false);
          executeCapture();
        }}
        targetUrl={url}
      />
    </div>
  );
}
