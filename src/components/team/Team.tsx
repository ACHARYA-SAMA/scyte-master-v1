"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SliceWord, STRIPS, type Face } from "@/components/brand/SliceWord";
import { SceneSection } from "@/components/gl/SceneSection";
import { scan } from "@/components/gl/scenes/team/scan";
import { TEAM, assetsFor, displayName, hexId } from "@/data/team";
import { productName } from "@/config/site";
import { prefersReducedMotion } from "@/lib/motion";
import { useMedia } from "@/lib/useMedia";
import { FACE } from "@/lib/silhouette";
import { Dock, type DockHandle } from "./Dock";
import { TeamHud } from "./TeamHud";
import { Dossier } from "./Dossier";
import styles from "./Team.module.css";

const LOGO: Face = { id: "logo", kind: "logo" };
const ATTRACT_AFTER_MS = 2400;
const ATTRACT_EVERY_MS = 3600;

/**
 * The Scan. Portraits in a dock; the exact wordmark beneath; pointing at a person
 * locks the reticle, slices the wordmark into their name and resolves their portrait
 * as a hologram, with the HUD drawing out around it.
 */
export function Team() {
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(-1);
  const [openFrom, setOpenFrom] = useState<HTMLElement | null>(null);
  const [attract, setAttract] = useState(false);
  const [origin, setOrigin] = useState(STRIPS / 2);
  const dock = useRef<DockHandle>(null);
  const userTookOver = useRef(false);
  const touch = useMedia("(hover: none), (max-width: 900px)");

  // deep link: /team?member=slug opens that dossier
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("member");
    const i = TEAM.findIndex((m) => m.slug === slug);
    if (i >= 0) {
      userTookOver.current = true;
      // the URL is only known in the browser, after hydration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(i);
      setOpen(i);
    }
  }, []);

  // attract mode: until someone takes over, the scanner steps slowly through the team
  useEffect(() => {
    if (prefersReducedMotion() || TEAM.length < 2 || window.matchMedia("(hover: none), (max-width: 900px)").matches) return;
    const start = window.setTimeout(() => {
      if (!userTookOver.current) setAttract(true);
    }, ATTRACT_AFTER_MS);
    return () => window.clearTimeout(start);
  }, []);
  useEffect(() => {
    if (!attract) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- attract mode begins by locking the first member
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
      const thumb = dock.current?.thumb(i);
      if (thumb) {
        const r = thumb.getBoundingClientRect();
        setOrigin(Math.round(((r.left + r.width / 2) / window.innerWidth) * (STRIPS - 1)));
      }
    },
    [takeOver],
  );

  const leave = useCallback(() => {
    if (open >= 0 || attract) return;
    setActive(-1);
  }, [open, attract]);

  const openDossier = (i: number) => {
    takeOver();
    setActive(i);
    setOpenFrom(dock.current?.thumb(i) ?? null);
    setOpen(i);
    window.history.pushState({ dossier: TEAM[i].slug }, "", `?member=${TEAM[i].slug}`);
  };

  const closeDossier = useCallback(() => {
    setOpen(-1);
    if (window.history.state?.dossier) window.history.back();
  }, []);

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

  // tell the hologram who to draw
  const member = active >= 0 ? TEAM[active] : null;
  useEffect(() => {
    const a = member ? assetsFor(member.slug) : null;
    scan.set({
      slug: member?.slug ?? null,
      photo: a?.photo ?? null,
      depth: a?.depth ?? null,
      face: a ? a.face : [FACE.x, FACE.y],
      lockedAt: performance.now(),
    });
  }, [member]);
  useEffect(() => () => scan.set({ slug: null }), []);

  const face: Face = useMemo(() => (member ? { id: member.slug, kind: "text", text: displayName(member) } : LOGO), [member]);

  return (
    <SceneSection scene="team" className={styles.team} aria-labelledby="team-title">
      <div className={styles.stage} data-motion-own>
        <header className={styles.top}>
          <h1 id="team-title" className={styles.title}>
            The team
          </h1>
          <p className={styles.intro}>
            The people building Scyte and {productName("its WhatsApp recovery platform")}.{" "}
            <span className={styles.hint}>{touch ? "Tap a portrait." : "Point at a portrait or use the arrow keys. Enter opens the dossier."}</span>
          </p>
          <Dock ref={dock} team={TEAM} active={active} touch={touch} onPreview={preview} onOpen={openDossier} onLeave={leave} />
        </header>

        <TeamHud member={member} index={Math.max(0, active)} total={TEAM.length} attract={attract} />

        <div className={styles.word} data-member={member ? "1" : "0"}>
          <SliceWord face={face} tone={member ? "cream" : "khaki"} origin={origin} label={member ? displayName(member) : "Scyte"} />
        </div>

        <p className="sr-only" aria-live="polite">
          {member ? `${displayName(member)}. ${member.role}. ${member.name ? "" : "Name not yet listed."} Press Enter for the dossier.` : ""}
        </p>

        {touch && member && open < 0 ? (
          <div className={styles.sheet} role="region" aria-label={`${displayName(member)}, summary`}>
            <span className={styles.grip} aria-hidden />
            <p className={`${styles.sheetId} t-hud`}>
              <span className="t-num">{hexId(member.slug)}</span>
              <span>{member.codename ?? "[ FILL: codename ]"}</span>
            </p>
            <p className={styles.sheetName}>{member.name ?? "[ FILL: name ]"}</p>
            <p className={styles.sheetRole}>{member.role}</p>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.sheetOpen} onClick={() => openDossier(active)}>
                Open the dossier
              </button>
              {member.links.portfolio ? (
                <a className={styles.sheetPortfolio} href={member.links.portfolio} target="_blank" rel="noopener noreferrer">
                  Visit portfolio
                </a>
              ) : (
                <span className={styles.sheetSoon}>Portfolio coming soon</span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <section className={styles.roster} aria-labelledby="roster-title">
        <h2 id="roster-title" className={styles.rosterTitle}>
          The roster
        </h2>
        <p className={styles.rosterNote}>Four seats, from our plan. Each one fills in here as the person joins: name, photo, links.</p>
        <ol className={styles.rows}>
          {TEAM.map((m, i) => (
            <li key={m.slug}>
              <span className={`${styles.ri} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.rn}>{m.name ?? <span className="fill">[ FILL: name ]</span>}</span>
              <span className={styles.rr}>{m.role}</span>
              <span className={styles.rl}>{m.location ?? <span className="fill">[ FILL: city ]</span>}</span>
              <span className={styles.rp}>
                {m.links.portfolio ? (
                  <a href={m.links.portfolio} target="_blank" rel="noopener noreferrer">
                    Portfolio
                  </a>
                ) : (
                  <span className="c-muted t-small">Portfolio coming soon</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {open >= 0 ? <Dossier key={TEAM[open].slug} member={TEAM[open]} fromEl={openFrom} onClose={closeDossier} /> : null}
    </SceneSection>
  );
}
