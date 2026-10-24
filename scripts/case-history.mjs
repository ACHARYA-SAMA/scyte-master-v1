// The build's history for Case 00's timelapse: every commit, in order, with its round.
//
//   node scripts/case-history.mjs
//
// Writes src/data/case-history.json. Deploys clone shallowly, so the page reads this file
// rather than git. Rounds start when each brief arrived (times in UTC).

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ROUNDS = [
  { id: "r0", start: "1970-01-01T00:00:00Z" },
  { id: "r1", start: "2026-10-22T15:13:00Z" },
  { id: "r2", start: "2026-10-22T19:54:00Z" },
  { id: "r3", start: "2026-10-23T12:52:00Z" },
  { id: "r4", start: "2026-10-23T17:55:00Z" },
];

const log = execFileSync("git", ["log", "--reverse", "--format=%h%x09%aI%x09%s"], { encoding: "utf8" });
const commits = log
  .trim()
  .split("\n")
  .map((line) => {
    const [h, t, ...rest] = line.split("\t");
    const at = Date.parse(t);
    const round = [...ROUNDS].reverse().find((r) => at >= Date.parse(r.start))?.id ?? "r0";
    return { h, t: new Date(at).toISOString(), s: rest.join("\t"), r: round };
  });
// the import of the site as received is where the story starts
if (commits[0]) commits[0].r = "r0";

fs.writeFileSync("src/data/case-history.json", `${JSON.stringify({ generated: new Date().toISOString(), commits }, null, 1)}\n`);
console.log(`${commits.length} commits`);
