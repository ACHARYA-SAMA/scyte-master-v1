import type { Flow, FlowNode } from "./types";

/**
 * Shopper-side flows from the business report (sections 3.2, 5.1 and 8). The store,
 * the shopper and the order are fictional; the message wording follows the report's
 * example templates. Events are the report's event catalogue (section 7.2).
 */

const STORE = "Demo store";
const AMOUNT = "₹1,499";
const ORDER = "#DS1042";
const ITEM = "Heavyweight hoodie, oat, M";

const common: Record<string, FlowNode> = {
  track: {
    id: "track",
    bot: [{ kind: "track", order: ORDER, steps: [{ label: "Ordered", done: true }, { label: "Shipped", done: true }, { label: "Out for delivery", done: false }, { label: "Delivered", done: false }] }],
    events: ["message_received {intent: track}", "message_sent {template: order_status, category: utility}"],
  },
  help: {
    id: "help",
    bot: [{ kind: "text", text: "Happy to help. Pick one, or type your question and a person from the store will reply." }],
    replies: [
      { label: "Where is my order?", to: "track" },
      { label: "Change size", to: "size" },
      { label: "Talk to a person", to: "human" },
    ],
  },
  size: { id: "size", bot: [{ kind: "text", text: "Sure. Reply with the size you want and we'll swap it before it ships." }], input: { placeholder: "L, XL…", to: "sizeDone" } },
  sizeDone: { id: "sizeDone", bot: [{ kind: "text", text: "Noted. We'll confirm the swap here once the warehouse has it." }] },
  human: { id: "human", bot: [{ kind: "text", text: "Done. Someone from the store will reply here, usually within the hour, 10 am to 7 pm." }], events: ["handoff {to: support}"] },
  stop: {
    id: "stop",
    bot: [{ kind: "text", text: "You won't get offers or reminders from us again. Order updates you asked for will still come through. Send START to change your mind." }],
    events: ["consent_withdrawn {channel: whatsapp}", "flows_suppressed {all marketing}"],
    outcome: "stopped",
    end: true,
  },
  hello: { id: "hello", bot: [{ kind: "text", text: "Hi Aarav. Anything I can help with?" }], replies: [{ label: "Track my order", to: "track" }, { label: "Help", to: "help" }] },
  passed: { id: "passed", bot: [{ kind: "text", text: "Thanks. I've passed this to the store team; they'll reply here." }], events: ["message_received {intent: unknown}", "handoff {to: support}"] },
};

const router = [
  { match: /\b(stop|unsubscribe|opt ?out)\b/i, to: "stop" },
  { match: /\b(track|where|status|delivery|shipped)\b/i, to: "track" },
  { match: /\b(help|human|person|agent|call)\b/i, to: "help" },
  { match: /\b(hi|hello|hey|namaste)\b/i, to: "hello" },
];

