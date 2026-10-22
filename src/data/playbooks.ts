/**
 * The ten playbooks from the business report, section 5.1.
 * "weight" decides how much room a playbook gets: the wedge playbooks lead.
 */

export type TemplateCategory = "utility" | "marketing" | "utility-then-marketing";

export type Playbook = {
  id: string;
  name: string;
  trigger: string;
  timing: string;
  template: TemplateCategory;
  goal: string;
  weight: "wedge" | "core" | "lifecycle";
  /** One line, in the founder's voice. */
  line: string;
  /** A sample of the WhatsApp message. Variables in {braces}. Sample copy, not a live template. */
  message: string;
  buttons: string[];
  /** Event chain that fires the flow, used by the flow diagram. */
  events: string[];
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "payment-failed",
    name: "Payment-failed rescue",
    trigger: "Gateway failure webhook",
    timing: "Immediate (transactional), then a follow-up",
    template: "utility-then-marketing",
    goal: "Payment recovery rate",
    weight: "wedge",
    line: "The shopper didn't leave. The UPI timed out. We read the reason code and offer the fix that matches it.",
    message: "Hi {name}, your payment of ₹{amount} didn't go through. Your cart is saved.",
    buttons: ["Retry in one tap", "Pay by UPI", "Cash on delivery"],
    events: ["checkout_started", "payment_failed {reason: upi_timeout}", "message_sent", "payment_success"],
  },
  {
    id: "cod-confirmation",
    name: "COD confirmation",
    trigger: "COD order created",
    timing: "Immediate, reminder at 2–4 h",
    template: "utility",
    goal: "RTO reduction",
    weight: "wedge",
    line: "COD is a promise. We ask for it in writing before the parcel leaves the warehouse.",
    message: "Hi {name}, please confirm your cash-on-delivery order #{order}.",
    buttons: ["Confirm", "Cancel"],
    events: ["order_created {payment: cod}", "message_sent", "cod_confirmed", "shipment_status"],
  },
  {
    id: "checkout-recovery",
    name: "Checkout recovery",
    trigger: "Checkout started, no payment",
    timing: "15–30 min",
    template: "marketing",
    goal: "Recovered orders",
    weight: "core",
    line: "They gave you a phone number and stopped one step short. That is the warmest lead you will ever have.",
    message: "Hi {name}, you were one step away. Your {product} is saved at checkout.",
    buttons: ["Finish checkout"],
    events: ["checkout_started", "wait 20m, no payment", "message_sent", "order_created"],
  },
  {
    id: "cart-recovery",
    name: "Cart recovery",
    trigger: "Item in cart, no checkout",
    timing: "30–60 min, then next day",
    template: "marketing",
    goal: "Recovered orders",
    weight: "core",
    line: "One nudge, timed to when they were actually shopping. Not five.",
    message: "Hi {name}, your {product} is still in your cart.",
    buttons: ["Complete your order"],
    events: ["add_to_cart", "wait 45m, no checkout", "message_sent", "checkout_started"],
  },
  {
    id: "browse-abandonment",
    name: "Browse abandonment",
    trigger: "Repeated engaged views, no cart",
    timing: "24 h",
    template: "marketing",
    goal: "Cart creation",
    weight: "core",
    line: "Three visits, size chart opened twice, reviews read to the bottom. That is intent, not traffic.",
    message: "Hi {name}, still thinking about the {product}? Size {size} is in stock.",
    buttons: ["See it again"],
    events: ["product_view ×3 in 24h", "size_chart_open", "intent_score ≥ threshold", "message_sent"],
  },
  {
    id: "back-in-stock",
    name: "Back-in-stock / price drop",
    trigger: "Wishlist or alert subscription",
    timing: "On event",
    template: "marketing",
    goal: "Conversion on intent",
    weight: "lifecycle",
    line: "They asked to be told. So we tell them, once, the moment it is true.",
    message: "Hi {name}, the {product} in size {size} is back.",
    buttons: ["Shop now"],
    events: ["alert_subscribed", "inventory_restocked", "message_sent"],
  },
  {
    id: "post-purchase",
    name: "Post-purchase",
    trigger: "Shipped, out for delivery, delivered",
    timing: "On event",
    template: "utility",
    goal: "Fewer support tickets",
    weight: "lifecycle",
    line: "Where is my order is a support ticket you can delete before it is written.",
    message: "Hi {name}, order #{order} is out for delivery today.",
    buttons: ["Track order"],
    events: ["shipment_status {shipped}", "out_for_delivery", "delivered"],
  },
  {
    id: "review-request",
    name: "Review request",
    trigger: "Delivered + 5–7 days",
    timing: "Once",
    template: "marketing",
    goal: "Review rate",
    weight: "lifecycle",
    line: "Asked once, a week after it arrived, when they have actually worn it.",
    message: "Hi {name}, how is the {product} fitting? A two-line review helps the next shopper.",
    buttons: ["Write a review"],
    events: ["delivered", "wait 7d", "message_sent"],
  },
  {
    id: "reorder",
    name: "Reorder / replenishment",
    trigger: "Predicted usage cycle",
    timing: "Cycle-based",
    template: "marketing",
    goal: "Repeat purchase",
    weight: "lifecycle",
    line: "The serum runs out in about 40 days. The message lands on day 36.",
    message: "Hi {name}, running low on {product}? Reorder in one tap.",
    buttons: ["Reorder"],
    events: ["order_created", "wait until day 36 of cycle", "message_sent"],
  },
  {
    id: "win-back",
    name: "Win-back",
    trigger: "60–90 days inactive",
    timing: "Once or twice",
    template: "marketing",
    goal: "Reactivation",
    weight: "lifecycle",
    line: "Two messages at most. If they don't come back, we stop asking.",
    message: "Hi {name}, it has been a while. Here is what is new since your last order.",
    buttons: ["See what's new"],
    events: ["no order for 75d", "message_sent", "stop after 2"],
  },
];
