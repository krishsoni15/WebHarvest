'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface URLInputProps {
  url: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export function URLInput({
  url,
  onChange,
  onSubmit,
  isLoading,
  errorMessage,
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
    <div className="w-full max-w-xl mx-auto mt-1 sm:mt-2">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl border border-border/80 bg-card/90 shadow-xl backdrop-blur-md hover:border-foreground/30 focus-within:ring-4 focus-within:ring-foreground/10 focus-within:border-foreground/70 transition-all duration-300">
          <div className="pl-2.5 sm:pl-3 text-muted-foreground flex items-center justify-center pointer-events-none shrink-0">
            <Link2 className="w-4 h-4 text-foreground/70" />
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
            className="flex-1 min-w-0 bg-transparent py-2 sm:py-2.5 px-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden font-mono tracking-tight"
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-200 shadow-sm cursor-pointer shrink-0 group active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Capture</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </>
            )}
          </Button>
        </div>

        {(error || errorMessage) && (
          <p className="mt-2 text-xs font-medium text-destructive pl-3 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-destructive" />
            {error || errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
