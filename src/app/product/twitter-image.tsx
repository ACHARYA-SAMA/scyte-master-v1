import { OG_SIZE, OG_TYPE, routeCard } from "@/lib/og";

export const alt = "The Machine: six stations from a page view to proof";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return routeCard("/product");
}
