import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { THIS_SITE, WORK } from "@/data/work";
import { ClientCase, ThisSiteCase } from "@/components/work/Case";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...WORK.map((w) => ({ slug: w.slug })), { slug: THIS_SITE.slug }];
}

export async function generateMetadata(props: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug === THIS_SITE.slug) {
    return {
      title: "Case 00: this site",
      description: THIS_SITE.summary,
      alternates: { canonical: `/work/${slug}` },
      openGraph: { url: `/work/${slug}` },
    };
  }
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
  if (slug === THIS_SITE.slug) return <ThisSiteCase />;
  const w = WORK.find((x) => x.slug === slug);
  if (!w) notFound();
  return <ClientCase w={w} />;
}
