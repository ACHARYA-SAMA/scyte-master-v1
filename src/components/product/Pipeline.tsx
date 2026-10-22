"use client";

import { useEffect, useRef, useState } from "react";
import { STATIONS } from "@/data/pipeline";
import { StageWindow } from "@/components/stage/StageControls";
import { bridge } from "@/components/stage/bridge";
import { scroller } from "@/components/providers/SmoothScroll";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion";
import { stage, ui, useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import styles from "./Pipeline.module.css";

/** DOM labels pinned to the stations' projected positions in the WebGL scene. */
function StationLabels({ active }: { active: number }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const tick = () => {
      bridge.anchors.forEach((a, i) => {
        const el = refs.current[i];
        if (!el) return;
        el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        el.dataset.visible = a.visible ? "1" : "0";
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <div className={styles.labels} aria-hidden>
      {STATIONS.map((s, i) => (
        <div
          key={s.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.label}
          data-active={i === active ? "1" : "0"}
        >
          <span className={styles.labelLine} />
          <span className={styles.labelText}>
            <span className="t-num">{String(i + 1).padStart(2, "0")}</span> {s.name}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Without WebGL: the same six stations as a schematic, lit by scroll. */
function Schematic({ active }: { active: number }) {
  return (
    <ol className={styles.schematic} aria-hidden>
      {STATIONS.map((s, i) => (
        <li key={s.id} data-state={i < active ? "done" : i === active ? "on" : "off"}>
          <span className="t-num">{String(i + 1).padStart(2, "0")}</span>
          <strong>{s.name}</strong>
        </li>
      ))}
    </ol>
  );
}

export function Pipeline() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const webgl = useStore(ui, (s) => s.webgl);
  const stRef = useRef<ScrollTrigger | null>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let last = -1;
      stRef.current = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (st) => {
          stage.set({ pipeline: st.progress });
          const i = Math.min(STATIONS.length - 1, Math.floor(st.progress * STATIONS.length));
          if (i !== last) {
            last = i;
            setActive(i);
            sfx.tick();
          }
        },
        onLeaveBack: () => stage.set({ pipeline: 0 }),
      });
    },
    { scope: root },
  );

  useEffect(() => () => stage.set({ pipeline: 0 }), []);

  const jump = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const y = st.start + ((st.end - st.start) * (i + 0.5)) / STATIONS.length;
    if (scroller.lenis) scroller.lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const s = STATIONS[active];

  return (
    <StageWindow as="section" className={styles.section} id="pipeline" aria-labelledby="pipeline-title">
      <div ref={root} className={styles.track}>
        <div className={styles.sticky}>
          {webgl === "unsupported" ? <Schematic active={active} /> : <StationLabels active={active} />}

          <div className={styles.panel}>
            <h2 id="pipeline-title" className={styles.kicker}>
              The loop, one shopper at a time
            </h2>
            <div className={styles.station} key={s.id}>
              <p className={styles.count}>
                <span className="t-num">{String(active + 1).padStart(2, "0")}</span>
                <span className={styles.of}> / 06</span>
              </p>
              <h3 className={styles.name}>{s.name}</h3>
              <p className={styles.what}>{s.what}</p>
              <p className={styles.detail}>{s.detail}</p>
            </div>
          </div>

          <p className={styles.legend} aria-live="polite">
            {s.legend}
          </p>

          <nav className={styles.rail} aria-label="Pipeline stations">
            {STATIONS.map((st, i) => (
              <button
                key={st.id}
                type="button"
                className={styles.railItem}
                data-state={i < active ? "done" : i === active ? "on" : "off"}
                aria-current={i === active ? "step" : undefined}
                aria-label={`Go to ${st.name}`}
                onClick={() => jump(i)}
              >
                <span className={styles.railTick} />
                <span className={styles.railName}>{st.name}</span>
              </button>
            ))}
          </nav>

          <div className={styles.key} aria-hidden>
            <span>
              <i data-c="bone" /> consented events
            </span>
            <span>
              <i data-c="moss" /> anonymous, never messaged
            </span>
            <span>
              <i data-c="dim" /> holdout, never messaged on purpose
            </span>
            <span>
              <i data-c="signal" /> measured lift
            </span>
          </div>
        </div>
      </div>
    </StageWindow>
  );
}
