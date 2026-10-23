"use client";

import { ui } from "./store";

/**
 * Synthesised interface sounds via the Web Audio API. Off by default; the toggle in
 * the navigation persists the choice. Nothing is downloaded: every sound is a few
 * oscillators and a noise burst.
 */

const KEY = "scyte.sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const audio = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

const blip = (freq: number, dur: number, type: OscillatorType = "square", glideTo?: number, gain = 1) => {
  const a = audio();
  if (!a || !master || !ui.get().soundOn) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};

const noise = (dur: number, gain = 0.3, hp = 2400) => {
  const a = audio();
  if (!a || !master || !ui.get().soundOn) return;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(master);
  src.start();
};

export const sfx = {
  /** A reticle locks: two short rising tones. */
  lock: () => {
    blip(880, 0.05, "triangle");
    window.setTimeout(() => blip(1320, 0.07, "triangle"), 55);
  },
  /** A scan sweep. */
  scan: () => blip(220, 0.35, "sine", 660, 0.35),
  /** One decoded character. */
  tick: () => blip(2400 + Math.random() * 600, 0.012, "square", undefined, 0.22),
  /** Menu columns and route wipes. */
  slice: () => noise(0.12, 0.2, 3200),
  /** A drop falls through a crack. */
  drip: () => blip(1400 + Math.random() * 300, 0.09, "sine", 420, 0.6),
  /** Liquid moving: a soft filtered rush. */
  pour: () => noise(0.5, 0.14, 600),
  /** A clamp closes on a leak. */
  clamp: () => {
    blip(160, 0.08, "square", 120, 0.7);
    noise(0.06, 0.25, 1800);
  },
  /** A message lands on a phone. */
  ping: () => {
    blip(1046, 0.06, "sine", undefined, 0.6);
    window.setTimeout(() => blip(1568, 0.09, "sine", undefined, 0.5), 70);
  },
  /** Refusal: a low buzz. */
  deny: () => {
    blip(110, 0.22, "square", 80, 0.7);
    noise(0.18, 0.16, 800);
  },
  /** Confirmation. */
  ok: () => blip(660, 0.09, "triangle", 990, 0.8),
  /** A ratchet detent on a knob: a dry click with a little body under it. */
  detent: () => {
    noise(0.018, 0.32, 4200);
    blip(520 + Math.random() * 40, 0.02, "square", 300, 0.25);
  },
  /** A relay or a lever landing: a low clunk and a metal tick. */
  relay: () => {
    blip(92, 0.11, "square", 60, 0.8);
    noise(0.05, 0.35, 1400);
    window.setTimeout(() => blip(2200, 0.015, "square", undefined, 0.3), 24);
  },
  /** One split-flap leaf falling. Called per flap, so it stays very short. */
  flap: () => noise(0.014 + Math.random() * 0.01, 0.22, 2600 + Math.random() * 1400),
  /** A receipt printer head: a burst of tiny dot strikes for one printed line. */
  printLine: () => {
    for (let i = 0; i < 6; i++) window.setTimeout(() => noise(0.008, 0.18, 5200), i * 14);
    blip(180, 0.07, "sawtooth", 170, 0.08);
  },
  /** Paper tearing along the serrated edge. */
  tear: () => noise(0.22, 0.3, 2000),
  /** A rubber stamp landing on paper. */
  stamp: () => {
    blip(70, 0.14, "sine", 46, 1);
    noise(0.07, 0.4, 600);
  },
  /** Glass touching glass. */
  clink: () => {
    blip(2637, 0.22, "sine", 2600, 0.35);
    blip(3951, 0.16, "sine", undefined, 0.18);
  },
  /** A short scan blip, for a beam passing a target. */
  blip: () => blip(1760, 0.035, "sine", 2093, 0.45),
  /** A cable plug seating in a jack. */
  plug: () => {
    blip(300, 0.05, "square", 180, 0.5);
    noise(0.03, 0.3, 3000);
  },
  /** A soft key on a keyboard. */
  key: () => noise(0.012, 0.16, 3600),
};

/**
 * A room tone per page: a very quiet filtered noise bed with one low partial, so
 * pages sound like different rooms. It starts only when sound is on, fades between
 * pages, and stops when sound is turned off or the tab is hidden.
 */
export type Room = "leak" | "machine" | "assembly" | "archive" | "scan" | "conversation" | "lost";

const ROOMS: Record<Room, { cutoff: number; hum: number; level: number }> = {
  leak: { cutoff: 520, hum: 55, level: 0.05 },
  machine: { cutoff: 900, hum: 73.4, level: 0.055 },
  assembly: { cutoff: 1400, hum: 98, level: 0.035 },
  archive: { cutoff: 700, hum: 61.7, level: 0.05 },
  scan: { cutoff: 2600, hum: 110, level: 0.025 },
  conversation: { cutoff: 480, hum: 49, level: 0.04 },
  lost: { cutoff: 360, hum: 41.2, level: 0.05 },
};

let roomNodes: { gain: GainNode; filter: BiquadFilterNode; hum: OscillatorNode; src: AudioBufferSourceNode } | null = null;
let currentRoom: Room | null = null;

const ensureRoom = () => {
  const a = audio();
  if (!a || !master) return null;
  if (roomNodes) return roomNodes;
  const len = a.sampleRate * 4;
  const buffer = a.createBuffer(1, len, a.sampleRate);
  const data = buffer.getChannelData(0);
  // brown noise: integrated white noise, soft and low
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const src = a.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  const hum = a.createOscillator();
  hum.type = "sine";
  const humGain = a.createGain();
  humGain.gain.value = 0.18;
  const gain = a.createGain();
  gain.gain.value = 0.0001;
  src.connect(filter).connect(gain);
  hum.connect(humGain).connect(gain);
  gain.connect(master);
  src.start();
  hum.start();
  roomNodes = { gain, filter, hum, src };
  return roomNodes;
};

const applyRoom = () => {
  const room = currentRoom;
  if (!ui.get().soundOn || !room || document.hidden) {
    if (roomNodes && ctx) roomNodes.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
    return;
  }
  const nodes = ensureRoom();
  if (!nodes || !ctx) return;
  const r = ROOMS[room];
  const t = ctx.currentTime;
  nodes.filter.frequency.setTargetAtTime(r.cutoff, t, 0.8);
  nodes.hum.frequency.setTargetAtTime(r.hum, t, 0.8);
  nodes.gain.gain.setTargetAtTime(r.level, t, 0.9);
};

/** Move to a room's tone, or to silence with null. */
export const setRoom = (room: Room | null) => {
  currentRoom = room;
  applyRoom();
};

if (typeof window !== "undefined") {
  let wasOn = ui.get().soundOn;
  ui.subscribe(() => {
    const on = ui.get().soundOn;
    if (on === wasOn) return;
    wasOn = on;
    applyRoom();
  });
  document.addEventListener("visibilitychange", applyRoom);
}

export const loadSoundPreference = () => {
  try {
    ui.set({ soundOn: localStorage.getItem(KEY) === "on" });
  } catch {
    /* default stays off */
  }
};

export const setSound = (on: boolean) => {
  ui.set({ soundOn: on });
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* preference simply won't persist */
  }
  if (on) {
    audio();
    sfx.ok();
  }
};
