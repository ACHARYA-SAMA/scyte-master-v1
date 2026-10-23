"use client";

import { useState } from "react";
import { Station } from "../Station";
import { explodeAt } from "@/components/gl/scenes/collect/CollectScene";
import { LAYER_EVENTS } from "@/components/gl/storeCanvas";
import styles from "./stations.module.css";

const FEED = [
  { at: 0.02, e: "page_view {source: instagram_ad}", src: "SDK" },
  { at: 0.12, e: "anonymous_id a91f-3c", src: "SDK" },
  ...Object.values(LAYER_EVENTS)
    .flat()
    .map((e, i) => ({ at: 0.3 + i * 0.05, e, src: "SDK" })),
  { at: 0.78, e: "checkout_started", src: "Shopify webhook" },
];

export function Collect() {
  const [p, setP] = useState(0);
  const e = explodeAt(p);
  return (
    <Station
      id="collect"
      scene="collect"
      index="01"
      name="Collect"
      mark="0:00"
      moment="Aarav lands on a hoodie page from an Instagram ad"
      title="The store already knows. It just doesn’t listen."
      height="320svh"
      onProgress={setP}
      lede={
        <>
          <p>
            A small script and the store’s own webhooks record what a shopper does: page views, engaged seconds, the size chart, the
            reviews, the cart. Payments and orders arrive straight from the gateway and Shopify, which never miss an event the way a
            browser can.
          </p>
          <p className={`${styles.hint} t-small`}>{e < 0.05 ? "Move over the screen to x-ray it." : "Each part of the page, and the event it sends."}</p>
        </>
      }
    >
      <ol className={styles.feed} aria-label="Events recorded so far">
        {FEED.map((f) => (
          <li key={f.e} data-on={p >= f.at ? "1" : undefined}>
            <code className={styles.event}>{f.e}</code>
            <span className={`${styles.src} t-hud`}>{f.src}</span>
          </li>
        ))}
      </ol>
    </Station>
  );
}
