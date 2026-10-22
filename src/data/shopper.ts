import type { ChatMessage } from "@/components/product/Phone";

/**
 * "A shopper's 20 minutes": the worked example from the business report, section 3.2.
 * Aarav and the store are fictional. Intent weights are illustrative.
 */

export type Screen = "product" | "sizechart" | "cart" | "checkout" | "failed" | "report";

export type Moment = {
  clock: string;
  title: string;
  events: string[];
  screen: Screen;
  /** How many phone messages are visible at this moment. */
  messages: number;
  intent: number;
};

export const MOMENTS: Moment[] = [
  {
    clock: "0:00",
    title: "Aarav lands on a hoodie page from an Instagram ad.",
    events: ["page_view {source: instagram_ad}", "anonymous_id assigned"],
    screen: "product",
    messages: 0,
    intent: 0,
  },
  {
    clock: "0:40",
    title: "Thirty-eight engaged seconds. He opens the size chart and reads most of the reviews.",
    events: ["engaged_time 38s", "size_chart_open", "review_scroll 80%"],
    screen: "sizechart",
    messages: 0,
    intent: 35,
  },
  {
    clock: "1:30",
    title: "He adds size M to the cart.",
    events: ["add_to_cart {variant: M}"],
    screen: "cart",
    messages: 0,
    intent: 55,
  },
  {
    clock: "2:10",
    title: "Checkout. He enters his phone number, then ticks a separate box, unticked by default, for WhatsApp offers.",
    events: ["checkout_started", "consent_granted {channel: whatsapp}", "identity merged: anonymous → phone"],
    screen: "checkout",
    messages: 0,
    intent: 70,
  },
  {
    clock: "3:00",
    title: "His UPI payment times out. The gateway webhook says why.",
    events: ["payment_failed {reason: upi_timeout}"],
    screen: "failed",
    messages: 0,
    intent: 70,
  },
  {
    clock: "3:05",
    title: "A transactional message: the payment did not complete, the cart is saved, one tap to retry.",
    events: ["message_sent {template: payment_failed, category: utility}"],
    screen: "failed",
    messages: 1,
    intent: 70,
  },
  {
    clock: "36:05",
    title: "Thirty-three minutes later, still no order. One recovery message about the hoodie he looked at and the reviews he read. No fake scarcity.",
    events: ["no order for 33 min", "message_sent {template: checkout_recovery, category: marketing}"],
    screen: "failed",
    messages: 2,
    intent: 70,
  },
  {
    clock: "Next day",
    title: "Still nothing, and the frequency rules allow one more: retry, or cash on delivery. A tenth of shoppers like him get no messages at all, on purpose.",
    events: ["frequency_cap ok", "holdout: 10% never messaged"],
    screen: "failed",
    messages: 3,
    intent: 60,
  },
  {
    clock: "Order",
    title: "He orders. Every recovery message stops at once. Shipping updates begin, and a review request is booked for day 7.",
    events: ["order_created", "recovery flows stopped", "review_request scheduled +7d"],
    screen: "failed",
    messages: 4,
    intent: 100,
  },
  {
    clock: "Report",
    title: "The dashboard compares the order rate of messaged shoppers with the holdout, and reports only the difference.",
    events: ["incremental = messaged − holdout"],
    screen: "report",
    messages: 4,
    intent: 100,
  },
];

export const THREAD: ChatMessage[] = [
  { id: "d", from: "system", text: "Today" },
  {
    id: "m1",
    from: "brand",
    tag: "Utility",
    text: "Hi Aarav, your payment of ₹1,499 didn't go through. Your cart is saved.",
    time: "15:05",
    buttons: ["Retry in one tap"],
  },
  {
    id: "m2",
    from: "brand",
    tag: "Marketing",
    text: "Still thinking about the Forest hoodie in M? Reviewers say it runs true to size. Your cart is where you left it.",
    time: "15:38",
    buttons: ["Finish checkout"],
  },
  {
    id: "m3",
    from: "brand",
    tag: "Marketing",
    text: "Want to finish your order another way?",
    time: "11:20",
    buttons: ["Retry UPI", "Cash on delivery"],
  },
  {
    id: "m4",
    from: "brand",
    tag: "Utility",
    text: "Order #4821 is confirmed. We'll message you when it ships.",
    time: "11:24",
  },
];

export const INTENT_RULES = [
  { label: "Engaged time over 30 s", points: 15 },
  { label: "Size chart opened", points: 10 },
  { label: "Reviews read", points: 10 },
  { label: "Added to cart", points: 20 },
  { label: "Checkout started", points: 15 },
];
