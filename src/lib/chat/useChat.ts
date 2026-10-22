"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, ChatMessage, Flow, FlowNode } from "./types";

const clock = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

const typingDelay = (m: { kind: string; text?: string }) =>
  m.kind === "text" ? Math.min(1500, 420 + (m.text?.length ?? 0) * 11) : 650;

type Options = {
  onEvent?: (event: string) => void;
  onOutcome?: (outcome: NonNullable<FlowNode["outcome"]>, flow: Flow) => void;
  onField?: (name: string, value: string) => void;
  /** speed multiplier for typing delays; 0 skips them (reduced motion, tests) */
  pace?: number;
};

/**
 * Runs a Flow: bot messages arrive with typing delays, the shopper's bubbles go from
 * sent to delivered to read, actions advance the graph, typed text is routed by
 * keyword. Safe under Strict Mode: start() always resets, and every timer is cleared.
 */
export const useChat = (flow: Flow, { onEvent, onOutcome, onField, pace = 1 }: Options = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [node, setNode] = useState<FlowNode | null>(null);
  const [sheet, setSheet] = useState<FlowNode["sheet"] | null>(null);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);
  const token = useRef(0);
  const cb = useRef({ onEvent, onOutcome, onField });
  useEffect(() => {
    cb.current = { onEvent, onOutcome, onField };
  });

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms * pace);
    timers.current.push(t);
  };

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const enter = useCallback(
    (id: string) => {
      const next = flow.nodes[id];
      if (!next) return;
      const my = ++token.current;
      setNode(null);
      setSheet(null);
      // actions on earlier messages stop being live once the graph moves on
      setMessages((list) => list.map((m) => (m.live ? { ...m, live: false } : m)));
      let at = 260;
      next.bot.forEach((body, i) => {
        later(() => token.current === my && setTyping(true), at);
        at += typingDelay(body as { kind: string; text?: string });
        later(() => {
          if (token.current !== my) return;
          setTyping(false);
          setMessages((list) => [...list, { id: ++seq.current, from: "bot", body, time: clock(), live: true }]);
        }, at);
        at += i < next.bot.length - 1 ? 220 : 0;
      });
      later(() => {
        if (token.current !== my) return;
        setNode(next);
        next.events?.forEach((e) => cb.current.onEvent?.(e));
        if (next.sheet) later(() => token.current === my && setSheet(next.sheet ?? null), 420);
        if (next.outcome) cb.current.onOutcome?.(next.outcome, flow);
        if (next.end) setEnded(true);
      }, at + 60);
    },
    // later() and clear() only touch refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow, pace],
  );

  const say = useCallback(
    (text: string) => {
      const id = ++seq.current;
      setMessages((list) => [...list, { id, from: "me", body: { kind: "text", text }, time: clock(), ticks: 1 }]);
      later(() => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ticks: 2 } : m))), 380);
      later(() => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ticks: 3 } : m))), 980);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pace],
  );

  const choose = useCallback(
    (a: Action) => {
      if (ended) return;
      say(a.say ?? a.label);
      if (a.field) cb.current.onField?.(a.field.name, a.field.value);
      enter(a.to);
    },
    [ended, enter, say],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || ended) return;
      say(text);
      const n = node;
      if (n?.input) {
        if (n.input.field) cb.current.onField?.(n.input.field, text);
        enter(n.input.to);
        return;
      }
      const hit = flow.router?.find((r) => r.match.test(text));
      enter(hit?.to ?? flow.fallback);
    },
    [ended, enter, flow, node, say],
  );

  const start = useCallback(() => {
    clear();
    token.current++;
    seq.current = 0;
    setMessages([]);
    setTyping(false);
    setNode(null);
    setSheet(null);
    setEnded(false);
    setStarted(true);
    enter(flow.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter, flow.start]);

  const answerSheet = useCallback(
    (a: Action) => {
      setSheet(null);
      choose(a);
    },
    [choose],
  );

  useEffect(() => () => clear(), []);

  return { messages, typing, node, sheet, ended, started, start, choose, send, answerSheet };
};
