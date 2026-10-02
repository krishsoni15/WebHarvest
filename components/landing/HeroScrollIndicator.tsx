'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export function HeroScrollIndicator() {
  const handleScroll = () => {
    const target = document.getElementById('use-cases');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mt-5 sm:mt-7 mb-2 sm:mb-4 relative z-20">
      <button
        type="button"
        onClick={handleScroll}
        className="group inline-flex items-center justify-center p-2 rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label="Scroll to discover features"
      >
        <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-white/55 dark:text-indigo-200/60 group-hover:text-white dark:group-hover:text-white group-hover:scale-110 transition-all duration-300 animate-serin-chevron drop-shadow-[0_2px_10px_rgba(99,102,241,0.65)]" />
      </button>
    </div>
  );
}

export default HeroScrollIndicator;
