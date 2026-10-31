import { boxCorners, fitProjection, iso, type Flat, type Plan, type Point3 } from "@/components/iso/iso-kit";

/**
 * The recovery bench: world layout in units of about a pixel, x along the belt, y
 * toward the front, z up. The base's top is z = 0; everything stands on it.
 */
export const WIDTH = 760;
export const HEIGHT = 430;
export const AZIMUTH = 58;

export const BASE: Plan = { x: -168, y: -68, w: 336, d: 136, r: 10 };
export const BASE_H = 9;
export const FOOT_H = 5;

/** The belt the shoppers ride, between two rails. */
export const BELT = { x0: -146, x1: 136, y0: 12, y1: 28, rail: 2.5, railH: 5 };
export const LANE = (BELT.y0 + BELT.y1) / 2;
export const TOKEN = 8.4;
export const TOKEN_Z = 0.6;

/** 01 the tracker: a hopper on four legs over the start of the belt. */
export const HOPPER_X = -120;
export const HOPPER_Z = 30;

/** 02 consent: a gate arm across the belt, and the switch that lifts it. */
export const GATE_X = -70;

/** 03 reason codes: a chest of four drawers behind the belt. */
export const CHEST: Plan = { x: -32, y: -60, w: 58, d: 42, r: 2 };
export const CHEST_H = 52;
export const DRAWER_H = 10;
export const DRAWER_GAP = 2;
export const DRAWER_OUT = 10;
export const drawerZ = (index: number) => 3 + index * (DRAWER_H + DRAWER_GAP);

/** 04 timing: a dial with a needle that sweeps while a shopper waits. */
export const DIAL = { cx: 50, cy: -32, r: 19, z: 4, h: 9 };
export const DIAL_TOP = DIAL.z + DIAL.h;

/** 05 the playbook: a press on a gantry that stamps each shopper's message. */
export const PRESS_X = 102;
export const PRESS_TOP = 50;
export const HEAD_Z = 14;
export const STAMP = 7.4;

/** 06 the holdout: a drum that catches one shopper in ten, and the tray the rest go to. */
export const DRUM = { cx: 152, cy: -26, r: 13, h: 26 };
export const TRAY: Plan = { x: 124, y: 36, w: 34, d: 22, r: 3 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [HOPPER_X, LANE, HOPPER_Z + 18],
    [PRESS_X, LANE, PRESS_TOP + 10],
    ...boxCorners(CHEST, 0, CHEST_H + 3),
  ],
  WIDTH,
  HEIGHT,
  { pad: 6, azimuth: AZIMUTH },
);

export const at = (point: Point3): Flat => iso(point, P);
