"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, type Texture } from "three";
import { prefersReducedMotion } from "@/lib/motion";
import { PLATES, PLATE_ASPECT, archiveGl, strip, type Plate } from "@/components/work/strip";
import { Backdrop } from "../../Backdrop";
import { canvasTexture, siteFont } from "../../materials";

const Z = 165;
const TW = 1280;
const TH = 800;

const vertexShader = /* glsl */ `
  uniform float uBend;
  uniform float uHalfW;
  uniform float uLift;
  uniform float uTime;
  uniform float uPhase;
  uniform float uFloat;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    // at rest the frames hang on the strip and drift a little, each on its own beat
    w.y += sin(uTime * 0.8 + uPhase * 0.9) * uFloat;
    float nx = clamp(w.x / uHalfW, -1.6, 1.6);
    // the strip curves away like film round a drum, harder the faster it moves
    w.z -= uBend * nx * nx * uHalfW * 0.28;
    // the frame under the pointer swells like a liquid surface
    w.z += uLift * sin(uv.x * 3.14159) * sin(uv.y * 3.14159) * 3.0;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uTime;
  uniform float uPlane;
  uniform float uImage;
  uniform float uShift;
  uniform float uAlpha;
  uniform float uDim;
  uniform float uPhase;
  uniform float uSheen;
  varying vec2 vUv;

  // object-fit: cover, so a frame of any shape crops the image the way CSS would
  vec2 cover(vec2 uv) {
    float r = uPlane / uImage;
    vec2 s = r > 1.0 ? vec2(1.0, 1.0 / r) : vec2(r, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  void main() {
    vec2 uv = vUv;
    vec2 d = uv - uMouse;
    d.x *= uPlane;
    float r = length(d);
    // rings travel out from the pointer, and the surface lenses just under it
    float ring = sin(r * 38.0 - uTime * 4.5) * exp(-r * 5.5) * uHover;
    vec2 dir = d / max(r, 1e-4);
    dir.x /= uPlane;
    uv += dir * ring * 0.010;
    uv -= (uv - uMouse) * exp(-r * r * 22.0) * 0.07 * uHover;
    vec2 c = cover(uv);
    vec3 col = vec3(
      texture2D(uMap, c + vec2(uShift, 0.0)).r,
      texture2D(uMap, c).g,
      texture2D(uMap, c - vec2(uShift, 0.0)).b
    );
    // now and then a soft beam passes across the strip, frame to frame, like a projector's
    float sweep = fract(uTime * 0.11 - uPhase * 0.045) * 3.0 - 1.0;
    float band = exp(-pow((vUv.x * 0.85 + vUv.y * 0.15 - sweep) * 9.0, 2.0));
    col += band * 0.08 * uSheen;
    gl_FragColor = vec4(col * uDim, uAlpha);
    #include <colorspace_fragment>
  }
`;

