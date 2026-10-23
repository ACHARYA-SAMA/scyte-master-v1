"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import { toast } from "@/lib/store";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { DEFAULT_PATCH, EVENTS, MODULES, canLift, canPlug, isInput, isOutput, plug, route, run, type EventId, type JackId, type ModuleId, type Patch, type Rules, type Step } from "./patch";
import styles from "./PatchBay.module.css";

type P = { x: number; y: number; px: number; py: number };
type Rope = { from: JackId; to: JackId | null; pts: P[]; rest: number };

const SEGMENTS = 18;
const DANGLE = 110;
const GRAVITY = 900;

type Props = {
  rules: Rules;
  onRules: (r: Partial<Rules>) => void;
  onTrace: (steps: Step[], done: boolean) => void;
  /** bumped by the station to run the current patch */
  runId: number;
  /** a run finished; `sent` says whether it reached the send line */
  onRunEnd?: (sent: boolean, everyRule: boolean) => void;
};

const JACK_LABEL = (j: JackId) => {
  if (j === "send") return "Send line input";
  if (j.startsWith("in:")) return `${EVENTS.find((e) => e.id === j.slice(3))?.event} output`;
  const [m, side] = j.split(":");
  return `${MODULES.find((x) => x.id === m)?.name} ${side === "in" ? "input" : "output"}`;
};

/**
 * P5, the patch bay. A rack of rule modules, patched with rope cables you can lift
 * and re-plug (or, from the keyboard, pick up with Enter and drop with Enter on the
 * new jack). Hold to run, and a token rides the cables through each module in patch
 * order while the trace writes what each rule decided.
 */
