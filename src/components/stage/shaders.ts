/**
 * The event-pixel field. One instanced quad per pixel; the vertex shader computes
 * where each pixel sits in two formations and morphs between them.
 *
 * Formations
 *   0 home      a dot matrix that records the pointer trail and visit events
 *   1 pipeline  the six-station shopper-data world (3D, perspective camera)
 *   2 portrait  a halftone portrait made of square cells
 *   3 lost      scattered drifting pixels (404)
 *   4 quiet     a faint, still matrix behind long-form pages
 */

export const FORMATION = { home: 0, pipeline: 1, portrait: 2, lost: 3, quiet: 4 } as const;
export const TRAIL = 12;
export const BURSTS = 6;
export const STATION_SPACING = 12;
export const EVENT_SHARE = 0.62;

export const vertexShader = /* glsl */ `
precision highp float;

attribute vec4 aRand;
attribute float aIdx;

uniform float uTime;
uniform vec2 uRes;
uniform float uDpr;
uniform float uCount;
uniform vec2 uPointer;
uniform vec3 uTrail[${TRAIL}];
uniform vec4 uBursts[${BURSTS}];
uniform float uFormA;
uniform float uFormB;
uniform float uMorph;
uniform float uScroll;
uniform float uStation;
uniform float uConsent;
uniform sampler2D uPortraitA;
uniform sampler2D uPortraitB;
uniform float uPortraitMix;
uniform float uPortraitOn;
uniform float uPortraitAspect;
uniform float uScan;
uniform vec3 uBone;
uniform vec3 uMoss;
uniform vec3 uSignal;
uniform vec3 uDim;

varying vec3 vColor;
varying float vAlpha;

const float SP = ${STATION_SPACING.toFixed(1)};
const float EVENT_SHARE = ${EVENT_SHARE};

struct Pix { vec4 clip; vec3 color; float alpha; };

Pix hidden() {
  Pix o;
  o.clip = vec4(0.0, 0.0, 2.0, 1.0); // beyond the far plane: clipped
  o.color = uMoss;
  o.alpha = 0.0;
  return o;
}

float snapPx(float v) { return floor(v * uDpr + 0.5) / uDpr; }

vec4 screenClip(vec2 px, float sizePx) {
  px = vec2(snapPx(px.x), snapPx(px.y));
  vec2 ndc = vec2(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0);
  vec2 corner = position.xy * (sizePx / uRes) * 2.0;
  return vec4(ndc + corner, 0.0, 1.0);
}

vec4 worldClip(vec3 p, float size) {
  vec4 mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * size;
  return projectionMatrix * mv;
}

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// ---------------------------------------------------------------------------------
// 0 / 4: the dot matrix
// ---------------------------------------------------------------------------------
Pix formMatrix(float quiet) {
  float spacing = mix(24.0, 34.0, quiet);
  float cols = ceil(uRes.x / spacing) + 1.0;
  float rows = ceil(uRes.y / spacing) + 2.0;
  if (aIdx >= cols * rows) return hidden();
  float c = mod(aIdx, cols);
  float r = floor(aIdx / cols);
  vec2 px = vec2(c, r) * spacing + spacing * 0.5;
  px.y -= mod(uScroll * uRes.y * 0.35, spacing);
  vec2 uv = px / uRes;

  // The pointer trail is recorded, not glowed: each cell takes the strongest nearby
  // sample, then the value is quantised into three discrete sizes.
  float g = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec3 t = uTrail[i];
    vec2 d = (uv - t.xy) * uRes;
    g = max(g, exp(-dot(d, d) / (2.0 * 30.0 * 30.0)) * (1.0 - t.z));
  }
  for (int i = 0; i < ${BURSTS}; i++) {
    vec4 b = uBursts[i];
    vec2 dv = abs((uv - b.xy) * uRes);
    float dd = max(dv.x, dv.y); // square rings: the logo's grammar, not circles
    float radius = b.z * 520.0;
    g = max(g, exp(-pow((dd - radius) / 14.0, 2.0)) * (1.0 - b.z) * b.w);
  }
  g *= 1.0 - quiet * 0.9;
  float level = floor(g * 3.0 + 0.35); // 0..3

  vec2 toP = (uv - uPointer) * uRes;
  float dp = length(toP);
  px += (toP / max(dp, 1.0)) * exp(-dp * dp / (2.0 * 70.0 * 70.0)) * 10.0 * (1.0 - quiet);

  float size = level < 0.5 ? 2.0 : 2.0 + level * (spacing * 0.22);
  Pix o;
  o.clip = screenClip(px, floor(size));
  vec3 base = uMoss * mix(1.9, 1.5, quiet);
  vec3 lit = level > 2.5 && aRand.y > 0.9 ? uSignal : (level > 1.5 ? uBone : mix(base, uBone, 0.55));
  o.color = level < 0.5 ? base : lit;
  o.alpha = 1.0;
  return o;
}

// ---------------------------------------------------------------------------------
// 2: halftone portrait
// ---------------------------------------------------------------------------------
vec2 coverUv(vec2 uv, float screenAspect, float texAspect) {
  vec2 s = screenAspect > texAspect ? vec2(1.0, texAspect / screenAspect) : vec2(screenAspect / texAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

Pix formPortrait() {
  float spacing = max(7.0, sqrt(uRes.x * uRes.y / max(uCount, 1.0)) * 1.04);
  float cols = ceil(uRes.x / spacing) + 1.0;
  float rows = ceil(uRes.y / spacing) + 1.0;
  if (aIdx >= cols * rows) return hidden();
  float c = mod(aIdx, cols);
  float r = floor(aIdx / cols);
  vec2 px = vec2(c, r) * spacing + spacing * 0.5;
  vec2 uv = px / uRes;
  vec2 tuv = coverUv(uv, uRes.x / uRes.y, uPortraitAspect);
  tuv.y = 1.0 - tuv.y;

  float la = texture2D(uPortraitA, tuv).r;
  float lb = texture2D(uPortraitB, tuv).r;
  float swap = smoothstep(aRand.x - 0.12, aRand.x + 0.12, uPortraitMix * 1.24 - 0.12);
  float l = mix(la, lb, swap);
  // mid-swap, cells blink out: the dissolve reads as a re-scan, not a crossfade
  float gap = 1.0 - smoothstep(0.0, 0.22, abs(uPortraitMix * 1.24 - 0.12 - aRand.x));
  l *= 1.0 - gap * 0.85;

  // pointer lens: cells near the pointer sharpen and are pushed aside
  vec2 toP = (uv - uPointer) * uRes;
  float dp = length(toP);
  float lens = exp(-dp * dp / (2.0 * 120.0 * 120.0));
  l = mix(l, smoothstep(0.25, 0.75, l), lens);
  px += (toP / max(dp, 1.0)) * lens * spacing * 0.9;

  // scan line sweeping the face
  float scan = uScan < 0.0 ? 0.0 : exp(-pow((uv.y - uScan) * uRes.y / 10.0, 2.0));

  float base = 1.0;
  float size = floor(mix(base, spacing * 0.96, pow(l, 0.85) * uPortraitOn));
  Pix o;
  o.clip = screenClip(px, size);
  o.color = mix(mix(uMoss * 1.6, uBone, smoothstep(0.1, 0.6, l * uPortraitOn)), uSignal, scan * step(0.2, l));
  o.alpha = mix(0.4, 1.0, uPortraitOn);
  return o;
}

// ---------------------------------------------------------------------------------
// 3: lost signal
// ---------------------------------------------------------------------------------
Pix formLost() {
  if (aIdx >= min(uCount, 2400.0)) return hidden();
  vec2 base = aRand.xy;
  float t = uTime * (0.04 + aRand.z * 0.05);
  vec2 drift = vec2(sin(t + aRand.w * 6.283), cos(t * 1.3 + aRand.x * 6.283)) * 0.06;
  vec2 uv = fract(base + drift + vec2(uTime * 0.004 * (aRand.w - 0.5), 0.0));
  vec2 px = uv * uRes;
  vec2 toP = (uPointer * uRes) - px;
  float dp = length(toP);
  px += toP * exp(-dp * dp / (2.0 * 160.0 * 160.0)) * 0.35;
  Pix o;
  o.clip = screenClip(px, aRand.y > 0.85 ? 4.0 : 2.0);
  o.color = aRand.z > 0.97 ? uSignal : mix(uMoss * 1.6, uBone, aRand.y);
  o.alpha = 0.85;
  return o;
}

// ---------------------------------------------------------------------------------
// 1: the pipeline world
// Stations sit along +x, SP units apart: Collect, Identify, Understand, Decide, Send,
// Measure. ~62% of pixels are shopper events, the rest draw the stations.
// ---------------------------------------------------------------------------------

// Station outlines as line segments (x0, y0, x1, y1), relative to the station centre.
const vec4 S0[6] = vec4[6](
  vec4(-3.6, -2.4, 3.6, -2.4), vec4(3.6, -2.4, 3.6, 2.4), vec4(3.6, 2.4, -3.6, 2.4),
  vec4(-3.6, 2.4, -3.6, -2.4), vec4(-3.6, 1.7, 3.6, 1.7), vec4(-3.2, 2.05, -2.5, 2.05));
const vec4 S1[5] = vec4[5](
  vec4(-0.9, -2.6, -0.9, 2.6), vec4(0.9, -2.6, 0.9, 2.6), vec4(-1.4, 2.6, 1.4, 2.6),
  vec4(-1.4, -2.6, -0.9, -2.6), vec4(0.9, -2.6, 1.4, -2.6));
const vec4 S2[6] = vec4[6](
  vec4(-1.0, -2.5, 1.0, -2.5), vec4(1.0, -2.5, 1.0, 2.5), vec4(1.0, 2.5, -1.0, 2.5),
  vec4(-1.0, 2.5, -1.0, -2.5), vec4(1.3, -2.5, 1.3, 2.5), vec4(1.3, 0.9, 1.8, 0.9));
const vec4 S3[6] = vec4[6](
  vec4(-3.4, 0.0, -0.6, 0.0), vec4(-0.6, 0.0, 0.8, 2.0), vec4(-0.6, 0.0, 0.8, -2.0),
  vec4(-0.6, 0.0, 3.4, 0.0), vec4(0.8, 2.0, 3.4, 2.0), vec4(0.8, -2.0, 3.4, -2.0));
const vec4 S4[6] = vec4[6](
  vec4(-1.4, -2.6, 1.4, -2.6), vec4(1.4, -2.6, 1.4, 2.6), vec4(1.4, 2.6, -1.4, 2.6),
  vec4(-1.4, 2.6, -1.4, -2.6), vec4(-0.4, 2.3, 0.4, 2.3), vec4(-0.3, -2.3, 0.3, -2.3));
const vec4 S5[6] = vec4[6](
  vec4(-3.2, -2.6, 3.2, -2.6), vec4(-2.1, -2.6, -2.1, 2.6), vec4(-0.5, -2.6, -0.5, 2.6),
  vec4(0.5, -2.6, 0.5, 1.2), vec4(2.1, -2.6, 2.1, 1.2), vec4(-2.1, 2.6, -0.5, 2.6));

float segLen(vec4 s) { return length(s.zw - s.xy); }

vec2 walk6(vec4 a, vec4 b, vec4 c, vec4 d, vec4 e, vec4 f, float q) {
  float l0 = segLen(a), l1 = segLen(b), l2 = segLen(c), l3 = segLen(d), l4 = segLen(e), l5 = segLen(f);
  float L = (l0 + l1 + l2 + l3 + l4 + l5) * q;
  if (L < l0) return mix(a.xy, a.zw, L / l0); L -= l0;
  if (L < l1) return mix(b.xy, b.zw, L / l1); L -= l1;
  if (L < l2) return mix(c.xy, c.zw, L / l2); L -= l2;
  if (L < l3) return mix(d.xy, d.zw, L / l3); L -= l3;
  if (L < l4) return mix(e.xy, e.zw, L / l4); L -= l4;
  return mix(f.xy, f.zw, clamp(L / l5, 0.0, 1.0));
}

vec2 stationOutline(int k, float q) {
  if (k == 0) return walk6(S0[0], S0[1], S0[2], S0[3], S0[4], S0[5], q);
  if (k == 1) return walk6(S1[0], S1[1], S1[2], S1[3], S1[4], S1[4], q);
  if (k == 2) return walk6(S2[0], S2[1], S2[2], S2[3], S2[4], S2[5], q);
  if (k == 3) return walk6(S3[0], S3[1], S3[2], S3[3], S3[4], S3[5], q);
  if (k == 4) return walk6(S4[0], S4[1], S4[2], S4[3], S4[4], S4[5], q);
  return walk6(S5[0], S5[1], S5[2], S5[3], S5[4], S5[5], q);
}

vec2 snapCell(vec2 p, float cell) { return floor(p / cell + 0.5) * cell; }

// Where an event sits while at station k.
vec3 eventHome(int k, bool consent, bool holdout, bool suppressed) {
  float X = float(k) * SP;
  float jitter = 0.05 * sin(uTime * (1.0 + aRand.w * 2.0) + aRand.x * 40.0);
  if (k == 0) {
    vec2 p = vec2((aRand.x * 2.0 - 1.0) * 3.2, (aRand.y * 2.0 - 1.0) * 1.85 - 0.3);
    p = snapCell(p, 0.3);
    return vec3(X + p.x, p.y + jitter, (aRand.z - 0.5) * 0.4);
  }
  if (!consent) {
    // refused at the gate: dropped to the floor beside it, and they stay there
    return vec3(SP + 1.6 + aRand.z * 2.4, -3.0 - aRand.y * 0.5, (aRand.w - 0.5) * 1.2);
  }
  if (k == 1) {
    return vec3(X + (aRand.z - 0.5) * 0.5, (aRand.y * 2.0 - 1.0) * 2.2, (aRand.w - 0.5) * 0.3);
  }
  if (k == 2) {
    float fill = smoothstep(1.4, 2.5, uStation);
    vec2 p = vec2((aRand.z - 0.5) * 1.7, -2.4 + aRand.w * 4.8 * fill);
    p = snapCell(p, 0.2);
    return vec3(X + p.x, p.y, 0.0);
  }
  if (k == 3 || (suppressed && k > 3)) {
    float lane = holdout ? 2.0 : (suppressed ? -2.0 : 0.0);
    return vec3(3.0 * SP + 1.0 + aRand.z * 2.2, lane + (aRand.w - 0.5) * 0.3 + jitter, 0.0);
  }
  if (k == 4) {
    if (holdout) return vec3(X + (aRand.z - 0.5) * 2.0, 3.4 + aRand.w * 0.4, -0.5);
    // assemble into a message bubble inside the phone
    vec2 p = vec2(-1.05 + aRand.z * 2.1, 0.1 + aRand.w * 1.5);
    if (aRand.y > 0.9) p = vec2(-0.9 + aRand.z * 0.4, -0.2 - aRand.w * 0.3);
    p = snapCell(p, 0.18);
    return vec3(X + p.x, p.y, 0.15);
  }
  // k == 5: messaged shoppers fill column A; the holdout fills column B to its own rate
  if (holdout) {
    vec2 p = vec2(1.3 + (aRand.z - 0.5) * 1.3, -2.5 + aRand.w * 2.0);
    return vec3(X + snapCell(p, 0.2).x, snapCell(p, 0.2).y, 0.0);
  }
  vec2 p = vec2(-1.3 + (aRand.z - 0.5) * 1.3, -2.5 + aRand.w * 5.0);
  return vec3(X + snapCell(p, 0.2).x, snapCell(p, 0.2).y, 0.0);
}

Pix formPipeline() {
  float f = aIdx / max(uCount, 1.0);
  if (f >= 1.0) return hidden();
  Pix o;

  if (f >= EVENT_SHARE) {
    float u = (f - EVENT_SHARE) / (1.0 - EVENT_SHARE);
    int k = int(floor(u * 6.0));
    float q = fract(u * 6.0);
    vec2 p = stationOutline(k, q);
    float near = 1.0 - smoothstep(0.6, 1.6, abs(uStation - float(k)));
    o.clip = worldClip(vec3(float(k) * SP + p.x, p.y, 0.0), 0.06);
    o.color = mix(uMoss * 1.9, uBone, near);
    o.alpha = mix(0.55, 1.0, near);
    return o;
  }

  bool consent = aRand.x < 0.4 && uConsent > 0.5;
  bool holdout = consent && aRand.y < 0.10;
  bool suppressed = consent && !holdout && aRand.y < 0.24;

  float delay = aRand.w * 1.25;
  float phi = clamp(uStation + 0.55 - delay, 0.0, 5.0);
  int k = int(min(floor(phi), 4.0));
  float t = phi >= 5.0 ? 1.0 : fract(phi);
  float glide = smoothstep(0.3, 1.0, t);

  vec3 a = eventHome(k, consent || k == 0, holdout, suppressed);
  vec3 b = eventHome(min(k + 1, 5), consent, holdout, suppressed);
  if (!consent && k >= 1) b = a;
  vec3 pos = mix(a, b, glide);
  // a slight arc between stations, like a conveyor lifting a part
  pos.y += sin(glide * 3.14159) * (0.6 + aRand.z * 0.8) * step(0.001, glide) * step(glide, 0.999);

  float st = float(k) + glide;
  vec3 col = uBone;
  float alpha = 1.0;
  if (st < 1.0) col = mix(uMoss * 2.0, uBone * 0.8, aRand.z);
  if (!consent && st >= 1.0) { col = uMoss * 1.5; alpha = 0.6; }
  if (holdout && st >= 3.0) { col = uDim; alpha = 0.85; }
  if (suppressed && st >= 3.0) { col = uMoss * 1.6; alpha = 0.6; }
  if (st >= 4.6 && !holdout && consent && !suppressed) {
    // measured lift: the top 60% of column A is incremental
    float h = (pos.y + 2.5) / 5.0;
    col = h > 0.4 ? mix(uBone, uSignal, step(0.97, aRand.x * 2.5)) : uBone * 0.62;
  }
  o.clip = worldClip(pos, 0.075);
  o.color = col;
  o.alpha = alpha;
  return o;
}

Pix formation(float id) {
  if (id < 0.5) return formMatrix(0.0);
  if (id < 1.5) return formPipeline();
  if (id < 2.5) return formPortrait();
  if (id < 3.5) return formLost();
  return formMatrix(1.0);
}

void main() {
  Pix a = formation(uFormA);
  if (uMorph <= 0.0) {
    gl_Position = a.clip;
    vColor = a.color;
    vAlpha = a.alpha;
    return;
  }
  Pix b = formation(uFormB);
  // per-pixel stagger so the morph reads as a swarm, not a crossfade
  float m = smoothstep(aRand.z * 0.45, aRand.z * 0.45 + 0.55, uMorph);
  bool aOff = a.alpha <= 0.0 || a.clip.w <= 0.0;
  bool bOff = b.alpha <= 0.0 || b.clip.w <= 0.0;
  if (aOff && bOff) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vAlpha = 0.0; vColor = a.color; return; }
  vec4 ca = aOff ? b.clip / b.clip.w : a.clip / a.clip.w;
  vec4 cb = bOff ? ca : b.clip / b.clip.w;
  if (aOff) a.color = b.color;
  if (bOff) b.color = a.color;
  gl_Position = mix(ca, cb, m);
  vColor = mix(a.color, b.color, m);
  vAlpha = mix(aOff ? 0.0 : a.alpha, bOff ? 0.0 : b.alpha, m);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform float uFade;
varying vec3 vColor;
varying float vAlpha;

// 4x4 ordered dither: transparency without blending keeps every pixel crisp.
float bayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x + q.y * 4.0);
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}

void main() {
  float a = vAlpha * uFade;
  if (a < bayer(gl_FragCoord.xy)) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`;
