'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

// By mapping position directly to gl_Position, we bypass projection and view matrices.
// A plane of args={[2, 2]} will precisely fill the entire viewport perfectly.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // 3D Simplex Noise from Ashima Arts
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // Generic pseudo-random for film grain
  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  void main() {
    vec2 st = vUv;
    
    // Calculate aspect ratio corrected mouse distance
    vec2 aspectCorrectedSt = vec2(st.x * (uResolution.x / uResolution.y), st.y);
    vec2 aspectCorrectedMouse = vec2(uMouse.x * (uResolution.x / uResolution.y), uMouse.y);
    
    float dist = distance(aspectCorrectedSt, aspectCorrectedMouse);
    float mouseEffect = smoothstep(0.6, 0.0, dist);
    
    // Generate organic coordinate warp
    float noiseWarp = snoise(vec3(st * 2.0, uTime * 0.15));
    vec2 warpedSt = st + noiseWarp * 0.08 * mouseEffect;
    
    // Core fluid pattern driven by time and warped coordinates
    float fluid = snoise(vec3(warpedSt * 3.0, uTime * 0.1 + mouseEffect * 0.5));
    
    // Define the dark brutalist / deep charcoal palette
    // Mixing into the Primary color (#1A261F)
    vec3 baseColor = vec3(0.10, 0.15, 0.12);     
    vec3 highlightColor = vec3(0.15, 0.20, 0.17); 
    
    vec3 finalColor = mix(baseColor, highlightColor, fluid * 0.5 + 0.5);
    
    // Apply dynamic film grain over time
    float grain = rand(st * fract(uTime)) * 0.04;
    finalColor += grain;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function FluidBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Track mouse with lerping for fluid inertia
  const targetMouse = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const mouse = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const resolution = useMemo(() => new THREE.Vector2(0, 0), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to 0-1
      targetMouse.x = e.clientX / window.innerWidth;
      // Invert Y because WebGL UVs go bottom-up (0 at bottom, 1 at top)
      targetMouse.y = 1.0 - (e.clientY / window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [targetMouse]);

  useFrame((state) => {
    if (!materialRef.current) return;
    
    // Set resolution for aspect ratio correction
    resolution.set(window.innerWidth, window.innerHeight);
    
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uResolution.value = resolution;
    
    // Lerp mouse coordinates so the warp follows smoothly, not rigidly
    mouse.x = THREE.MathUtils.lerp(mouse.x, targetMouse.x, 0.05);
    mouse.y = THREE.MathUtils.lerp(mouse.y, targetMouse.y, 0.05);
    
    materialRef.current.uniforms.uMouse.value = mouse;
  });

  return (
    <mesh>
      {/* 2x2 plane mapped directly to NDC (Normalized Device Coordinates) */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uResolution: { value: new THREE.Vector2(1, 1) }
        }}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function WebGLOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <FluidBackground />
      </Canvas>
    </div>
  );
}
