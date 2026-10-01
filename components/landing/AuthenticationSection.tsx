'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  ExternalLink,
  Upload,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Key,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export type AuthModeType = 'none' | 'browser' | 'profile' | 'import';

export interface AuthProfileItem {
  id: string;
  name: string;
  target_origin: string;
  last_used_at?: number;
  created_at: number;
}

interface AuthenticationSectionProps {
  authMode: AuthModeType;
  onChangeAuthMode: (mode: AuthModeType) => void;
  targetUrl: string;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
}

export function AuthenticationSection({
  authMode,
  onChangeAuthMode,
  targetUrl,
  activeSessionId,
  setActiveSessionId,
  selectedProfileId,
  setSelectedProfileId,
}: AuthenticationSectionProps) {
  const [profiles, setProfiles] = useState<AuthProfileItem[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Manual browser login modal state
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<'idle' | 'starting' | 'waiting' | 'completing' | 'success' | 'error'>('idle');
  const [loginMessage, setLoginMessage] = useState('');
  const [browserSessionId, setBrowserSessionId] = useState('');

  // Import session modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importName, setImportName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch('/api/auth/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        if (data.profiles?.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data.profiles[0].id);
        }
      }
    } catch {} finally {
      setIsLoadingProfiles(false);
    }
  };

  const startBrowserLogin = async () => {
    const target = targetUrl.trim() || 'https://example.com';
    setLoginStep('starting');
    setLoginMessage('Launching isolated Chromium browser...');
    setIsBrowserModalOpen(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', targetUrl: target }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start browser login');
      }

      setBrowserSessionId(data.sessionId);
      setLoginStep('waiting');
      setLoginMessage(data.message || 'Browser opened. Please complete your login, then click "Confirm Login".');
    } catch (err: any) {
      setLoginStep('error');
      setLoginMessage(err.message || 'Failed to launch browser login');
    }
  };

  const completeBrowserLogin = async (saveAsProfile: boolean = false) => {
    if (!browserSessionId) return;
    setLoginStep('completing');
    setLoginMessage('Extracting authenticated session cookies and storage tokens...');

    try {
      let hostname = 'site.com';
      try {
        if (targetUrl) hostname = new URL(targetUrl).hostname;
      } catch {}

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          sessionId: browserSessionId,
          saveProfile: saveAsProfile,
          profileName: saveAsProfile ? `${hostname} Session` : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login verification failed');
      }

      setLoginStep('success');
      setLoginMessage(`Session captured! Found ${data.cookieCount || 0} session cookies.`);
      setActiveSessionId(browserSessionId);
      onChangeAuthMode('browser');

      if (saveAsProfile) {
        loadProfiles();
      }

      setTimeout(() => {
        setIsBrowserModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setLoginStep('error');
      setLoginMessage(err.message || 'Failed to complete session capture');
    }
  };

  const cancelBrowserLogin = async () => {
    if (browserSessionId) {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', sessionId: browserSessionId }),
      }).catch(() => {});
    }
    setIsBrowserModalOpen(false);
    setLoginStep('idle');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportLoading(true);

    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(importJson.trim());
      } catch {
        throw new Error('Invalid JSON format. Please paste valid Playwright storageState or cookie array.');
      }

      let origin = 'https://example.com';
      try {
        if (targetUrl.trim()) origin = new URL(targetUrl.trim()).origin;
      } catch {}

      const res = await fetch('/api/auth/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importName.trim() || `Imported Profile (${new Date().toLocaleTimeString()})`,
          target_origin: origin,
          storage_state: parsedJson,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save session profile');
      }

      await loadProfiles();
      if (data.profile?.id) {
        setSelectedProfileId(data.profile.id);
      }
      onChangeAuthMode('profile');
      setIsImportModalOpen(false);
      setImportJson('');
      setImportName('');
    } catch (err: any) {
      setImportError(err.message || 'Failed to import session');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/auth/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        if (selectedProfileId === id) {
          const remaining = profiles.filter((p) => p.id !== id);
          setSelectedProfileId(remaining.length > 0 ? remaining[0].id : '');
          if (remaining.length === 0) {
            onChangeAuthMode('none');
          }
        }
      }
    } catch {}
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Authentication
              </h2>
              {authMode !== 'none' && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0 font-mono">
                  {authMode === 'browser' ? 'Browser Session' : authMode === 'profile' ? 'Profile Selected' : 'Imported'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use an isolated browser session to capture pages available after login.
            </p>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            Zero credential storage • Isolated cookies
          </div>
        </div>

        {/* Radio Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. No authentication */}
          <button
            type="button"
            onClick={() => onChangeAuthMode('none')}
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              authMode === 'none'
                ? 'border-foreground bg-muted/60 text-foreground font-medium'
                : 'border-border/60 bg-card/40 hover:bg-card hover:border-border text-muted-foreground'
            }`}
          >
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              authMode === 'none' ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
            }`}>
              {authMode === 'none' && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">No authentication</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                Public pages & assets only
              </div>
            </div>
          </button>

          {/* 2. Login in browser */}
          <button
            type="button"
            onClick={() => {
              onChangeAuthMode('browser');
              if (!activeSessionId) {
                startBrowserLogin();
              }
            }}
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              authMode === 'browser'
                ? 'border-foreground bg-muted/60 text-foreground font-medium'
                : 'border-border/60 bg-card/40 hover:bg-card hover:border-border text-muted-foreground'
            }`}
          >
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              authMode === 'browser' ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
            }`}>
              {authMode === 'browser' && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Login in browser</span>
                {activeSessionId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground" title="Active session ready" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                {activeSessionId ? 'Session captured & ready' : 'Interactive Playwright window'}
              </div>
            </div>
          </button>

          {/* 3. Saved profile */}
          <button
            type="button"
            onClick={() => onChangeAuthMode('profile')}
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              authMode === 'profile'
                ? 'border-foreground bg-muted/60 text-foreground font-medium'
                : 'border-border/60 bg-card/40 hover:bg-card hover:border-border text-muted-foreground'
            }`}
          >
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              authMode === 'profile' ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
            }`}>
              {authMode === 'profile' && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Saved profile</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                {profiles.length > 0 ? `${profiles.length} profile(s) available` : 'No profiles stored'}
              </div>
            </div>
          </button>

          {/* 4. Import authorized session */}
          <button
            type="button"
            onClick={() => {
              onChangeAuthMode('import');
              setIsImportModalOpen(true);
            }}
            className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              authMode === 'import'
                ? 'border-foreground bg-muted/60 text-foreground font-medium'
                : 'border-border/60 bg-card/40 hover:bg-card hover:border-border text-muted-foreground'
            }`}
          >
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
              authMode === 'import' ? 'border-foreground bg-foreground' : 'border-muted-foreground/40'
            }`}>
              {authMode === 'import' && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">Import session</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                Cookie / Storage JSON
              </div>
            </div>
          </button>
        </div>

        {/* Relevant next step when a non-none mode is selected */}
        {authMode === 'browser' && (
          <div className="mt-3.5 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              {activeSessionId ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
                  <span>Session ready for authenticated crawl.</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>No browser session captured yet.</span>
                </>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startBrowserLogin}
              className="text-xs h-7 gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              {activeSessionId ? 'Re-open Browser' : 'Launch Browser Login'}
            </Button>
          </div>
        )}

        {authMode === 'profile' && (
          <div className="mt-3.5 pt-3 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-muted-foreground shrink-0">Select Profile:</span>
              {profiles.length > 0 ? (
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="bg-background border border-border text-foreground rounded-md px-2.5 py-1 text-xs focus:outline-hidden focus:border-foreground max-w-xs"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.target_origin})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground italic">No saved profiles found.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs h-7 gap-1.5"
              >
                <Upload className="w-3 h-3" />
                Import New
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Browser Login Dialog */}
      <Dialog open={isBrowserModalOpen} onOpenChange={(open) => !open && cancelBrowserLogin()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-foreground" />
            Interactive Browser Authentication
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log in manually in the Chromium window that opens. When finished, return here and confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="p-3 rounded-lg border border-border bg-muted/30 font-mono text-xs text-muted-foreground flex items-center gap-2.5">
            {loginStep === 'starting' || loginStep === 'completing' ? (
              <Loader2 className="w-4 h-4 animate-spin text-foreground shrink-0" />
            ) : loginStep === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
            ) : loginStep === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-foreground animate-pulse shrink-0" />
            )}
            <span className="text-foreground">{loginMessage || 'Waiting for browser action...'}</span>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Note: Your credentials are typed directly into the site inside your local browser. WebHarvest only extracts session cookies and storage tokens to authenticate crawl requests.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={cancelBrowserLogin}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => completeBrowserLogin(false)}
            disabled={loginStep !== 'waiting'}
          >
            Confirm Session
          </Button>
          <Button
            size="sm"
            onClick={() => completeBrowserLogin(true)}
            disabled={loginStep !== 'waiting'}
            className="bg-foreground text-background hover:bg-foreground/90 font-medium"
          >
            Save as Reusable Profile
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Import Session JSON Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <form onSubmit={handleImportSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-foreground" />
              Import Authorized Session
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste Playwright storageState JSON or exported browser cookies.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Profile Label
              </label>
              <Input
                placeholder="e.g. Dashboard Staging Admin"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="h-8 text-xs font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Storage State JSON
              </label>
              <textarea
                rows={6}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={'{\n  "cookies": [\n    { "name": "session_id", "value": "xyz...", "domain": ".example.com", "path": "/" }\n  ]\n}'}
                className="w-full bg-background border border-border text-foreground font-mono text-xs rounded-md p-2.5 focus:outline-hidden focus:border-foreground"
                required
              />
            </div>

            {importError && (
              <p className="text-xs text-destructive font-medium">{importError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={importLoading}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {importLoading ? 'Saving...' : 'Import Profile'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
