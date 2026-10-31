import {
  corners,
  cylinder,
  haloOf,
  insetPlan,
  knurl,
  lineOnTop,
  planOutline,
  radialTicks,
  ring,
  segment,
  sideArc,
  sideSeam,
  slabOf,
  topMatrix,
  topTicks,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
  type Tone,
} from "@/components/iso/iso-kit";
import {
  BASE,
  BASE_H,
  BELT,
  CHEST,
  CHEST_H,
  DIAL,
  DIAL_TOP,
  DRAWER_H,
  DRUM,
  FOOT_H,
  GATE_X,
  HEAD_Z,
  HOPPER_X,
  HOPPER_Z,
  LANE,
  P,
  PRESS_TOP,
  PRESS_X,
  TOKEN,
  TOKEN_Z,
  TRAY,
  at,
  drawerZ,
} from "./view";

/** One thing to draw. The art renders a list of these in painter's order. */
export type Op =
  | { k: "halo"; d: string }
  | { k: "solid"; p: SolidPaths; tone?: Tone; crease?: Tone | "none"; lit?: boolean; flat?: boolean; inner?: string }
  | { k: "line"; d: string; tone?: LineTone; dotted?: boolean; dashed?: boolean; flow?: boolean; free?: boolean }
  | { k: "dots"; pts: Flat[]; size?: number; tone?: Tone }
  | { k: "wire"; from: Flat; to: Flat; via?: Flat[]; tone?: LineTone }
  | { k: "text"; t: string; text: string; size: number; tone?: Tone };

const slab = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const box = (x: number, y: number, w: number, d: number, z: number, h: number, r = 1, bevel = 0) => slab({ x, y, w, d, r }, z, h, 3, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const seg = (a: Point3, b: Point3) => segment(a, b, P);
/** Screen points rounded as the kit rounds paths, so server and browser agree to the digit. */
const tenth = ([x, y]: Flat): Flat => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
const dotsAt = (points: Point3[]) => points.map((p) => tenth(at(p)));

/** Screws: a dot in a ring, at the four corners of a plate's top. */
const screws = (plan: Plan, z: number, inset: number): Op[] => {
  const spots = corners(plan, inset);
  return [
    { k: "line", d: spots.map(([x, y]) => ring(x, y, 0.95, z, P, 12)).join(""), tone: "lo" },
    { k: "dots", pts: spots.map(([x, y]) => at([x, y, z])), size: 0.5, tone: "mid" },
  ];
};

/** A plate on its own four feet, with a groove, corner screws, a ruler and a label plate. */
const BASE_OPS: Op[] = (() => {
  const feet = corners(BASE, 16).flatMap(([x, y]): Op[] => [
    { k: "solid", p: cyl(x, y, 7, -BASE_H - FOOT_H, FOOT_H, 24), tone: "lo", crease: "faint" },
    { k: "line", d: sideArc(x, y, 7, -BASE_H - FOOT_H + 1.6, P, 16), tone: "faint" },
  ]);
  const ruler = topTicks(BASE.x + 22, BASE.x + BASE.w - 22, 5, 5, BASE.y + BASE.d - 7, 0, [1.6, 3.2], P, "x");
  const plate: Plan = { x: BASE.x + 12, y: BASE.y + BASE.d - 32, w: 46, d: 18, r: 2 };
  return [
    { k: "halo", d: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P) },
    ...feet,
    { k: "solid", p: slab(BASE, -BASE_H, BASE_H, 8, 1.2), tone: "mid", crease: "faint", inner: sideSeam(BASE, -BASE_H + 2.4, P, 8) },
    { k: "line", d: planOutline(insetPlan(BASE, 5), 0, P, 8), tone: "faint" },
    ...screws(BASE, 0, 9),
    { k: "line", d: lineOnTop([BASE.x + 22, BASE.y + BASE.d - 7], [BASE.x + BASE.w - 22, BASE.y + BASE.d - 7], 0, P), tone: "lo" },
    { k: "line", d: ruler.minor, tone: "lo" },
    { k: "line", d: ruler.major, tone: "mid" },
    { k: "solid", p: slab(plate, 0, 0.6, 3), tone: "lo", crease: "none" },
    { k: "text", t: topMatrix([plate.x + 4, plate.y + 7.5], 0.6, P), text: "SCYTE RX-1", size: 4, tone: "mid" },
    { k: "line", d: [11.5, 14].map((y) => lineOnTop([plate.x + 4, plate.y + y], [plate.x + plate.w - 4, plate.y + y], 0.6, P)).join(""), tone: "faint", free: true },
    ...screws(plate, 0.6, 2.2),
  ];
})();

