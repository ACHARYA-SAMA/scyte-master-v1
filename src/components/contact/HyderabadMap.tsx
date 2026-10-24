"use client";

import { useMemo, useSyncExternalStore } from "react";
import { OFFICE_HOURS, SITE } from "@/config/site";
import styles from "./HyderabadMap.module.css";

const W = 1000;
const H = 520;
const PIN = { x: 560, y: 270 };

const ist = () => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
const istParts = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", weekday: "short", hour12: false }).formatToParts(new Date());
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { h: Number(get("hour")), m: Number(get("minute")), day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")) };
};
const everySecond = (cb: () => void) => {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
};

/** Contour-like rings, drawn by hand in code: a stylised plateau, not a survey map. */
const contours = () =>
  Array.from({ length: 11 }, (_, k) => {
    const r = 40 + k * 34;
    const pts: string[] = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(t * 3 + k * 0.7) + 0.06 * Math.sin(t * 7 - k);
      pts.push(`${(PIN.x + Math.cos(t) * r * 1.5 * wob).toFixed(1)},${(PIN.y + Math.sin(t) * r * wob).toFixed(1)}`);
    }
    return pts.join(" ");
  });

/**
 * K5, Hyderabad: a stylised map drawn in code (no embed, no tiles, nothing fetched),
 * with the pin at 17.385° N, 78.487° E and the time there now. The "likely online"
 * dial appears only once real office hours are configured.
 */
export function HyderabadMap() {
  const time = useSyncExternalStore(everySecond, ist, () => "--:--:--");
  const rings = useMemo(() => contours(), []);
  const parts = useSyncExternalStore(everySecond, () => JSON.stringify(istParts()), () => "");
  const now = parts ? (JSON.parse(parts) as { h: number; m: number; day: number }) : null;
  const online = OFFICE_HOURS && now ? OFFICE_HOURS.days.includes(now.day) && now.h >= OFFICE_HOURS.from && now.h < OFFICE_HOURS.to : null;

  return (
    <section className={styles.section} aria-labelledby="map-title">
      <div className={styles.copy}>
        <p className={`${styles.kicker} t-hud`}>Where we are</p>
        <h2 id="map-title" className={styles.title}>
          Hyderabad, India.
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt className="t-hud">Coordinates</dt>
            <dd className="t-num">
              {SITE.coordinates.lat.toFixed(3)}° N, {SITE.coordinates.lon.toFixed(3)}° E
            </dd>
          </div>
          <div>
            <dt className="t-hud">Time there now</dt>
            <dd className={`${styles.time} t-num`}>{time}</dd>
          </div>
          {OFFICE_HOURS && online !== null ? (
            <div>
              <dt className="t-hud">Likely online</dt>
              <dd className={styles.online} data-on={online ? "1" : undefined}>
                <i aria-hidden /> {online ? "Yes, during office hours" : "Outside office hours"}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className={styles.map} aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
          {rings.map((pts, k) => (
            <polygon key={k} points={pts} className={styles.ring} data-k={k % 3} />
          ))}
          {/* a few straight roads, the way a sketch map marks the ring and the radials */}
          <path d={`M0 ${PIN.y + 60} L${W} ${PIN.y - 40}`} className={styles.road} />
          <path d={`M${PIN.x - 260} 0 L${PIN.x + 120} ${H}`} className={styles.road} />
          <path d={`M${PIN.x + 300} 0 L${PIN.x - 200} ${H}`} className={styles.road} />
          <ellipse cx={PIN.x} cy={PIN.y} rx={330} ry={210} className={styles.outer} />
          <g transform={`translate(${PIN.x} ${PIN.y})`}>
            <circle r={44} className={styles.pulse} />
            <circle r={6} className={styles.pin} />
            <line x1={0} y1={0} x2={120} y2={-90} className={styles.leader} />
            <text x={128} y={-94} className={styles.label}>
              Scyte, Hyderabad
            </text>
          </g>
          {[0, 1, 2, 3].map((k) => (
            <text key={k} x={20 + k * 250} y={H - 14} className={styles.tick}>
              {`${(78.3 + k * 0.1).toFixed(1)}° E`}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}
