"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { gl } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { silhouetteCanvas, silhouetteDepth, SIL_H, SIL_W } from "@/lib/silhouette";
import { sfx } from "@/lib/sound";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C } from "../../materials";
import { projectAnchors } from "../../anchors";
import { scan } from "./scan";

const H = 26;
const W = (H * SIL_W) / SIL_H;
const DEPTH = 5.5;

const shared = /* glsl */ `
  uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform float uAppear;
  uniform float uScan;
  uniform float uTime;
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
  vec3 place(vec2 uv, float d) {
    vec3 p = vec3((uv.x - 0.5) * ${W.toFixed(3)}, (uv.y - 0.5) * ${H.toFixed(3)}, d * ${DEPTH.toFixed(2)});
    // before the portrait arrives, every point waits scattered in a flat sheet
    float a = clamp(uAppear * 1.25 - hash(uv) * 0.25, 0.0, 1.0);
    a = a * a * (3.0 - 2.0 * a);
    vec3 scatter = vec3((hash(uv + 1.7) - 0.5) * 30.0, (hash(uv + 3.1) - 0.5) * 4.0 - 14.0, (hash(uv + 5.3) - 0.5) * 8.0);
    return mix(scatter, p, a);
  }
`;

const pointsMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uImage: { value: null as Texture | null },
      uDepth: { value: null as Texture | null },
      uAppear: { value: 0 },
      uScan: { value: 2 },
      uTime: { value: 0 },
      uSize: { value: 3 },
      uPixel: { value: 1 },
      uKhaki: { value: C.khaki.clone() },
      uCream: { value: C.cream.clone().multiplyScalar(1.15) },
      uLumen: { value: C.lumen.clone().multiplyScalar(2.4) },
    },
    vertexShader: /* glsl */ `
      ${shared}
      uniform float uSize;
      uniform float uPixel;
      attribute vec2 aUv;
      varying float vL;
      varying float vBand;
      varying float vMask;
      void main() {
        vec2 uv = aUv;
        float d = texture2D(uDepth, uv).r;
        float l = lum(texture2D(uImage, uv).rgb);
        vec3 p = place(uv, d);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // the sweep: a bright band travelling down the face
        float y = 1.0 - uScan;
        vBand = 1.0 - smoothstep(0.0, 0.035, abs(uv.y - y));
        vL = l;
        vMask = smoothstep(0.06, 0.2, l) * smoothstep(0.08, 0.3, d);
        gl_PointSize = uSize * uPixel * (0.55 + l * 0.9 + vBand * 1.2) * (60.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uKhaki;
      uniform vec3 uCream;
      uniform vec3 uLumen;
      varying float vL;
      varying float vBand;
      varying float vMask;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        float a = smoothstep(0.5, 0.32, r) * vMask;
        if (a < 0.01) discard;
        vec3 col = mix(uKhaki * 0.7, uCream, vL);
        col = mix(col, uLumen, vBand);
        gl_FragColor = vec4(col * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });

const linesMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uImage: { value: null as Texture | null },
      uDepth: { value: null as Texture | null },
      uAppear: { value: 0 },
      uScan: { value: 2 },
      uTime: { value: 0 },
      uColor: { value: C.khaki.clone() },
    },
    vertexShader: /* glsl */ `
      ${shared}
      attribute vec2 aUv;
      varying float vMask;
      void main() {
        float d = texture2D(uDepth, aUv).r;
        float l = lum(texture2D(uImage, aUv).rgb);
        vMask = smoothstep(0.06, 0.2, l) * smoothstep(0.08, 0.3, d);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(place(aUv, d) + vec3(0.0, 0.0, 0.05), 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vMask;
      void main() { gl_FragColor = vec4(uColor * 0.35 * vMask, 0.35 * vMask); }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });

