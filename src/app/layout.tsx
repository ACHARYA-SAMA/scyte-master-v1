import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Scyte Studio | Brutalist Architecture",
  description: "High-octane digital experiences",
};

import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import MagneticCursor from "@/components/MagneticCursor";
import GlobalCanvas from "@/components/GlobalCanvas";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-oak-green text-white selection:bg-neon-accent selection:text-black cursor-none font-sans">
        <SmoothScrollProvider>
          <GlobalCanvas />
          <MagneticCursor />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
