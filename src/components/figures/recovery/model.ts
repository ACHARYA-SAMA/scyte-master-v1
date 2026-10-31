import { BELT, DRUM, GATE_X, HOPPER_X, HOPPER_Z, LANE, PRESS_X, TRAY, DIAL } from "./view";

/**
 * The recovery machine's model: one clock, from which every shopper's place and every
 * station's state is read. A shopper takes CYCLE seconds from hopper to tray; a new one
 * drops every CYCLE / IN_FLIGHT seconds. Every tenth is held out: it passes through and
 * nothing is sent, which is how the lift of the others is measured.
 */
export const CYCLE = 6;
export const IN_FLIGHT = 3;
export const HOLDOUT_EVERY = 10;

export const REASONS = [
  { code: "UPI_TIMEOUT", fix: "retry link sent" },
  { code: "BANK_DECLINE", fix: "switch-method link sent" },
  { code: "INSUFFICIENT_FUNDS", fix: "cash on delivery offered" },
  { code: "USER_CANCELLED", fix: "saved-cart reminder sent" },
] as const;

export type Shopper = { n: number; u: number; reason: number; holdout: boolean };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const span = (u: number, a: number, b: number) => smooth(clamp((u - a) / (b - a)));
/** Up quickly, held, back down: a station acting on one shopper. */
const bump = (u: number, a: number, b: number, edge = 0.025) => Math.min(span(u, a, a + edge), 1 - span(u, b - edge, b));

/** The shoppers on the machine at time t. */
export const shoppersAt = (t: number): Shopper[] => {
  const gap = CYCLE / IN_FLIGHT;
  const newest = Math.floor(t / gap);
  const out: Shopper[] = [];
  for (let n = Math.max(0, newest - IN_FLIGHT + 1); n <= newest; n++) {
    const u = (t - n * gap) / CYCLE;
    if (u >= 0 && u < 1) out.push({ n, u, reason: [0, 1, 0, 2, 3, 0, 1, 2][n % 8]!, holdout: n % HOLDOUT_EVERY === HOLDOUT_EVERY - 1 });
  }
  return out;
};

/** Where the belt carries a shopper: stops at the gate, the chest, the dial and the press. */
const BELT_KEYS: [number, number][] = [
  [0.08, HOPPER_X],
  [0.18, GATE_X - 9],
  [0.23, GATE_X - 9],
  [0.31, -3],
  [0.42, -3],
  [0.5, DIAL.cx],
  [0.6, DIAL.cx],
  [0.67, PRESS_X],
  [0.77, PRESS_X],
  [0.84, BELT.x1 - 4],
];

const beltX = (u: number) => {
  if (u <= BELT_KEYS[0]![0]) return BELT_KEYS[0]![1];
  for (let i = 1; i < BELT_KEYS.length; i++) {
    const [ua, xa] = BELT_KEYS[i - 1]!;
    const [ub, xb] = BELT_KEYS[i]!;
    if (u <= ub) return xa + (xb - xa) * smooth(clamp((u - ua) / (ub - ua)));
  }
  return BELT_KEYS[BELT_KEYS.length - 1]![1];
};

export type Pose = { x: number; y: number; z: number; alpha: number; message: boolean };

/** A shopper's place: dropped from the hopper, carried down the belt, then to the tray or the drum. */
export const poseOf = ({ u, holdout }: Shopper): Pose => {
  const message = !holdout && u > 0.715;
  if (u < 0.08) {
    const k = u / 0.08;
    return { x: HOPPER_X, y: 0, z: (HOPPER_Z - 9) * (1 - k * k), alpha: clamp(k * 4), message };
  }
  if (u < 0.84) return { x: beltX(u), y: 0, z: 0, alpha: 1, message };
  const k = smooth(clamp((u - 0.84) / 0.14));
  const fade = 1 - span(u, 0.93, 0.99);
  if (holdout) {
    // up and over into the drum
    return { x: BELT.x1 - 4 + (DRUM.cx - BELT.x1 + 4) * k, y: (DRUM.cy - LANE) * k, z: Math.sin(Math.PI * k) * 26 + k * (DRUM.h + 4), alpha: fade, message };
  }
  return { x: BELT.x1 - 4 + (TRAY.x + 12 - BELT.x1 + 4) * k, y: (TRAY.y + 8 - LANE) * k, z: Math.sin(Math.PI * k) * 7 + k * 1.2, alpha: fade, message };
};

export type Stations = { arm: number; drawers: number[]; needle: number; head: number; lamp: number };

/** What every station is doing at time t, read from the shoppers at it. */
export const stationsAt = (list: Shopper[]): Stations => {
  const s: Stations = { arm: 0, drawers: [0, 0, 0, 0], needle: 0, head: 0, lamp: 0 };
  for (const p of list) {
    s.arm = Math.max(s.arm, bump(p.u, 0.19, 0.27));
    s.drawers[p.reason] = Math.max(s.drawers[p.reason]!, bump(p.u, 0.33, 0.45, 0.03));
    if (p.u > 0.49 && p.u < 0.62) {
      s.needle = span(p.u, 0.5, 0.6) * Math.PI * 2;
      s.lamp = bump(p.u, 0.5, 0.6);
    }
    if (!p.holdout) s.head = Math.max(s.head, bump(p.u, 0.68, 0.75, 0.018));
  }
  return s;
};

/** The card's readout for a shopper that has just left the belt. */
export const readoutOf = (p: Shopper, held: number, sent: number) =>
  `#${String(p.n + 1).padStart(2, "0")} ${REASONS[p.reason]!.code} · ${p.holdout ? "held out, nothing sent" : REASONS[p.reason]!.fix} · sent ${sent} · held out ${held}`;

export const READOUT_REST = "Scroll to build it";
