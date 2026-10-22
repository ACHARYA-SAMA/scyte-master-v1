import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { WORK } from "@/data/work";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/product", "/services", "/work", "/team", "/contact"];
  return [
    ...routes.map((r) => ({
      url: `${SITE.url}${r}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: r === "" ? 1 : r === "/product" ? 0.9 : 0.7,
    })),
    ...WORK.map((w) => ({ url: `${SITE.url}/work/${w.slug}`, lastModified: now, priority: 0.6 })),
  ];
}
