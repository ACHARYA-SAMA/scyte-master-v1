"use client";

import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  ShaderMaterial,
  AdditiveBlending,
  SRGBColorSpace,
  LinearMipmapLinearFilter,
  LinearFilter,
} from "three";

/** The palette as linear-light colours for shaders and materials. */
export const C = {
  ground: new Color("#1b261d"),
  groundDeep: new Color("#152018"),
  surface: new Color("#253026"),
  raised: new Color("#2b3a2f"),
  line: new Color("#334638"),
  khaki: new Color("#c2b897"),
  khakiLight: new Color("#cfc7aa"),
  cream: new Color("#e6d5b8"),
  abyss: new Color("#09120b"),
  lumen: new Color("#f9dc7d"),
};

/**
 * Dark green glass: full transmission, a little roughness so the edges catch the
 * softboxes, green attenuation so thick parts go deep and thin parts stay clear.
 */
export const makeGlass = (opts: { thickness?: number; roughness?: number; tint?: string } = {}) =>
  new MeshPhysicalMaterial({
    // near-neutral body so the light inside stays yellow; the green comes from the
    // world behind and a light attenuation that only deepens the thick parts
    color: new Color(opts.tint ?? "#ece9df"),
    metalness: 0,
    roughness: opts.roughness ?? 0.08,
    transmission: 1,
    thickness: opts.thickness ?? 3.2,
    ior: 1.47,
    attenuationColor: new Color("#93ab96"),
    attenuationDistance: 9,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 1,
    specularColor: new Color("#f3e8cf"),
    envMapIntensity: 1.7,
    dispersion: 0.025,
    // a grazing-angle sheen so the faces of the letters read even against the dark
    sheen: 0.55,
    sheenColor: new Color("#cfc7aa"),
    sheenRoughness: 0.35,
  });

/** Brushed lines for metal anisotropy, drawn once. */
let brushed: CanvasTexture | null = null;
const brushedTexture = () => {
  if (brushed) return brushed;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgb(128,128,255)";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      const y = Math.random() * 256;
      const a = 0.05 + Math.random() * 0.12;
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},128,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
  }
  brushed = new CanvasTexture(c);
  brushed.wrapS = brushed.wrapT = RepeatWrapping;
  brushed.minFilter = LinearMipmapLinearFilter;
  brushed.magFilter = LinearFilter;
  brushed.anisotropy = 8;
  return brushed;
};

/** Brushed dark metal, green-black, for clamps, bezels, turnstiles and flanges. */
export const makeMetal = (color = "#2b3a2f", roughness = 0.32) =>
  new MeshPhysicalMaterial({
    color: new Color(color),
    metalness: 1,
    roughness,
    anisotropy: 0.7,
    anisotropyMap: brushedTexture(),
    clearcoat: 0.2,
    envMapIntensity: 1.1,
  });

/** Matte forest surfaces. */
export const makeMatte = (color = "#1b261d", roughness = 0.92) =>
  new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0, envMapIntensity: 0.5 });

/**
 * The light that runs inside the glass. Brightness travels along the tube (uv.x is
 * arc length in world units), so the liquid visibly moves. `uFlow` 0..1 fills it.
 */
export const makeLiquid = () =>
  new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 0 },
      uSpeed: { value: 1 },
      uLength: { value: 1 },
      uColor: { value: C.lumen.clone().multiplyScalar(2.2) },
      uDim: { value: C.line.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFlow;
      uniform float uSpeed;
      uniform float uLength;
      uniform vec3 uColor;
      uniform vec3 uDim;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float s = vUv.x * uLength;
        // pulses of light travelling down the tube
        float pulse = 0.78 + 0.22 * sin(s * 0.9 - uTime * 3.2 * uSpeed);
        pulse *= 0.85 + 0.15 * sin(s * 0.23 - uTime * 1.3 * uSpeed + 1.7);
        // filled up to the flow front
        float front = smoothstep(uFlow * uLength + 0.8, uFlow * uLength - 0.8, s);
        float rim = pow(1.0 - abs(dot(vN, vView)), 2.0);
        vec3 lit = uColor * (0.55 + 0.6 * pulse) + uColor * rim * 0.4;
        vec3 col = mix(uDim * 0.35, lit, front);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  });

/** A soft additive glow sprite for droplets and hotspots. */
export const makeGlow = () =>
  new ShaderMaterial({
    uniforms: { uColor: { value: C.lumen.clone().multiplyScalar(1.4) }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.2) * uAlpha;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });

/** Draws into a canvas once and returns a crisp, mipmapped sRGB texture. */
export const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) draw(ctx);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  return t;
};

/** The page's real font stack (next/font gives Archivo a generated family name). */
export const siteFont = () =>
  typeof document === "undefined" ? "Arial, sans-serif" : getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
