import type { Metadata } from "next";
import { StageScene, StageWindow } from "@/components/stage/StageControls";
import { TransitionLink } from "@/components/transition/navigation";
import { LostSignal } from "@/components/brand/LostSignal";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Lost signal",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <StageScene scene="lost" />
      <StageWindow as="section" className={styles.page} aria-labelledby="nf-title">
        <p className={styles.code} aria-hidden>
          404
        </p>
        <div className={styles.copy}>
          <h1 id="nf-title" className={styles.title}>
            Lost signal.
          </h1>
          <p className={styles.lede}>
            This page doesn&rsquo;t exist, or it moved. Unlike an abandoned cart, we won&rsquo;t message you about it.
          </p>
          <LostSignal />
          <nav className={styles.links} aria-label="Ways back">
            <TransitionLink href="/">Home</TransitionLink>
            <TransitionLink href="/product">The product</TransitionLink>
            <TransitionLink href="/contact">Contact</TransitionLink>
          </nav>
        </div>
      </StageWindow>
    </>
  );
}
