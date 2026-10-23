"use client";

import { useRef, useState } from "react";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { BACK_IN_STOCK, CART_RECOVERY, COD_CONFIRM, PAYMENT_FAILED, REVIEW } from "@/lib/chat/flows";
import { recordRecovery, toast } from "@/lib/store";
import { useAttract } from "@/lib/idle";
import { PhoneWall, type WallItem } from "./PhoneWall";
import styles from "./send.module.css";

const BANK = [
  { flow: CART_RECOVERY, name: "Cart recovery", when: "33 min after the cart" },
  { flow: PAYMENT_FAILED, name: "Payment-failed rescue", when: "5 s after the failure" },
  { flow: COD_CONFIRM, name: "COD confirmation", when: "as the order is placed" },
  { flow: BACK_IN_STOCK, name: "Back in stock", when: "when size M returns" },
  { flow: REVIEW, name: "Review request", when: "7 days after delivery" },
];

/**
 * P6, Send: the phone wall. Five working phones on a curved wall, each running a
 * different playbook on the same chat engine. Turn the wall, pick one up, answer it.
 * While the visitor is still, the wall turns to each phone as its message arrives.
 */
export function Send() {
  const root = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(1);
  useAttract(root, () => setFocus((f) => (f + 1) % BANK.length), 4200);

  const items: WallItem[] = BANK.map((b) => ({
    id: b.flow.id,
    name: b.name,
    when: b.when,
    render: (active, front) => (
      <InteractivePhone
        flow={b.flow}
        active={active}
        tilt={front}
        label={`Demo chat: ${b.name}`}
        onOutcome={(o) => {
          if (o === "recovered") {
            recordRecovery(b.flow.id);
            toast(`${b.name}: recovered. One more order on this visit.`, "ok");
          }
        }}
      />
    ),
  }));

  return (
    <section id="send" className={styles.station} aria-label="05 Send">
      <div ref={root} className={styles.sticky} data-motion-own>
        <header className={styles.head}>
          <span className={styles.index} aria-hidden>
            05
          </span>
          <span className={`${styles.where} t-hud`}>
            <span>Send</span>
            <span className={styles.clock}>3:05</span>
            <span className="c-muted">Five seconds later</span>
          </span>
        </header>
        <div className={styles.copy}>
          <h2 className={styles.title}>The right message, on the phone they already hold.</h2>
          <p className={styles.lede}>
            Pre-approved templates go out through the official WhatsApp Business API. Order and payment updates are utility messages; offers
            and reminders are marketing, and only with consent. Every phone runs a real flow. Turn the wall, pick one up and answer it.
          </p>
        </div>
        <div className={styles.wallArea}>
          <PhoneWall items={items} focus={focus} onFocus={setFocus} label="Five playbooks, each on a working phone" />
        </div>
      </div>
    </section>
  );
}
