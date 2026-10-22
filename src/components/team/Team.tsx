"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SliceWord, STRIPS, type Face } from "@/components/brand/SliceWord";
import { StageWindow } from "@/components/stage/StageControls";
import { bridge } from "@/components/stage/bridge";
import { TEAM, displayName, hexId } from "@/data/team";
import { prefersReducedMotion } from "@/lib/motion";
import { useMedia } from "@/lib/useMedia";
import { sfx } from "@/lib/sound";
import { Thumbs } from "./Thumbs";
import { TeamHud } from "./TeamHud";
import { Dossier } from "./Dossier";
import styles from "./Team.module.css";

const LOGO: Face = { id: "logo", kind: "logo" };
const ATTRACT_AFTER_MS = 2600;
const ATTRACT_EVERY_MS = 2900;

export function Team() {
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(-1);
  const [openFrom, setOpenFrom] = useState<HTMLElement | null>(null);
  const [attract, setAttract] = useState(false);
  const [origin, setOrigin] = useState(STRIPS / 2);
  const dock = useRef<HTMLDivElement>(null);
  const userTookOver = useRef(false);

  const touch = useMedia("(hover: none), (max-width: 900px)");

  // Deep link: /team?member=slug opens that dossier.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("member");
    const i = TEAM.findIndex((m) => m.slug === slug);
    if (i >= 0) {
      userTookOver.current = true;
      // The URL is only known in the browser, after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(i);
      setOpen(i);
    }
  }, []);

  // Attract mode: until someone takes over, the scanner steps through the team.
  useEffect(() => {
    // Not on touch screens: there, a self-opening bottom sheet would read as a bug.
    if (prefersReducedMotion() || TEAM.length < 2 || window.matchMedia("(hover: none), (max-width: 900px)").matches) return;
    const start = window.setTimeout(() => {
      if (!userTookOver.current) setAttract(true);
    }, ATTRACT_AFTER_MS);
    return () => window.clearTimeout(start);
  }, []);
  useEffect(() => {
    if (!attract) return;
    // Attract mode starts by locking the first member; a timer steps it on from there.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive((a) => (a < 0 ? 0 : a));
    const id = window.setInterval(() => setActive((a) => (a + 1) % TEAM.length), ATTRACT_EVERY_MS);
    return () => window.clearInterval(id);
  }, [attract]);

  const takeOver = useCallback(() => {
    userTookOver.current = true;
    setAttract(false);
  }, []);

  const preview = useCallback(
    (i: number) => {
      takeOver();
      setActive(i);
      const thumb = dock.current?.children[i] as HTMLElement | undefined;
      if (thumb) {
        const r = thumb.getBoundingClientRect();
        setOrigin(Math.round(((r.left + r.width / 2) / window.innerWidth) * (STRIPS - 1)));
      }
    },
    [takeOver],
  );

  const leave = useCallback(() => {
    if (open >= 0) return;
    setActive(-1);
  }, [open]);

  const openDossier = (i: number) => {
    takeOver();
    setActive(i);
    setOpenFrom((dock.current?.children[i] as HTMLElement | undefined) ?? null);
    setOpen(i);
    sfx.lock();
    window.history.pushState({ dossier: TEAM[i].slug }, "", `?member=${TEAM[i].slug}`);
  };

  const closeDossier = () => {
    setOpen(-1);
    if (window.history.state?.dossier) window.history.back();
  };

  // Escape releases the lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open < 0) {
        takeOver();
        setActive(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, takeOver]);

  // The portrait the WebGL field should draw.
  const member = active >= 0 ? TEAM[active] : null;
  useEffect(() => {
    bridge.portrait = member ? { slug: member.slug, photo: member.photo, on: 1 } : { ...bridge.portrait, on: 0 };
  }, [member]);
  useEffect(
    () => () => {
      bridge.portrait = { slug: "", photo: null, on: 0 };
      bridge.scan = -1;
    },
    [],
  );

  const face: Face = useMemo(
    () => (member ? { id: member.slug, kind: "text", text: displayName(member) } : LOGO),
    [member],
  );

  return (
    <StageWindow as="section" className={styles.team} aria-labelledby="team-title">
      <h1 id="team-title" className="sr-only">
        The team
      </h1>

      <div className={styles.top}>
        <p className={styles.intro}>
          The people building Scyte and its platform.{" "}
          <span className={styles.hint}>{touch ? "Tap a portrait." : "Point at a portrait, or use the arrow keys."}</span>
        </p>
        <Thumbs ref={dock} team={TEAM} active={active} onPreview={preview} onOpen={openDossier} onLeave={leave} touch={touch} />
      </div>

      <div className={styles.word} data-member={member ? "1" : "0"}>
        <SliceWord face={face} tone={member ? "paper" : "bone"} origin={origin} label={member ? displayName(member) : "Scyte"} />
      </div>

      <p className="sr-only" aria-live="polite">
        {member
          ? `${displayName(member)}. ${member.role}. ${member.name ? "" : "Name not yet listed."} Press Enter for the full dossier.`
          : ""}
      </p>

      <TeamHud member={member} index={Math.max(0, active)} total={TEAM.length} scanning={attract} />

      {touch && member && open < 0 ? (
        <div className={styles.sheet} role="region" aria-label={`${displayName(member)} summary`}>
          <div className={styles.sheetGrip} aria-hidden />
          <p className={styles.sheetId}>
            <span className="t-num">{hexId(member.slug)}</span>
            <span>{member.codename ?? "[ FILL ]"}</span>
          </p>
          <p className={styles.sheetName}>{member.name ?? "[ FILL: name ]"}</p>
          <p className={styles.sheetRole}>{member.role}</p>
          <ul className={styles.sheetChips}>
            {member.tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button type="button" className={styles.sheetOpen} onClick={() => openDossier(active)}>
            Open the dossier
          </button>
        </div>
      ) : null}

      {open >= 0 ? (
        <Dossier
          key={TEAM[open].slug}
          member={TEAM[open]}
          fromEl={openFrom}
          onClose={closeDossier}
        />
      ) : null}
    </StageWindow>
  );
}
