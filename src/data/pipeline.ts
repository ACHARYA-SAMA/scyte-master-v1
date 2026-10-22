/** The core loop from the business report, section 3.1. */
export const STATIONS = [
  {
    id: "collect",
    name: "Collect",
    what: "A lightweight script on the store, plus store, payment and courier webhooks, captures what shoppers do.",
    detail: "Server-side webhooks are more reliable than browser events for payments and orders.",
    legend: "Every pixel is one event: a page view, a size-chart open, a scroll through the reviews.",
  },
  {
    id: "identify",
    name: "Identify",
    what: "An anonymous visitor is linked to a phone number only after they consent.",
    detail: "Triggers: OTP login, the checkout phone field, an opt-in widget, click-to-WhatsApp.",
    legend: "Anonymous traffic falls away at the gate. It is never messaged.",
  },
  {
    id: "understand",
    name: "Understand",
    what: "Events become an intent score and a customer profile.",
    detail: "Engaged time, not tab-open time. Scores decay.",
    legend: "Consented events stack into an intent score, one cell at a time.",
  },
  {
    id: "decide",
    name: "Decide",
    what: "Rules choose the trigger, the template and the delay. Models come later, once there is data to beat the rules.",
    detail: "Frequency caps, quiet hours, suppression, holdout.",
    legend: "Most go ahead. Some are held back by caps. A fixed share is held out on purpose.",
  },
  {
    id: "send",
    name: "Send",
    what: "Pre-approved WhatsApp templates go out through the official API.",
    detail: "Delivery, read and reply events come back to the profile.",
    legend: "One message, assembled from the shopper's own context.",
  },
  {
    id: "measure",
    name: "Measure",
    what: "Revenue is compared against the holdout group that got nothing.",
    detail: "Incremental revenue, not vanity attribution. Measurement feeds the next decision.",
    legend: "Left: shoppers we messaged. Right: the holdout. The difference is the lift.",
  },
] as const;