/** Where each part will stand, marked on the bare plate before it arrives. */
const MARKS: Record<string, string> = {
  hopper: planOutline({ x: HOPPER_X - 16, y: 4, w: 32, d: 32, r: 2 }, 0.05, P, 3),
  gate: planOutline({ x: GATE_X - 16, y: 4, w: 32, d: 50, r: 2 }, 0.05, P, 3),
  chest: planOutline(insetPlan(CHEST, -3), 0.05, P, 3),
  dial: ring(DIAL.cx, DIAL.cy, DIAL.r + 5, 0.05, P, 48),
  press: planOutline({ x: PRESS_X - 9, y: 0, w: 18, d: 40, r: 2 }, 0.05, P, 3),
  holdout: ring(DRUM.cx, DRUM.cy, DRUM.r + 4, 0.05, P, 40) + planOutline(insetPlan(TRAY, -3), 0.05, P, 3),
};

/** The belt: a back rail and a floor drawn before the shoppers, the front rail after. */
const BELT_BACK: Op[] = [
  { k: "solid", p: box(BELT.x0 - 6, BELT.y0 - 3, 6, BELT.y1 - BELT.y0 + 6, 0, 8, 1, 0.5), tone: "mid", crease: "faint" },
  { k: "solid", p: box(BELT.x0, BELT.y0, BELT.x1 - BELT.x0, BELT.rail, 0, BELT.railH, 0.6, 0.4), tone: "mid", crease: "faint" },
  { k: "solid", p: box(BELT.x0, BELT.y0 + BELT.rail, BELT.x1 - BELT.x0, BELT.y1 - BELT.y0 - BELT.rail * 2, 0, TOKEN_Z, 0.4), tone: "lo", crease: "none", flat: true },
  { k: "line", d: lineOnTop([BELT.x0 + 2, LANE], [BELT.x1 - 2, LANE], TOKEN_Z, P), tone: "lo", dotted: true, flow: true },
  { k: "dots", pts: dotsAt(Array.from({ length: 14 }, (_, i): Point3 => [BELT.x0 + 10 + i * 20, BELT.y0 + BELT.rail / 2, BELT.railH])), size: 0.42, tone: "mid" },
];
const BELT_FRONT: Op[] = [
  { k: "solid", p: box(BELT.x0, BELT.y1 - BELT.rail, BELT.x1 - BELT.x0, BELT.rail, 0, BELT.railH, 0.6, 0.4), tone: "mid", crease: "faint" },
  { k: "dots", pts: dotsAt(Array.from({ length: 14 }, (_, i): Point3 => [BELT.x0 + 10 + i * 20, BELT.y1 - BELT.rail / 2, BELT.railH])), size: 0.42, tone: "mid" },
  { k: "solid", p: box(BELT.x1, BELT.y0 - 3, 6, BELT.y1 - BELT.y0 + 6, 0, 8, 1, 0.5), tone: "mid", crease: "faint" },
];

/** A square post with a foot plate and two screws. */
const post = (x: number, y: number, size: number, z0: number, z1: number, tone: Tone = "mid"): Op[] => [
  { k: "solid", p: box(x - size, y - size, size * 2, size * 2, 0, 1.4, 0.8), tone: "lo", crease: "none" },
  { k: "dots", pts: dotsAt([[x - size + 1.2, y + size - 1.2, 1.4], [x + size - 1.2, y - size + 1.2, 1.4]]), size: 0.4, tone: "mid" },
  { k: "solid", p: box(x - size / 2, y - size / 2, size, size, z0, z1 - z0, 0.5, 0.3), tone, crease: "faint" },
];

