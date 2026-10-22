import type { Metadata } from "next";
import { ViewTransition } from "react";
import Image from "next/image";
import { WORK } from "@/data/work";
import { StageScene, StageWindow } from "@/components/stage/StageControls";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./work.module.css";

export const metadata: Metadata = {
  title: "Work",
  description: "Websites, apps and social media Scyte has shipped.",
  alternates: { canonical: "/work" },
  openGraph: { url: "/work" },
};

const SLOTS = ["Website", "Mobile app", "Social media"];

export default function WorkPage() {
  return (
    <>
      <StageScene scene="quiet" />
      <StageWindow as="header" className={styles.hero}>
        <h1 className={styles.title}>Work</h1>
        <p className={styles.lede}>
          {WORK.length
            ? "Projects we have shipped, each with what changed and how we know."
            : "Case studies go up here as clients sign off on them. Until then this page stays honest and nearly empty."}
        </p>
      </StageWindow>

      <section className={styles.list} aria-label="Case studies">
        {WORK.length ? (
          <ol className={styles.rows}>
            {WORK.map((w) => (
              <li key={w.slug}>
                <TransitionLink href={`/work/${w.slug}`} className={styles.row} data-cursor="view" data-cursor-label="Open">
                  <span className={`${styles.year} t-num`}>{w.year}</span>
                  <span className={styles.client}>{w.client}</span>
                  <span className={styles.rowTitle}>{w.title}</span>
                  <span className={styles.tags}>{w.services.join(", ")}</span>
                  <ViewTransition name={`work-${w.slug}`} share="morph" default="none">
                    <span className={styles.cover}>
                      <Image src={w.cover} alt="" fill sizes="(max-width: 900px) 90vw, 40vw" />
                    </span>
                  </ViewTransition>
                </TransitionLink>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            <ol className={styles.slots} aria-label="Empty case study slots">
              {SLOTS.map((s) => (
                <li key={s} className={styles.slot}>
                  <span className={styles.slotFrame} aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.slotKind}>{s}</span>
                  <span className="fill">[ FILL: a real project, with permission ]</span>
                </li>
              ))}
            </ol>
            <p className={styles.emptyNote}>
              Want to be the first one here? Studio projects start with a call.{" "}
              <TransitionLink href="/contact" className={styles.inline}>
                Start a project
              </TransitionLink>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
