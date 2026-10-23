"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, CircleGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, InstancedMesh, LineBasicMaterial, LineSegments, MeshBasicMaterial, Object3D, PerspectiveCamera, Vector3 } from "three";
import { gl, useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { C } from "../../materials";
import { drift } from "../../idle";
import { projectAnchors } from "../../anchors";
import { P0, SHOPPERS, WEEKS, draws, measure, measured, outcomes } from "./measure";

/** dot spacing, world units: the same in both crowds, so density reads as size */
const S = 1;
const COLS_M = 45;
const COLS_H = 15;
/** the gap between the crowds is the valve: the holdout knob sits in it */
const GAP = 16;
/** rows of the tallest crowd the knob's range allows (1,900 messaged at 5 %) */
const MAX_ROWS = 43;
const TAN = Math.tan((30 / 2) * (Math.PI / 180));

type Dot = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; lit: number; flash: number };

/** Grid positions for the two crowds: the messaged block on the left, the holdout to its right. */
const layout = (n1: number, n0: number) => {
  const rowsM = Math.ceil(n1 / COLS_M);
  const rowsH = Math.ceil(Math.max(1, n0) / COLS_H);
  const wM = COLS_M * S;
  const wH = COLS_H * S;
  const total = wM + GAP + wH;
  const x0 = -total / 2;
  // a fixed top, so the crowds hold still while dots move between them
  const top = (MAX_ROWS * S) / 2;
  const pos: [number, number][] = [];
  for (let i = 0; i < SHOPPERS; i++) {
    if (i < n1) {
      const c = i % COLS_M;
      const r = Math.floor(i / COLS_M);
      pos.push([x0 + c * S + S / 2, top - r * S - S / 2]);
    } else {
      const k = i - n1;
      const c = k % COLS_H;
      const r = Math.floor(k / COLS_H);
      pos.push([x0 + wM + GAP + c * S + S / 2, top - r * S - S / 2]);
    }
  }
  return {
    pos,
    total,
    top,
    x0,
    frames: {
      m: { x: x0 - 0.8, y: top + 0.8, w: wM + 1.6, h: rowsM * S + 1.6 },
      h: { x: x0 + wM + GAP - 0.8, y: top + 0.8, w: wH + 1.6, h: rowsH * S + 1.6 },
    },
  };
};

const frameGeometry = (f: { x: number; y: number; w: number; h: number }) => {
  const g = new BufferGeometry();
  const { x, y, w, h } = f;
  // corner brackets, not a full box: an instrument's framing marks
  const k = 2.2;
  const v = [
    [x, y, x + k, y],
    [x, y, x, y - k],
    [x + w, y, x + w - k, y],
    [x + w, y, x + w, y - k],
    [x, y - h, x + k, y - h],
    [x, y - h, x, y - h + k],
    [x + w, y - h, x + w - k, y - h],
    [x + w, y - h, x + w, y - h + k],
  ].flatMap(([a, b, c, d]) => [a!, b!, 0, c!, d!, 0]);
  g.setAttribute("position", new Float32BufferAttribute(v, 3));
  return g;
};

