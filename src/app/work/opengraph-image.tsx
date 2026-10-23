import { OG_SIZE, OG_TYPE, routeCard } from "@/lib/og";

export const alt = "The Archive: case 00 is this site, scene by scene";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return routeCard("/work");
}
