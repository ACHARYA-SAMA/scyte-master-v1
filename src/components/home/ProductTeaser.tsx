"use client";

import { useRef } from "react";
import { Phone, type ChatMessage } from "@/components/product/Phone";
import { TransitionLink } from "@/components/transition/navigation";
import { PRODUCT_NAME } from "@/config/site";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/motion";
import styles from "./ProductTeaser.module.css";

const MESSAGES: ChatMessage[] = [
  { id: "sys", from: "system", text: "Today" },
  {
    id: "pf",
    from: "brand",
    tag: "Utility template",
    text: "Hi Aarav, your payment of ₹1,499 didn't go through. Your cart is saved.",
    time: "15:05",
    buttons: ["Retry in one tap", "Pay by UPI", "Cash on delivery"],
  },
];

const PROBLEMS = [
  {
    head: "Payments fail quietly",
    body: "A UPI timeout or a bank decline looks like abandonment in most dashboards, though the shopper often still wants to buy.",
  },
  {
    head: "COD costs twice",
    body: "Unconfirmed cash-on-delivery orders get refused at the door, and the shipping is paid both ways.",
  },
  {
    head: "Proof is weak",
    body: "Most tools claim revenue from people who would have bought anyway. We measure against a holdout instead.",
  },
];

export function ProductTeaser() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const title = el.querySelector<HTMLElement>("[data-title]");
      if (title) {
        const split = SplitText.create(title, { type: "lines", mask: "lines", linesClass: styles.line });
        gsap.from(split.lines, {
          yPercent: 105,
          duration: 0.9,
          ease: "latch",
          stagger: 0.07,
          scrollTrigger: { trigger: title, start: "top 78%" },
        });
      }
      gsap.from(el.querySelectorAll("[data-msg]"), {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: "glide",
        stagger: 0.25,
        scrollTrigger: { trigger: el.querySelector("[data-phone]"), start: "top 70%" },
      });
      // Exit: the phone keeps rising as the section leaves, the copy holds still.
      gsap.to(el.querySelector("[data-phone]"), {
        yPercent: -12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "center center", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={`on-paper ${styles.section}`} aria-labelledby="teaser-title">
      <div className={styles.grid}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            {PRODUCT_NAME}, from Scyte. WhatsApp recovery for online stores.
          </p>
          <h2 id="teaser-title" className={styles.title} data-title>
            Your shopper didn&rsquo;t leave. Their UPI timed out.
          </h2>
          <p className={styles.lede}>
            We read what shoppers do on a store, work out who still wants to buy, and send one consented, pre-approved
            WhatsApp message at the right moment. Then we prove the revenue against a group that got nothing.
          </p>
          <TransitionLink href="/product" className={styles.cta} data-cursor="view" data-cursor-label="Enter">
            Walk through the platform
          </TransitionLink>
          <p className={styles.status}>
            Status <span className="fill">[ FILL: pre-revenue, pilots or paying ]</span>
          </p>
        </div>
        <div className={styles.phoneWrap} data-phone>
          <Phone brand="Hoodie Co." time="15:05" messages={MESSAGES} label="A payment-failed message with three ways to finish the order" />
          <p className={styles.caption}>
            Sample message, built from the report&rsquo;s payment-failed template. Not a live send.
          </p>
        </div>
      </div>
      <ul className={styles.problems}>
        {PROBLEMS.map((p) => (
          <li key={p.head}>
            <h3>{p.head}</h3>
            <p>{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
