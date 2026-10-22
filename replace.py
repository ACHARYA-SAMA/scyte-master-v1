import sys

with open('src/components/HeroScrollSequence.tsx', 'r') as f:
    content = f.read()

target = """    if (!trackRef.current || !masterContainerRef.current) return;

    const track = trackRef.current;
    const videos = gsap.utils.toArray('.parallax-video');

    const getDistanceVw = () => {
      const isMobile = window.innerWidth < 768;
      const cardW = isMobile ? 70 : 50; 
      const gaps = (projects.length - 1) * 10; 
      const padding = 30; 
      return ((projects.length * cardW) + gaps + padding) - 100;
    };

    // The scroll distance accounts for the gallery scrub + the dissolve time + the signature animation
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: masterContainerRef.current,
        start: "top top",
        end: () => `+=${(getDistanceVw() * (window.innerWidth / 100) * 1.5) + (window.innerHeight * 2)}`, 
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      }
    });

    // Phase 1: Horizontal Gallery Scrub
    masterTl.to(track, {
      x: () => `-${getDistanceVw()}vw`,
      ease: "none",
      duration: 4 // Gives the track the majority of the scroll duration
    }, "gallery");

    videos.forEach((vid) => {
      masterTl.to(vid as Element, { xPercent: 30, ease: "none", duration: 4 }, "gallery");
    });

    // Phase 2: The Dissolve Effect
    masterTl.to("#gallery-layer", {
      opacity: 0,
      ease: "power2.inOut",
      duration: 1
    }, "dissolve");

    // The signature layer fades in ON TOP of the global header, hiding it naturally
    masterTl.to("#signature-layer", {
      opacity: 1,
      pointerEvents: "auto", // Allows interaction once visible
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
    }, "dissolve+=0.5"); // Start revealing blades during the end of dissolve

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
    }, "dissolve+=2.2");"""

replacement = """    if (!masterContainerRef.current) return;

    // Initialize laptop starting position since DOM classes were not altered
    gsap.set("#laptop-frame", { opacity: 0, scale: 0.8, y: 150 });

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: masterContainerRef.current,
        start: "top top",
        end: () => `+=${window.innerHeight * 2}`, 
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      }
    });

    // 1. Elevate and Scale the Laptop Frame
    masterTl.to("#laptop-frame", {
      opacity: 1,
      scale: 1,
      y: 0,
      ease: "power2.out",
      duration: 1
    }, "open");

    // 2. The Hinge Reveal
    masterTl.to("#laptop-lid", {
      rotateX: 0,
      ease: "power2.out",
      duration: 1.5
    }, "open+=0.2");

    // Phase 2: The Dissolve Effect
    masterTl.to("#laptop-stage", {
      opacity: 0,
      ease: "power2.inOut",
      duration: 1
    }, "dissolve");

    // The signature layer fades in ON TOP of the global header
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
    }, "dissolve+=2.2");"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/HeroScrollSequence.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
