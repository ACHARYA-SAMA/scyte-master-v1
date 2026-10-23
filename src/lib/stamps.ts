"use client";

import { createStore, toast } from "./store";
import { sfx } from "./sound";
import { haptic } from "./prefs";

/**
 * The stamp passport: one hidden stamp per page, collected in this browser only.
 * Nothing is sent anywhere; the record is a list of ids and dates in localStorage, and
 * clearing site data clears it. Collect them all and Lumen mode unlocks.
 */
export type StampId = "plumber" | "operator" | "keyboard" | "thumb" | "fullscan" | "correspondent" | "lostfound" | "nightshift";

export type Stamp = { id: StampId; name: string; page: string; href: string; hint: string; found: string };

export const STAMPS: readonly Stamp[] = [
  { id: "plumber", name: "Plumber", page: "Home", href: "/", hint: "Somewhere, every leak can be sealed.", found: "You sealed every leak." },
  { id: "operator", name: "Operator", page: "Product", href: "/product", hint: "A lever pulled with nothing left unpatched.", found: "You ran the machine with every rule patched in." },
  { id: "keyboard", name: "Keyboard-first", page: "Studio", href: "/studio", hint: "Some paths are walked without a mouse.", found: "You walked the Tab path without a mouse." },
  { id: "thumb", name: "Quick thumb", page: "Work", href: "/work", hint: "Beat the clock in the lab.", found: "You beat the stopwatch." },
  { id: "fullscan", name: "Full scan", page: "Team", href: "/team", hint: "Scan everyone, start to finish.", found: "You scanned the whole room." },
  { id: "correspondent", name: "Correspondent", page: "Contact", href: "/contact", hint: "Every message leaves a paper trail.", found: "You printed a receipt." },
  { id: "lostfound", name: "Lost and found", page: "404", href: "/lost", hint: "Even a lost drop can be brought home.", found: "You brought the drop home." },
  { id: "nightshift", name: "Night shift", page: "Anywhere", href: "/", hint: "The palette knows a command it does not list.", found: "You found the unlisted command." },
];

const KEY = "scyte.stamps";

export const stamps = createStore({ found: {} as Partial<Record<StampId, number>>, lumen: false, last: null as StampId | null });

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(stamps.get().found));
  } catch {
    /* the passport just won't persist */
  }
};

const applyLumen = (on: boolean) => {
  if (on) document.documentElement.dataset.lumen = "1";
  else delete document.documentElement.dataset.lumen;
};

export const loadStamps = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const found = raw ? (JSON.parse(raw) as Partial<Record<StampId, number>>) : {};
    const all = STAMPS.every((s) => found[s.id]);
    const lumen = all && localStorage.getItem(`${KEY}.lumen`) !== "off";
    stamps.set({ found, lumen });
    applyLumen(lumen);
  } catch {
    /* a fresh passport */
  }
};

export const countStamps = (found = stamps.get().found) => STAMPS.filter((s) => found[s.id]).length;

/** Award a stamp. Does nothing if it is already in the passport. */
export const awardStamp = (id: StampId) => {
  const { found } = stamps.get();
  if (found[id]) return;
  const next = { ...found, [id]: Date.now() };
  stamps.set({ found: next, last: id });
  save();
  sfx.stamp();
  haptic([16, 40, 24]);
  const stamp = STAMPS.find((s) => s.id === id);
  const n = countStamps(next);
  if (n === STAMPS.length) {
    setLumen(true);
    toast("Every stamp found. Lumen mode is on; turn it off in the passport.", "ok");
  } else if (stamp) toast(`Stamp: ${stamp.name}. ${n} of ${STAMPS.length} in your passport.`, "ok");
};

export const setLumen = (on: boolean) => {
  stamps.set({ lumen: on });
  applyLumen(on);
  try {
    localStorage.setItem(`${KEY}.lumen`, on ? "on" : "off");
  } catch {
    /* fine */
  }
};

export const clearStamps = () => {
  stamps.set({ found: {}, lumen: false, last: null });
  applyLumen(false);
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(`${KEY}.lumen`);
  } catch {
    /* fine */
  }
};
