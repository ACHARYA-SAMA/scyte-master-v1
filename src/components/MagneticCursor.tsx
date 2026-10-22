'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export default function MagneticCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  // useGSAP handles automatic cleanup when the component unmounts
  useGSAP(() => {
    if (!cursorRef.current) return;
    const cursor = cursorRef.current;

    // Use GSAP quickTo for performance
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.6, ease: 'power4.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.6, ease: 'power4.out' });
    const scaleXTo = gsap.quickTo(cursor, 'scaleX', { duration: 0.4, ease: 'power4.out' });
    const scaleYTo = gsap.quickTo(cursor, 'scaleY', { duration: 0.4, ease: 'power4.out' });

    let isMagnetic = false;

    const moveCursor = (e: MouseEvent) => {
      if (isMagnetic) return;
      xTo(e.clientX);
      yTo(e.clientY);
    };

    const handleMagneticEnter = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      isMagnetic = true;
      xTo(x);
      yTo(y);
      scaleXTo(3); 
      scaleYTo(3); 
    };

    const handleMagneticLeave = () => {
      isMagnetic = false;
      scaleXTo(1);
      scaleYTo(1);
    };

    window.addEventListener('mousemove', moveCursor);

    // Initial attachment
    const updateMagneticElements = () => {
      const magneticElements = document.querySelectorAll('[data-magnetic]');
      magneticElements.forEach((el) => {
        el.addEventListener('mouseenter', handleMagneticEnter as EventListener);
        el.addEventListener('mouseleave', handleMagneticLeave as EventListener);
      });
    };
    
    updateMagneticElements();

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      const magneticElements = document.querySelectorAll('[data-magnetic]');
      magneticElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMagneticEnter as EventListener);
        el.removeEventListener('mouseleave', handleMagneticLeave as EventListener);
      });
    };
  }, { scope: cursorRef });

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-4 h-4 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference will-change-transform"
      style={{ transform: 'translate(-50%, -50%)' }}
    />
  );
}
