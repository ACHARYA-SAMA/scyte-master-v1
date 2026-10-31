"use client";

import { Color, DoubleSide, ShaderMaterial, Vector3, type Texture } from "three";
import { C, lightBlend } from "../../materials";

/**
 * The film's materials. Every light is kept at or under 1.9: on integrated GPUs under
 * Direct3D, brighter values overflow in the bloom chain and ring the light with black.
 * The glare comes from the bloom instead. No transmission and no reflection pass: on the integrated GPUs
 * most visitors have, those two cost more than the whole film. Glass is a Fresnel
 * shader over a light core, the wet floor is a mirrored copy of the set seen through a
 * thin dark film, and every glow is additive. Fog is computed here, per material, so
 * additive light can fade to black while solid surfaces fade to the air's colour.
 */

/** Air shared by every material in the film: the rig moves it between sets. */
export const air = {
  uFogColor: { value: new Color("#060c08") },
  uFogDensity: { value: 0.0032 },
};

const FOG = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  float fogOf(vec3 w) {
    float d = length(cameraPosition - w) * uFogDensity;
    return 1.0 - exp(-d * d);
  }
`;

const WORLD_VERT = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING
      vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vec4 w = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
    #endif
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * Dark green glass with lit edges. Faces seen head on are thin and let the light core
 * show; faces seen edge on go opaque and catch the horizon behind them, so the
 * letters read as solid shapes with light inside, at any angle.
 */
export const makeShell = (opts: { bottom: number; height: number }) =>
  new ShaderMaterial({
    transparent: true,
    uniforms: {
      ...air,
      uBody: { value: new Color("#0b1a10") },
      uRim: { value: C.khakiLight.clone() },
      uWarm: { value: C.lumen.clone() },
      uGlow: { value: 1 },
      uAlpha: { value: 1 },
      uLit: { value: 0 },
      uBottom: { value: opts.bottom },
      uHeight: { value: opts.height },
      uBack: { value: 1 },
    },
    vertexShader: WORLD_VERT,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform vec3 uBody;
      uniform vec3 uRim;
      uniform vec3 uWarm;
      uniform float uGlow;
      uniform float uAlpha;
      uniform float uLit;
      uniform float uBottom;
      uniform float uHeight;
      uniform float uBack;
      varying vec3 vW;
      varying vec3 vN;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float ndv = clamp(dot(N, V), 0.0, 1.0);
        float fr = pow(max(0.0, 1.0 - ndv), 3.0);
        // the horizon glow sits behind the monument: tops and back edges catch it
        vec3 L = normalize(vec3(0.0, 0.42, -1.0 * uBack));
        float back = pow(max(dot(N, L), 0.0), 2.0);
        float top = smoothstep(0.5, 1.0, N.y);
        float h = clamp((vW.y - uBottom) / uHeight, 0.0, 1.0);
        vec3 col = uBody * (0.3 + 0.75 * h);
        col += uRim * pow(max(fr, 0.0), 1.4) * (0.2 + 0.5 * uGlow);
        col += uWarm * (back * 0.5 + top * 0.1) * uGlow;
        // a long softbox reflected across the faces: one thin streak of light
        vec3 R = reflect(-V, N);
        float streak = (R.y - 0.18) * 11.0;
        col += uRim * exp(-streak * streak) * 0.22 * uGlow;
        // light inside warms the glass around it
        col += uWarm * uLit * (0.05 + 0.1 * (1.0 - fr));
        float a = mix(0.5, 0.97, fr) * uAlpha;
        col = mix(col, uFogColor, fogOf(vW));
        gl_FragColor = vec4(col, a);
      }
    `,
  });

/**
 * Light running inside the glass. `aArc` is each vertex's distance along the whole
 * route in world units, so one front fills every letter in story order. Short drops
 * of brighter light ride the flow, even through pipes that are still dark.
 */
