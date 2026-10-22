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
  /** Target acquired: two quick rising squares. */
  lock: () => {
    blip(880, 0.05, "square");
    window.setTimeout(() => blip(1320, 0.07, "square"), 55);
  },
  /** Scan line sweep. */
  scan: () => blip(220, 0.35, "sawtooth", 660, 0.35),
  /** One decoded character. */
  tick: () => blip(2400 + Math.random() * 600, 0.012, "square", undefined, 0.35),
  /** Menu and route slices. */
  slice: () => noise(0.12, 0.25, 3200),
  /** Refusal: low buzz. */
  deny: () => {
    blip(110, 0.22, "square", 80, 0.9);
    noise(0.18, 0.2, 800);
  },
  /** Confirmation. */
  ok: () => blip(660, 0.09, "triangle", 990, 0.8),
};

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
