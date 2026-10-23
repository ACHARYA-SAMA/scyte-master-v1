import type { Metadata } from "next";
import { pageMeta } from "@/config/meta";
import { PRODUCT_LABEL, PRODUCT_NAME, PRODUCT_NAME_FINAL } from "@/config/site";
import { ProductMachine } from "@/components/product/ProductMachine";

export const metadata: Metadata = pageMeta({
  title: PRODUCT_NAME_FINAL ? `${PRODUCT_NAME}: ${PRODUCT_LABEL}` : `${PRODUCT_LABEL[0]!.toUpperCase()}${PRODUCT_LABEL.slice(1)}`,
  description: "Consent-first WhatsApp messages that recover abandoned carts, failed payments and risky COD orders, proven against a holdout group. Built by Scyte for Shopify stores in India.",
  path: "/product",
});

export default function ProductPage() {
  return <ProductMachine />;
}
