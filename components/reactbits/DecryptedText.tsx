'use client';

import React, { useEffect, useState, useRef } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover';
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = DEFAULT_CHARS,
  className = '',
  encryptedClassName = 'opacity-60 font-mono',
  parentClassName = '',
  animateOn = 'hover',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLSpanElement>(null);

  const availableChars = useOriginalCharsOnly
    ? Array.from(new Set(text.split(''))).filter((char) => char !== ' ').join('') || DEFAULT_CHARS
    : characters;

  const triggerAnimation = () => {
    setIsScrambling(true);
    setRevealedIndices(new Set());
  };

  useEffect(() => {
    if (animateOn === 'view') {
      triggerAnimation();
    }
  }, [text, animateOn]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let iteration = 0;

    if (isScrambling) {
      interval = setInterval(() => {
        setDisplayText(() => {
          return text
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' ';
              if (revealedIndices.has(index)) return text[index];

              if (sequential) {
                let shouldReveal = false;
                if (revealDirection === 'start') {
                  shouldReveal = index <= iteration;
                } else if (revealDirection === 'end') {
                  shouldReveal = index >= text.length - 1 - iteration;
                } else if (revealDirection === 'center') {
                  const center = Math.floor(text.length / 2);
                  shouldReveal = Math.abs(index - center) <= iteration;
                }

                if (shouldReveal) {
                  setRevealedIndices((prev) => new Set(prev).add(index));
                  return text[index];
                }
              } else {
                if (Math.random() < 0.25 || iteration >= maxIterations) {
                  setRevealedIndices((prev) => new Set(prev).add(index));
                  return text[index];
                }
              }

              return availableChars[Math.floor(Math.random() * availableChars.length)];
            })
            .join('');
        });

        iteration++;

        if (iteration > text.length + maxIterations) {
          setIsScrambling(false);
          setDisplayText(text);
          clearInterval(interval);
        }
      }, speed);
    } else {
      setDisplayText(text);
    }

    return () => clearInterval(interval);
  }, [isScrambling, text, speed, maxIterations, sequential, revealDirection, availableChars, revealedIndices]);

  return (
    <span
      ref={containerRef}
      className={`inline-block select-none cursor-default ${parentClassName}`}
      onMouseEnter={() => {
        setIsHovering(true);
        if (animateOn === 'hover') triggerAnimation();
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      <span className={className}>
        {displayText.split('').map((char, i) => {
          const isRevealed = !isScrambling || revealedIndices.has(i) || char === ' ';
          return (
            <span
              key={i}
              className={isRevealed ? '' : encryptedClassName}
            >
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
