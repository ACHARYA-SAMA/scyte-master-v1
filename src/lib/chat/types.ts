/**
 * A chat flow is a small graph. Entering a node sends its bot messages (with typing
 * delays), records its events, and offers its replies. Every flow on the site is one
 * of these objects, so the phone component never knows which story it is telling.
 */

export type Action = {
  label: string;
  /** node to go to */
  to: string;
  /** what the shopper's bubble says, if different from the label */
  say?: string;
  /** a form field this answer fills (contact flow) */
  field?: { name: string; value: string };
  tone?: "primary" | "quiet";
};

export type OrderCard = {
  kind: "order";
  title: string;
  lines: { label: string; value: string }[];
  status?: string;
};

export type TrackCard = {
  kind: "track";
  order: string;
  steps: { label: string; done: boolean }[];
};

export type StarCard = { kind: "stars" };

export type BotMessage =
  | { kind: "text"; text: string; actions?: Action[] }
  | (OrderCard & { actions?: Action[] })
  | (TrackCard & { actions?: Action[] })
  | (StarCard & { actions?: Action[] });

export type FlowNode = {
  id: string;
  bot: BotMessage[];
  /** quick replies under the composer */
  replies?: Action[];
  /** free text expected here: where it goes, and which form field it fills */
  input?: { placeholder: string; to: string; field?: string; type?: "text" | "email" | "url" | "tel" };
  /** dashboard events recorded on entering this node */
  events?: string[];
  /** an in-phone sheet, such as a UPI approval */
  sheet?: { title: string; body: string; approve: Action; decline: Action };
  outcome?: "recovered" | "lost" | "confirmed" | "stopped" | "sent";
  end?: boolean;
};

export type Flow = {
  id: string;
  /** shown in the chat header */
  business: string;
  /** shown as the notification that opens the chat */
  notification: string;
  start: string;
  nodes: Record<string, FlowNode>;
  /** keyword replies to typed text, checked in order */
  router?: { match: RegExp; to: string }[];
  /** reply when nothing matches */
  fallback: string;
};

export type ChatMessage = {
  id: number;
  from: "bot" | "me" | "system";
  body: BotMessage;
  time: string;
  ticks?: 1 | 2 | 3;
  /** actions on this message stay live until the next node */
  live?: boolean;
};
