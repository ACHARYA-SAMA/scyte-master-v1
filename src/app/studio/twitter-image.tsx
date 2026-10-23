import { OG_SIZE, OG_TYPE, routeCard } from "@/lib/og";

export const alt = "The Assembly: websites, mobile apps and social media from Scyte";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return routeCard("/studio");
}