/** 01 the tracker: back legs first, then the hopper body, throat, sensor and front legs. */
const HOP = { x0: HOPPER_X - 13, x1: HOPPER_X + 13, yb: 6, yf: 34 };
const HOPPER_BACK: Op[] = [...post(HOP.x0, HOP.yb, 4, 1.4, HOPPER_Z), ...post(HOP.x1, HOP.yb, 4, 1.4, HOPPER_Z), { k: "solid", p: box(HOP.x0, HOP.yb - 1, HOP.x1 - HOP.x0, 2, 15, 2, 0.4), tone: "lo", crease: "none" }];
const HOPPER_FRONT: Op[] = [
  { k: "solid", p: box(HOPPER_X - 6, LANE - 6, 12, 12, 21, HOPPER_Z - 21, 1, 0.4), tone: "mid", crease: "faint" },
  { k: "solid", p: box(HOPPER_X - 16, LANE - 16, 32, 32, HOPPER_Z, 14, 2, 1), tone: "hi", crease: "faint", inner: sideSeam({ x: HOPPER_X - 16, y: LANE - 16, w: 32, d: 32, r: 2 }, HOPPER_Z + 4, P, 3) },
  { k: "line", d: planOutline({ x: HOPPER_X - 12, y: LANE - 12, w: 24, d: 24, r: 1 }, HOPPER_Z + 14, P, 3), tone: "mid" },
  { k: "solid", p: box(HOPPER_X - 9, LANE - 9, 18, 18, HOPPER_Z + 13.6, 0.4, 0.5), tone: "lo", crease: "none", flat: true },
  ...screws({ x: HOPPER_X - 16, y: LANE - 16, w: 32, d: 32, r: 2 }, HOPPER_Z + 14, 2),
  { k: "solid", p: cyl(HOPPER_X + 9, LANE + 18.5, 2.4, HOPPER_Z + 4, 3.5, 16), tone: "mid", crease: "faint" },
  { k: "dots", pts: [at([HOPPER_X + 9, LANE + 18.5, HOPPER_Z + 7.5])], size: 0.9, tone: "hi" },
  { k: "wire", from: at([HOPPER_X + 9, LANE + 18.5, HOPPER_Z + 4]), to: at([HOPPER_X + 9, LANE + 26, 0]), tone: "lo" },
  ...post(HOP.x0, HOP.yf, 4, 1.4, HOPPER_Z),
  ...post(HOP.x1, HOP.yf, 4, 1.4, HOPPER_Z),
  { k: "solid", p: box(HOP.x0, HOP.yf - 1, HOP.x1 - HOP.x0, 2, 15, 2, 0.4), tone: "lo", crease: "none" },
];

/** 02 consent: a pillar each side of the belt, an arm across it, a switch in front. */
const GATE_BACK: Op[] = [...post(GATE_X, 7, 3.5, 1.4, 19), { k: "solid", p: box(GATE_X - 3.5, 3.5, 7, 7, 19, 2, 1, 0.4), tone: "mid", crease: "faint" }];
const GATE_FRONT: Op[] = [...post(GATE_X, 33, 3.5, 1.4, 19), { k: "solid", p: box(GATE_X - 3.5, 29.5, 7, 7, 19, 2, 1, 0.4), tone: "mid", crease: "faint" }];
const GATE_ARM: Op[] = [
  { k: "solid", p: box(GATE_X - 1.6, 8, 3.2, 24, 11, 3, 0.8, 0.3), tone: "hi", crease: "faint" },
  { k: "line", d: [12, 16, 20, 24, 28].map((y) => seg([GATE_X + 1.6, y, 11.2], [GATE_X + 1.6, y, 13.8])).join(""), tone: "lo" },
];
const SWITCH: Plan = { x: GATE_X - 18, y: 44, w: 36, d: 12, r: 2 };
const GATE_SWITCH: Op[] = [
  { k: "solid", p: slab(SWITCH, 0, 6, 3, 0.8), tone: "mid", crease: "faint", inner: sideSeam(SWITCH, 2, P, 3) },
  { k: "solid", p: box(GATE_X - 12, 49, 24, 2, 5.6, 0.4, 0.8), tone: "lo", crease: "none", flat: true },
  { k: "line", d: [GATE_X - 13.5, GATE_X + 13.5].map((x) => lineOnTop([x, 46.5], [x, 53.5], 6, P)).join(""), tone: "mid" },
  ...screws(SWITCH, 6, 2),
  { k: "wire", from: at([GATE_X + 18, 50, 3]), to: at([GATE_X + 3.5, 36.5, 1.4]), tone: "lo" },
];
const KNOB: Op[] = [
  { k: "solid", p: cyl(GATE_X - 8, 50, 3, 6, 5, 20, 0.4), tone: "hi", crease: "faint" },
  { k: "line", d: knurl(GATE_X - 8, 50, 3, 6, 11, 22, P), tone: "lo" },
];

