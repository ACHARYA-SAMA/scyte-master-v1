import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { StageScene, StageWindow } from "@/components/stage/StageControls";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact: book a 20-minute store audit",
  description: "Book a 20-minute store audit or start a studio project with Scyte in Hyderabad. Email scytehq@gmail.com.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact" },
};

const AUDIT = [
  { t: "Before the call", d: "We study your store, payment methods, COD share and the messages you send today." },
  { t: "On the call", d: "Twenty minutes on where carts, payments and COD orders leak, with your own numbers." },
  { t: "After", d: "If it fits, a 30-day pilot with a holdout. If it doesn't, you keep the audit." },
];

export default function ContactPage() {
  return (
    <>
      <StageScene scene="quiet" />
      <StageWindow as="section" className={styles.page} aria-labelledby="contact-title">
        <div className={styles.side}>
          <h1 id="contact-title" className={styles.title}>
            Let&rsquo;s talk.
          </h1>
          <div id="audit" className={styles.audit}>
            <h2 className={styles.auditTitle}>The 20-minute store audit</h2>
            <ol className={styles.steps}>
              {AUDIT.map((a, i) => (
                <li key={a.t}>
                  <span className="t-num">{String(i + 1).padStart(2, "0")}</span>
                  <strong>{a.t}</strong>
                  <p>{a.d}</p>
                </li>
              ))}
            </ol>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Write</dt>
              <dd>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </dd>
            </div>
            <div>
              <dt>Visit</dt>
              <dd>{SITE.city}, India</dd>
            </div>
            <div>
              <dt>Follow</dt>
              <dd className={styles.socials}>
                <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
                <a href={SITE.socials.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.formCol}>
          <ContactForm />
        </div>
      </StageWindow>
    </>
  );
}