/** The resolved portrait: the image on a depth-displaced sheet, revealed behind the sweep. */
const photoMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uImage: { value: null as Texture | null },
      uDepth: { value: null as Texture | null },
      uAppear: { value: 0 },
      uScan: { value: 2 },
      uTime: { value: 0 },
      uLow: { value: C.abyss.clone() },
      uMid: { value: C.raised.clone() },
      uHigh: { value: C.khaki.clone() },
      uTop: { value: C.cream.clone() },
    },
    vertexShader: /* glsl */ `
      ${shared}
      varying vec2 vUv;
      varying float vD;
      void main() {
        vUv = uv;
        float d = texture2D(uDepth, uv).r;
        vD = d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(place(uv, d) - vec3(0.0, 0.0, 0.08), 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${shared}
      uniform vec3 uLow, uMid, uHigh, uTop;
      varying vec2 vUv;
      varying float vD;
      void main() {
        float l = lum(texture2D(uImage, vUv).rgb);
        // the photo in the palette: abyss, raised, khaki, cream
        vec3 col = l < 0.33 ? mix(uLow, uMid, l / 0.33) : l < 0.7 ? mix(uMid, uHigh, (l - 0.33) / 0.37) : mix(uHigh, uTop, (l - 0.7) / 0.3);
        float revealed = smoothstep(1.0 - uScan - 0.02, 1.0 - uScan + 0.02, vUv.y);
        float mask = smoothstep(0.06, 0.2, l) * smoothstep(0.08, 0.3, vD);
        float a = revealed * mask * 0.85 * clamp(uAppear * 2.0 - 1.0, 0.0, 1.0);
        // fine scanlines keep it reading as projected light, not a print
        a *= 0.82 + 0.18 * sin(vUv.y * 900.0);
        gl_FragColor = vec4(col * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

const gridGeometry = (cols: number, rows: number) => {
  const uv = new Float32Array(cols * rows * 2);
  let k = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      uv[k++] = (x + 0.5) / cols;
      // three's texture convention: v runs up
      uv[k++] = 1 - (y + 0.5) / rows;
    }
  const g = new BufferGeometry();
  g.setAttribute("aUv", new BufferAttribute(uv, 2));
  g.setAttribute("position", new BufferAttribute(new Float32Array(cols * rows * 3), 3));
  return g;
};

const rowLines = (cols: number, rows: number, every: number) => {
  const uv: number[] = [];
  for (let y = 0; y < rows; y += every)
    for (let x = 0; x < cols - 1; x++) uv.push((x + 0.5) / cols, 1 - (y + 0.5) / rows, (x + 1.5) / cols, 1 - (y + 0.5) / rows);
  const g = new BufferGeometry();
  g.setAttribute("aUv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("position", new BufferAttribute(new Float32Array((uv.length / 2) * 3), 3));
  return g;
};

const loader = new TextureLoader();

const fromCanvas = (c: HTMLCanvasElement) => {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  return t;
};

export default function TeamScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const quality = gl.get().quality;
  const cols = quality === 2 ? 150 : quality === 1 ? 110 : 80;
  const rows = Math.round((cols * SIL_H) / SIL_W);
  const points = useMemo(() => gridGeometry(cols, rows), [cols, rows]);
  const lines = useMemo(() => rowLines(cols, rows, 5), [cols, rows]);
  const sheet = useMemo(() => new PlaneGeometry(1, 1, cols, rows), [cols, rows]);
  const pMat = useMemo(() => pointsMaterial(), []);
  const lMat = useMemo(() => linesMaterial(), []);
  const fMat = useMemo(() => photoMaterial(), []);
  const ring = useMemo(() => new RingGeometry(9.6, 9.7, 160), []);
  const ring2 = useMemo(() => new RingGeometry(12.4, 12.45, 200), []);
  const group = useRef<Group>(null);
  const state = useRef({ slug: null as string | null, appear: 0, target: 0, scan: 2, pending: null as null | { image: Texture; depth: Texture } });
  const cam = useRef({ pos: new Vector3(0, 0, 60), ready: false });
  const anchors = useMemo(() => ({ face: new Vector3(), crown: new Vector3(), shoulder: new Vector3(), base: new Vector3() }), []);

  useEffect(
    () => () => {
      points.dispose();
      lines.dispose();
      sheet.dispose();
      pMat.dispose();
      lMat.dispose();
      fMat.dispose();
      ring.dispose();
      ring2.dispose();
    },
    [points, lines, sheet, pMat, lMat, fMat, ring, ring2],
  );

  // load the textures for whoever is selected
  useEffect(() => {
    const apply = () => {
      const s = scan.get();
      const st = state.current;
      if (s.slug === st.slug) return;
      st.slug = s.slug;
      if (!s.slug) {
        st.target = 0;
        return;
      }
      const slug = s.slug;
      const done = (image: Texture, depth: Texture) => {
        if (state.current.slug !== slug) return;
        st.pending = { image, depth };
      };
      if (s.photo && s.depth) {
        Promise.all([loader.loadAsync(s.photo), loader.loadAsync(s.depth)]).then(([image, depth]) => {
          image.colorSpace = SRGBColorSpace;
          done(image, depth);
        });
      } else {
        done(fromCanvas(silhouetteCanvas(slug, 0.6)), fromCanvas(silhouetteDepth(slug, 300)));
      }
    };
    apply();
    return scan.subscribe(apply);
  }, []);

  useFrame((_, dt) => {
    const st = state.current;
    const t = performance.now() / 1000;
    const reduced = prefersReducedMotion();
    // swap in new textures once the old portrait has dissolved
    if (st.pending && st.appear < 0.02) {
      for (const m of [pMat, lMat, fMat]) {
        m.uniforms.uImage.value = st.pending.image;
        m.uniforms.uDepth.value = st.pending.depth;
      }
      st.pending = null;
      st.target = 1;
      st.scan = 0;
      if (!reduced) sfx.scan();
    } else if (st.pending) st.target = 0;
    st.appear += (st.target - st.appear) * Math.min(1, dt * (st.target ? 2.2 : 5));
    if (reduced) st.appear = st.target;
    if (st.target === 1 && st.appear > 0.6) st.scan = Math.min(1.15, st.scan + dt * (reduced ? 10 : 0.75));
    for (const m of [pMat, lMat, fMat]) {
      m.uniforms.uAppear.value = st.appear;
      m.uniforms.uScan.value = st.scan;
      m.uniforms.uTime.value = t;
    }
    pMat.uniforms.uPixel.value = dpr;
    // the sensitivity knob: thicker points and a deeper relief as it turns up
    const sens = scan.get().sensitivity / 100;
    pMat.uniforms.uSize.value += (2 + sens * 2.6 - pMat.uniforms.uSize.value) * Math.min(1, dt * 8);
    if (group.current) group.current.scale.z += (0.35 + sens * 1.3 - group.current.scale.z) * Math.min(1, dt * 6);

    // parallax and a slow idle turn
    const g = gl.get();
    const turn = reduced ? 0 : Math.sin(t * 0.25) * 0.12 + g.px * 0.32;
    if (group.current) {
      group.current.rotation.y += (turn - group.current.rotation.y) * Math.min(1, dt * 3);
      group.current.rotation.x += ((reduced ? 0 : g.py * 0.1) - group.current.rotation.x) * Math.min(1, dt * 3);
      scan.set({ rot: Math.round((group.current.rotation.y * 180) / Math.PI) });
    }

    const [fx, fy] = scan.get().face;
    anchors.face.set((fx - 0.5) * W, (0.5 - fy) * H, DEPTH * 0.9);
    anchors.crown.set((fx - 0.5) * W, (0.5 - (fy - 0.17)) * H, DEPTH * 0.6);
    anchors.shoulder.set((fx - 0.5) * W - W * 0.3, (0.5 - 0.78) * H, DEPTH * 0.4);
    anchors.base.set(0, -H / 2 - 0.5, 0);
    if (group.current) {
      group.current.updateMatrixWorld();
      for (const v of Object.values(anchors)) v.applyMatrix4(group.current.matrixWorld);
    }

    const aspect = size.width / size.height;
    const want = new Vector3(0, 0.5, aspect < 1 ? 60 / Math.max(0.55, aspect) : 60);
    const c = cam.current;
    if (!c.ready) {
      c.pos.copy(want);
      c.ready = true;
    } else c.pos.lerp(want, Math.min(1, dt * 4));
    camera.position.copy(c.pos);
    camera.lookAt(0, 0.5, 0);
    projectAnchors(camera, anchors, size.width, size.height);
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <Backdrop z={-40} cell={1.5} />
      <group ref={group} position={[0, 2.2, 0]} scale={1.18}>
        <points geometry={points} material={pMat} frustumCulled={false} />
        <lineSegments geometry={lines} material={lMat} frustumCulled={false} />
        <mesh geometry={sheet} material={fMat} frustumCulled={false} renderOrder={-1} />
      </group>
      {/* the projector: two hairline rings under the bust */}
      <group position={[0, -H / 2 + 1, 0]} rotation={[-Math.PI / 2.15, 0, 0]}>
        <mesh geometry={ring}>
          <meshBasicMaterial color={C.khaki.clone().multiplyScalar(0.6)} transparent opacity={0.6} toneMapped={false} />
        </mesh>
        <mesh geometry={ring2}>
          <meshBasicMaterial color={C.line.clone().multiplyScalar(1.6)} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      </group>
      <Post bloom={0.7} threshold={0.8} vignette={0.5} />
    </>
  );
}
