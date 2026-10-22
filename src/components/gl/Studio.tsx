"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Procedural studio light instead of a downloaded HDRI. Long softboxes tinted with the
 * palette's light tones give glass and metal crisp product-shot reflections, cost no
 * bytes, and keep the brand's colour in every highlight. Rendered once into a cube map.
 */
export function Studio({ intensity = 1, warm = 1 }: { intensity?: number; warm?: number }) {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={intensity}>
      <color attach="background" args={["#101a12"]} />
      {/* key: a long overhead strip */}
      <Lightformer form="rect" intensity={4.2 * warm} color="#e6d5b8" position={[0, 6, -1]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 1.6, 1]} />
      {/* tall side strips draw the glass edges */}
      <Lightformer form="rect" intensity={3} color="#cfc7aa" position={[-7, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[12, 0.8, 1]} />
      <Lightformer form="rect" intensity={2.4} color="#c2b897" position={[7, 0.5, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[12, 0.6, 1]} />
      {/* a low front strip so faces turned to the camera still catch something */}
      <Lightformer form="rect" intensity={1.4} color="#e6d5b8" position={[0, -3, 7]} rotation={[0.3, 0, 0]} scale={[14, 0.5, 1]} />
      {/* a ring of thin verticals: edge highlights from every angle the camera takes */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <Lightformer
            key={i}
            form="rect"
            intensity={1.1}
            color={i % 2 ? "#cfc7aa" : "#c2b897"}
            position={[Math.cos(a) * 9, 0, Math.sin(a) * 9]}
            rotation={[0, -a - Math.PI / 2, 0]}
            scale={[0.35, 14, 1]}
          />
        );
      })}
      {/* a broad, dim fill from behind */}
      <Lightformer form="rect" intensity={0.7} color="#334638" position={[0, 0, -9]} scale={[22, 9, 1]} />
      {/* a small warm kicker low on the right */}
      <Lightformer form="circle" intensity={2.8 * warm} color="#f9dc7d" position={[5, -4, 3]} scale={1.2} />
    </Environment>
  );
}