export const PAYMENT_FAILED: Flow = {
  id: "payment-failed",
  business: STORE,
  notification: `${STORE}: your payment of ${AMOUNT} didn't go through. Your cart is saved.`,
  start: "failed",
  router: [
    ...router,
    { match: /\b(cod|cash)\b/i, to: "cod" },
    { match: /\b(retry|again|upi|pay)\b/i, to: "retry" },
  ],
  fallback: "passed",
  nodes: {
    ...common,
    failed: {
      id: "failed",
      bot: [
        {
          kind: "text",
          text: `Hi Aarav, your payment of ${AMOUNT} didn't go through. Your cart is saved.`,
          actions: [
            { label: "Retry in one tap", to: "retry", tone: "primary" },
            { label: "Pay by UPI", to: "upi" },
            { label: "Cash on delivery", to: "cod" },
          ],
        },
      ],
      events: ["payment_failed {reason: upi_timeout}", "message_sent {template: payment_failed, category: utility}"],
    },
    retry: {
      id: "retry",
      bot: [{ kind: "order", title: "Your cart", lines: [{ label: "Item", value: ITEM }, { label: "Total", value: AMOUNT }], status: "Ready to pay" }],
      events: ["button_clicked {retry}", "checkout_resumed"],
      sheet: {
        title: `Pay ${AMOUNT} to ${STORE}`,
        body: "Approve the request in your UPI app. This one is a demo, so nothing is charged.",
        approve: { label: "Approve", to: "paid", tone: "primary" },
        decline: { label: "Not now", to: "notNow" },
      },
    },
    upi: {
      id: "upi",
      bot: [{ kind: "text", text: "Type the UPI ID you'd like to pay from and we'll send a collect request to it." }],
      input: { placeholder: "name@bank", to: "collect" },
      replies: [{ label: "aarav@upi", to: "collect" }],
      events: ["button_clicked {pay_by_upi}"],
    },
    collect: {
      id: "collect",
      bot: [{ kind: "text", text: `Request for ${AMOUNT} sent. Approve it in your UPI app and this chat will update.` }],
      sheet: {
        title: `Collect request: ${AMOUNT}`,
        body: `${STORE} is asking for ${AMOUNT}. A demo: nothing is charged.`,
        approve: { label: "Approve", to: "paid", tone: "primary" },
        decline: { label: "Decline", to: "notNow" },
      },
      events: ["upi_collect_sent"],
    },
    paid: {
      id: "paid",
      bot: [
        { kind: "text", text: `Paid. Order ${ORDER} is confirmed. We'll message you when it ships.` },
        { kind: "order", title: `Order ${ORDER}`, lines: [{ label: "Item", value: ITEM }, { label: "Paid", value: `${AMOUNT}, UPI` }], status: "Confirmed" },
      ],
      events: ["payment_success {method: upi}", "order_created", "recovery_flows_stopped"],
      outcome: "recovered",
      replies: [{ label: "Track my order", to: "track" }],
    },
    cod: {
      id: "cod",
      bot: [
        {
          kind: "text",
          text: `Switched to cash on delivery. Please confirm order ${ORDER}: ${AMOUNT}, paid at your door.`,
          actions: [
            { label: "Confirm", to: "codYes", tone: "primary" },
            { label: "Cancel", to: "codNo" },
          ],
        },
      ],
      events: ["button_clicked {cash_on_delivery}", "order_created {payment: cod}", "message_sent {template: cod_confirm, category: utility}"],
    },
    codYes: {
      id: "codYes",
      bot: [{ kind: "text", text: `Confirmed. Keep ${AMOUNT} ready when it arrives. We'll tell you the day before.` }],
      events: ["cod_confirmed", "recovery_flows_stopped"],
      outcome: "recovered",
      replies: [{ label: "Track my order", to: "track" }],
    },
    codNo: { id: "codNo", bot: [{ kind: "text", text: "Cancelled. Your cart is still saved if you change your mind." }], events: ["cod_cancelled"], outcome: "lost" },
    notNow: {
      id: "notNow",
      bot: [{ kind: "text", text: "No problem. Your cart stays saved. Tap below whenever you're ready.", actions: [{ label: "Retry in one tap", to: "retry", tone: "primary" }] }],
      events: ["payment_abandoned"],
    },
  },
};

export const COD_CONFIRM: Flow = {
  id: "cod-confirmation",
  business: STORE,
  notification: `${STORE}: please confirm your cash-on-delivery order ${ORDER}.`,
  start: "ask",
  router,
  fallback: "passed",
  nodes: {
    ...common,
    ask: {
      id: "ask",
      bot: [
        { kind: "order", title: `Order ${ORDER}`, lines: [{ label: "Item", value: ITEM }, { label: "Pay at door", value: AMOUNT }], status: "Waiting for you" },
        {
          kind: "text",
          text: `Hi Aarav, please confirm your cash-on-delivery order ${ORDER}.`,
          actions: [
            { label: "Confirm", to: "yes", tone: "primary" },
            { label: "Cancel", to: "no" },
          ],
        },
      ],
      events: ["order_created {payment: cod}", "message_sent {template: cod_confirm, category: utility}"],
    },
    yes: { id: "yes", bot: [{ kind: "text", text: "Thanks, it's confirmed. It ships today." }], events: ["cod_confirmed", "dispatch_released"], outcome: "confirmed", replies: [{ label: "Track my order", to: "track" }] },
    no: { id: "no", bot: [{ kind: "text", text: "Cancelled before it shipped, so nobody pays for a return trip." }], events: ["cod_cancelled", "rto_avoided"], outcome: "lost" },
  },
};