/** The open slot, drawn to match the HTML version in Archive.module.css. */
const drawSlot = (ctx: CanvasRenderingContext2D, p: Plate) => {
  const font = siteFont();
  ctx.fillStyle = "#152018";
  ctx.fillRect(0, 0, TW, TH);
  ctx.strokeStyle = "#334638";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 40; x < TW; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TH);
  }
  for (let y = 40; y < TH; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(TW, y);
  }
  ctx.stroke();
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = "#c2b897";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, TW - 56, TH - 56);
  ctx.setLineDash([]);
  ctx.textBaseline = "alphabetic";
  ctx.fontStretch = "condensed";
  ctx.fillStyle = "#c2b897";
  ctx.font = `600 30px ${font}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("OPEN SLOT", 72, 112);
  ctx.letterSpacing = "-3px";
  ctx.fillStyle = "#e6d5b8";
  let size = 128;
  ctx.font = `760 ${size}px ${font}`;
  while (ctx.measureText(p.title).width > TW - 144 && size > 60) {
    size -= 4;
    ctx.font = `760 ${size}px ${font}`;
  }
  ctx.fillText(p.title, 72, TH / 2 + size * 0.36);
  ctx.letterSpacing = "0px";
  ctx.fontStretch = "normal";
  ctx.fillStyle = "#cfc7aa";
  ctx.font = `440 36px ${font}`;
  ctx.fillText(p.slot?.what ?? "", 72, TH - 96);
};

/**
 * The archive's frames, drawn exactly where the DOM strip lays them out. The DOM owns
 * input and physics (see Archive); this reads the shared `strip` every frame.
 */
export default function ArchiveScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const renderer = useThree((s) => s.gl);
  const geometry = useMemo(() => new PlaneGeometry(1, 1, 32, 20), []);
  const mats = useMemo(
    () =>
      PLATES.map(
        (_p, i) =>
          new ShaderMaterial({
            uniforms: {
              uMap: { value: null as Texture | null },
              uMouse: { value: new Vector2(0.5, 0.5) },
              uHover: { value: 0 },
              uLift: { value: 0 },
              uTime: { value: 0 },
              uPlane: { value: PLATE_ASPECT },
              uImage: { value: PLATE_ASPECT },
              uShift: { value: 0 },
              uAlpha: { value: 0 },
              uDim: { value: 1 },
              uBend: { value: 0 },
              uHalfW: { value: 1 },
              uPhase: { value: i },
              uFloat: { value: 0 },
              uSheen: { value: 1 },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );
  const state = useMemo(() => PLATES.map(() => ({ hover: 0, mx: 0.5, my: 0.5, alpha: 0, dim: 1 })), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const bend = useRef(0);

  // textures: the plate images (already in the cache from the DOM), and the slots drawn once the font is in
  useEffect(() => {
    let alive = true;
    const loaded: Texture[] = [];
    const loader = new TextureLoader();
    Promise.all(
      PLATES.map(async (p, i) => {
        let t: Texture;
        if (p.img) {
          t = await loader.loadAsync(p.img);
          t.colorSpace = SRGBColorSpace;
          t.anisotropy = 8;
        } else {
          await document.fonts.ready;
          t = canvasTexture(TW, TH, (ctx) => drawSlot(ctx, p));
        }
        loaded.push(t);
        if (!alive) return;
        renderer.initTexture(t);
        mats[i].uniforms.uMap.value = t;
      }),
    )
      .then(() => {
        if (alive) archiveGl.set({ ready: true });
      })
      .catch(() => {
        // a frame failed to load: the HTML strip stays on show
      });
    return () => {
      alive = false;
      archiveGl.set({ ready: false });
      loaded.forEach((t) => t.dispose());
    };
  }, [mats, renderer]);

  useEffect(
    () => () => {
      geometry.dispose();
      mats.forEach((m) => m.dispose());
    },
    [geometry, mats],
  );

  useFrame((_, dt) => {
    // other scenes move the camera; this one is square-on, one CSS pixel per pixel
    camera.position.set(0, 0, Z);
    camera.lookAt(0, 0, 0);
    if (camera.fov !== 30) {
      camera.fov = 30;
      camera.updateProjectionMatrix();
    }
    const el = strip.el;
    if (!el || !strip.pitch) return;
    const W = size.width;
    const H = size.height;
    const k = (2 * Z * Math.tan((camera.fov * Math.PI) / 360)) / H;
    const r = el.getBoundingClientRect();
    const reduced = prefersReducedMotion();
    const now = performance.now() / 1000;
    const settle = (rate: number) => 1 - Math.exp(-dt * rate);
    const wantBend = reduced ? 0 : Math.min(1, Math.abs(strip.vel) / 3500) * (1 - strip.e);
    bend.current += (wantBend - bend.current) * settle(6);
    const pointing = strip.hover >= 0;

    PLATES.forEach((_p, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const u = mats[i].uniforms;
      const s = state[i];
      let x = r.left + strip.x0 + i * strip.pitch - strip.offset;
      let y = r.top + strip.y0;
      let w = strip.w;
      let h = strip.h;
      let fade = 1;
      const growing = i === strip.expand;
      if (strip.expand >= 0) {
        if (growing) {
          const e = strip.e;
          x += (0 - x) * e;
          y += (0 - y) * e;
          w += (W - w) * e;
          h += (H - h) * e;
        } else fade = 1 - Math.min(1, strip.e * 1.8);
      }
      m.visible = Boolean(u.uMap.value) && x + w > -W * 0.3 && x < W * 1.3 && y + h > -80 && y < H + 80;
      if (!m.visible) return;
      m.position.set((x + w / 2 - W / 2) * k, -(y + h / 2 - H / 2) * k, 0);
      m.scale.set(w * k, h * k, 1);
      m.renderOrder = growing ? 50 : i;

      const hot = i === strip.hover;
      s.hover += ((hot ? 1 : 0) - s.hover) * settle(hot ? 7 : 3.5);
      if (hot) {
        s.mx += (strip.mx - s.mx) * settle(12);
        s.my += (strip.my - s.my) * settle(12);
      }
      s.alpha += (1 - s.alpha) * settle(5);
      // with one frame under the pointer, the others sit back
      s.dim += ((pointing && !hot && !growing ? 0.58 : 1) - s.dim) * settle(6);
      const live = reduced ? 0 : 1 - strip.e;
      u.uHover.value = s.hover * live;
      u.uLift.value = s.hover * live;
      u.uMouse.value.set(s.mx, s.my);
      u.uTime.value = now;
      u.uPlane.value = w / h;
      u.uBend.value = bend.current;
      u.uHalfW.value = (W / 2) * k;
      u.uShift.value = reduced ? 0 : Math.max(-0.006, Math.min(0.006, strip.vel / 500000)) * (1 - strip.e);
      u.uAlpha.value = s.alpha * fade;
      u.uDim.value = s.dim;
      u.uFloat.value = reduced ? 0 : 3 * k * (1 - strip.e) * (1 - s.hover);
      u.uSheen.value = reduced ? 0 : 1 - strip.e;
    });
  });

  return (
    <>
      <color attach="background" args={["#1b261d"]} />
      <Backdrop z={-60} cell={5} lines={0.42} />
      {PLATES.map((p, i) => (
        <mesh
          key={p.key}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geometry}
          material={mats[i]}
          visible={false}
        />
      ))}
    </>
  );
}