/** 03 reason codes: the chest, then each drawer as its own group so it can slide. */
const CHEST_OPS: Op[] = [
  { k: "halo", d: haloOf(CHEST, 0, CHEST_H, P) },
  { k: "solid", p: slab(CHEST, 0, CHEST_H, 3), tone: "mid", crease: "faint" },
  { k: "solid", p: slab(insetPlan(CHEST, -2), CHEST_H, 3, 3, 1), tone: "hi", crease: "faint" },
  ...screws(insetPlan(CHEST, -2), CHEST_H + 3, 2.5),
  { k: "dots", pts: dotsAt([6, 18, 30, 42].flatMap((z): Point3[] => [[CHEST.x + CHEST.w, CHEST.y + 6, z], [CHEST.x + CHEST.w, CHEST.y + CHEST.d - 6, z]])), size: 0.45, tone: "mid" },
  { k: "line", d: seg([CHEST.x + CHEST.w, CHEST.y + 12, 26], [CHEST.x + CHEST.w, CHEST.y + CHEST.d - 12, 26]), tone: "faint" },
];
const FRONT_Y = CHEST.y + CHEST.d;
export const DRAWERS: Op[][] = [0, 1, 2, 3].map((index) => {
  const z = drawerZ(index);
  const face: Plan = { x: CHEST.x + 3, y: FRONT_Y - 2, w: CHEST.w - 6, d: 3, r: 0.8 };
  return [
    { k: "solid", p: slab(face, z, DRAWER_H, 3, 0.4), tone: "mid", crease: "faint" },
    { k: "solid", p: box(CHEST.x + CHEST.w / 2 - 7, FRONT_Y + 1, 14, 2.4, z + 4, 2.4, 1, 0.3), tone: "hi", crease: "faint" },
    { k: "solid", p: box(CHEST.x + 8, FRONT_Y + 0.8, 11, 0.6, z + 2.5, 5, 0.2), tone: "lo", crease: "none" },
    { k: "line", d: seg([CHEST.x + 9.5, FRONT_Y + 1.4, z + 5], [CHEST.x + 17.5, FRONT_Y + 1.4, z + 5]), tone: "faint", free: true },
  ];
});

/** 04 timing: a drum, a ruled dial, a crown to set it and a quiet-hours lamp. */
const DIAL_OPS: Op[] = (() => {
  const ticks = radialTicks(DIAL.cx, DIAL.cy, DIAL.r - 2.5, 60, 5, DIAL_TOP, [1.4, 3], P);
  return [
    { k: "halo", d: haloOf({ x: DIAL.cx - DIAL.r - 3, y: DIAL.cy - DIAL.r - 3, w: DIAL.r * 2 + 6, d: DIAL.r * 2 + 6, r: DIAL.r + 3 }, 0, DIAL_TOP, P) },
    { k: "solid", p: cyl(DIAL.cx, DIAL.cy, DIAL.r + 3, 0, DIAL.z, 56, 0.6), tone: "lo", crease: "faint" },
    { k: "solid", p: cyl(DIAL.cx, DIAL.cy, DIAL.r, DIAL.z, DIAL.h, 56, 0.8), tone: "mid", crease: "faint", inner: sideArc(DIAL.cx, DIAL.cy, DIAL.r, DIAL.z + 3, P, 32) },
    { k: "line", d: ring(DIAL.cx, DIAL.cy, DIAL.r - 1.2, DIAL_TOP, P, 64), tone: "mid" },
    { k: "line", d: ticks.minor, tone: "lo" },
    { k: "line", d: ticks.major, tone: "mid" },
    { k: "solid", p: cyl(DIAL.cx + DIAL.r + 6, DIAL.cy + 4, 3.2, 0, 12, 20, 0.4), tone: "mid", crease: "faint" },
    { k: "line", d: knurl(DIAL.cx + DIAL.r + 6, DIAL.cy + 4, 3.2, 7, 12, 20, P), tone: "lo" },
    { k: "solid", p: cyl(DIAL.cx - 10, DIAL.cy + 9, 2, DIAL_TOP, 1.6, 16), tone: "lo", crease: "faint" },
  ];
})();
export const DIAL_CAP: Op[] = [{ k: "solid", p: cyl(DIAL.cx, DIAL.cy, 2.2, DIAL_TOP, 1.8, 16, 0.3), tone: "hi", crease: "faint" }];
export const LAMP = tenth(at([DIAL.cx - 10, DIAL.cy + 9, DIAL_TOP + 1.6]));

