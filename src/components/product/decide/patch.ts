/**
 * The patch bay's logic. Events come in on the left, rule modules sit in the rack,
 * and cables decide the order a run takes. Consent and suppression are welded in: no
 * patch can route around them. Holdout, the frequency cap and quiet hours can be
 * re-ordered or bypassed, so a visitor can see what each one is for. The rules and
 * their values are examples, in the order the business report lists them (3.1).
 */

export type EventId = "pf" | "cod" | "cart" | "browse" | "done";

export const EVENTS: { id: EventId; event: string; detail: string; kind: "utility" | "marketing"; ordered: boolean; template: string }[] = [
  { id: "pf", event: "payment_failed", detail: "reason: upi_timeout", kind: "utility", ordered: false, template: "payment_failed (utility)" },
  { id: "cod", event: "order_created", detail: "payment: cod", kind: "utility", ordered: false, template: "cod_confirm (utility)" },
  { id: "cart", event: "cart_abandoned", detail: "33 min ago", kind: "marketing", ordered: false, template: "cart_recovery (marketing)" },
  { id: "browse", event: "product_view ×3", detail: "no cart, 24 h", kind: "marketing", ordered: false, template: "browse_abandonment (marketing)" },
  { id: "done", event: "checkout_started", detail: "then ordered", kind: "marketing", ordered: true, template: "" },
];

export type ModuleId = "consent" | "suppress" | "holdout" | "cap" | "quiet" | "template";

export const MODULES: { id: ModuleId; name: string; line: string; welded: boolean }[] = [
  { id: "consent", name: "Consent", line: "Marketing needs a yes", welded: true },
  { id: "suppress", name: "Suppression", line: "Never after an order", welded: true },
  { id: "holdout", name: "Holdout", line: "A share never messaged", welded: false },
  { id: "cap", name: "Frequency cap", line: "One marketing a day", welded: false },
  { id: "quiet", name: "Quiet hours", line: "Nothing from 9 pm to 9 am", welded: false },
  { id: "template", name: "Template", line: "An approved message", welded: false },
];

/** A jack: an event's output, a module's input or output, or the send line. */
export type JackId = `in:${EventId}` | `${ModuleId}:in` | `${ModuleId}:out` | "send";

/** Cables: from an output jack to an input jack (or loose, null). */
export type Patch = Partial<Record<JackId, JackId | null>>;

export const DEFAULT_PATCH: Patch = {
  "in:cart": "consent:in",
  "consent:out": "suppress:in",
  "suppress:out": "holdout:in",
  "holdout:out": "cap:in",
  "cap:out": "quiet:in",
  "quiet:out": "template:in",
  "template:out": "send",
};

export const isOutput = (j: JackId) => j.startsWith("in:") || j.endsWith(":out");
export const isInput = (j: JackId) => j === "send" || j.endsWith(":in");

/** The cables the visitor may not unplug. */
const WELDED_OUT = new Set<JackId>(["consent:out", "suppress:out"]);

export const canLift = (from: JackId) => !WELDED_OUT.has(from);

/** Whether a cable from `from` may be plugged into `to`. */
export const canPlug = (from: JackId, to: JackId): string | null => {
  if (!isOutput(from) || !isInput(to)) return "Outputs plug into inputs.";
  if (from === "suppress:out" || from === "consent:out") return "Consent and suppression are welded in.";
  if (to === "consent:in" && !from.startsWith("in:")) return "Every run starts at consent.";
  if (to === "suppress:in") return "Suppression always follows consent.";
  const own = from.split(":")[0];
  if (to.startsWith(`${own}:`)) return "A module cannot feed itself.";
  if (from.startsWith("in:") && to !== "consent:in") return "An event can only enter at consent.";
  return null;
};

/** Plug a cable, unplugging whatever was in the input before. Returns the new patch. */
export const plug = (patch: Patch, from: JackId, to: JackId | null): Patch => {
  const next: Patch = { ...patch };
  if (to) {
    for (const [k, v] of Object.entries(next) as [JackId, JackId | null][]) if (v === to) next[k] = null;
    // only one event is ever patched in: the others' cables come out
    if (from.startsWith("in:")) for (const k of Object.keys(next) as JackId[]) if (k.startsWith("in:") && k !== from) next[k] = null;
  }
  next[from] = to;
  return next;
};

export type Rules = { consent: boolean; hour: number; sentToday: number; inHoldout: boolean };

export type Step = { at: ModuleId | "send" | "entry"; result: "pass" | "stop" | "note"; text: string };

