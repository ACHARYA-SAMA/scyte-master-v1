'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

interface KineticHoverTextProps {
  text: string;
  className?: string;
}

export default function KineticHoverText({ text, className = '' }: KineticHoverTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    // Aggressive, snappy shadow push mimicking the OFF+BRAND aesthetic
    gsap.to(el, {
      y: -15,
      scaleX: 1.05,
      scaleY: 1.05,
      textShadow: '0px 8px 0px #C2B897, 0px 16px 0px #C2B897',
      color: '#ffffff', // Ensure it stays white while the neon shadow drops
      duration: 0.15,
      ease: 'power4.out',
      overwrite: 'auto'
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    // Seamless reverse
    gsap.to(el, {
      y: 0,
      scaleX: 1,
      scaleY: 1,
      textShadow: '0px 0px 0px transparent',
      duration: 0.4,
      ease: 'power4.out',
      overwrite: 'auto'
    });
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* 1. TEXT DUPLICATION: Hidden from layout but accessible to screen readers */}
      <span className="sr-only">{text}</span>

      {/* 2. CHARACTER SPLITTING: Visible duplicated string broken into nodes */}
      <div className="flex flex-wrap pointer-events-auto" aria-hidden="true">
        {text.split(' ').map((word, wordIndex) => (
          <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.25em]">
            {word.split('').map((char, charIndex) => (
              // Outer span provides the initial overflow mask for the global entrance
              <span
                key={charIndex}
                className="inline-block overflow-visible align-bottom"
                style={{ paddingBottom: '0.2em', marginBottom: '-0.2em' }}
              >
                {/* 3. GSAP HOVER NODE: Inner span tracks mouse events and animates text-shadow */}
                <span
                  className="hero-char inline-block will-change-transform cursor-crosshair"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{ transformOrigin: 'bottom center' }}
                >
                  {char}
                </span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
