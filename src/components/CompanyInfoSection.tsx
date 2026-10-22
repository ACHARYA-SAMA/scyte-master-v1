'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CompanyInfoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !textRef.current || !paragraphRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 75%',
        end: 'bottom 25%',
        toggleActions: 'play none none reverse',
      }
    });

    tl.fromTo(textRef.current, 
      { y: 50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
    ).fromTo(paragraphRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out' },
      '-=0.7'
    );
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="w-full min-h-screen bg-[#050505] text-[#cfc7aa] flex flex-col items-center justify-center px-8 md:px-24 py-32 relative z-10"
    >
      <div className="max-w-5xl mx-auto text-center space-y-12">
        <h2 
          ref={textRef}
          className="text-4xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-none opacity-0"
        >
          We build digital <br />
          <span className="text-white">experiences</span> that <br />
          defy expectations.
        </h2>
        
        <p 
          ref={paragraphRef}
          className="text-lg md:text-2xl font-light tracking-wide max-w-3xl mx-auto opacity-0"
        >
          Scyte is a vanguard design and engineering studio. We partner with visionaries to craft immersive, high-performance web applications that blur the line between software and art. 
        </p>
      </div>
    </section>
  );
}