/** 05 the playbook: gantry posts, the crossbar, the moving head on its rod. */
const PRESS_BACK: Op[] = post(PRESS_X, 4, 3.5, 1.4, PRESS_TOP);
const PRESS_FRONT: Op[] = [
  ...post(PRESS_X, 36, 3.5, 1.4, PRESS_TOP),
  { k: "solid", p: box(PRESS_X - 5, 0, 10, 40, PRESS_TOP, 7, 1, 0.8), tone: "hi", crease: "faint", inner: sideSeam({ x: PRESS_X - 5, y: 0, w: 10, d: 40, r: 1 }, PRESS_TOP + 2.4, P, 3) },
  ...screws({ x: PRESS_X - 5, y: 0, w: 10, d: 40, r: 1 }, PRESS_TOP + 7, 2),
  { k: "solid", p: cyl(PRESS_X, LANE, 3.4, PRESS_TOP + 7, 2.2, 20, 0.3), tone: "mid", crease: "faint" },
];
export const HEAD: Op[] = [
  { k: "solid", p: cyl(PRESS_X, LANE, 1.6, HEAD_Z + 8, PRESS_TOP + 12 - HEAD_Z - 8, 16), tone: "mid", crease: "faint" },
  { k: "solid", p: box(PRESS_X - 7.5, LANE - 7.5, 15, 15, HEAD_Z + 1.4, 7, 1.5, 0.8), tone: "hi", crease: "faint", inner: sideSeam({ x: PRESS_X - 7.5, y: LANE - 7.5, w: 15, d: 15, r: 1.5 }, HEAD_Z + 4.4, P, 3) },
  { k: "solid", p: box(PRESS_X - 5.5, LANE - 5.5, 11, 11, HEAD_Z, 1.4, 0.6), tone: "lo", crease: "none" },
  ...screws({ x: PRESS_X - 7.5, y: LANE - 7.5, w: 15, d: 15, r: 1.5 }, HEAD_Z + 8.4, 2),
];

