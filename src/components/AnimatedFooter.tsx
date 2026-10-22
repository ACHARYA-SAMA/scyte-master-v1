'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AnimatedFooter() {
  const containerRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLUListElement>(null);
  const ctaTextRef = useRef<HTMLHeadingElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);

  const services = [
    "Website",
    "Mobile Apps",
    "Social Media Management",
  ];

  useGSAP(() => {
    if (!containerRef.current) return;

    // 1. Services Stagger Reveal
    if (servicesRef.current) {
      const serviceItems = servicesRef.current.children;
      gsap.fromTo(serviceItems, 
        { y: 100, opacity: 0, rotateX: -45 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: servicesRef.current,
            start: "top 80%",
            end: "bottom 60%",
            scrub: 1,
          }
        }
      );
    }

    // 2. Massive CTA Parallax & Scale
    if (ctaTextRef.current) {
      gsap.fromTo(ctaTextRef.current,
        { scale: 0.8, letterSpacing: "-0.05em", opacity: 0.5, y: 100 },
        {
          scale: 1.2,
          letterSpacing: "0.05em",
          opacity: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top center",
            end: "bottom bottom",
            scrub: true,
          }
        }
      );
    }

    // 3. Bottom Bar Reveal (Fixed overlap by using opacity + fixed pixel offset instead of full percentage which caused clipping)
    if (bottomBarRef.current) {
      gsap.fromTo(bottomBarRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "bottom 110%", 
            end: "bottom bottom",
            scrub: true,
          }
        }
      );
    }

  }, { scope: containerRef });

  return (
    <footer 
      ref={containerRef}
      className="relative w-full min-h-screen bg-[#253026] text-[#cfc7aa] overflow-hidden flex flex-col justify-between pt-32 pb-16 px-8 md:px-16"
      style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
    >
      {/* Top Section: Services & Info */}
      <div className="flex flex-col md:flex-row justify-between items-start w-full gap-16 relative z-10">
        <div className="max-w-md">
          <h3 className="text-xl md:text-2xl font-medium mb-6 uppercase tracking-widest text-white">
            Our Expertise
          </h3>
          <ul ref={servicesRef} className="space-y-4">
            {services.map((service, i) => (
              <li key={i} className="text-3xl md:text-5xl font-light uppercase tracking-tight opacity-0 transform translate-y-12">
                {service}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-8 max-w-sm">
          <div>
            <h4 className="text-sm tracking-widest uppercase mb-2 text-white/50">Say Hello</h4>
            <a href="mailto:scytehq@gmail.com" className="text-2xl hover:text-white transition-colors" data-magnetic>
              scytehq@gmail.com
            </a>
          </div>
          <div>
            <h4 className="text-sm tracking-widest uppercase mb-2 text-white/50">Location</h4>
            <p className="text-xl uppercase">
              Hyderabad
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Massive Parallax CTA */}
      <div className="flex-grow flex items-center justify-center w-full my-32 relative z-0 pointer-events-none">
        <h2 
          ref={ctaTextRef}
          className="text-[12vw] font-black uppercase text-center leading-none text-white whitespace-nowrap will-change-transform mix-blend-difference"
        >
          Let's Talk
        </h2>
      </div>

      {/* Bottom Section: Copyright & Socials */}
      <div 
        ref={bottomBarRef}
        className="w-full flex flex-col md:flex-row justify-between items-center text-sm tracking-widest uppercase border-t border-[#cfc7aa]/20 pt-8 relative z-10"
      >
        <p>© 2026 Scyte Makers. All rights reserved.</p>
        
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="https://www.instagram.com/scyte.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-magnetic>Instagram</a>
          <a href="https://www.linkedin.com/in/scyte-undefined-056131412/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" data-magnetic>LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
