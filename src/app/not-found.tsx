import type { Metadata } from "next";
import { TransitionLink } from "@/components/transition/navigation";
import { PipeGame } from "@/components/lost/PipeGame";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "This page leaked",
  robots: { index: false },
};

const WAYS = [
  { href: "/", label: "Home" },
  { href: "/product", label: "The product" },
  { href: "/studio", label: "The studio" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <section className={styles.page} aria-labelledby="nf-title">
      <div className={styles.copy}>
        <p className="t-hud c-khaki">404</p>
        <h1 id="nf-title" className={styles.title}>
          This page leaked.
        </h1>
        <p className={styles.lede}>
          Nothing lives at this address. It may have moved, or it never existed. Turn the pipes until the liquid reaches home, or skip the
          puzzle and take a way back.
        </p>
        <nav aria-label="Ways back">
          <ul className={styles.ways}>
            {WAYS.map((w) => (
              <li key={w.href}>
                <TransitionLink href={w.href}>{w.label}</TransitionLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <PipeGame />
    </section>
  );
}
