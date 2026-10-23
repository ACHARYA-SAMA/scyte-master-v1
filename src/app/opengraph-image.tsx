import { OG_SIZE, OG_TYPE, routeCard } from "@/lib/og";

export const alt = "Scyte, a web and app studio in Hyderabad: the leak, where a store loses shoppers";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return routeCard("/");
}