export const CART_RECOVERY: Flow = {
  id: "cart-recovery",
  business: STORE,
  notification: `${STORE}: your hoodie is still in your cart.`,
  start: "nudge",
  router,
  fallback: "passed",
  nodes: {
    ...common,
    nudge: {
      id: "nudge",
      bot: [
        {
          kind: "text",
          text: "Hi Aarav, your Heavyweight hoodie (M) is still in your cart. The reviews you read said it runs true to size.",
          actions: [
            { label: "Complete my order", to: "checkout", tone: "primary" },
            { label: "Not interested", to: "stopFlow" },
          ],
        },
      ],
      events: ["cart_abandoned {age: 33 min}", "message_sent {template: cart_recovery, category: marketing}"],
    },
    checkout: {
      id: "checkout",
      bot: [{ kind: "order", title: "Your cart", lines: [{ label: "Item", value: ITEM }, { label: "Total", value: AMOUNT }], status: "Saved" }],
      sheet: {
        title: `Pay ${AMOUNT}`,
        body: "A demo payment. Nothing is charged.",
        approve: { label: "Pay", to: "done", tone: "primary" },
        decline: { label: "Later", to: "later" },
      },
      events: ["button_clicked {complete_order}", "checkout_started"],
    },
    done: { id: "done", bot: [{ kind: "text", text: `Done. Order ${ORDER} is confirmed.` }], events: ["payment_success", "order_created", "recovery_flows_stopped"], outcome: "recovered" },
    later: { id: "later", bot: [{ kind: "text", text: "Saved for later. We won't remind you again today." }], events: ["frequency_cap {reached}"] },
    stopFlow: { id: "stopFlow", bot: [{ kind: "text", text: "Understood. No more reminders about this cart." }], events: ["flow_suppressed {cart_recovery}"], outcome: "lost" },
  },
};

export const BACK_IN_STOCK: Flow = {
  id: "back-in-stock",
  business: STORE,
  notification: `${STORE}: size M is back.`,
  start: "back",
  router,
  fallback: "passed",
  nodes: {
    ...common,
    back: {
      id: "back",
      bot: [
        {
          kind: "text",
          text: "Good news, Aarav: the hoodie you saved is back in size M.",
          actions: [
            { label: "Buy now", to: "buy", tone: "primary" },
            { label: "Not now", to: "no" },
          ],
        },
      ],
      events: ["restock {variant: M}", "message_sent {template: back_in_stock, category: marketing}"],
    },
    buy: {
      id: "buy",
      bot: [{ kind: "order", title: "Reserved for 30 minutes", lines: [{ label: "Item", value: ITEM }, { label: "Total", value: AMOUNT }] }],
      sheet: { title: `Pay ${AMOUNT}`, body: "A demo payment. Nothing is charged.", approve: { label: "Pay", to: "done", tone: "primary" }, decline: { label: "Later", to: "no" } },
    },
    done: { id: "done", bot: [{ kind: "text", text: "It's yours. Order confirmed." }], events: ["order_created"], outcome: "recovered" },
    no: { id: "no", bot: [{ kind: "text", text: "Okay. We'll only message again if you ask us to." }], events: ["alert_closed"] },
  },
};

