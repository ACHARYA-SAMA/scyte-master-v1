import type { Metadata } from "next";
import { Suspense } from "react";
import { PRODUCT_NAME } from "@/config/site";
import { StageScene } from "@/components/stage/StageControls";
import { ProductHero } from "@/components/product/ProductHero";
import { Pipeline } from "@/components/product/Pipeline";
import { TwentyMinutes } from "@/components/product/TwentyMinutes";
import { Playbooks } from "@/components/product/Playbooks";
import { ConsentGate } from "@/components/product/ConsentGate";
import { Economics } from "@/components/product/Economics";
import { Dashboard } from "@/components/product/Dashboard";
import { Pilot } from "@/components/product/Pilot";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME}: WhatsApp recovery for online stores`,
  description:
    "Consent-first WhatsApp messages that recover abandoned carts, failed payments and risky COD orders, proven against a holdout group. Built by Scyte for Shopify stores in India.",
  alternates: { canonical: "/product" },
  openGraph: { url: "/product" },
};

export default function ProductPage() {
  return (
    <>
      <StageScene scene="product" />
      <ProductHero />
      {/* Each boundary lets React hydrate in short, yieldable pieces. */}
      <Suspense>
        <Pipeline />
      </Suspense>
      <Suspense>
        <TwentyMinutes />
      </Suspense>
      <Suspense>
        <Playbooks />
      </Suspense>
      <Suspense>
        <ConsentGate />
      </Suspense>
      <Suspense>
        <Economics />
      </Suspense>
      <Suspense>
        <Dashboard />
      </Suspense>
      <Pilot />
    </>
  );
}
