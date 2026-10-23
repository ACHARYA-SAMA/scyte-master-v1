import type { Metadata } from "next";
import { Conversation } from "@/components/contact/Conversation";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Scyte on a chat, or with the form under it. Book a 20-minute store audit, or start a website, app or social media project.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact" },
};

export default function ContactPage() {
  return <Conversation />;
}
