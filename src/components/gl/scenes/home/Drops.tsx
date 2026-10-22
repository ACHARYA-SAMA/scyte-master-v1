"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are created once and mutated every frame inside useFrame; that is how R3F scenes animate without re-rendering. */
/* eslint-disable react-hooks/purity -- the stream's starting spread and speeds are random on purpose, computed once per mount. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D, Quaternion, Vector3 } from "three";
import { gl, ui } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { C } from "../../materials";
import { CRACK_AT, FILL_ORDER, PATHS, dirAt, pointAt, type PathId } from "./paths";
import { HOME_CHAPTERS, leak } from "./leak";

/**
 * Shoppers as drops of light. Each runs the network letter by letter. At the Y fork a
 * share of payments fail (one in three: a simulation setting, chosen so the leak is
 * easy to see) and take the left arm, where each drop leaks out at the crack of its
 * reason code unless that crack is clamped. A clamped crack sends it round the rescue
 * loop and back into the stream.
 */

type Drop = {
  path: PathId;
  s: number;
  speed: number;
  reason: number;
  exit: number;
  falling: boolean;
  rescued: boolean;
  pos: Vector3;
  vel: Vector3;
  life: number;
  wait: number;
};

const FAIL_SHARE = 1 / 3;
const NEXT: Partial<Record<PathId, PathId>> = {
  feed: "S",
  S: "SC",
  SC: "C",
  C: "CY",
  CY: "Ystem",
  Ypaid: "YT",
  YT: "T",
  Yfail: "rescue",
  rescue: "T",
  T: "TE",
  TE: "Espine",
};
const OUTLETS: PathId[] = ["Ebottom", "Emid", "Etop"];

const dim = C.line.clone();
const hot = C.lumen.clone().multiplyScalar(3.2);
const warm = C.lumen.clone().multiplyScalar(4.5);

export function Drops({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new CapsuleGeometry(0.42, 0.7, 4, 10), []);
  const material = useMemo(() => new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), []);
  const dummy = useMemo(() => new Object3D(), []);
  const tmp = useMemo(() => ({ d: new Vector3(), q: new Quaternion(), up: new Vector3(0, 1, 0), c: new Color() }), []);
  const lastDrip = useRef(0);

  // the stream is already running when the glass appears: drops start spread along
  // the whole network, in proportion to each path's length
  const drops = useMemo<Drop[]>(() => {
    const total = FILL_ORDER.reduce((s, id) => s + PATHS[id].len, 0);
    return Array.from({ length: count }, (_, i) => {
      let at = ((i + Math.random() * 0.5) / count) * total;
      let path: PathId = FILL_ORDER[0];
      for (const id of FILL_ORDER) {
        if (at <= PATHS[id].len) {
          path = id;
          break;
        }
        at -= PATHS[id].len;
      }
      return {
        path,
        s: Math.max(0, at),
        speed: 0.82 + Math.random() * 0.36,
        reason: i % 4,
        exit: i % 3,
        falling: false,
        rescued: false,
        pos: new Vector3(),
        vel: new Vector3(),
        life: 0,
        wait: 0,
      };
    });
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const p = gl.get().progress;
    const started = p > 0.008;
    const inLeaks = p > HOME_CHAPTERS.leaks[0] && p < HOME_CHAPTERS.leaks[1];
    const slow = inLeaks ? 0.3 : 1;
    const dt = Math.min(rawDt, 1 / 20) * slow;
    const L = leak.get();
    let arrived = 0;
    let leaked = 0;
    let rescued = 0;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!started || d.wait > 0) {
        if (started) d.wait -= dt;
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }

      if (d.falling) {
        d.vel.y -= 34 * dt;
        d.vel.multiplyScalar(1 - 0.25 * dt);
        d.pos.addScaledVector(d.vel, dt);
        d.life += dt;
        if (d.pos.y < -150) {
          // back to the store, as a new shopper
          d.falling = false;
          d.path = "feed";
          d.s = 0;
          d.rescued = false;
          d.wait = Math.random() * 1.5;
        }
        tmp.d.copy(d.vel).normalize();
        const fade = Math.min(1, d.life / 0.9);
        tmp.c.copy(hot).lerp(dim, fade);
        m.setColorAt(i, tmp.c);
        tmp.q.setFromUnitVectors(tmp.up, tmp.d);
        dummy.position.copy(d.pos);
        dummy.quaternion.copy(tmp.q);
        const sc = 1 - fade * 0.35;
        dummy.scale.set(sc, sc * (1 + Math.min(2.2, d.vel.length() * 0.05)), sc);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const path = PATHS[d.path];
      const v = 15 * d.speed;
      d.s += v * dt;

      // the failing arm: leak at this drop's crack unless it is clamped
      if (d.path === "Yfail" && !d.rescued) {
        const at = path.len * CRACK_AT[d.reason];
        if (d.s >= at) {
          if (L.sealed[d.reason]) d.rescued = true;
          else {
            pointAt(path, at, d.pos);
            d.pos.z = 2.4;
            d.falling = true;
            d.life = 0;
            d.vel.set((Math.random() - 0.5) * 5, -3 - Math.random() * 3, 7 + Math.random() * 4);
            leaked++;
            if (inLeaks && ui.get().soundOn && performance.now() - lastDrip.current > 260) {
              lastDrip.current = performance.now();
              sfx.drip();
            }
            continue;
          }
        }
      }

      // the E spine hands each drop to its outlet on the way up
      if (d.path === "Espine") {
        const branch = [0, 0.5, 1][d.exit] * path.len;
        if (d.s >= branch) {
          d.path = OUTLETS[d.exit];
          d.s = 0;
        }
      } else if (d.s >= path.len) {
        const over = d.s - path.len;
        if (d.path === "Ystem") d.path = Math.random() < FAIL_SHARE ? "Yfail" : "Ypaid";
        else if (OUTLETS.includes(d.path)) {
          arrived++;
          if (d.rescued) rescued++;
          d.path = "feed";
          d.rescued = false;
          d.wait = Math.random() * 0.6;
        } else d.path = NEXT[d.path] ?? "feed";
        d.s = over;
        if (d.path === "Yfail") d.reason = Math.floor(Math.random() * 4);
        if (d.path === "Espine") d.exit = Math.floor(Math.random() * 3);
      }

      const cur = PATHS[d.path];
      pointAt(cur, d.s, d.pos);
      dirAt(cur, d.s, tmp.d);
      tmp.q.setFromUnitVectors(tmp.up, tmp.d);
      dummy.position.copy(d.pos);
      dummy.quaternion.copy(tmp.q);
      // the streak: faster drops stretch along their path, a cheap motion blur
      dummy.scale.set(1, 1 + v * 0.045 * slow, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, d.rescued ? warm : hot);
    }

    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (arrived || leaked || rescued)
      leak.set((s) => ({ arrived: s.arrived + arrived, leaked: s.leaked + leaked, rescued: s.rescued + rescued }));
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
