'use client';

import React, { useState } from "react";
import HeroScrollSequence from "@/components/HeroScrollSequence";
import AnimatedFooter from "@/components/AnimatedFooter";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Home() {
  const [isResetting, setIsResetting] = useState(false);

  const handleHomeClick = () => {
    if (window.scrollY === 0) return; // Don't trigger if already at the top
    
    setIsResetting(true); // 1. Show the loader curtain
    
    setTimeout(() => {
      // 2. Hard jump to top instantly while screen is covered
      window.scrollTo({ top: 0, behavior: 'instant' }); 
      
      // Optional: Force ScrollTrigger to refresh its calculations
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      
      // 3. Hide the loader curtain after the jump
      setTimeout(() => {
        setIsResetting(false);
      }, 500); 
    }, 600); // Wait for the curtain to fully drop before jumping
  };

  return (
    <main className="flex min-h-screen flex-col relative z-10 overflow-hidden">
      
      {/* THE RESET LOADER CURTAIN */}
      <div 
        className={`fixed inset-0 z-[999] bg-[#050505] flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.85,0,0.15,1)] ${isResetting ? "translate-y-0" : "-translate-y-full"}`}
      >
        {/* CUSTOM SCYTE SIGNATURE LOADER */}
        <div className="flex flex-col items-center justify-center text-[#cfc7aa]">
          <style dangerouslySetInnerHTML={{__html: `
            #curtain-loader-signature svg path {
              stroke-dasharray: 1000; 
              stroke-dashoffset: 1000;
              animation: drawSignature 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            }
            
            #curtain-loader-signature svg {
              animation: popSignature 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            
            @keyframes drawSignature {
              0% { stroke-dashoffset: 1000; }
              60% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: 0; }
            }

            @keyframes popSignature {
              0% { transform: scale(1); }
              60% { transform: scale(1); }
              80% { transform: scale(1.1); }
              100% { transform: scale(1.1); }
            }
          `}} />

          {/* Mini Signature Container */}
          <div id="curtain-loader-signature" className="w-[15vw] md:w-[8vw] flex items-center justify-center will-change-transform">
            <svg 
              viewBox="0 0 400 200" 
              className="w-full h-auto opacity-90 will-change-transform"
              style={{ overflow: 'visible' }}
            >
              <path 
                d="
                  M 84,60 L 20,60 L 20,100 L 80,100 L 80,140 L 16,140
                  M 164,60 L 100,60 L 100,140 L 164,140
                  M 178,56 L 200,100 L 222,56 M 200,96 L 200,144
                  M 236,60 L 304,60 M 270,60 L 270,144
                  M 364,60 L 320,60 L 320,100 L 350,100 M 320,100 L 320,140 L 364,140
                "
                fill="none" 
                stroke="#C2B897" 
                strokeWidth="12"
                strokeLinecap="butt" 
                strokeLinejoin="miter" 
              />
            </svg>
          </div>
        </div>
      </div>
      
      {/* NAVBAR PLACEHOLDER */}
      <nav id="global-header" className="w-full flex justify-between items-center px-8 md:px-16 py-8 fixed top-0 left-0 z-[100] pointer-events-none">
        
        {/* Geometric SVG Logo */}
        <div 
          onClick={handleHomeClick} 
          className="relative z-[100] cursor-pointer pointer-events-auto block"
        >
          <div className="pointer-events-auto cursor-pointer" data-magnetic>
            <svg 
              viewBox="0 0 380 200" 
              className="h-12 md:h-16 will-change-transform"
              style={{ overflow: 'visible' }}
            >
              <path 
                d="
                  M 84,60 L 20,60 L 20,100 L 80,100 L 80,140 L 16,140
                  M 164,60 L 100,60 L 100,140 L 164,140
                  M 178,56 L 200,100 L 222,56 M 200,96 L 200,144
                  M 236,60 L 304,60 M 270,60 L 270,144
                  M 364,60 L 320,60 L 320,100 L 350,100 M 320,100 L 320,140 L 364,140
                "
                fill="none" 
                stroke="#C2B897" 
                strokeWidth="12" // Slightly thicker relative to viewbox for a bold logo
                strokeLinecap="butt"
                strokeLinejoin="miter"
              />
            </svg>
          </div>
        </div>

        <div className="flex gap-8 items-center text-sm font-medium tracking-widest uppercase pointer-events-auto">
          <span className="cursor-pointer hover:text-neon-accent transition-colors" data-magnetic>Work</span>
          <span className="cursor-pointer hover:text-neon-accent transition-colors" data-magnetic>Studio</span>
          <span className="cursor-pointer hover:text-neon-accent transition-colors" data-magnetic>Contact</span>
        </div>
      </nav>

      {/* 1. PINNED SCROLL SEQUENCE (HERO -> SIGNATURE) */}
      <HeroScrollSequence />

      {/* 2. GRAND FINALE FOOTER */}
      <AnimatedFooter />
    </main>
  );
}
