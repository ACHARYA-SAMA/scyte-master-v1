"use client";

import { Accordion } from "@/components/kit/Accordion";
import { CopyEmail } from "@/components/shell/CopyEmail";
import { WHATSAPP_NUMBER } from "@/config/site";
import styles from "./ContactFaq.module.css";

const FAQ = [
  { id: "long", title: "How long does the audit take?", body: "Twenty minutes on a call, then a short written summary of what we found." },
  { id: "access", title: "Do you need access to our store for the audit?", body: "No. We go through it as a shopper would. Access only comes up if you start a pilot, and then it is set out in writing first." },
  { id: "consent", title: "Will you message our customers without asking us?", body: "Never. Nothing is sent before the playbooks, the holdout and the success number are agreed, and only to shoppers who opted in." },
  { id: "lift", title: "What if the pilot shows no lift?", body: "Then the week-four review says so, against the holdout." },
  { id: "studio", title: "Do you only do WhatsApp recovery?", body: "No. Scyte is a studio first: websites, mobile apps and social media. The recovery platform is what we are building alongside." },
  { id: "where", title: "Where are you?", body: "Hyderabad, India. The time there now is on the map below." },
];

/** K6, questions founders ask, the email with a confirmation, and WhatsApp only once there is a number. */
export function ContactFaq() {
  return (
    <section className={styles.section} aria-labelledby="faq-title">
      <header className={styles.head}>
        <p className={`${styles.kicker} t-hud`}>Before you write</p>
        <h2 id="faq-title" className={styles.title}>
          Questions founders ask.
        </h2>
        <div className={styles.channels}>
          <CopyEmail big />
          {WHATSAPP_NUMBER ? (
            <a className={`${styles.whatsapp} cta`} href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" data-magnetic data-cursor="open">
              Talk to us on WhatsApp
            </a>
          ) : null}
          <p className="t-small c-muted">A person reads every message.</p>
        </div>
      </header>
      <Accordion items={FAQ} single className={styles.list} />
    </section>
  );
}
