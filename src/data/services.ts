/**
 * Studio services, carried over from the base site and rewritten without filler.
 * The promises are commitments about how we work, not results we claim.
 */
export type Service = {
  id: "website" | "apps" | "social";
  name: string;
  line: string;
  promises: string[];
};

export const SERVICES: Service[] = [
  {
    id: "website",
    name: "Website",
    line: "A storefront that loads before they lose interest.",
    promises: [
      "Designed around what your customers need to see first",
      "Fast on a budget Android phone over mobile data, not just on our laptops",
      "Hardened, patched and kept up to date",
      "An editor your team can use without calling us",
      "Search set up from day one: structure, speed, metadata",
    ],
  },
  {
    id: "apps",
    name: "Mobile apps",
    line: "Your brand on the home screen, not in a forgotten tab.",
    promises: [
      "Designed for your brand, not assembled from a kit",
      "iPhone and Android from one codebase",
      "Smooth, and still useful without a signal",
      "We handle the App Store and Play Store submissions",
      "A dashboard to run it without us",
    ],
  },
  {
    id: "social",
    name: "Social media",
    line: "Something worth stopping for, every day.",
    promises: [
      "A plan with a reason behind every post",
      "Video and graphics made for the feed they land in",
      "Posting handled, on schedule",
      "Replies to your customers' messages, in your voice",
      "A monthly report in plain numbers",
    ],
  },
];
