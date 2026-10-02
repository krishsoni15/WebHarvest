'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SlingButton, { type SlingDirection } from '@/components/ui/SlingButton';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      setIsDark(!document.documentElement.classList.contains('light'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Show after scrolling a little bit down (> 80px)
      if (scrollY > 80) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToTarget = (target: number) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

  const handleSend = (info?: SlingDirection) => {
    const direction = info?.direction;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (direction === 'down') {
      scrollToTarget(maxScroll);
    } else {
      scrollToTarget(0);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 16 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-8 sm:bottom-9 right-6 sm:right-7 z-50 flex items-center justify-center pointer-events-auto group"
        >
          <div className="relative">
            <SlingButton
              onSend={handleSend}
              size={44}
              strokeWidth={2.4}
              armAt={34}
              maxPull={100}
              launchSpeed={2600}
              recoil={0.2}
              flight={85}
              particles={12}
              spread={55}
              axis="any"
              tapSends={true}
              aimOnPull={true}
              defaultRotation={0}
              padColor={isDark ? '#18181b' : '#ffffff'}
              iconColor={isDark ? '#f4f4f5' : '#18181b'}
              accentColor={isDark ? '#f4f4f5' : '#18181b'}
              wellColor={isDark ? '#0c0c0e' : '#f4f4f5'}
              bandColor={isDark ? '#52525b' : '#a1a1aa'}
              ariaLabel="Scroll to top"
            />

            {/* Clean Monochrome Tooltip */}
            <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-neutral-950 dark:text-white text-xs font-sans font-medium tracking-normal whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none border border-neutral-700/80 dark:border-white/15 flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m18 15-6-6-6 6"/>
              </svg>
              <span className="font-semibold text-white">Scroll to Top</span>
              <span className="text-neutral-500 text-[10px]">•</span>
              <span className="text-[11px] text-neutral-400 font-normal">Tap or sling</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default ScrollToTop;
