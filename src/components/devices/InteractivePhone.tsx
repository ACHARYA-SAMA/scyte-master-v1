"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useChat } from "@/lib/chat/useChat";
import type { Action, BotMessage, ChatMessage, Flow, FlowNode } from "@/lib/chat/types";
import { gsap, prefersReducedMotion, springStep, SPRING } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { Arrow, Back, Battery, Check, Dots, Send, Signal, Ticks } from "./icons";
import styles from "./InteractivePhone.module.css";

type Props = {
  flow: Flow;
  /** start the conversation (the phone starts itself when scrolled into view if omitted) */
  active?: boolean;
  /** device: a tilting 3D shell. frameless: the chat alone, for small screens. */
  variant?: "device" | "frameless";
  label?: string;
  className?: string;
  style?: CSSProperties;
  onEvent?: (event: string) => void;
  onOutcome?: (outcome: NonNullable<FlowNode["outcome"]>, flow: Flow) => void;
  onField?: (name: string, value: string) => void;
  /** tilt with the pointer and drag to rotate */
  tilt?: boolean;
  /** a replay button once the flow ends */
  replay?: boolean;
  /** a message the page wants the business to say, such as a server result */
  inject?: { id: number; text: string; end?: boolean } | null;
};

const istTime = () =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 10000);
  return () => window.clearInterval(id);
};

const MENU = [
  { label: "Track my order", to: "track" },
  { label: "Help", to: "help" },
  { label: "Stop messages", to: "stop" },
];

