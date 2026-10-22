'use client';

import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function HeroScrollSequence() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState(0);
  const [readyToExit, setReadyToExit] = useState(false);
  
  // Trigger exit if the first video loads
  useEffect(() => {
    if (loadedVideos >= 1) setReadyToExit(true);
  }, [loadedVideos]);

  // Escape Hatch: Force exit after 4 seconds regardless of load status
  useEffect(() => {
    const timer = setTimeout(() => {
      setReadyToExit(true);
    }, 4000); 
    return () => clearTimeout(timer);
  }, []);
  
  const preloaderRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signatureWrapperRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const masterContainerRef = useRef<HTMLElement>(null);

  // Lock scroll while preloader is active, using CSS classes
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isLoading]);

  useGSAP(() => {
    if (!preloaderRef.current) return;
    if (!readyToExit) return; // Wait until ready
    
    const introTl = gsap.timeline({
      onComplete: () => setIsLoading(false) // Unlocks Lenis scroll
    });

    // The Exit Sequence
    introTl.to("#loader-signature", { scale: 1, opacity: 0, duration: 0.4, ease: "power2.out" });
    introTl.to(preloaderRef.current, { yPercent: -100, duration: 1, ease: "power4.inOut" }, "-=0.2");

    // 4. Frame Zero: Masked Text Reveal
    introTl.to('.hero-text-line', {
      y: 0,
      stagger: 0.1,
      duration: 1,
      ease: "power4.out"
    }, "-=0.6");
  }, { dependencies: [readyToExit] });

  const projects = [
    { name: "BORN & BRED", src: "/WhatsApp Video 2026-05-29 at 8.00.45 PM.mp4" },
    { name: "PANDAPAY", src: "/WhatsApp Video 2026-05-29 at 8.00.45 PM (1).mp4" },
    { name: "MATE LIBRE", src: "/WhatsApp Video 2026-05-29 at 8.00.49 PM.mp4" },
    { name: "MAKING STUDIO", src: "/WhatsApp Video 2026-05-29 at 8.00.50 PM.mp4" },
    { name: "AIM", src: "/WhatsApp Video 2026-05-29 at 8.00.50 PM (1).mp4" }
  ];

  const projectWords = ["BRUTAL.", "SMOOTH.", "SPATIAL.", "FLUID.", "DYNAMIC."];
  
  // Kinetic Parallax Blades
  const bladeOneRef = useRef<HTMLDivElement>(null);
  const bladeTwoRef = useRef<HTMLDivElement>(null);
  const bladeThreeRef = useRef<HTMLDivElement>(null);

  // NEW REFS for Architectural HUD
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeRef2 = useRef<HTMLDivElement>(null);
  const marqueeFadeRef = useRef<HTMLDivElement>(null);

  // 3D Parallax Hover for Blades
  useEffect(() => {
    if (!bladeOneRef.current || !bladeTwoRef.current || !bladeThreeRef.current) return;
    
    // QuickTo for high performance tracking
    const b1x = gsap.quickTo(bladeOneRef.current, "xPercent", { duration: 0.8, ease: "power3.out" });
    const b1y = gsap.quickTo(bladeOneRef.current, "yPercent", { duration: 0.8, ease: "power3.out" });
    
    const b2x = gsap.quickTo(bladeTwoRef.current, "xPercent", { duration: 1.0, ease: "power3.out" });
    const b2y = gsap.quickTo(bladeTwoRef.current, "yPercent", { duration: 1.0, ease: "power3.out" });
    
    const b3x = gsap.quickTo(bladeThreeRef.current, "xPercent", { duration: 0.6, ease: "power3.out" });
    const b3y = gsap.quickTo(bladeThreeRef.current, "yPercent", { duration: 0.6, ease: "power3.out" });
    
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize cursor position from -1 to 1
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      
      // Move blades proportionally to create 3D depth
      b1x(nx * 1); 
      b1y(ny * 1);
      
      b2x(nx * -2);
      b2y(ny * -2);
      
      b3x(nx * 3);
      b3y(ny * 3);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useGSAP(() => {
    if (!containerRef.current || !pathRef.current || !svgRef.current || !signatureWrapperRef.current || !bladeOneRef.current || !bladeTwoRef.current || !bladeThreeRef.current || !marqueeRef.current || !marqueeRef2.current || !marqueeFadeRef.current) return;
    if (!masterContainerRef.current) return;

    // 0. Independent Marquee Loop
    gsap.to([marqueeRef.current, marqueeRef2.current], {
      xPercent: -50,
      repeat: -1,
      ease: "none",
      duration: 20
    });

    // 1. Setup SVG Path Drawing State
    const pathLength = pathRef.current.getTotalLength();
    
    gsap.set(pathRef.current, {
      strokeDasharray: pathLength + 1,
      strokeDashoffset: pathLength + 1,
    });

    const totalSlides = projects.length;

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: masterContainerRef.current,
        start: "top top",
        end: "+=" + (window.innerHeight * (totalSlides * 0.8 + 10.0)), // Reduced for faster scroll time
        pin: true,
        scrub: true,
        anticipatePin: 1, // Eliminates jump on scroll initialization
        invalidateOnRefresh: true,
      }
    });

    masterTl.addLabel("start");

    // 1. OPENING SEQUENCE (Relaxed cinematic timing, zero dead-scroll)
    masterTl.fromTo("#laptop-frame", 
      { opacity: 0, scale: 0.85, y: 100, xPercent: 0 }, 
      { opacity: 1, scale: 1, y: 0, xPercent: 0, ease: "power2.out", duration: 1.2 }, 
      "start"
    );
    masterTl.fromTo("#laptop-lid", 
      { rotateX: -90 }, 
      { rotateX: 0, ease: "power2.out", duration: 1.4 }, 
      "start+=0.1"
    );
    masterTl.fromTo("#oak-green-solid", 
      { opacity: 1 }, 
      { opacity: 0, ease: "power1.inOut", duration: 1.4 }, 
      "start+=0.1"
    );
    masterTl.fromTo(".bg-vid-0", 
      { opacity: 0 }, 
      { opacity: 0.4, ease: "power1.inOut", duration: 1.4 }, 
      "start+=0.1"
    );

    masterTl.addLabel("opened-center");

    // 2. SHIFT LEFT & REVEAL FIRST TEXT
    masterTl.addLabel("shift-left");
    masterTl.to("#laptop-frame", { xPercent: -25, scale: 0.85, ease: "power2.inOut", duration: 1.5 }, "shift-left");

    // Word 0 slides out from behind the laptop (x: -400) to the Entry Point (y: 160)
    masterTl.fromTo(".word-0",
      { x: -400, y: 160, opacity: 0 },
      { x: 0, y: 160, opacity: 1, duration: 1.0, ease: "power2.out" },
      "shift-left+=0.5"
    );

    masterTl.addLabel("video-0-left");

    // 3. HORIZONTAL SLIDER & VERTICAL STACKING LOOP
    for (let i = 1; i < totalSlides; i++) {
      const slideSync = "slide-sync-" + i;
      masterTl.addLabel(slideSync);

      // Slider & Background
      masterTl.to("#screen-slider-track", {
        x: () => {
          const slideElement = document.querySelector('.screen-slide') as HTMLElement;
          const slideWidth = slideElement?.offsetWidth || window.innerWidth * 0.65;
          return -(slideWidth * i);
        },
        ease: "power2.inOut", duration: 2
      }, slideSync);
      masterTl.to(".bg-vid-" + (i - 1), { opacity: 0, ease: "power1.inOut", duration: 2 }, slideSync);
      masterTl.to(".bg-vid-" + i, { opacity: 0.4, ease: "power1.inOut", duration: 2 }, slideSync);

      // --- OLD WORD FLYING UP ---
      // Calculate the permanent vertical slot for the old word based on its index
      const prevSlotY = (i - 1) * 80 - 160; 
      masterTl.to(".word-" + (i - 1), {
        y: prevSlotY,
        duration: 1.5,
        ease: "power2.inOut"
      }, slideSync);

      // --- NEW WORD SLIDING OUT ---
      // The new word slides out from behind the laptop into the Entry Point (y: 160)
      masterTl.fromTo(".word-" + i,
        { x: -400, y: 160, opacity: 0 },
        { x: 0, y: 160, opacity: 1, duration: 1.5, ease: "power2.out" },
        slideSync + "+=0.2"
      );

      masterTl.addLabel("video-" + i + "-left");
    }

    // PORTAL DIVE SEQUENCE (Appended at the absolute end)
    masterTl.addLabel("portal-dive");

    // 1. Fade out typography
    masterTl.to("#text-reveal-container", { opacity: 0, duration: 1 }, "portal-dive");

    // 2. Fade out screen glare so it doesn't wash out the final green canvas
    masterTl.to("#screen-glare", { opacity: 0, duration: 1 }, "portal-dive");

    // 3. Rise the lighter, translucent global background behind the laptop
    masterTl.to("#global-portal-bg", { y: () => -window.innerHeight, ease: "power2.inOut", duration: 3 }, "portal-dive");

    // 4. Rise the solid background inside the screen (overshoots slightly to cover edges)
    masterTl.to("#screen-portal-bg", { top: "-5%", ease: "power2.inOut", duration: 3 }, "portal-dive");

    // 5. CENTER FIRST: Fast ease to bring the laptop to the exact center immediately
    masterTl.to("#laptop-frame", { 
      y: "12vh", // Centers the heavy lid in the viewport
      xPercent: 0,
      ease: "power2.out", 
      duration: 3 
    }, "portal-dive");

    // 6. THEN ZOOM: Exponential ease so the massive scale happens late in the scroll
    masterTl.to("#laptop-frame", { 
      scale: 30, // Increased scale to guarantee viewport fill
      transformOrigin: "50% 45%", // Perfect center of the screen
      ease: "expo.in", 
      duration: 3 
    }, "portal-dive");

    masterTl.addLabel("portal-complete", "portal-dive+=1.2");

    // --- SERVICES BROCHURE ENTRANCE (SCROLL-SYNCED) ---
    // Pre-initialize initial brochure styles in the timeline so they are completely hidden
    masterTl.set(".brochure-card", { opacity: 0, y: 150, scale: 0.95 }, "start");
    masterTl.set(".brochure-card li", { opacity: 0, x: -20 }, "start");

    // --- SERVICES BROCHURE ENTRANCE (SCROLL-SYNCED) ---
    masterTl.to("#brochure-layer", {
      opacity: 1,
      pointerEvents: "auto",
      duration: 0.8,
      ease: "power2.inOut"
    }, "portal-complete");

    // --- CARD 1 ENTRANCE (WEBSITE) ---
    masterTl.addLabel("card-1-enter", "portal-complete+=0.5");
    masterTl.to(".brochure-card-1", {
      y: 0,
      opacity: 1,
      scale: 1.05,
      boxShadow: "0 20px 50px rgba(194,184,151,0.15)",
      duration: 2.0,
      ease: "power3.out"
    }, "card-1-enter");
    masterTl.to(".brochure-card-1 li", {
      opacity: 1,
      x: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power2.out"
    }, "card-1-enter+=0.5");

    // --- CARD 2 ENTRANCE (MOBILE APPS) ---
    masterTl.addLabel("card-2-enter", "card-1-enter+=2.5");
    // Dim Card 1
    masterTl.to(".brochure-card-1", {
      opacity: 0.4,
      scale: 0.95,
      boxShadow: "none",
      duration: 1.5,
      ease: "power2.inOut"
    }, "card-2-enter");
    // Enter Card 2
    masterTl.to(".brochure-card-2", {
      y: 0,
      opacity: 1,
      scale: 1.05,
      boxShadow: "0 20px 50px rgba(194,184,151,0.15)",
      duration: 2.0,
      ease: "power3.out"
    }, "card-2-enter");
    masterTl.to(".brochure-card-2 li", {
      opacity: 1,
      x: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power2.out"
    }, "card-2-enter+=0.5");

    // --- CARD 3 ENTRANCE (SOCIAL MEDIA) ---
    masterTl.addLabel("card-3-enter", "card-2-enter+=2.5");
    // Dim Card 2
    masterTl.to(".brochure-card-2", {
      opacity: 0.4,
      scale: 0.95,
      boxShadow: "none",
      duration: 1.5,
      ease: "power2.inOut"
    }, "card-3-enter");
    // Enter Card 3
    masterTl.to(".brochure-card-3", {
      y: 0,
      opacity: 1,
      scale: 1.05,
      boxShadow: "0 20px 50px rgba(194,184,151,0.15)",
      duration: 2.0,
      ease: "power3.out"
    }, "card-3-enter");
    masterTl.to(".brochure-card-3 li", {
      opacity: 1,
      x: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power2.out"
    }, "card-3-enter+=0.5");

    // --- RESET TO SHOW ALL THREE GLORIOUSLY ---
    masterTl.addLabel("brochure-reset", "card-3-enter+=2.5");
    masterTl.to(".brochure-card", {
      opacity: 1,
      scale: 1.0,
      boxShadow: "none",
      duration: 1.5,
      ease: "power2.inOut"
    }, "brochure-reset");

    // --- EXIT SEQUENCE ---
    masterTl.addLabel("brochure-exit", "brochure-reset+=2.0");
    masterTl.to(".brochure-card", {
      y: -150,
      opacity: 0,
      scale: 0.95,
      duration: 2.0,
      stagger: 0.2,
      ease: "power3.inOut"
    }, "brochure-exit");

    masterTl.to("#brochure-layer", {
      opacity: 0,
      pointerEvents: "none",
      duration: 1.0,
      ease: "power2.in"
    }, "brochure-exit+=0.3");

    // Phase 2: The Dissolve Effect (Signature Fade In)
    masterTl.addLabel("dissolve", "brochure-exit+=1.0");

    masterTl.to("#signature-layer", {
      opacity: 1,
      pointerEvents: "auto",
      ease: "power2.inOut",
      duration: 1
    }, "dissolve");

    // Phase 3: The Signature Reveal
    masterTl.to([bladeOneRef.current, bladeTwoRef.current, bladeThreeRef.current], {
      x: '0%',
      y: '0%',
      ease: 'power4.out',
      duration: 1.5,
      stagger: 0.1
    }, "dissolve+=0.5");

    masterTl.to(signatureWrapperRef.current, {
      autoAlpha: 1,
      duration: 0.1 
    }, "dissolve+=0.7");

    masterTl.to(marqueeFadeRef.current, { opacity: 0.5, duration: 1, ease: "power2.out" }, "dissolve+=0.7");

    masterTl.to(pathRef.current, {
      strokeDashoffset: 0,
      ease: 'power2.inOut',
      duration: 1.5
    }, "dissolve+=0.7");

    masterTl.to(svgRef.current, {
      scale: 1.1,
      ease: 'power1.out',
      duration: 0.5
    }, "dissolve+=2.2");

  }, { scope: masterContainerRef });

  return (
    <>

      {/* 2. Preloader */}
      <div ref={preloaderRef} className="fixed inset-0 z-[5000] bg-[#1a241c] flex flex-col items-center justify-center text-[#cfc7aa]">
        
        <style dangerouslySetInnerHTML={{__html: `
          #loader-signature svg path {
            stroke-dasharray: 1000; 
            stroke-dashoffset: 1000;
            animation: drawSignature 2.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          }
          
          #loader-signature svg {
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
        <div id="loader-signature" className="w-[15vw] md:w-[8vw] flex items-center justify-center will-change-transform">
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

      <main ref={mainContainerRef} className="w-full bg-[#1a241c]">
        
        {/* 3. Frame Zero (Masked Typography Landing) */}
        <section className="h-screen w-full flex flex-col justify-center px-[5vw]">
          {["SCYTE.", "CRAFTING", "DIGITAL", "EXPERIENCES."].map((word, i) => (
            <div key={i} className="overflow-hidden leading-[0.85]">
              <h1 className="hero-text-line text-[12vw] font-bold uppercase tracking-tighter text-[#cfc7aa] translate-y-full will-change-transform">
                {word}
              </h1>
            </div>
          ))}
        </section>

        {/* 4. INSERT THE EXISTING MASTER CONTAINER HERE */}
        <section ref={masterContainerRef} className="relative h-screen w-full bg-[#1a241c] overflow-hidden">

        {/* LAYER 0.5: Global Translucent Oak Green Portal Wave */}
        <div id="global-portal-bg" className="absolute top-[100vh] left-0 w-full h-[120vh] bg-[#2a3a2d]/70 backdrop-blur-2xl z-0 will-change-transform" />

        {/* LAYER 1: The Backgrounds */}
        <div id="dynamic-bg-container" className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          <div id="oak-green-solid" className="absolute inset-0 bg-[#1a241c] z-10" />
          {projects.map((proj, i) => (
            <video 
              key={`bg-vid-${i}`}
              className={`bg-video-blur absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-0 z-0 bg-vid-${i}`}
              src={proj.src} poster={(proj as any).poster} autoPlay loop muted playsInline preload="auto"
            />
          ))}
        </div>

        {/* LAYER 2: The 3D Laptop (MAXIMUM REALISM EDITION) */}
        <div id="laptop-stage" className="absolute inset-0 w-full h-full z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "2500px" }}>
          
          <div id="laptop-frame" className="relative w-[85vw] md:w-[65vw] max-w-[1100px] aspect-video flex flex-col items-center opacity-0 scale-50 translate-y-32 will-change-transform">
            
            {/* Lid: Removed overflow-hidden to prevent 3D sub-pixel bleed */}
            <div id="laptop-lid" className="relative w-full h-full bg-gradient-to-b from-[#181818] to-[#050505] rounded-t-2xl border-[4px] md:border-[8px] border-[#222] border-b-0 origin-bottom shadow-2xl will-change-transform shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" style={{ transformStyle: "preserve-3d", transform: "rotateX(-90deg)" }}>
              
              {/* Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-30 shadow-[0_2px_15px_rgba(0,0,0,0.8)] flex justify-center items-center">
                {/* Camera Lens */}
                <div className="w-2 h-2 rounded-full bg-[#0a0a2a] border border-[#222] shadow-[inset_0_0_3px_rgba(255,255,255,0.3)] flex justify-center items-center">
                  <div className="w-[2px] h-[2px] bg-blue-400/50 rounded-full" />
                </div>
              </div>
              
              {/* STRICT LCD MASK: Absolute positioned strictly inside the borders */}
              <div className="absolute top-[4px] md:top-[8px] left-[4px] md:left-[8px] right-[4px] md:right-[8px] bottom-[2px] overflow-hidden bg-black rounded-t-sm md:rounded-t-md z-10">
                
                {/* Inner Screen Track */}
                <div id="screen-slider-track" ref={trackRef} className="absolute inset-0 h-full flex w-max will-change-transform">
                  {projects.map((proj, i) => (
                    <div key={"screen-slide-" + i} className="screen-slide relative w-[calc(85vw-8px)] md:w-[calc(65vw-16px)] max-w-[1084px] h-full flex-shrink-0 bg-black">
                      <video className="w-full h-full object-cover" src={proj.src} poster={(proj as any).poster} autoPlay loop muted playsInline preload={i === 0 ? "auto" : "none"} onLoadedData={() => setLoadedVideos(prev => prev + 1)} />
                    </div>
                  ))}
                </div>

                {/* SCREEN PORTAL WAVE (Oversized to hide video edges) */}
                <div id="screen-portal-bg" className="absolute top-full -left-[5%] w-[110%] h-[110%] bg-[#1d2920] z-50 will-change-transform" />

                {/* SCREEN GLARE OVERLAY (Added ID so we can fade it out) */}
                <div id="screen-glare" className="absolute inset-0 z-40 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 mix-blend-screen" />
                <div className="absolute inset-0 z-40 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]" />
              </div>
              
            </div>

            {/* Base: Keyboard matrix, screen glow, and machined lip */}
            <div id="laptop-base" className="relative w-[106%] h-[24px] md:h-[34px] bg-gradient-to-b from-[#2a2a2a] via-[#111] to-[#000] border-t-[1px] border-[#333] rounded-b-3xl rounded-t-[4px] shadow-[0_40px_70px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] z-40 flex flex-col items-center">
              
              {/* SCREEN GLOW CAST ON BASE */}
              <div className="absolute top-0 left-0 w-full h-[15px] bg-white/5 blur-md z-10 pointer-events-none" />

              {/* FAKE KEYBOARD GRID (Using repeating gradients) */}
              <div className="absolute top-[2px] w-[80%] h-[12px] md:h-[18px] bg-[#111] rounded shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)] opacity-80"
                   style={{
                     backgroundImage: `linear-gradient(to right, transparent 95%, #050505 95%), linear-gradient(to bottom, transparent 80%, #050505 80%)`,
                     backgroundSize: '15px 6px'
                   }}
              />
              
              {/* Trackpad Indent */}
              <div className="absolute bottom-[4px] md:bottom-[6px] left-1/2 -translate-x-1/2 w-[22%] h-[6px] md:h-[8px] bg-gradient-to-b from-[#0a0a0a] to-[#151515] rounded-b-md shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] border-b border-[#333]/40" />
              
              {/* Front Lip / Finger Groove */}
              <div className="absolute top-[1px] left-1/2 -translate-x-1/2 w-[12%] h-[3px] bg-[#050505] rounded-b-md shadow-[inset_0_1px_3px_rgba(0,0,0,1)]" />
            </div>

          </div>
        </div>

        {/* LAYER 4: The Stacked Typography Container */}
        <div id="text-reveal-container" className="absolute right-0 top-0 w-full md:w-[46%] lg:w-[45%] h-full z-10 flex items-center justify-start pl-10 md:pl-14 lg:pl-20 pointer-events-none">
          {projectWords.map((word, i) => (
            <h2 
              key={"word-" + i} 
              className={"word-" + i + " absolute text-[#e6d5b8] font-sans font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter opacity-0 will-change-transform drop-shadow-2xl"}
            >
              {word}
            </h2>
          ))}
        </div>

        {/* LAYER 2.8: Services Brochure */}
        <div 
          id="brochure-layer" 
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none z-[45] flex items-center justify-center bg-[#1a241c]"
        >
          <div className="max-w-[95rem] w-full px-[2vw] grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Card 1: Website */}
            <div className="brochure-card brochure-card-1 bg-[#152018]/95 border-2 border-[#C2B897]/40 p-10 md:p-14 flex flex-col justify-between min-h-[600px] md:min-h-[700px] rounded-[3.5rem] relative overflow-hidden will-change-transform opacity-0 group">
              <div>
                <h3 className="text-[#C2B897] font-sans font-black text-4xl md:text-5xl tracking-tighter uppercase mb-2">WEBSITE</h3>
                <p className="text-gray-300 text-sm md:text-base font-bold uppercase tracking-widest mb-10 leading-tight">Your Digital Storefront</p>
                <ul className="flex flex-col gap-6 text-sm md:text-base md:leading-relaxed tracking-wide text-gray-300 font-medium">
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Beautiful design that wins you customers
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Super fast loading on any phone or computer
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Fully secure and safe from hackers
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Easy-to-use editor (no coding required)
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Setup to help people find you on Google
                  </li>
                </ul>
              </div>
              <button className="w-full py-5 mt-10 bg-[#C2B897] hover:bg-white text-black font-sans font-black text-sm md:text-base tracking-[0.2em] uppercase transition-colors duration-200 rounded-full">
                Get Started
              </button>
            </div>

            {/* Card 2: Mobile Apps */}
            <div className="brochure-card brochure-card-2 bg-[#152018]/95 border-2 border-[#C2B897]/40 p-10 md:p-14 flex flex-col justify-between min-h-[600px] md:min-h-[700px] rounded-[3.5rem] relative overflow-hidden will-change-transform opacity-0 group">
              <div>
                <h3 className="text-[#C2B897] font-sans font-black text-4xl md:text-5xl tracking-tighter uppercase mb-2">MOBILE APPS</h3>
                <p className="text-gray-300 text-sm md:text-base font-bold uppercase tracking-widest mb-10 leading-tight">In Your Customers Pocket</p>
                <ul className="flex flex-col gap-6 text-sm md:text-base md:leading-relaxed tracking-wide text-gray-300 font-medium">
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Custom designed just for your brand
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Works perfectly on Apple and Android
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Fast, smooth, and works without internet
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> We handle the entire App Store launch
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Simple dashboard to manage everything
                  </li>
                </ul>
              </div>
              <button className="w-full py-5 mt-10 bg-[#C2B897] hover:bg-white text-black font-sans font-black text-sm md:text-base tracking-[0.2em] uppercase transition-colors duration-200 rounded-full">
                Get Started
              </button>
            </div>

            {/* Card 3: Social Media */}
            <div className="brochure-card brochure-card-3 bg-[#152018]/95 border-2 border-[#C2B897]/40 p-10 md:p-14 flex flex-col justify-between min-h-[600px] md:min-h-[700px] rounded-[3.5rem] relative overflow-hidden will-change-transform opacity-0 group">
              <div>
                <h3 className="text-[#C2B897] font-sans font-black text-4xl md:text-5xl tracking-tighter uppercase mb-2">SOCIAL MEDIA</h3>
                <p className="text-gray-300 text-sm md:text-base font-bold uppercase tracking-widest mb-10 leading-tight">Grow Your Brand Daily</p>
                <ul className="flex flex-col gap-6 text-sm md:text-base md:leading-relaxed tracking-wide text-gray-300 font-medium">
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> A clear plan to get you more followers
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Stunning videos and custom graphics
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> We handle all the posting for you
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> We talk to your customers in messages
                  </li>
                  <li className="flex items-center gap-4">
                    <span className="text-[#C2B897] text-xl">✓</span> Simple reports that show your success
                  </li>
                </ul>
              </div>
              <button className="w-full py-5 mt-10 bg-[#C2B897] hover:bg-white text-black font-sans font-black text-sm md:text-base tracking-[0.2em] uppercase transition-colors duration-200 rounded-full">
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* LAYER 3: The Signature */}
        <div id="signature-layer" className="absolute inset-0 w-full h-full opacity-0 z-50 pointer-events-none flex items-center justify-center bg-[#1a241c]">
          <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-transparent pointer-events-none">

            {/* Dynamic Keyframes for Grain Animation */}
            <style>{`
              @keyframes buzz {
                0%, 100% { transform: translate(0, 0); }
                10% { transform: translate(-5%, -10%); }
                20% { transform: translate(-15%, 5%); }
                30% { transform: translate(7%, -25%); }
                40% { transform: translate(-5%, 25%); }
                50% { transform: translate(-15%, 10%); }
                60% { transform: translate(15%, 0%); }
                70% { transform: translate(0%, 15%); }
                80% { transform: translate(3%, 35%); }
                90% { transform: translate(-10%, 10%); }
              }
              .animate-grain {
                animation: buzz 0.8s steps(10) infinite;
              }
            `}</style>

            {/* KINETIC SHARDS BACKGROUND (Z-10) */}
            <div className="absolute inset-0 z-10 overflow-hidden pointer-events-auto">
              {/* Blade 1 (Top Left) */}
              <div 
                ref={bladeOneRef}
                className="absolute -top-[50%] -left-[50%] w-[200vw] h-[200vh] bg-[#2b3a2f] origin-center -rotate-12 -translate-x-[150%] -translate-y-[100%] will-change-transform"
              />
              
              {/* Blade 2 (Bottom Right) */}
              <div 
                ref={bladeTwoRef}
                className="absolute -top-[50%] -left-[50%] w-[200vw] h-[200vh] bg-[#233026] origin-center rotate-6 translate-x-[150%] translate-y-[100%] will-change-transform"
              />

              {/* Blade 3 (Center Slash) */}
              <div 
                ref={bladeThreeRef}
                className="absolute -top-[50%] -left-[50%] w-[200vw] h-[200vh] bg-[#1a251d] origin-center rotate-12 translate-x-[150%] will-change-transform"
              />
            </div>

            {/* ARCHITECTURAL HUD & MARQUEE (Z-15) */}
            <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
              {/* Infinite Marquee */}
              <div ref={marqueeFadeRef} className="absolute inset-0 z-10 pointer-events-none opacity-0 flex items-center justify-center overflow-hidden">
                
                {/* Base Layer (Beige) */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex items-center pointer-events-none">
                  <div 
                    ref={marqueeRef}
                    className="text-[12vw] font-bold text-[#C2B897] whitespace-nowrap inline-block pointer-events-none"
                  >
                    ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — 
                  </div>
                </div>
                
                {/* X-Ray Layer (Dark Theme + Stroke) */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex items-center pointer-events-none" 
                  style={{ 
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 5%, black 20%, black 80%, transparent 95%, transparent 100%)',
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 5%, black 20%, black 80%, transparent 95%, transparent 100%)'
                  }}
                >
                  <div 
                    ref={marqueeRef2}
                    className="text-[12vw] font-bold text-[#334638] whitespace-nowrap inline-block pointer-events-none"
                    style={{ WebkitTextStroke: '2px rgba(255, 255, 255, 0.15)' }}
                  >
                    ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — ZERO COMPROMISE — METICULOUSLY CRAFTED — HIGH PERFORMANCE — 
                  </div>
                </div>

              </div>
            </div>

            {/* SIGNATURE LAYER (Z-20) */}
            <div  
              ref={signatureWrapperRef}
              className="absolute inset-0 w-full h-full flex items-center justify-center z-20 opacity-0 invisible pointer-events-none"
            >
              <svg 
                ref={svgRef}
                viewBox="0 0 400 200" 
                className="w-[130%] max-w-[85rem] opacity-90 will-change-transform drop-shadow-2xl"
                style={{ overflow: 'visible' }}
              >
                {/* Precision Geometric / Brutalist Path for 'SCYTE' */}
                <path 
                  ref={pathRef}
                  d="
                    M 84,60 L 20,60 L 20,100 L 80,100 L 80,140 L 16,140
                    M 164,60 L 100,60 L 100,140 L 164,140
                    M 178,56 L 200,100 L 222,56 M 200,96 L 200,144
                    M 236,60 L 304,60 M 270,60 L 270,144
                    M 364,60 L 320,60 L 320,100 L 350,100 M 320,100 L 320,140 L 364,140
                  "
                  fill="none" 
                  stroke="#C2B897" // Updated to the exact muted beige/khaki from the image
                  strokeWidth="8"  // Thicker, heavier stroke for brutalist impact
                  strokeLinecap="butt" // Changed from square to butt to prevent zero-length caps from rendering as artifacts
                  strokeLinejoin="miter" // Sharp corners
                />
              </svg>
            </div>

          </div>
        </div>

        </section>
      </main>
    </>
  );
}
