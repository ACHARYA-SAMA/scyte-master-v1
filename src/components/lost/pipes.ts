/**
 * The 404 puzzle: rotate pipe tiles until the liquid runs from the left edge to the
 * right. Pure functions, seeded, so the server and the browser draw the same pipe.
 */

/** Openings as bits: north, east, south, west. */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export type Kind = "straight" | "elbow" | "tee";
export type Tile = { kind: Kind; /** quarter turns clockwise, counted up forever so CSS never spins back */ turns: number };
export type Board = {
  cols: number;
  rows: number;
  row: number;
  tiles: Tile[];
  /** one way through, as tile indices and the openings each needs */
  path: number[];
  want: number[];
};

const BASE: Record<Kind, number> = { straight: N | S, elbow: N | E, tee: N | E | S };

const rotate = (m: number) => ((m << 1) | (m >> 3)) & 15;

export const openings = (t: Tile) => {
  let m = BASE[t.kind];
  for (let i = 0; i < ((t.turns % 4) + 4) % 4; i++) m = rotate(m);
  return m;
};

const STEP: Record<number, [number, number]> = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] };
const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

/** Small, fast, seedable. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A self-avoiding walk from the left edge to the right edge of the middle row, with a few detours. */
const walk = (cols: number, rows: number, row: number, rand: () => number) => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const path: [number, number][] = [[0, row]];
    const seen = new Set([`0,${row}`]);
    let stuck = false;
    while (!stuck) {
      const [x, y] = path[path.length - 1];
      if (x === cols - 1 && y === row && path.length >= cols + 4) return path;
      const options = [E, N, S, W]
        .map((d) => ({ d, w: d === E ? 0.5 : d === W ? 0.08 : 0.42, r: rand() }))
        .sort((a, b) => b.r * b.w - a.r * a.w)
        .map((o) => o.d);
      stuck = true;
      for (const d of options) {
        const nx = x + STEP[d][0];
        const ny = y + STEP[d][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(`${nx},${ny}`)) continue;
        // the exit cell only counts once the walk has wandered
        if (nx === cols - 1 && ny === row && path.length + 1 < cols + 4) continue;
        path.push([nx, ny]);
        seen.add(`${nx},${ny}`);
        stuck = false;
        break;
      }
    }
  }
  return Array.from({ length: cols }, (_, x) => [x, row] as [number, number]);
};

const dirBetween = (a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
};

/** The tile and turns whose openings are exactly `m`. */
const tileFor = (m: number): Tile => {
  for (const kind of ["straight", "elbow", "tee"] as Kind[]) {
    for (let turns = 0; turns < 4; turns++) if (openings({ kind, turns }) === m) return { kind, turns };
  }
  return { kind: "straight", turns: 1 };
};

export const makeBoard = (seed: number, cols = 7, rows = 5): Board => {
  const rand = mulberry32(seed);
  const row = Math.floor(rows / 2);
  const path = walk(cols, rows, row, rand);
  const tiles: Tile[] = Array.from({ length: cols * rows }, () => {
    const r = rand();
    const kind: Kind = r < 0.45 ? "elbow" : r < 0.8 ? "straight" : "tee";
    return { kind, turns: Math.floor(rand() * 4) };
  });
  const want: number[] = [];
  path.forEach((p, i) => {
    const into = i === 0 ? W : OPPOSITE[dirBetween(path[i - 1], p)];
    const out = i === path.length - 1 ? E : dirBetween(p, path[i + 1]);
    const solved = tileFor(into | out);
    want.push(into | out);
    // scrambled: right shape, wrong way round (most of the time)
    tiles[p[1] * cols + p[0]] = { kind: solved.kind, turns: solved.turns + 1 + Math.floor(rand() * 3) };
  });
  const board: Board = { cols, rows, row, tiles, path: path.map(([x, y]) => y * cols + x), want };
  // never hand over a pipe that is already fixed
  if (flow(board).solved) {
    const [x, y] = path[Math.floor(path.length / 2)];
    tiles[y * cols + x].turns += 1;
  }
  return board;
};

/** The first pipe along the way through that faces wrong, and the turns that fix it. */
export const hint = (b: Board): { index: number; turns: number } | null => {
  for (let k = 0; k < b.path.length; k++) {
    const i = b.path[k];
    const t = b.tiles[i];
    if (openings(t) === b.want[k]) continue;
    let turns = t.turns;
    while (openings({ ...t, turns }) !== b.want[k]) turns++;
    return { index: i, turns };
  }
  return null;
};

/** Where the liquid reaches from the left inlet, and how many steps it took to get there. */
export const flow = (b: Board) => {
  const depth = new Map<number, number>();
  const start = b.row * b.cols;
  if (!(openings(b.tiles[start]) & W)) return { depth, solved: false };
  depth.set(start, 0);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift() as number;
    const x = i % b.cols;
    const y = Math.floor(i / b.cols);
    const m = openings(b.tiles[i]);
    for (const d of [N, E, S, W]) {
      if (!(m & d)) continue;
      const nx = x + STEP[d][0];
      const ny = y + STEP[d][1];
      if (nx < 0 || ny < 0 || nx >= b.cols || ny >= b.rows) continue;
      const j = ny * b.cols + nx;
      if (depth.has(j) || !(openings(b.tiles[j]) & OPPOSITE[d])) continue;
      depth.set(j, (depth.get(i) as number) + 1);
      queue.push(j);
    }
  }
  const end = b.row * b.cols + b.cols - 1;
  return { depth, solved: depth.has(end) && Boolean(openings(b.tiles[end]) & E) };
};

const NAMES: Record<number, string> = { [N]: "up", [E]: "right", [S]: "down", [W]: "left" };

export const describe = (t: Tile) => {
  const m = openings(t);
  const ways = [N, E, S, W].filter((d) => m & d).map((d) => NAMES[d]);
  const kind = t.kind === "tee" ? "three-way" : t.kind;
  return `${kind}, open ${ways.slice(0, -1).join(", ")}${ways.length > 2 ? "," : ""} and ${ways[ways.length - 1]}`;
};