function Body({ body, live, onAction, disabled }: { body: BotMessage; live?: boolean; onAction: (a: Action) => void; disabled: boolean }) {
  const actions = body.actions;
  return (
    <>
      {body.kind === "text" ? <p className={styles.text}>{body.text}</p> : null}
      {body.kind === "order" ? (
        <div className={styles.card}>
          <p className={styles.cardTitle}>{body.title}</p>
          <dl className={styles.lines}>
            {body.lines.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>{l.value}</dd>
              </div>
            ))}
          </dl>
          {body.status ? <p className={styles.status}>{body.status}</p> : null}
        </div>
      ) : null}
      {body.kind === "track" ? (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Order {body.order}</p>
          <ol className={styles.steps}>
            {body.steps.map((s) => (
              <li key={s.label} data-done={s.done ? "1" : undefined}>
                <span className={styles.stepDot} aria-hidden />
                {s.label}
                <span className="sr-only">{s.done ? ", done" : ", not yet"}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {body.kind === "stars" ? <p className={styles.text}>Tap a rating below.</p> : null}
      {actions?.length ? (
        <div className={styles.actions}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={styles.action}
              data-tone={a.tone}
              disabled={!live || disabled}
              onClick={() => onAction(a)}
              data-cursor="tap"
            >
              <span>{a.label}</span>
              <Arrow className={styles.actionIcon} />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Bubble({ m, onAction, disabled }: { m: ChatMessage; onAction: (a: Action) => void; disabled: boolean }) {
  return (
    <li className={styles.row} data-from={m.from}>
      <div className={styles.bubble} data-kind={m.body.kind}>
        <Body body={m.body} live={m.live} onAction={onAction} disabled={disabled} />
        <span className={styles.meta}>
          <time>{m.time}</time>
          {m.from === "me" && m.ticks ? (
            <>
              <Ticks n={m.ticks} className={styles.ticks} />
              <span className="sr-only">{m.ticks === 1 ? "sent" : m.ticks === 2 ? "delivered" : "read"}</span>
            </>
          ) : null}
        </span>
      </div>
    </li>
  );
}

/**
 * A working phone: a generic chat app (own icons, own bubbles, no third-party marks)
 * running one of the report's flows. Everything in it is a real control, and the
 * page can listen to its events and outcomes.
 */
export function InteractivePhone({
  flow,
  active,
  variant = "device",
  label,
  className,
  style,
  onEvent,
  onOutcome,
  onField,
  tilt = true,
  replay = true,
  inject,
}: Props) {
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const device = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLOListElement>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState(false);
  const time = useSyncExternalStore(subscribe, istTime, () => "--:--");
  const reduced = typeof window !== "undefined" && prefersReducedMotion();
  const chat = useChat(flow, {
    onEvent,
    onOutcome: (o, f) => {
      if (o === "recovered" || o === "confirmed") {
        sfx.ok();
        haptic([10, 40, 10]);
      }
      onOutcome?.(o, f);
    },
    onField,
    pace: reduced ? 0.15 : 1,
  });
  const { start, started } = chat;
  const injectChat = chat.inject;

  useEffect(() => {
    if (inject) injectChat(inject.text, inject.end);
  }, [inject, injectChat]);

  // start when asked, or when scrolled into view
  useEffect(() => {
    if (active === false) return;
    if (active === true) {
      if (!started) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the notification is the first beat of the flow
        setNotice(true);
        sfx.ping();
        start();
      }
      return;
    }
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          setNotice(true);
          start();
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, start, started]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(false), 2600);
    return () => window.clearTimeout(t);
  }, [notice]);

  // keep the newest message in view, inside the phone only
  const count = chat.messages.length;
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    const last = chat.messages[count - 1];
    if (last?.from === "bot" && count > 1) sfx.ping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, chat.typing]);

  // tilt with springs; drag on the frame to rotate
  useEffect(() => {
    const el = device.current;
    const wrap = root.current;
    if (!el || !wrap || !tilt || variant !== "device" || reduced) return;
    const s = { rx: 0, vx: 0, ry: 0, vy: 0, tx: 0, ty: 0, drag: 0 };
    let dragging = false;
    let startX = 0;
    let base = 0;
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      if (dragging) s.drag = base + (e.clientX - startX) * 0.35;
      s.ty = Math.max(-1, Math.min(1, nx)) * 9;
      s.tx = -Math.max(-1, Math.min(1, ny)) * 7;
    };
    const onLeave = () => {
      s.tx = 0;
      s.ty = 0;
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-screen]")) return;
      dragging = true;
      startX = e.clientX;
      base = s.drag;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      dragging = false;
      s.drag = 0;
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      [s.rx, s.vx] = springStep(s.rx, s.vx, s.tx, SPRING.float, dt);
      [s.ry, s.vy] = springStep(s.ry, s.vy, s.ty + s.drag, SPRING.float, dt);
      el.style.setProperty("--rx", `${s.rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${s.ry.toFixed(2)}deg`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      gsap.ticker.remove(tick);
    };
  }, [tilt, variant, reduced]);

  const act = (a: Action) => {
    sfx.tick();
    haptic(6);
    chat.choose(a);
  };

  const submit = () => {
    if (!draft.trim()) return;
    chat.send(draft);
    setDraft("");
  };

  const n = chat.node;
  const status = chat.typing ? "typing…" : "Business account";
  const busy = chat.typing;

  const screen = (
    <div className={styles.screen} data-screen data-lenis-prevent data-cursor="default">
      <div className={styles.statusbar} aria-hidden>
        <time suppressHydrationWarning>{time}</time>
        <span className={styles.island} />
        <span className={styles.sys}>
          <Signal className={styles.sysIcon} />
          <Battery className={styles.battery} />
        </span>
      </div>

      <div className={styles.notification} data-show={notice ? "1" : undefined} aria-hidden={!notice}>
        <span className={styles.appMark} aria-hidden />
        <span>
          <b>{flow.business}</b>
          <span>{flow.notification.replace(`${flow.business}: `, "")}</span>
        </span>
      </div>

      <header className={styles.header}>
        <Back className={styles.headerIcon} />
        <span className={styles.avatar} aria-hidden>
          {flow.business.slice(0, 1)}
        </span>
        <span className={styles.who}>
          <b>{flow.business}</b>
          <span aria-live="polite">{status}</span>
        </span>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Chat menu"
          aria-expanded={menu}
          aria-controls={`${uid}-menu`}
          onClick={() => setMenu((v) => !v)}
          data-cursor="tap"
        >
          <Dots className={styles.headerIcon} />
        </button>
      </header>

      <ol ref={log} className={styles.log} aria-live="polite" aria-label={`Conversation with ${flow.business}`}>
        <li className={styles.day} aria-hidden>
          Today
        </li>
        {chat.messages.map((m) => (
          <Bubble key={m.id} m={m} onAction={act} disabled={busy || chat.ended} />
        ))}
        {chat.typing ? (
          <li className={styles.row} data-from="bot" aria-label={`${flow.business} is typing`}>
            <div className={`${styles.bubble} ${styles.typing}`}>
              <i />
              <i />
              <i />
            </div>
          </li>
        ) : null}
        {chat.ended && replay ? (
          <li className={styles.endRow}>
            <button type="button" className={styles.replay} onClick={() => start()} data-cursor="tap">
              Play it again
            </button>
          </li>
        ) : null}
      </ol>

      {n?.replies?.length && !busy ? (
        <div className={styles.replies} role="group" aria-label="Quick replies">
          {n.replies.map((r) => (
            <button key={r.label} type="button" className={styles.reply} onClick={() => act(r)} data-cursor="tap">
              {r.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={styles.composer}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${uid}-input`} className="sr-only">
          Message {flow.business}
        </label>
        <input
          id={`${uid}-input`}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={n?.input?.placeholder ?? "Message"}
          type={n?.input?.type ?? "text"}
          autoComplete="off"
          disabled={chat.ended}
          enterKeyHint="send"
        />
        <button type="submit" className={styles.send} aria-label="Send" disabled={!draft.trim() || chat.ended} data-cursor="tap">
          <Send className={styles.sendIcon} />
        </button>
      </form>

      {/* the three-dot menu */}
      <div id={`${uid}-menu`} className={styles.sheet} data-open={menu ? "1" : undefined} hidden={!menu}>
        <p className={styles.sheetTitle}>{flow.business}</p>
        {MENU.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.sheetItem}
            onClick={() => {
              setMenu(false);
              act({ label: item.label, to: item.to });
            }}
            data-cursor="tap"
          >
            {item.label}
          </button>
        ))}
        <button type="button" className={styles.sheetCancel} onClick={() => setMenu(false)}>
          Close
        </button>
      </div>

      {/* in-phone sheets: a UPI approval, a demo payment */}
      {chat.sheet ? (
        <div className={styles.paySheet} role="dialog" aria-label={chat.sheet.title}>
          <span className={styles.payGrip} aria-hidden />
          <p className={styles.payTitle}>{chat.sheet.title}</p>
          <p className={styles.payBody}>{chat.sheet.body}</p>
          <div className={styles.payActions}>
            <button type="button" className={styles.payDecline} onClick={() => chat.answerSheet(chat.sheet!.decline)} data-cursor="tap">
              {chat.sheet.decline.label}
            </button>
            <button type="button" className={styles.payApprove} onClick={() => chat.answerSheet(chat.sheet!.approve)} data-cursor="tap">
              <Check className={styles.payIcon} />
              {chat.sheet.approve.label}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      ref={root}
      className={`${styles.wrap} ${className ?? ""}`}
      data-variant={variant}
      data-motion-own
      data-avoid
      style={style}
      role="region"
      aria-label={label ?? `Demo chat: ${flow.id.replace(/-/g, " ")}`}
    >
      {variant === "device" ? (
        <div ref={device} className={styles.device} data-cursor="drag" data-cursor-label="Drag to turn">
          <span className={styles.edge} aria-hidden />
          <span className={styles.edge} aria-hidden />
          <span className={styles.edge} aria-hidden />
          <span className={styles.buttons} aria-hidden />
          <div className={styles.bezel}>{screen}</div>
        </div>
      ) : (
        <div className={styles.frameless}>{screen}</div>
      )}
    </div>
  );
}
