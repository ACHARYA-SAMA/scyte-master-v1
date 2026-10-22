import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Scyte designs and builds websites, mobile apps and social media for brands. We work from Hyderabad.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <section className="frame" style={{ minHeight: "100svh", paddingTop: "calc(var(--nav-h) + 10vh)" }}>
      <h1 className="t-h1 c-cream">The Assembly</h1>
    </section>
  );
}