export function PatchBay({ rules, onRules, onTrace, runId, onRunEnd }: Props) {
  const bay = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [patch, setPatch] = useState<Patch>(DEFAULT_PATCH);
  const [holding, setHolding] = useState<JackId | null>(null);
  const [lamps, setLamps] = useState<Partial<Record<ModuleId | "send", "pass" | "stop" | "busy">>>({});
  const patchRef = useRef(patch);
  const jacks = useRef(new Map<JackId, { x: number; y: number }>());
  const ropes = useRef(new Map<JackId, Rope>());
  const drag = useRef<{ from: JackId; x: number; y: number } | null>(null);
  const token = useRef<{ x: number; y: number; on: boolean; glow: number }>({ x: 0, y: 0, on: false, glow: 0 });
  const signal = useRef<{ from: JackId | null; t: number }>({ from: null, t: 0 });
  const cb = useRef({ onTrace, onRunEnd, rules });
  useEffect(() => {
    cb.current = { onTrace, onRunEnd, rules };
  });
  useEffect(() => {
    patchRef.current = patch;
  }, [patch]);

  // --- where every jack is, relative to the bay
  const measure = useCallback(() => {
    const el = bay.current;
    const c = canvas.current;
    if (!el || !c) return;
    const r = el.getBoundingClientRect();
    el.querySelectorAll<HTMLElement>("[data-jack]").forEach((j) => {
      const b = j.getBoundingClientRect();
      jacks.current.set(j.dataset.jack as JackId, { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 });
    });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    c.style.width = `${r.width}px`;
    c.style.height = `${r.height}px`;
    c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // --- ropes follow the patch: a cable per output jack that has one
  const syncRopes = useCallback((p: Patch) => {
    const map = ropes.current;
    for (const [from, to] of Object.entries(p) as [JackId, JackId | null][]) {
      const a = jacks.current.get(from);
      if (!a) continue;
      const b = to ? jacks.current.get(to) : null;
      const len = b ? Math.max(60, Math.hypot(b.x - a.x, b.y - a.y) * 1.07) : DANGLE;
      let rope = map.get(from);
      if (!rope) {
        const pts: P[] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const t = i / SEGMENTS;
          const x = b ? a.x + (b.x - a.x) * t : a.x + t * 8;
          const y = b ? a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 30 : a.y + t * DANGLE;
          pts.push({ x, y, px: x, py: y });
        }
        rope = { from, to, pts, rest: len / SEGMENTS };
        map.set(from, rope);
      } else {
        rope.to = to;
        rope.rest = len / SEGMENTS;
      }
    }
  }, []);

  useEffect(() => {
    const el = bay.current;
    if (!el) return;
    measure();
    syncRopes(patchRef.current);
    const ro = new ResizeObserver(() => {
      measure();
      ropes.current.clear();
      syncRopes(patchRef.current);
    });
    ro.observe(el);
    void document.fonts.ready.then(() => {
      measure();
      ropes.current.clear();
      syncRopes(patchRef.current);
    });
    return () => ro.disconnect();
  }, [measure, syncRopes]);

  useEffect(() => {
    syncRopes(patch);
  }, [patch, syncRopes]);

  // --- physics and drawing, only while on screen
  useEffect(() => {
    const el = bay.current;
    const c = canvas.current;
    if (!el || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    let t = 0;

    const step = (dt: number) => {
      t += dt;
      const wind = reduced ? 0 : Math.sin(t * 0.7) * 18 + Math.sin(t * 1.9) * 6;
      for (const rope of ropes.current.values()) {
        const a = jacks.current.get(rope.from);
        if (!a) continue;
        const d = drag.current?.from === rope.from ? drag.current : null;
        const b = d ? { x: d.x, y: d.y } : rope.to ? jacks.current.get(rope.to) : null;
        const pts = rope.pts;
        // integrate
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i]!;
          const vx = (p.x - p.px) * 0.985;
          const vy = (p.y - p.py) * 0.985;
          p.px = p.x;
          p.py = p.y;
          p.x += vx + wind * dt * dt * 4;
          p.y += vy + GRAVITY * dt * dt;
        }
        // constraints
        for (let k = 0; k < 14; k++) {
          pts[0]!.x = a.x;
          pts[0]!.y = a.y;
          if (b) {
            pts[pts.length - 1]!.x = b.x;
            pts[pts.length - 1]!.y = b.y;
          }
          for (let i = 0; i < pts.length - 1; i++) {
            const p = pts[i]!;
            const q = pts[i + 1]!;
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const diff = (dist - rope.rest) / dist;
            const pinP = i === 0;
            const pinQ = i + 1 === pts.length - 1 && !!b;
            const wp = pinP ? 0 : pinQ ? 1 : 0.5;
            const wq = pinQ ? 0 : pinP ? 1 : 0.5;
            p.x += dx * diff * wp;
            p.y += dy * diff * wp;
            q.x -= dx * diff * wq;
            q.y -= dy * diff * wq;
          }
        }
      }
    };

    const strokeRope = (pts: P[]) => {
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i]!.x + pts[i + 1]!.x) / 2;
        const my = (pts[i]!.y + pts[i + 1]!.y) / 2;
        ctx.quadraticCurveTo(pts[i]!.x, pts[i]!.y, mx, my);
      }
      const last = pts[pts.length - 1]!;
      ctx.lineTo(last.x, last.y);
    };

    const pointAt = (pts: P[], f: number) => {
      const n = pts.length - 1;
      const x = Math.min(n - 1e-6, Math.max(0, f * n));
      const i = Math.floor(x);
      const u = x - i;
      return { x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * u, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * u };
    };

    const draw = () => {
      const w = c.width;
      const h = c.height;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.restore();
      const live = route(patchRef.current).cables.map(([f]) => f);
      for (const rope of ropes.current.values()) {
        const on = live.includes(rope.from) && rope.to;
        // shadow, body, highlight: a rubber cable lit from above
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        strokeRope(rope.pts.map((p) => ({ ...p, y: p.y + 6 })));
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 6;
        ctx.stroke();
        strokeRope(rope.pts);
        ctx.strokeStyle = on ? "#8f8768" : "#5a5f4c";
        ctx.lineWidth = 5;
        ctx.stroke();
        strokeRope(rope.pts.map((p) => ({ ...p, y: p.y - 1.4 })));
        ctx.strokeStyle = on ? "rgba(230, 213, 184, 0.55)" : "rgba(207, 199, 170, 0.22)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // the plug at the free end
        const end = rope.pts[rope.pts.length - 1]!;
        if (!rope.to || drag.current?.from === rope.from) {
          ctx.fillStyle = "#c2b897";
          ctx.fillRect(end.x - 5, end.y - 7, 10, 14);
          ctx.fillStyle = "#2b3a2f";
          ctx.fillRect(end.x - 2, end.y + 6, 4, 6);
        }
        // signal: a pulse of light travelling the cable during a run
        if (signal.current.from === rope.from && rope.to) {
          const f = signal.current.t;
          for (let k = 0; k < 6; k++) {
            const q = pointAt(rope.pts, Math.max(0, f - k * 0.03));
            ctx.beginPath();
            ctx.arc(q.x, q.y, 3.4 - k * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(249, 220, 125, ${0.9 - k * 0.14})`;
            ctx.fill();
          }
        }
      }
      // the cargo token
      const tk = token.current;
      if (tk.on) {
        const g = ctx.createRadialGradient(tk.x, tk.y, 0, tk.x, tk.y, 22);
        g.addColorStop(0, "rgba(249, 220, 125, 0.95)");
        g.addColorStop(0.3, "rgba(249, 220, 125, 0.45)");
        g.addColorStop(1, "rgba(249, 220, 125, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(tk.x, tk.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff3c8";
        ctx.beginPath();
        ctx.arc(tk.x, tk.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let acc = 0;
    const tick = (_t: number, deltaMs: number) => {
      acc += Math.min(0.05, deltaMs / 1000);
      // fixed steps keep the ropes stable at any frame rate
      while (acc >= 1 / 120) {
        step(1 / 120);
        acc -= 1 / 120;
      }
      draw();
    };
    // settle the ropes before the first frame so they do not fall into place on screen
    for (let i = 0; i < 160; i++) step(1 / 120);
    draw();
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
    };
  }, []);

  // --- patching with the pointer
  const nearestInput = (x: number, y: number) => {
    let best: JackId | null = null;
    let bd = 46;
    for (const [id, p] of jacks.current) {
      if (!isInput(id)) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  };

  const attempt = useCallback((from: JackId, to: JackId | null) => {
    if (to) {
      const why = canPlug(from, to);
      if (why) {
        toast(why);
        sfx.deny();
        haptic([20, 30, 20]);
        return false;
      }
    }
    if (!to && !canLift(from)) return false;
    setPatch((p) => plug(p, from, to));
    sfx.plug();
    haptic(8);
    return true;
  }, []);

  const lift = (from: JackId) => {
    if (!canLift(from)) {
      toast("Consent and suppression are welded in. Not even we can route around them.");
      sfx.deny();
      haptic([20, 30, 20]);
      return false;
    }
    return true;
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = bay.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onJackDown = (id: JackId) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    // an input with a plug in it: lift that plug; an output: lift its own cable
    let from: JackId | null = null;
    if (isOutput(id)) from = id;
    else {
      const owner = (Object.entries(patchRef.current) as [JackId, JackId | null][]).find(([, v]) => v === id);
      from = owner ? owner[0] : null;
    }
    if (!from || !lift(from)) return;
    e.preventDefault();
    const p = local(e);
    drag.current = { from, ...p };
    sfx.plug();
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const q = local(ev);
      drag.current.x = q.x;
      drag.current.y = q.y;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const q = local(ev);
      const target = nearestInput(q.x, q.y);
      if (target && target === patchRef.current[d.from]) return;
      if (target) attempt(d.from, target);
      else attempt(d.from, null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // --- patching from the keyboard: Enter picks a cable up, Enter on an input plugs it in
  const onJackKey = (id: JackId) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && holding) {
      setHolding(null);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (holding) {
      if (isInput(id) && attempt(holding, id)) setHolding(null);
      else if (isOutput(id) && lift(id)) setHolding(id);
      return;
    }
    if (isOutput(id)) {
      if (lift(id)) setHolding(id);
    } else {
      const owner = (Object.entries(patchRef.current) as [JackId, JackId | null][]).find(([, v]) => v === id);
      if (owner && lift(owner[0])) setHolding(owner[0]);
    }
  };

  // --- running the patch
  useEffect(() => {
    if (!runId) return;
    const { rules: r, onTrace: trace, onRunEnd: end } = cb.current;
    const result = run(patchRef.current, r);
    const { cables } = route(patchRef.current);
    const reduced = prefersReducedMotion();
    const stops = result.stoppedAt;
    // the cables the token actually travels: up to the module that stops it
    const travel: [JackId, JackId][] = [];
    for (const c of cables) {
      travel.push(c);
      const mod = c[1] === "send" ? "send" : c[1].split(":")[0];
      if (mod === stops) break;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a run is started by the runId prop; its lamps reset with it
    setLamps({});
    trace(result.steps.slice(0, 1), false);
    const everyRule = MODULES.every((m) => route(patchRef.current).path.includes(m.id));
    if (reduced) {
      trace(result.steps, true);
      const final: Partial<Record<ModuleId | "send", "pass" | "stop">> = {};
      for (const st of result.steps) if (st.at !== "entry") final[st.at] = st.result === "stop" ? "stop" : "pass";
      setLamps(final);
      end?.(result.sent, everyRule);
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        token.current.on = false;
        signal.current.from = null;
        trace(result.steps, true);
        end?.(result.sent, everyRule);
      },
    });
    const f = { t: 0 };
    travel.forEach(([from, to], i) => {
      tl.add(() => {
        signal.current.from = from;
        token.current.on = true;
      });
      tl.fromTo(
        f,
        { t: 0 },
        {
          t: 1,
          duration: 0.62,
          ease: "drift",
          onUpdate: () => {
            const rope = ropes.current.get(from);
            if (!rope) return;
            signal.current.t = f.t;
            const n = rope.pts.length - 1;
            const x = Math.min(n - 1e-6, f.t * n);
            const k = Math.floor(x);
            const u = x - k;
            token.current.x = rope.pts[k]!.x + (rope.pts[k + 1]!.x - rope.pts[k]!.x) * u;
            token.current.y = rope.pts[k]!.y + (rope.pts[k + 1]!.y - rope.pts[k]!.y) * u;
          },
        },
      );
      const mod = (to === "send" ? "send" : to.split(":")[0]) as ModuleId | "send";
      tl.add(() => {
        const stepFor = result.steps.find((s) => s.at === mod);
        const stopped = stepFor?.result === "stop";
        setLamps((l) => ({ ...l, [mod]: stopped ? "stop" : "pass" }));
        // reveal the trace up to this module's last line
        let last = 0;
        result.steps.forEach((st, j) => {
          if (st.at === mod) last = j;
        });
        trace(result.steps.slice(0, last + 1), false);
        if (stopped) {
          sfx.deny();
          gsap.to(token.current, { y: token.current.y + 46, duration: 0.5, ease: "power2.in" });
        } else if (mod === "send") {
          sfx.ping();
          haptic([10, 20, 30]);
        } else sfx.relay();
      });
      tl.to({}, { duration: i === travel.length - 1 ? 0.5 : 0.18 });
    });
    const tk = token.current;
    const sig = signal.current;
    return () => {
      tl.kill();
      tk.on = false;
      sig.from = null;
    };
  }, [runId]);

  const { path, event } = route(patch);

  // a render function, not a component: a component defined here would remount every
  // jack on each update and drop keyboard focus mid-patch
  const jack = (id: JackId, side: "in" | "out") => (
    <button
      key={id}
      type="button"
      className={styles.jack}
      data-jack={id}
      data-side={side}
      data-holding={holding === id ? "1" : undefined}
      data-target={holding && isInput(id) && !canPlug(holding, id) ? "1" : undefined}
      aria-label={`${JACK_LABEL(id)}${holding === id ? ", holding its cable" : ""}`}
      onPointerDown={onJackDown(id)}
      onKeyDown={onJackKey(id)}
      data-cursor="drag"
      data-cursor-label="Patch"
    />
  );

  const control = (m: ModuleId) => {
    if (m === "consent")
      return (
        <p className={`${styles.read} t-hud`}>
          From the gate: <b>{rules.consent ? "yes" : "no"}</b>
        </p>
      );
    if (m === "suppress") return <p className={`${styles.read} t-hud`}>Ordered since: {event === "done" ? "yes" : "no"}</p>;
    if (m === "holdout")
      return (
        <button type="button" className={`${styles.flip} t-hud`} onClick={() => onRules({ inHoldout: !rules.inHoldout })} aria-pressed={rules.inHoldout}>
          This shopper: <b>{rules.inHoldout ? "held out" : "messaged"}</b>
        </button>
      );
    if (m === "cap")
      return (
        <button type="button" className={`${styles.flip} t-hud`} onClick={() => onRules({ sentToday: rules.sentToday ? 0 : 1 })} aria-pressed={rules.sentToday > 0}>
          Sent today: <b>{rules.sentToday}</b>
        </button>
      );
    if (m === "quiet")
      return <RotaryKnob label="Hour" value={rules.hour} min={0} max={23} step={1} onChange={(h) => onRules({ hour: h })} format={(h) => `${String(h).padStart(2, "0")}:00`} size="s" ticks={24} />;
    return <p className={`${styles.read} t-hud`}>{EVENTS.find((e) => e.id === event)?.template || "None fits"}</p>;
  };

  return (
    <div ref={bay} className={styles.bay} data-holding={holding ? "1" : undefined}>
      <canvas ref={canvas} className={styles.cables} aria-hidden />
      <div className={styles.inputs} role="group" aria-label="Events in">
        <p className={`${styles.colHead} t-hud`}>Events in</p>
        {EVENTS.map((e) => (
          <div key={e.id} className={styles.input} data-on={event === e.id ? "1" : undefined}>
            <span className={styles.inText}>
              <span className={styles.inName}>{e.event}</span>
              <span className={`${styles.inDetail} t-hud`}>{e.kind}</span>
            </span>
            {jack(`in:${e.id}` as JackId, "out")}
          </div>
        ))}
      </div>
      <div className={styles.rack} role="group" aria-label="Rule modules">
        {MODULES.map((m, i) => (
          <div
            key={m.id}
            className={styles.module}
            data-state={lamps[m.id]}
            data-bypassed={!path.includes(m.id) ? "1" : undefined}
            data-welded={m.welded ? "1" : undefined}
            data-wide={m.id === "quiet" ? "1" : undefined}
          >
            {jack(`${m.id}:in` as JackId, "in")}
            <div className={styles.face}>
              <span className={`${styles.num} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.lamp} aria-hidden />
              <span className={styles.mName}>{m.name}</span>
              <span className={`${styles.mLine} t-small`}>{m.line}</span>
              <div className={styles.ctl}>{control(m.id)}</div>
              {!path.includes(m.id) ? <span className={`${styles.bypass} t-hud`}>Bypassed</span> : m.welded ? <span className={`${styles.weld} t-hud`}>Welded</span> : null}
            </div>
            {jack(`${m.id}:out` as JackId, "out")}
          </div>
        ))}
      </div>
      <div className={styles.send} data-state={lamps.send}>
        {jack("send", "in")}
        <span className={styles.sendLamp} aria-hidden />
        <span className={styles.sendName}>Send</span>
        <span className={`${styles.sendLine} t-hud`}>Official API</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {holding ? `Holding the cable from ${JACK_LABEL(holding)}. Choose an input jack and press Enter, or Escape to put it back.` : ""}
      </p>
    </div>
  );
}

export type { EventId };
