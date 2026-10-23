import { OG_SIZE, OG_TYPE, routeCard } from "@/lib/og";

export const alt = "The Conversation: talk to Scyte on a chat";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return routeCard("/contact");
}