export const quiet = (h: number) => h >= 21 || h < 9;

const clock = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** The modules a run will visit, in patch order, starting from the patched event. */
export const route = (patch: Patch): { event: EventId | null; path: (ModuleId | "send")[]; cables: [JackId, JackId][] } => {
  const entry = (Object.keys(patch) as JackId[]).find((k) => k.startsWith("in:") && patch[k]);
  if (!entry) return { event: null, path: [], cables: [] };
  const path: (ModuleId | "send")[] = [];
  const cables: [JackId, JackId][] = [];
  let at: JackId | null | undefined = entry;
  for (let guard = 0; guard < 12 && at; guard++) {
    const to: JackId | null | undefined = patch[at];
    if (!to) break;
    cables.push([at, to]);
    if (to === "send") {
      path.push("send");
      break;
    }
    const mod = to.split(":")[0] as ModuleId;
    if (path.includes(mod)) break;
    path.push(mod);
    at = `${mod}:out`;
  }
  return { event: entry.slice(3) as EventId, path, cables };
};

/** Run one event through the patched route and write the trace. */
export const run = (patch: Patch, rules: Rules): { event: EventId | null; steps: Step[]; stoppedAt: ModuleId | "send" | null; sent: boolean } => {
  const { event, path } = route(patch);
  const steps: Step[] = [];
  if (!event) return { event, steps: [{ at: "entry", result: "stop", text: "Nothing patched in. Plug an event into consent." }], stoppedAt: null, sent: false };
  const ev = EVENTS.find((e) => e.id === event)!;
  steps.push({ at: "entry", result: "note", text: `${ev.event}, ${ev.detail}. ${ev.kind === "utility" ? "A utility message." : "A marketing message."}` });
  const visited = new Set(path);
  for (const m of path) {
    if (m === "send") {
      if (!visited.has("template")) {
        steps.push({ at: "send", result: "stop", text: "No approved template in the patch. Nothing can be sent." });
        return { event, steps, stoppedAt: "send", sent: false };
      }
      steps.push({ at: "send", result: "pass", text: `Sent at ${clock(rules.hour)}${ev.kind === "marketing" && quiet(rules.hour) && !visited.has("quiet") ? ", inside quiet hours. That is what the bypassed rule was for." : "."}` });
      if (!visited.has("holdout") && ev.kind === "marketing") steps.push({ at: "send", result: "note", text: "No holdout in this patch: this send can never be measured." });
      return { event, steps, stoppedAt: null, sent: true };
    }
    if (m === "consent") {
      if (ev.kind === "marketing" && !rules.consent) {
        steps.push({ at: m, result: "stop", text: "Stopped: no marketing consent. Tick the box at the gate above to change this." });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: ev.kind === "utility" ? "Pass: an update about their own order needs no marketing consent." : "Pass: consent given at the gate." });
    } else if (m === "suppress") {
      if (ev.ordered) {
        steps.push({ at: m, result: "stop", text: "Stopped: they already ordered. No reminder for a cart that is gone." });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: "Pass: no order, no refund, no complaint since." });
    } else if (m === "holdout") {
      if (ev.kind === "marketing" && rules.inHoldout) {
        steps.push({ at: m, result: "stop", text: "Held out: this shopper is in the holdout. Never messaged, but counted." });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: ev.kind === "utility" ? "Pass: utility messages are not held out." : "Pass: in the messaged group." });
    } else if (m === "cap") {
      if (ev.kind === "marketing" && rules.sentToday >= 1) {
        steps.push({ at: m, result: "stop", text: "Capped: one marketing message a day. Try tomorrow." });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: `Pass: ${rules.sentToday} sent today.` });
    } else if (m === "quiet") {
      if (ev.kind === "marketing" && quiet(rules.hour)) {
        steps.push({ at: m, result: "stop", text: `Waiting: it is ${clock(rules.hour)}. Quiet until 09:00.` });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: `Pass: ${clock(rules.hour)} is inside sending hours.` });
    } else if (m === "template") {
      if (!ev.template) {
        steps.push({ at: m, result: "stop", text: "No template fits this event." });
        return { event, steps, stoppedAt: m, sent: false };
      }
      steps.push({ at: m, result: "pass", text: `Template: ${ev.template}, pre-approved.` });
    }
  }
  steps.push({ at: "entry", result: "stop", text: "The patch ends in mid-air: the run has nowhere to go." });
  return { event, steps, stoppedAt: null, sent: false };
};