/** 06 the holdout: a drum with a window behind, and the tray for messages in front. */
const DRUM_OPS: Op[] = [
  { k: "halo", d: haloOf({ x: DRUM.cx - DRUM.r, y: DRUM.cy - DRUM.r, w: DRUM.r * 2, d: DRUM.r * 2, r: DRUM.r }, 0, DRUM.h, P) },
  { k: "solid", p: cyl(DRUM.cx, DRUM.cy, DRUM.r + 2, 0, 2, 40), tone: "lo", crease: "faint" },
  {
    k: "solid",
    p: cyl(DRUM.cx, DRUM.cy, DRUM.r, 2, DRUM.h, 48),
    tone: "mid",
    crease: "faint",
    inner: sideArc(DRUM.cx, DRUM.cy, DRUM.r, 8, P, 32) + sideArc(DRUM.cx, DRUM.cy, DRUM.r, DRUM.h - 4, P, 32),
  },
  { k: "solid", p: cyl(DRUM.cx, DRUM.cy, DRUM.r + 1.2, DRUM.h + 2, 3.2, 48, 0.6), tone: "hi", crease: "faint" },
  { k: "solid", p: cyl(DRUM.cx, DRUM.cy, 3.6, DRUM.h + 5.2, 2.4, 20, 0.4), tone: "mid", crease: "faint" },
  { k: "line", d: knurl(DRUM.cx, DRUM.cy, 3.6, DRUM.h + 5.2, DRUM.h + 7.6, 18, P), tone: "lo" },
];
/** Where the held-out shoppers show, in a column up the drum's window. */
export const DRUM_SLOTS: Flat[] = Array.from({ length: 6 }, (_, i) => {
  const a = (58 * Math.PI) / 180;
  return tenth(at([DRUM.cx + Math.cos(a) * (DRUM.r + 0.3), DRUM.cy + Math.sin(a) * (DRUM.r + 0.3), 10 + i * 2.6]));
});
const TRAY_OPS: Op[] = [
  { k: "halo", d: haloOf(TRAY, 0, 6, P) },
  { k: "solid", p: slab(TRAY, 0, 1.6, 3, 0.4), tone: "lo", crease: "faint" },
  { k: "solid", p: box(TRAY.x, TRAY.y, TRAY.w, 2, 1.6, 6, 0.6, 0.3), tone: "mid", crease: "faint" },
  { k: "solid", p: box(TRAY.x, TRAY.y, 2, TRAY.d, 1.6, 6, 0.6, 0.3), tone: "mid", crease: "faint" },
  { k: "solid", p: box(TRAY.x + TRAY.w - 2, TRAY.y, 2, TRAY.d, 1.6, 6, 0.6, 0.3), tone: "mid", crease: "faint" },
  { k: "solid", p: box(TRAY.x, TRAY.y + TRAY.d - 2, TRAY.w, 2, 1.6, 2.6, 0.6, 0.3), tone: "mid", crease: "faint" },
];
/** Messages stacked in the tray: up to three cards. */
export const CARDS: Op[][] = [0, 1, 2].map((i) => [{ k: "solid", p: box(TRAY.x + 5 + i * 1.2, TRAY.y + 5 - i * 0.6, 22, 12, 1.6 + i * 1.3, 1.1, 0.8), tone: "hi", crease: "faint", lit: true }]);

/** A shopper: one small block of light, built at the start of the belt and moved from there. */
export const TOKEN_OPS: Op[] = [{ k: "solid", p: box(-TOKEN / 2, LANE - TOKEN / 2, TOKEN, TOKEN, TOKEN_Z, TOKEN, 1, 0.4), tone: "hi", crease: "faint", lit: true }];

/** Every static layer, back to front, tagged with the part it belongs to. */
export type Layer = { key: string; part: string; ops: Op[] };
export const BACK_LAYERS: Layer[] = [
  { key: "base", part: "base", ops: BASE_OPS },
  ...Object.entries(MARKS).map(([part, d]): Layer => ({ key: `mark-${part}`, part: `mark-${part}`, ops: [{ k: "line", d, tone: "hi", dashed: true }] })),
  { key: "drum", part: "holdout", ops: DRUM_OPS },
  { key: "chest", part: "chest", ops: CHEST_OPS },
  { key: "dial", part: "dial", ops: DIAL_OPS },
  { key: "hopper-back", part: "hopper", ops: HOPPER_BACK },
  { key: "gate-back", part: "gate", ops: GATE_BACK },
  { key: "press-back", part: "press", ops: PRESS_BACK },
  { key: "belt-back", part: "base", ops: BELT_BACK },
];
export const FRONT_LAYERS: Layer[] = [
  { key: "belt-front", part: "base", ops: BELT_FRONT },
  { key: "hopper-front", part: "hopper", ops: HOPPER_FRONT },
  { key: "gate-front", part: "gate", ops: GATE_FRONT },
  { key: "press-front", part: "press", ops: PRESS_FRONT },
  { key: "switch", part: "gate", ops: GATE_SWITCH },
  { key: "tray", part: "holdout", ops: TRAY_OPS },
];
export const GATE_ARM_OPS = GATE_ARM;
export const KNOB_OPS = KNOB;
export const DIAL_CENTER: Plane = [DIAL.cx, DIAL.cy];