export default function MeasureScene() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const holdout = useStore(measure, (s) => s.holdoutPct);
  const seed = useStore(measure, (s) => s.seed);
  const week = useStore(measure, (s) => s.week);

  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new CircleGeometry(0.34, 14), []);
  const material = useMemo(() => new MeshBasicMaterial({ color: new Color(1, 1, 1), toneMapped: false }), []);
  const lineMat = useMemo(() => new LineBasicMaterial({ color: C.khaki.clone(), transparent: true, opacity: 0.8 }), []);
  const frameM = useRef<LineSegments>(null);
  const frameH = useRef<LineSegments>(null);

  const d = useMemo(() => draws(seed), [seed]);
  const o = useMemo(() => outcomes(d, holdout), [d, holdout]);
  const lay = useMemo(() => layout(o.n1, o.n0), [o]);

  const dots = useMemo<Dot[]>(() => Array.from({ length: SHOPPERS }, () => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, lit: 0, flash: 0 })), []);
  const first = useRef(true);
  const tmp = useMemo(() => ({ o: new Object3D(), c: new Color(), want: new Vector3(), look: new Vector3() }), []);
  const anchors = useMemo(
    () => ({ messaged: new Vector3(), holdout: new Vector3(), knob: new Vector3(), bandL: new Vector3(), bandR: new Vector3() }) as Record<string, Vector3>,
    [],
  );
  const cam = useRef({ pos: new Vector3(), look: new Vector3(), ready: false });

  // new targets when the groups change; the dots glide to them
  useEffect(() => {
    lay.pos.forEach(([x, y], i) => {
      const dot = dots[i]!;
      dot.tx = x;
      dot.ty = y;
      if (first.current || prefersReducedMotion()) {
        dot.x = x;
        dot.y = y;
      }
    });
    first.current = false;
    frameM.current?.geometry.dispose();
    frameH.current?.geometry.dispose();
    if (frameM.current) frameM.current.geometry = frameGeometry(lay.frames.m);
    if (frameH.current) frameH.current.geometry = frameGeometry(lay.frames.h);
  }, [lay, dots]);

  // the rates this world measured, for the DOM
  useEffect(() => {
    const m = measured(o, week);
    measure.set({ p1: m.p1, p0: m.p0 });
  }, [o, week]);

  // every world drawn adds its gap to the pile; a new holdout starts a new pile
  const pileFor = useRef(-1);
  useEffect(() => {
    const m = measured(o, WEEKS);
    const gap = m.p1 - m.p0;
    const fresh = pileFor.current !== holdout;
    pileFor.current = holdout;
    measure.set((s) => ({ worlds: fresh ? [gap] : [...s.worlds, gap].slice(-160) }));
  }, [o, holdout]);

  useEffect(() => {
    mesh.current?.instanceMatrix.setUsage(DynamicDrawUsage);
    return () => {
      geometry.dispose();
      material.dispose();
      lineMat.dispose();
    };
  }, [geometry, material, lineMat]);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const id = e.instanceId;
    if (id === undefined) return;
    const prev = measure.get().hover;
    if (prev?.id === id) return;
    measure.set({ hover: { id, group: id < o.n1 ? "messaged" : "holdout", week: o.week[id] ?? 0 } });
  };

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    const im = mesh.current;
    if (!im) return;
    const reduced = prefersReducedMotion();
    const w = measure.get().week;
    // the share of messaged orders above the holdout's rate: drawn brighter, as the difference layer
    const baseline = Math.round((o.n1 * P0 * w) / WEEKS);
    let messagedLit = 0;
    for (let i = 0; i < SHOPPERS; i++) {
      const dot = dots[i]!;
      // a spring to the dot's place in its crowd; a migrating dot arcs over
      const k = reduced ? 1 : 1 - Math.exp(-dt * (5 + (i % 7)));
      dot.x += (dot.tx - dot.x) * k;
      dot.y += (dot.ty - dot.y) * k;
      const ordered = o.week[i]! > 0 && o.week[i]! <= w;
      const target = ordered ? 1 : 0;
      if (target > dot.lit + 0.5) dot.flash = 1;
      dot.lit += (target - dot.lit) * Math.min(1, dt * 6);
      dot.flash = Math.max(0, dot.flash - dt * 1.6);
      let bright = 0.16;
      let scale = 0.62;
      if (ordered) {
        const isM = i < o.n1;
        if (isM) messagedLit++;
        const incremental = isM && messagedLit > baseline;
        // kept under 1.2 so the core stays yellow: the size carries the difference, not a blown-out white
        bright = incremental ? 1.15 : 0.62;
        scale = incremental ? 1.45 : 0.95;
      }
      const tw = reduced ? 0 : Math.sin(t * 1.3 + i * 0.7) * 0.04;
      tmp.o.position.set(dot.x, dot.y, ordered ? 0.5 : 0);
      const s = (scale + dot.flash * 0.9 + tw) * (0.6 + dot.lit * 0.4);
      tmp.o.scale.set(s, s, s);
      tmp.o.updateMatrix();
      im.setMatrixAt(i, tmp.o.matrix);
      if (ordered) tmp.c.copy(C.lumen).multiplyScalar(bright + dot.flash * 0.6);
      else tmp.c.copy(i < o.n1 ? C.khakiLight : C.khaki).multiplyScalar(bright);
      im.setColorAt(i, tmp.c);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;

    const f = lay.frames;
    anchors.messaged!.set(f.m.x + 2, f.m.y + 1.2, 0);
    anchors.holdout!.set(f.h.x + 1, f.h.y + 1.2, 0);
    anchors.knob!.set(lay.x0 + COLS_M * S + GAP / 2, lay.top - 20, 0);
    anchors.bandL!.set(lay.x0 - 0.8, lay.top - MAX_ROWS * S - 2, 0);
    anchors.bandR!.set(lay.x0 + lay.total + 0.8, lay.top - MAX_ROWS * S - 2, 0);

    // fit both crowds into the stage beside the copy: a share of the view's width,
    // centred to the right of the column; on phones, full width under the copy
    const g = gl.get();
    const aspect = size.width / size.height;
    const portrait = aspect < 1;
    const shareW = portrait ? 0.92 : 0.48;
    const shareH = portrait ? 0.34 : 0.42;
    const ndcX = portrait ? 0 : 0.32;
    const ndcY = portrait ? -0.3 : 0.17;
    const needH = Math.max((lay.total + 2) / shareW / aspect, (MAX_ROWS + 2) / shareH);
    const dist = needH / 2 / TAN;
    const halfH = dist * TAN;
    const lookX = -ndcX * halfH * aspect;
    const lookY = -ndcY * halfH;
    tmp.want.set(lookX + g.px * 3, lookY + g.py * 2, dist - g.progress * 6).add(drift(1.2));
    tmp.look.set(lookX, lookY, 0);
    const c = cam.current;
    if (!c.ready) {
      c.pos.copy(tmp.want);
      c.look.copy(tmp.look);
      c.ready = true;
    } else {
      const kk = 1 - Math.exp(-dt * 2.6);
      c.pos.lerp(tmp.want, kk);
      c.look.lerp(tmp.look, kk);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);
    projectAnchors(camera, anchors, size.width, size.height);
  });

  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <Backdrop z={-14} size={420} cell={5} lines={0.45} />
      <instancedMesh ref={mesh} args={[geometry, material, SHOPPERS]} onPointerMove={onMove} onPointerOut={() => measure.set({ hover: null })} />
      <lineSegments ref={frameM} material={lineMat} />
      <lineSegments ref={frameH} material={lineMat} />
      <Post bloom={0.55} threshold={0.6} />
    </>
  );
}
