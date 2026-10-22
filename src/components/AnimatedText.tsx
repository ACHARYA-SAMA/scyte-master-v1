'use client';
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedTextProps {
  text: string;
  tag?: React.ElementType;
  className?: string;
  delay?: number;
}

export default function AnimatedText({ 
  text, 
  tag: Tag = 'h2', 
  className = '',
  delay = 0 
}: AnimatedTextProps) {
  const textRef = useRef<any>(null);

  useEffect(() => {
    if (!textRef.current) return;

    // Split the text into lines, words, and characters
    const splitText = new SplitType(textRef.current, { types: 'lines,words,chars' });
    
    if (splitText.lines) {
      // Force overflow hidden on the lines so characters are masked before revealing
      gsap.set(splitText.lines, { overflow: 'hidden' });
    }
    
    if (splitText.chars) {
      // Initial state: translated down by 130% and slightly rotated for that dynamic snap
      gsap.set(splitText.chars, { 
        yPercent: 130,
        rotateZ: 8
      });

      const trigger = ScrollTrigger.create({
        trigger: textRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(splitText.chars, {
            yPercent: 0,
            rotateZ: 0,
            duration: 1.2,
            stagger: 0.02,
            ease: 'expo.out', // Expo.out gives that explosive initial velocity settling into a long tail
            delay: delay
          });
        },
        once: true // Only animate once per page load to avoid repetitive motion
      });

      return () => {
        trigger.kill();
        splitText.revert();
      };
    }
  }, [text, delay]);

  const CustomTag = Tag as any;

  // We set a clip-path wipe on the container itself just as an added bounding box safeguard
  return (
    <CustomTag 
      ref={textRef} 
      className={`will-change-transform ${className}`}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}
    >
      {text}
    </CustomTag>
  );
}
