'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export default function BrutalistHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Create a master timeline
    const tl = gsap.timeline({ delay: 0.1 });

    // Aggressive staggered reveal for the massive typography
    tl.fromTo(
      '.hero-word',
      { y: '150%', rotationZ: 5 },
      {
        y: '0%',
        rotationZ: 0,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.1,
      }
    );

    // Fade in the interactive buttons and micro-copy sequentially
    tl.fromTo(
      '.hero-sub',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power4.out' },
      '-=0.8' // Overlap heavily with the headline reveal
    );

    tl.fromTo(
      '.hero-button',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: 0.1 },
      '-=0.8'
    );
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="relative w-full h-screen flex flex-col justify-center z-10 px-8 md:px-16"
    >
      <div className="w-full flex flex-col items-stretch gap-0 relative z-50 pointer-events-auto">
        
        {/* Massive, tightly packed brutalist typography dominating the screen */}
        <div className="overflow-hidden">
          <div className="hero-word text-[10vw] leading-[0.8] font-sans font-black text-white uppercase tracking-tighter">
            CRAFTING
          </div>
        </div>
        
        <div className="overflow-hidden">
          <div className="hero-word ml-[15vw] text-[10vw] leading-[0.8] font-serif italic text-[#C2B897] lowercase">
            digital
          </div>
        </div>
        
        <div className="overflow-hidden text-right">
          <div className="hero-word text-[10vw] leading-[0.8] font-sans font-black text-white uppercase tracking-tighter">
            EXPERIENCES
          </div>
        </div>
        
        <div className="w-full mt-16">
          <div className="flex flex-col gap-6 items-start">
            <p className="hero-sub text-xs md:text-sm tracking-widest text-gray-400 max-w-sm leading-tight uppercase font-bold border-l-2 border-neon-accent pl-4">
              Awwwards-winning digital destinations. High-performance, meticulously animated, zero compromise.
            </p>

            {/* Action Buttons - Sharp, hard-edged, monochromatic hover states */}
            <div className="flex gap-4">
              <div className="hero-button pointer-events-auto inline-block cursor-pointer" data-magnetic>
                <button className="px-6 py-4 bg-white text-black font-sans font-black text-xs tracking-[0.2em] uppercase hover:bg-neon-accent transition-colors duration-0 rounded-none border-2 border-white hover:border-neon-accent">
                  Initialize
                </button>
              </div>
              <div className="hero-button pointer-events-auto inline-block cursor-pointer" data-magnetic>
                <button className="px-6 py-4 bg-transparent text-white font-sans font-black text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-colors duration-0 rounded-none border-2 border-white">
                  View Specs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
