import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/config/site";
import { ProductMachine } from "@/components/product/ProductMachine";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME}: WhatsApp recovery for online stores`,
  description:
    "Consent-first WhatsApp messages that recover abandoned carts, failed payments and risky COD orders, proven against a holdout group. Built by Scyte for Shopify stores in India.",
  alternates: { canonical: "/product" },
  openGraph: { url: "/product" },
};

export default function ProductPage() {
  return <ProductMachine />;
}
