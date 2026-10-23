"use client";

import { gsap } from "@/lib/motion";
import { createStore, useStore } from "@/lib/store";
import styles from "./Handoff.module.css";

/**
 * A shared element across a route change. The old page grows an image to fill the
 * screen and hands it to this layer, which outlives the page; the new page names the
 * element that image becomes (data-handoff="<src>") and the layer settles into it.
 */
const handoff = createStore({ src: null as string | null });
let img: HTMLImageElement | null = null;

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Cover the viewport with `src`. Resolves once it is decoded and on screen. */
export const showHandoff = async (src: string) => {
  handoff.set({ src });
  await nextFrame();
  if (img) {
    gsap.set(img, { clearProps: "all" });
    await img.decode().catch(() => undefined);
  }
  await nextFrame();
};

/** Shrink into the new page's matching element, if there is one, then let go. */
export const releaseHandoff = async () => {
  const src = handoff.get().src;
  if (!src || !img) {
    handoff.set({ src: null });
    return;
  }
  const target = document.querySelector<HTMLElement>(`[data-handoff="${CSS.escape(src)}"]`);
  const r = target?.getBoundingClientRect();
  if (r && r.bottom > 0 && r.top < window.innerHeight) {
    await gsap.to(img, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.75, ease: "latch" });
  }
  await gsap.to(img, { opacity: 0, duration: 0.25, ease: "none" });
  handoff.set({ src: null });
};

const bind = (el: HTMLImageElement | null) => {
  img = el;
};

export function Handoff() {
  const src = useStore(handoff, (s) => s.src);
  if (!src) return null;
  // the same file the old page drew, already in the cache
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={bind} className={styles.layer} src={src} alt="" aria-hidden />;
}
