import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // round 2 renamed the studio page to match the original site's nav label
  redirects: async () => [{ source: "/services", destination: "/studio", permanent: true }],
};

export default nextConfig;
