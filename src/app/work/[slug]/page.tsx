import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import Image from "next/image";
import { WORK } from "@/data/work";
import { StageScene } from "@/components/stage/StageControls";
import { TransitionLink } from "@/components/transition/navigation";
import styles from "./case.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return WORK.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata(props: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const w = WORK.find((x) => x.slug === slug);
  if (!w) return {};
  return {
    title: `${w.client}: ${w.title}`,
    description: w.summary,
    alternates: { canonical: `/work/${w.slug}` },
    openGraph: { url: `/work/${w.slug}`, images: [{ url: w.cover }] },
  };
}

export default async function CasePage(props: PageProps<"/work/[slug]">) {
  const { slug } = await props.params;
  const w = WORK.find((x) => x.slug === slug);
  if (!w) notFound();

  return (
    <article className={styles.case}>
      <StageScene scene="quiet" />
      <header className={styles.head}>
        <p className={styles.meta}>
          <span className="t-num">{w.year}</span> <span>{w.services.join(", ")}</span>
        </p>
        <h1 className={styles.client}>{w.client}</h1>
        <p className={styles.title}>{w.title}</p>
      </header>
      <ViewTransition name={`work-${w.slug}`} share="morph" default="none">
        <div className={styles.cover}>
          <Image src={w.cover} alt={`${w.client}, ${w.title}`} fill priority sizes="100vw" />
        </div>
      </ViewTransition>
      <div className={styles.body}>
        <p className={styles.summary}>{w.summary}</p>
        {w.sections.map((s) => (
          <section key={s.heading} className={styles.section}>
            <h2>{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
        {w.results.length ? (
          <dl className={styles.results}>
            {w.results.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className={styles.links}>
          {w.url ? (
            <a href={w.url} target="_blank" rel="noopener noreferrer">
              Visit the live site
            </a>
          ) : null}
          <TransitionLink href="/work">All work</TransitionLink>
        </div>
      </div>
    </article>
  );
}
