import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scyte",
    short_name: "Scyte",
    description: "A web and app studio in Hyderabad, building consent-first WhatsApp recovery for online stores.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0F0C",
    theme_color: "#0A0F0C",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
