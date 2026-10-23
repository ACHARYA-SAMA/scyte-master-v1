import { Vector3 } from "three";
import { prefersReducedMotion } from "@/lib/motion";

const v = new Vector3();

/**
 * A slow handheld drift for a scene's camera target, so a scene that is waiting for
 * scroll still breathes. Three incommensurate sines, so it never visibly loops.
 * `amount` is in the scene's own units; nothing moves with reduced motion.
 */
export const drift = (amount: number, t = performance.now() / 1000) => {
  if (prefersReducedMotion()) return v.set(0, 0, 0);
  return v.set(Math.sin(t * 0.31) * amount, Math.sin(t * 0.23 + 1.3) * amount * 0.6, Math.sin(t * 0.17 + 0.4) * amount * 0.45);
};