export const TRACKING: Flow = {
  id: "post-purchase",
  business: STORE,
  notification: `${STORE}: order ${ORDER} is out for delivery.`,
  start: "out",
  router,
  fallback: "passed",
  nodes: {
    ...common,
    out: {
      id: "out",
      bot: [
        { kind: "track", order: ORDER, steps: [{ label: "Ordered", done: true }, { label: "Shipped", done: true }, { label: "Out for delivery", done: true }, { label: "Delivered", done: false }] },
        { kind: "text", text: "Out for delivery today, before 7 pm.", actions: [{ label: "I won't be home", to: "away" }] },
      ],
      events: ["shipment_status {out_for_delivery}", "message_sent {template: shipping_update, category: utility}"],
    },
    away: { id: "away", bot: [{ kind: "text", text: "Thanks for telling us. The courier will call before they come and can try tomorrow." }], events: ["delivery_rescheduled"], outcome: "confirmed" },
  },
};

export const REVIEW: Flow = {
  id: "review-request",
  business: STORE,
  notification: `${STORE}: how's the hoodie?`,
  start: "ask",
  router,
  fallback: "passed",
  nodes: {
    ...common,
    ask: {
      id: "ask",
      bot: [{ kind: "text", text: "Hi Aarav, it's been a week. How's the hoodie?" }, { kind: "stars" }],
      replies: [1, 2, 3, 4, 5].map((n) => ({ label: "★".repeat(n), to: n >= 4 ? "good" : "bad", say: `${n} of 5` })),
      events: ["delivered {+7 days}", "message_sent {template: review_request, category: marketing}"],
    },
    good: { id: "good", bot: [{ kind: "text", text: "Glad it fits. One line about it for other shoppers?" }], input: { placeholder: "Runs warm, fits true…", to: "posted" } },
    bad: { id: "bad", bot: [{ kind: "text", text: "Sorry to hear that. What went wrong? A person will read this." }], input: { placeholder: "Tell us…", to: "heard" } },
    posted: { id: "posted", bot: [{ kind: "text", text: "Thank you. Posted to the product page." }], events: ["review_submitted"], outcome: "confirmed" },
    heard: { id: "heard", bot: [{ kind: "text", text: "Thanks. The store will reply here today." }], events: ["feedback_received", "handoff {to: support}"] },
  },
};

export const SHOPPER_FLOWS = { PAYMENT_FAILED, COD_CONFIRM, CART_RECOVERY, BACK_IN_STOCK, TRACKING, REVIEW };

/** Sample values for a template's {variables}: the same fictional shopper as every flow. */
const SAMPLE_VARS: Record<string, string> = { name: "Aarav", amount: "1,499", product: "Heavyweight hoodie", size: "M", order: "DS1042" };

/**
 * A one-message flow from a playbook's template, for the playbooks the site has no
 * full conversation for: the template as the shopper would get it, its buttons as
 * replies, and STOP honoured like everywhere else.
 */
export const templateFlow = (p: { id: string; name: string; message: string; buttons: string[] }): Flow => {
  const text = p.message.replace(/\{([a-z]+)\}/g, (_, k: string) => SAMPLE_VARS[k] ?? k);
  return {
    id: `template-${p.id}`,
    business: STORE,
    notification: `${STORE}: ${text}`,
    start: "open",
    router,
    fallback: "passed",
    nodes: {
      ...common,
      open: {
        id: "open",
        bot: [
          {
            kind: "text",
            text,
            actions: [...p.buttons.map((b, i) => ({ label: b, to: "tapped", tone: i === 0 ? ("primary" as const) : undefined })), { label: "Stop messages", to: "stop" }],
          },
        ],
        events: [`message_sent {template: ${p.id.replace(/-/g, "_")}}`],
      },
      tapped: {
        id: "tapped",
        bot: [{ kind: "text", text: "Done. In a real store this opens the right page, with the cart or the product already there." }],
        events: ["message_clicked", "session_started {source: whatsapp}"],
        outcome: "sent",
        end: true,
      },
    },
  };
};
