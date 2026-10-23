"use client";

import { useState } from "react";
import { Station } from "../Station";
import { InteractivePhone } from "@/components/devices/InteractivePhone";
import { BACK_IN_STOCK, CART_RECOVERY, COD_CONFIRM, PAYMENT_FAILED, REVIEW } from "@/lib/chat/flows";
import { recordRecovery, toast } from "@/lib/store";
import { useMedia } from "@/lib/useMedia";
import styles from "./send.module.css";

const BANK = [
  { flow: CART_RECOVERY, name: "Cart recovery", when: "33 min after the cart" },
  { flow: PAYMENT_FAILED, name: "Payment-failed rescue", when: "5 s after the failure" },
  { flow: COD_CONFIRM, name: "COD confirmation", when: "as the order is placed" },
  { flow: BACK_IN_STOCK, name: "Back in stock", when: "when size M returns" },
  { flow: REVIEW, name: "Review request", when: "7 days after delivery" },
];

/**
 * Five working phones on an arc, each receiving a different playbook as the station
 * plays. Pick any one up: it comes to the front and is fully usable.
 */
export function Send() {
  const [p, setP] = useState(0);
  const [focus, setFocus] = useState(1);
  const small = useMedia("(max-width: 960px)");
  const live = (i: number) => p > 0.06 + i * 0.09 || i === focus;
  return (
    <Station
      id="send"
      index="05"
      name="Send"
      mark="3:05"
      moment="Five seconds later"
      title="The right message, on the phone they already hold."
      height="260svh"
      onProgress={setP}
      lede={
        <p>
          Pre-approved templates go out through the official WhatsApp Business API. Order and payment updates are utility messages;
          offers and reminders are marketing, and only with consent. Every phone here runs a real flow. Pick one up and answer it.
        </p>
      }
      stage={
        <div className={styles.bank} data-small={small ? "1" : undefined}>
          {BANK.map((b, i) => {
            const offset = i - focus;
            return (
              <div
                key={b.flow.id}
                className={styles.slot}
                data-focus={i === focus ? "1" : undefined}
                style={{ "--o": offset, "--a": Math.abs(offset) } as React.CSSProperties}
                onPointerDown={() => i !== focus && setFocus(i)}
                onFocusCapture={() => i !== focus && setFocus(i)}
              >
                <p className={styles.tag}>
                  <span className="t-hud">{b.name}</span>
                  <span className="t-hud c-muted">{b.when}</span>
                </p>
                <InteractivePhone
                  flow={b.flow}
                  active={live(i)}
                  tilt={i === focus}
                  label={`Demo chat: ${b.name}`}
                  onOutcome={(o) => {
                    if (o === "recovered") {
                      recordRecovery(b.flow.id);
                      toast(`${b.name}: recovered. One more order on this visit.`, "ok");
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      }
    />
  );
}
