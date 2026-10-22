import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { SITE } from "@/config/site";
import { Shell } from "@/components/shell/Shell";
import { preloaderBootScript } from "@/components/preloader/boot";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: "%s | Scyte",
  },
  description: SITE.description,
  applicationName: "Scyte",
  authors: [{ name: "Scyte", url: SITE.url }],
  keywords: [
    "web studio Hyderabad",
    "mobile app development Hyderabad",
    "Shopify WhatsApp automation",
    "abandoned cart WhatsApp",
    "COD confirmation WhatsApp",
    "payment failed recovery",
  ],
  openGraph: {
    type: "website",
    siteName: "Scyte",
    locale: "en_IN",
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#1b261d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#org`,
      name: "Scyte",
      url: SITE.url,
      logo: `${SITE.url}/brand/scyte-logo.svg`,
      email: SITE.email,
      sameAs: [SITE.socials.instagram, SITE.socials.linkedin],
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE.url}/#studio`,
      name: "Scyte",
      url: SITE.url,
      email: SITE.email,
      areaServed: "IN",
      address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: "IN" },
      knowsAbout: ["Website design and development", "Mobile app development", "Social media management"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: "Scyte",
      publisher: { "@id": `${SITE.url}/#org` },
      inLanguage: "en-IN",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preloaderBootScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
