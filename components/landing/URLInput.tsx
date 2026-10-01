'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClickSpark } from '@/components/reactbits/ClickSpark';

interface URLInputProps {
  url: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function URLInput({
  url,
  onChange,
  onSubmit,
  isLoading,
}: URLInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a target website URL');
      return;
    }

    let target = trimmed;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
      onChange(target);
    }

    try {
      new URL(target);
    } catch {
      setError('Invalid URL format. Example: https://example.com');
      return;
    }

    onSubmit();
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-2">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-card shadow-xs focus-within:ring-1 focus-within:ring-ring">
          <div className="pl-3 text-muted-foreground flex items-center justify-center pointer-events-none">
            <Link2 className="w-4 h-4" />
          </div>

          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => {
              onChange(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://example.com"
            disabled={isLoading}
            autoComplete="url"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            className="flex-1 bg-transparent py-2.5 px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
          />

          <ClickSpark sparkColor="#ffffff" sparkSize={6} sparkRadius={22} sparkCount={10}>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>Capture</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </ClickSpark>
        </div>

        {error && (
          <p className="mt-2 text-xs font-medium text-destructive pl-3 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-destructive" />
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
