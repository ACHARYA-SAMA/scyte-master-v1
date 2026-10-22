import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/config/site";
import { StageScene, StageWindow } from "@/components/stage/StageControls";
import { Services } from "@/components/home/Services";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./services.module.css";

export const metadata: Metadata = {
  title: "Studio: websites, mobile apps, social media",
  description:
    "Scyte designs and builds websites and mobile apps and runs social media for brands, from Hyderabad. Fast on real phones, priced in rupees.",
  alternates: { canonical: "/services" },
  openGraph: { url: "/services" },
};

const PROCESS = [
  { step: "Call", body: "Thirty minutes on what you sell, who buys it and what is in the way." },
  { step: "Scope", body: "A written plan with a price in rupees and a date." },
  { step: "Design", body: "Real content on real screen sizes, tested on a budget Android phone before you see it." },
  { step: "Build", body: "Weekly working links you can click, not status decks." },
  { step: "Launch", body: "Search set up, analytics wired, your team trained on the editor." },
  { step: "Look after", body: "Updates and fixes on a monthly plan if you want one, or a clean handover if you don't." },
];

export default function ServicesPage() {
  return (
    <>
      <StageScene scene="quiet" />
      <StageWindow as="header" className={styles.hero}>
        <p className={styles.kicker}>Studio</p>
        <h1 className={styles.title}>Websites, apps and the feed people find you through.</h1>
        <p className={styles.lede}>
          A small team in Hyderabad that designs, builds and runs the parts of a brand people actually touch. The
          platform we are building came out of this work.
        </p>
      </StageWindow>

      <Services heading={false} />

      <section className={styles.process} aria-labelledby="process-title">
        <h2 id="process-title" className={styles.h2}>
          How a project runs
        </h2>
        <ol className={styles.steps}>
          {PROCESS.map((p, i) => (
            <li key={p.step}>
              <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.step}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`on-paper ${styles.bridge}`} aria-labelledby="bridge-title">
        <h2 id="bridge-title" className={styles.bridgeTitle}>
          Already selling online?
        </h2>
        <p className={styles.bridgeBody}>
          The studio also designs the consent widget and checkout opt-in for {PRODUCT_NAME}, so the platform has
          consented shoppers to talk to from day one.
        </p>
        <TransitionLink href="/product" className={styles.bridgeLink}>
          See how the platform works
        </TransitionLink>
      </section>
    </>
  );
}
