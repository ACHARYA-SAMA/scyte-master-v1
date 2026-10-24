"use client";

import { useState } from "react";
import { TEAM, displayName, hexId } from "@/data/team";
import { Redacted } from "@/components/kit/Redacted";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { Portrait } from "./Portrait";
import styles from "./Roster.module.css";

/**
 * T8, the roster: one row a seat. Open a row and the portrait slides out of it with the
 * seat's skills and tools; or switch to a plain table. Unlisted fields stay redacted.
 */
export function Roster({ onOpen }: { onOpen: (i: number) => void }) {
  const [openRow, setOpenRow] = useState(-1);
  const [table, setTable] = useState(false);
  return (
    <section className={styles.roster} aria-labelledby="roster-title">
      <header className={styles.head}>
        <h2 id="roster-title" className={styles.title}>
          The roster
        </h2>
        <p className={styles.note}>Four seats. Each fills in as its person is announced: name, photo, links. Until then the file stays redacted.</p>
        <ToggleSwitch label="View" checked={table} onChange={setTable} offLabel="Rows" onLabel="Table" />
      </header>

      {table ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Seat</th>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">City</th>
              <th scope="col">Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {TEAM.map((m, i) => (
              <tr key={m.slug}>
                <th scope="row">{String(i + 1).padStart(2, "0")}</th>
                <td>{m.name ?? <Redacted what="Name" chars={8} />}</td>
                <td>{m.role}</td>
                <td>{m.location ?? <Redacted what="City" chars={6} />}</td>
                <td>{m.links.portfolio ? <a href={m.links.portfolio} target="_blank" rel="noopener noreferrer">Visit</a> : "Coming soon"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ol className={styles.rows}>
          {TEAM.map((m, i) => {
            const open = openRow === i;
            return (
              <li key={m.slug} data-open={open ? "1" : undefined}>
                <button type="button" className={styles.row} aria-expanded={open} aria-controls={`row-${m.slug}`} onClick={() => setOpenRow(open ? -1 : i)} data-cursor="open">
                  <span className={`${styles.ri} t-hud`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.rn}>{m.name ?? displayName(m)}</span>
                  <span className={styles.rr}>{m.role}</span>
                  <span className={styles.rl}>{m.location ?? <Redacted what="City" chars={7} />}</span>
                  <span className={styles.plus} aria-hidden />
                </button>
                <div id={`row-${m.slug}`} className={styles.reveal} role="region" aria-label={`${displayName(m)}, details`} hidden={!open}>
                  <Portrait member={m} size="large" className={styles.portrait} />
                  <div className={styles.facts}>
                    <p className={`${styles.hex} t-hud`}>
                      {hexId(m.slug)} {m.codename ?? <Redacted what="Codename" chars={8} />}
                    </p>
                    <p className={styles.skills}>
                      {m.skills.map((s) => (
                        <span key={s.label}>{s.label}</span>
                      ))}
                    </p>
                    <p className={styles.tools}>Works with {m.tools.join(", ")}.</p>
                    <div className={styles.actions}>
                      <button type="button" className={styles.dossier} onClick={() => onOpen(i)}>
                        Open the dossier
                      </button>
                      {m.links.portfolio ? (
                        <a className={styles.portfolio} href={m.links.portfolio} target="_blank" rel="noopener noreferrer">
                          Visit portfolio ↗
                        </a>
                      ) : (
                        <span className={styles.soon}>Portfolio coming soon</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