export const makeCore = (total: number) =>
  new ShaderMaterial({
    uniforms: {
      ...air,
      uTime: { value: 0 },
      uFill: { value: 0 },
      uTotal: { value: total },
      uColor: { value: C.lumen.clone().multiplyScalar(1.6) },
      uDim: { value: new Color("#0d1c12") },
      uGain: { value: 1 },
      uSpeed: { value: 1 },
      /** arc positions of up to four cracks; light past each is lost unless sealed */
      uCracks: { value: [1e5, 1e5, 1e5, 1e5] },
      uSeal: { value: 1 },
      uIdle: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aArc;
      varying float vArc;
      varying vec3 vW;
      varying vec3 vN;
      void main() {
        vArc = aArc;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uTime;
      uniform float uFill;
      uniform float uTotal;
      uniform vec3 uColor;
      uniform vec3 uDim;
      uniform float uGain;
      uniform float uSpeed;
      uniform float uCracks[4];
      uniform float uSeal;
      uniform float uIdle;
      varying float vArc;
      varying vec3 vW;
      varying vec3 vN;
      void main() {
        float s = vArc;
        float t = uTime * uSpeed;
        float frontAt = uFill * uTotal;
        float front = smoothstep(frontAt + 1.6, frontAt - 1.6, s);
        // drops: sharp, periodic peaks travelling with the flow
        // pow of a base a hair below zero is NaN on Direct3D, and bloom spreads NaN as black: clamp every base
        float drops = pow(max(0.0, 0.5 + 0.5 * sin(s * 0.42 - t * 5.0)), 28.0);
        float wave = 0.72 + 0.28 * sin(s * 0.07 - t * 1.4);
        vec3 lit = uColor * (0.75 * wave + 1.9 * drops);
        // light lost at every crack it passes, until the cracks are sealed
        float lost = 0.0;
        for (int i = 0; i < 4; i++) lost += step(uCracks[i], s);
        lit *= 1.0 - lost * 0.21 * (1.0 - uSeal);
        vec3 dark = uDim + uColor * drops * 0.22 * uIdle;
        vec3 col = mix(dark, lit * uGain, front);
        // the meniscus: a bright band on the front while it moves
        float moving = step(0.001, uFill) * step(uFill, 0.999);
        col += uColor * 1.6 * exp(-abs(s - frontAt) * 0.5) * moving;
        vec3 V = normalize(cameraPosition - vW);
        float rim = pow(max(0.0, 1.0 - abs(dot(normalize(vN), V))), 2.0);
        col += uColor * rim * 0.18 * front;
        col *= 1.0 - fogOf(vW);
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * The wet floor. It is drawn over a mirrored copy of the set, and lets that copy
 * through where the floor is wet and the view is shallow, as real wet stone does.
 */
export const makeFloor = () =>
  new ShaderMaterial({
    transparent: true,
    uniforms: {
      ...air,
      uTime: { value: 0 },
      uBase: { value: new Color("#070f09") },
      uWarm: { value: C.lumen.clone() },
      uGlow: { value: 1 },
      /** 0..1: rings where the trails of light skim the water before the first gate */
      uRipples: { value: 0 },
      uHorizon: { value: new Color("#2e2a18") },
      uSunAt: { value: new Vector3(0, 0, -1500) },
    },
    vertexShader: WORLD_VERT,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uTime;
      uniform vec3 uBase;
      uniform vec3 uWarm;
      uniform float uGlow;
      uniform float uRipples;
      uniform vec3 uHorizon;
      uniform vec3 uSunAt;
      varying vec3 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec2 p = vW.xz;
        vec3 V = normalize(cameraPosition - vW);
        float graze = 1.0 - clamp(V.y, 0.0, 1.0);
        // broad wet and drier stretches, never spots
        float wet = noise(p * 0.009) * 0.7 + noise(p * 0.04) * 0.3;
        float puddle = smoothstep(0.3, 0.75, wet);
        float refl = mix(0.07, 0.38, smoothstep(0.55, 0.98, graze)) * mix(0.72, 1.0, puddle);
        vec3 col = uBase * (0.88 + 0.22 * wet);
        // light pooled along the line of gates, warmer where their glow reaches
        float lane = exp(-abs(p.x) / 45.0) * smoothstep(80.0, -10.0, p.y) * smoothstep(-760.0, -300.0, p.y);
        col += uWarm * uGlow * 0.03 * lane;
        // rings where the trails skim the water on their way in, a few at a time
        float rings = 0.0;
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          float beat = uTime * 0.32 + fi * 0.167;
          float k = floor(beat);
          vec2 c = vec2((hash(vec2(k, fi * 3.7)) - 0.5) * 110.0, 12.0 + hash(vec2(fi * 5.1, k)) * 80.0);
          float age = fract(beat) * 3.0;
          float r = length(p - c);
          float r1 = (r - age * 3.6) * 2.2;
          float r2 = (r - age * 2.2) * 2.8;
          rings += (exp(-r1 * r1) + exp(-r2 * r2) * 0.5) * (1.0 - smoothstep(0.1, 3.0, age));
        }
        col += uWarm * rings * uRipples * 0.35;
        float f = fogOf(vW);
        col = mix(col, uFogColor, f);
        // far out the water carries the bright band of the horizon
        col += uHorizon * uGlow * f * f * 0.55;
        // the sun's path across the water: a column of glints between the sun and the eye
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        vec3 S = normalize(uSunAt - vW);
        // narrow across, long toward the eye, broken into fine moving glints
        vec2 rs = vec2(R.x - S.x, R.y - S.y);
        float across = rs.x * 26.0;
        float path = exp(-across * across) * exp(-abs(rs.y) * 14.0);
        float glint = smoothstep(0.62, 0.92, noise(vec2(p.x * 2.6, p.y * 0.42 + uTime * 0.9)));
        col += uWarm * uGlow * path * (0.08 + glint * 1.2) * (1.0 - f * 0.5);
        float a = mix(1.0 - refl, 1.0, f * 0.85);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

/**
 * The sky behind the monument: near black overhead, a thin bright line on the horizon,
 * and a small hot sun sitting low behind the letters with an anamorphic streak through
 * it, the way a long lens catches a light source.
 */
export const makeSky = (horizon: number) =>
  new ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uHorizon: { value: horizon },
      uGlow: { value: 1 },
      uTop: { value: new Color("#020403") },
      uLow: { value: new Color("#0a110c") },
      uBand: { value: new Color("#2e2a18") },
      uSun: { value: C.lumen.clone() },
      uTime: { value: 0 },
      /** where the sun sits on the sky, in world x and y; and how hot its core burns */
      uSunAt: { value: [0, horizon + 26] },
      uHot: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHorizon;
      uniform float uGlow;
      uniform float uSunAt[2];
      uniform float uHot;
      uniform vec3 uTop;
      uniform vec3 uLow;
      uniform vec3 uBand;
      uniform vec3 uSun;
      uniform float uTime;
      varying vec3 vW;
      void main() {
        float y = vW.y - uHorizon;
        float above = max(y, 0.0);
        vec3 col = mix(uLow, uTop, smoothstep(0.0, 900.0, above));
        // a warm band of haze along the horizon, and the line itself
        col += uBand * exp(-above / 70.0) * uGlow;
        col += uSun * exp(-abs(y) / 5.0) * 0.18 * uGlow;
        // the sun: a wide soft halo and a small hot core, low behind the word
        vec2 s = vW.xy - vec2(uSunAt[0], uSunAt[1]);
        float d = length(s * vec2(0.8, 1.0));
        col += uSun * (exp(-d / 160.0) * 0.12 + exp(-d / 46.0) * 0.32 + exp(-d / 12.0) * 1.6 * uHot) * uGlow;
        // the anamorphic streak through it
        col += uSun * exp(-abs(s.y) / 2.0) * exp(-abs(s.x) / 800.0) * 0.22 * uGlow;
        // slow drifting haze in the band
        float mist = 0.5 + 0.5 * sin(vW.x * 0.004 + uTime * 0.05) * sin(vW.x * 0.011 - uTime * 0.07);
        col += uBand * exp(-above / 40.0) * mist * 0.3 * uGlow;
        // below the horizon, where the floor ends, the haze continues
        col = mix(col, uLow + uBand * 0.6, step(y, 0.0));
        // dither: dark gradients this smooth band into rings without it
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.006;
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/** A soft round glow, drawn additively; `uColor` carries the brightness. */
export const makeGlow = (color = C.lumen.clone().multiplyScalar(2)) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: { ...air, uColor: { value: color }, uAlpha: { value: 1 }, uFog: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uFog;
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.4) + exp(-d * 9.0) * 0.6;
        vec3 col = uColor * a * uAlpha * (1.0 - fogOf(vW) * uFog);
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * Streaks of light inside the pipe. Each instance is a quad stretched along the pipe's
 * axis and turned to face the camera; its depth wraps around the camera, so a few
 * thousand streaks fill a pipe of any length.
 */
export const makeStreaks = (span: number) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: {
      ...air,
      uTime: { value: 0 },
      uCamZ: { value: 0 },
      uSpan: { value: span },
      uColor: { value: C.lumen.clone().multiplyScalar(2.4) },
      uCool: { value: C.cream.clone().multiplyScalar(1.6) },
      uAlpha: { value: 1 },
      uStretch: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute vec3 aSize;
      uniform float uTime;
      uniform float uCamZ;
      uniform float uSpan;
      uniform float uStretch;
      varying vec2 vUv;
      varying float vFade;
      varying float vTint;
      varying vec3 vW;
      void main() {
        float z = uCamZ + 14.0 - mod(aSeed.z * uSpan + uTime * aSeed.w, uSpan);
        vec3 c = vec3(aSeed.x, aSeed.y, z);
        vec3 toCam = normalize(cameraPosition - c);
        vec3 side = normalize(cross(vec3(0.0, 0.0, 1.0), toCam));
        float len = aSize.x * uStretch;
        vec3 p = c + vec3(0.0, 0.0, 1.0) * position.y * len + side * position.x * aSize.y;
        vUv = uv;
        float ahead = uCamZ - z;
        vFade = smoothstep(uSpan - 14.0, uSpan * 0.55, ahead) * smoothstep(-14.0, -3.0, ahead);
        vTint = aSize.z;
        vW = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform vec3 uColor;
      uniform vec3 uCool;
      uniform float uAlpha;
      varying vec2 vUv;
      varying float vFade;
      varying float vTint;
      varying vec3 vW;
      void main() {
        float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
        // brightest at the head (the far end), a long tail behind
        float along = smoothstep(0.0, 0.85, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        float a = across * across * along * vFade * uAlpha;
        vec3 col = mix(uColor, uCool, vTint) * a * (1.0 - fogOf(vW));
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/**
 * Light falling out of the cracks. Each point's age comes from one clock the scene can
 * run backwards: when the cracks are sealed, the fallen light rises back into them.
 */
export const makeEmbers = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    ...lightBlend,
    uniforms: {
      ...air,
      uClock: { value: 0 },
      uCracks: { value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      uFall: { value: 260 },
      uPx: { value: 600 },
      uAlpha: { value: 1 },
      uHot: { value: C.lumen.clone().multiplyScalar(3) },
      uCold: { value: new Color("#33463a") },
    },
    vertexShader: /* glsl */ `
      attribute float aCrack;
      attribute vec4 aSeed;
      uniform float uClock;
      uniform float uCracks[12];
      uniform float uFall;
      uniform float uPx;
      varying float vT;
      varying vec3 vW;
      void main() {
        float t = fract(aSeed.x + uClock * (0.11 + aSeed.w * 0.06));
        int k = int(aCrack + 0.5) * 3;
        vec3 c = vec3(uCracks[k], uCracks[k + 1], uCracks[k + 2]);
        // a little spit out of the crack, then straight down
        float out_ = 1.0 - exp(-t * 9.0);
        vec3 p = c + vec3(aSeed.y * 3.2 * out_ + aSeed.y * 5.0 * t, -uFall * pow(t, 1.65), 2.4 + aSeed.z * 3.5 * out_);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_PointSize = min(140.0, (2.2 + aSeed.w * 3.0) * uPx / max(1.0, -mv.z) * (1.0 - 0.55 * t));
        vT = t;
        vW = p;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uAlpha;
      uniform vec3 uHot;
      uniform vec3 uCold;
      varying float vT;
      varying vec3 vW;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0);
        // the light goes out as it falls
        vec3 col = mix(uHot, uCold * 0.6, smoothstep(0.08, 0.6, vT));
        float life = smoothstep(0.0, 0.02, vT) * smoothstep(1.0, 0.7, vT);
        col *= a * life * uAlpha * (1.0 - fogOf(vW));
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
    toneMapped: false,
  });

/** A printed sign in the set: text from a canvas, self-lit, fading into the air. */
export const makeSign = (map: Texture) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { ...air, uMap: { value: map }, uGain: { value: 1.3 }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform sampler2D uMap;
      uniform float uGain;
      uniform float uAlpha;
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vec4 t = texture2D(uMap, vUv);
        float a = t.a * uAlpha * (1.0 - fogOf(vW));
        gl_FragColor = vec4(t.rgb * uGain, a);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  });

/** Dark brushed metal for ribs and flanges, lit only by what passes near it. */
export const makeRib = () =>
  new ShaderMaterial({
    uniforms: { ...air, uColor: { value: new Color("#1d2a20") }, uEdge: { value: C.khaki.clone().multiplyScalar(0.55) }, uWarm: { value: C.lumen.clone() }, uHeat: { value: 0.3 }, uGlowLine: { value: 0 } },
    vertexShader: WORLD_VERT,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform vec3 uColor;
      uniform vec3 uEdge;
      uniform vec3 uWarm;
      uniform float uHeat;
      uniform float uGlowLine;
      varying vec3 vW;
      varying vec3 vN;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(max(0.0, 1.0 - abs(dot(N, V))), 2.0);
        vec3 col = uColor + uEdge * fr + uWarm * uHeat * 0.12 * (0.5 + 0.5 * fr);
        // the stream's ribs carry a faint light of their own
        col += uWarm * uGlowLine * (0.5 + 0.5 * fr);
        col = mix(col, uFogColor, fogOf(vW));
        gl_FragColor = vec4(min(col, vec3(1.9)), 1.0);
      }
    `,
  });
