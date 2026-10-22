"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTransitionRouter } from "@/components/transition/navigation";
import { scroller } from "@/components/providers/SmoothScroll";
import { ROUTES, SITE } from "@/config/site";
import { toast, ui, useStore } from "@/lib/store";
import { setMotion, setPerf, toggleSound } from "@/lib/prefs";
import { sfx } from "@/lib/sound";
import { pageChapters } from "./chapters";
import styles from "./CommandPalette.module.css";

type Command = { id: string; group: string; label: string; hint?: string; run: () => void };

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

/**
 * Ctrl or Cmd K. Every route, every chapter on the current page, and the switches,
 * filtered as you type. Also owns the single-key shortcuts and one easter egg.
 */
export function CommandPalette() {
  const open = useStore(ui, (s) => s.paletteOpen);
  const soundOn = useStore(ui, (s) => s.soundOn);
  const go = useTransitionRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = () => ui.set({ paletteOpen: false });

  const commands = useMemo<Command[]>(() => {
    if (!open) return [];
    const routes = ROUTES.map((r) => ({
      id: `go:${r.href}`,
      group: "Go to",
      label: r.label,
      hint: r.chapter,
      run: () => void go(r.href),
    }));
    const chapters = pageChapters().map((c) => ({
      id: `ch:${c.id}`,
      group: "On this page",
      label: c.label,
      hint: c.mark,
      run: () => {
        const el = document.getElementById(c.target);
        if (el && scroller.lenis) scroller.lenis.scrollTo(el, { offset: 2 });
        else el?.scrollIntoView({ behavior: "smooth" });
      },
    }));
    const actions: Command[] = [
      { id: "audit", group: "Do", label: "Book a store audit", hint: "20 minutes", run: () => void go("/contact?intent=audit") },
      {
        id: "copy",
        group: "Do",
        label: "Copy email address",
        hint: SITE.email,
        run: () => {
          navigator.clipboard?.writeText(SITE.email).then(
            () => toast(`Copied ${SITE.email}`, "ok"),
            () => (window.location.href = `mailto:${SITE.email}`),
          );
        },
      },
      { id: "top", group: "Do", label: "Back to the top", run: () => scroller.lenis?.scrollTo(0) ?? window.scrollTo({ top: 0 }) },
      { id: "menu", group: "Do", label: "Open the menu", hint: "M", run: () => ui.set({ menuOpen: true }) },
      { id: "sound", group: "Settings", label: soundOn ? "Turn sound off" : "Turn sound on", hint: "S", run: toggleSound },
      { id: "motion-reduced", group: "Settings", label: "Reduce motion", run: () => setMotion("reduced") },
      { id: "motion-full", group: "Settings", label: "Full motion", run: () => setMotion("full") },
      { id: "motion-auto", group: "Settings", label: "Motion follows my system", run: () => setMotion("auto") },
      { id: "perf-low", group: "Settings", label: "Performance: low", hint: "fewer effects", run: () => setPerf("low") },
      { id: "perf-auto", group: "Settings", label: "Performance: auto", run: () => setPerf("auto") },
    ];
    return [...routes, ...chapters, ...actions];
  }, [open, go, soundOn]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    const words = q.split(/\s+/);
    return commands.filter((c) => {
      const hay = `${c.group} ${c.label} ${c.hint ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [commands, query]);

  // global keys
  useEffect(() => {
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.set({ paletteOpen: !ui.get().paletteOpen });
        return;
      }
      if (typing(e) || mod || e.altKey) return;
      if (ui.get().paletteOpen) return;
      if (e.key === "/" || e.key === "?") {
        e.preventDefault();
        ui.set({ paletteOpen: true });
        return;
      }
      if (e.key.toLowerCase() === "m" && !ui.get().menuOpen) ui.set({ menuOpen: true });
      if (e.key.toLowerCase() === "s") toggleSound();
      buffer = (buffer + e.key.toLowerCase()).slice(-7);
      if (buffer === "holdout") {
        buffer = "";
        sfx.ok();
        toast("You were in the holdout all along. No message reached you, and that is how the rest get measured.");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    scroller.lenis?.stop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a fresh search each time it opens
    setQuery("");
    setIndex(0);
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      if (!ui.get().menuOpen && ui.get().transition === "idle") scroller.lenis?.start();
      returnTo.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    close();
    sfx.ok();
    window.setTimeout(c.run, 30);
  };

  let lastGroup = "";

  return (
    <div className={styles.backdrop} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Jump to" data-lenis-prevent>
        <div className={styles.field}>
          <span className={`${styles.prompt} t-hud`} aria-hidden>
            Jump to
          </span>
          <input
            ref={input}
            className={styles.input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(filtered.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") run(filtered[index]);
              if (e.key === "Tab") e.preventDefault();
            }}
            placeholder="A page, a chapter or a setting"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={filtered[index] ? `cmd-${filtered[index].id}` : undefined}
            aria-autocomplete="list"
            spellCheck={false}
          />
          <kbd className={`${styles.esc} t-hud`}>Esc</kbd>
        </div>
        <ul ref={list} id="palette-list" className={styles.list} role="listbox" aria-label="Commands">
          {filtered.length === 0 ? <li className={`${styles.empty} t-small`}>Nothing matches “{query}”. Try a page name, like studio.</li> : null}
          {filtered.map((c, i) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {head ? <p className={`${styles.group} t-hud`}>{head}</p> : null}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === index}
                  data-index={i}
                  className={styles.item}
                  onPointerMove={() => setIndex(i)}
                  onClick={() => run(c)}
                >
                  <span>{c.label}</span>
                  {c.hint ? <span className={`${styles.hint} t-hud`}>{c.hint}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className={`${styles.foot} t-hud`}>
          <span>↑ ↓ to move</span>
          <span>Enter to go</span>
          <span>M menu</span>
          <span>S sound</span>
        </p>
      </div>
    </div>
  );
}
