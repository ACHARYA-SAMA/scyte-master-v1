"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { gl } from "@/lib/store";
import { LOGO_WIDTH } from "@/lib/logo/geometry";
import { prefersReducedMotion } from "@/lib/motion";
import { projectAnchors } from "../../anchors";
import { PATHS, crackPoint, pointAt } from "./paths";

type Key = { at: number; pos: [number, number, number]; look: [number, number, number]; fov?: number };

/**
 * The camera's route through the wordmark, keyed to scroll. Repeated keys are holds:
 * the camera dwells there while the chapter's DOM plays. Key 0 is solved at runtime
 * so the glass logo sits exactly under the DOM logo it replaces.
 */
const KEYS: Key[] = [
  { at: 0, pos: [0, 0, 165], look: [0, 0, 0] },
  { at: 0.05, pos: [26, -16, 128], look: [0, 1, -2] },
  // the flow: the store first, then down the S
  { at: 0.1, pos: [-46, 52, 26], look: [-76, 46, -20] },
  { at: 0.15, pos: [-30, 36, 30], look: [-50, 22, -6] },
  { at: 0.21, pos: [-28, 14, 34], look: [-56, 2, 0] },
  { at: 0.27, pos: [-40, -26, 40], look: [-30, -14, 0] },
  // the leaks: the Y's failing arm, framed right of the copy column, and hold
  { at: 0.32, pos: [2, -12, 36], look: [-6, 4, 0] },
  { at: 0.36, pos: [-2, 8, 42], look: [-7, 9.6, 0] },
  { at: 0.5, pos: [-2, 8, 42], look: [-7, 9.6, 0] },
  // one shopper: follow a drop down to his phone, and hold
  { at: 0.56, pos: [2, -34, 36], look: [0, -56, 0] },
  { at: 0.6, pos: [0, -78, 44], look: [0, -80, 0] },
  { at: 0.7, pos: [0, -78, 44], look: [0, -80, 0] },
  // relit: back up to the clamped arm
  { at: 0.77, pos: [6, 4, 44], look: [-10, 8, 0] },
  { at: 0.84, pos: [6, 4, 44], look: [-10, 8, 0] },
  // the builders: pull back until the whole network reads as the name, high in frame
  { at: 0.92, pos: [0, 30, 176], look: [0, -18, -2] },
  { at: 1, pos: [0, 150, 150], look: [0, -26, -4] },
];

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const sample = (p: number, keys: Key[], pos: Vector3, look: Vector3) => {
  let i = 1;
  while (i < keys.length - 1 && keys[i].at < p) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const span = b.at - a.at || 1;
  const t = smoother(Math.min(1, Math.max(0, (p - a.at) / span)));
  pos.set(a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t);
  look.set(a.look[0] + (b.look[0] - a.look[0]) * t, a.look[1] + (b.look[1] - a.look[1]) * t, a.look[2] + (b.look[2] - a.look[2]) * t);
};

/** Anchors the DOM labels follow. */
const ANCHORS = {
  store: new Vector3(-62, 52, -20),
  view: pointAt(PATHS.S, 4, new Vector3()),
  sizeChart: pointAt(PATHS.S, 34, new Vector3()),
  cart: pointAt(PATHS.C, 12, new Vector3()),
  checkout: pointAt(PATHS.C, PATHS.C.len - 6, new Vector3()),
  fork: pointAt(PATHS.Ystem, PATHS.Ystem.len, new Vector3()),
  paid: pointAt(PATHS.Ypaid, PATHS.Ypaid.len * 0.6, new Vector3()),
  crack0: crackPoint(0),
  crack1: crackPoint(1),
  crack2: crackPoint(2),
  crack3: crackPoint(3),
  send: pointAt(PATHS.Espine, PATHS.Espine.len * 0.5, new Vector3()),
  order: pointAt(PATHS.Etop, PATHS.Etop.len, new Vector3()),
};

export function Rig({ focus }: { focus: Vector3 }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const keys = useMemo(() => KEYS.map((k) => ({ ...k, pos: [...k.pos] as Key["pos"], look: [...k.look] as Key["look"] })), []);
  const want = useRef({ pos: new Vector3(0, 0, 165), look: new Vector3() });
  const cur = useRef({ pos: new Vector3(0, 0, 165), look: new Vector3(), ready: false });

  // solve key 0 so the glass logo matches the DOM logo's size and position
  useEffect(() => {
    const fit = () => {
      const el = document.querySelector<HTMLElement>("[data-hero-logo]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const k = r.width / LOGO_WIDTH; // px per unit
      const visH = size.height / k;
      const dist = visH / 2 / Math.tan((camera.fov * Math.PI) / 360);
      const cy = r.top + r.height / 2 - size.height / 2;
      const cx = r.left + r.width / 2 - size.width / 2;
      keys[0].pos = [cx / k, cy / k, dist];
      keys[0].look = [cx / k, cy / k, 0];
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [camera, keys, size.height, size.width]);

  useFrame((_, dt) => {
    const s = gl.get();
    sample(s.progress, keys, want.current.pos, want.current.look);
    // portrait screens see less width: pull back along the view line (key 0 is exact already)
    const aspect = size.width / size.height;
    if (aspect < 1.25 && s.progress > 0.02) {
      const pull = Math.min(2.3, 1.25 / aspect) * Math.min(1, (s.progress - 0.02) / 0.03);
      const k = 1 + (pull - 1) * 1;
      want.current.pos.sub(want.current.look).multiplyScalar(Math.max(1, k)).add(want.current.look);
    }
    // a breath of pointer parallax, never in the hero (it must sit under the DOM logo)
    if (s.progress > 0.04 && !prefersReducedMotion()) {
      want.current.pos.x += s.px * 2.2;
      want.current.pos.y += s.py * 1.4;
    }
    const c = cur.current;
    if (!c.ready || prefersReducedMotion()) {
      c.pos.copy(want.current.pos);
      c.look.copy(want.current.look);
      c.ready = true;
    } else {
      const k = 1 - Math.exp(-dt * 5.5);
      c.pos.lerp(want.current.pos, k);
      c.look.lerp(want.current.look, k);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    focus.copy(c.look);
    projectAnchors(camera, ANCHORS, size.width, size.height);
  });

  return null;
}
