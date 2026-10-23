"""Density audit for the frames scripts/qa-baseline.mjs captures.

    python scripts/qa-density.py docs/qa/baseline [--sheets]

Each frame is cut into a 12 x 8 grid. A cell counts as "holding something" when it has
structure (edges), texture (luminance spread above the film grain), or motion (it
changed between the two frames taken 600 ms apart). The brief asks for at least 70
percent of cells on every set piece; this reports the share per frame and per route,
writes density.json, and with --sheets draws one contact sheet per route and width with
the empty cells hatched, so the gaps are visible at a glance.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

COLS, ROWS = 12, 8
EDGE = 28  # luminance step that counts as an edge (0-255)
EDGE_SHARE = 0.006  # share of a cell's pixels that must be edges
SPREAD = 9.0  # luminance standard deviation above the grain
MOTION = 14  # per-pixel change between frames
MOTION_SHARE = 0.004
# the strict reading: a cell holds a subject, not just a hairline or the film grain
STRICT_EDGE_SHARE = 0.03
STRICT_MOTION_SHARE = 0.02


def luminance(path: Path) -> np.ndarray:
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    return rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def score(a: np.ndarray, b: np.ndarray | None):
    h, w = a.shape
    gx = np.abs(np.diff(a, axis=1))[:-1, :]
    gy = np.abs(np.diff(a, axis=0))[:, :-1]
    edges = (gx + gy) > EDGE
    moved = np.abs(a - b) > MOTION if b is not None else np.zeros_like(a, dtype=bool)
    cells = []
    for r in range(ROWS):
        for c in range(COLS):
            y0, y1 = r * h // ROWS, (r + 1) * h // ROWS
            x0, x1 = c * w // COLS, (c + 1) * w // COLS
            e = edges[y0 : min(y1, h - 1), x0 : min(x1, w - 1)].mean()
            s = a[y0:y1, x0:x1].std()
            m = moved[y0:y1, x0:x1].mean()
            kind = "motion" if m > MOTION_SHARE else "structure" if e > EDGE_SHARE else "texture" if s > SPREAD else ""
            strict = e > STRICT_EDGE_SHARE or m > STRICT_MOTION_SHARE
            cells.append(kind.upper() if strict and kind else kind)
    return cells


def sheet(out: Path, frames: list[dict], name: str):
    thumbs = []
    tw = 360
    for f in frames:
        im = Image.open(out / f"{f['name']}.png").convert("RGB")
        th = round(im.height * tw / im.width)
        im = im.resize((tw, th), Image.LANCZOS)
        d = ImageDraw.Draw(im, "RGBA")
        for i, kind in enumerate(f["cells"]):
            if kind and kind.isupper():
                continue
            r, c = divmod(i, COLS)
            x0, x1 = c * tw / COLS, (c + 1) * tw / COLS
            y0, y1 = r * th / ROWS, (r + 1) * th / ROWS
            # red: nothing at all; amber: only a hairline, grain or a faint gradient
            colour = (255, 64, 64) if not kind else (255, 190, 40)
            d.rectangle([x0, y0, x1, y1], fill=(*colour, 46), outline=(*colour, 90))
        d.rectangle([0, 0, 150, 18], fill=(0, 0, 0, 170))
        d.text((5, 3), f"{f['step']:02d}  any {round(f['share'] * 100)}%  strict {round(f['strict'] * 100)}%", fill=(255, 255, 255))
        thumbs.append(im)
    per_row = 6
    th = thumbs[0].height
    rows = (len(thumbs) + per_row - 1) // per_row
    canvas = Image.new("RGB", (per_row * (tw + 6) + 6, rows * (th + 6) + 34), (12, 12, 12))
    d = ImageDraw.Draw(canvas)
    d.text((8, 10), name, fill=(255, 255, 255))
    for i, t in enumerate(thumbs):
        r, c = divmod(i, per_row)
        canvas.paste(t, (6 + c * (tw + 6), 34 + r * (th + 6)))
    canvas.save(out / "sheets" / f"{name}.jpg", quality=78)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/qa/baseline")
    steps = json.loads((out / "steps.json").read_text())
    frames = []
    for s in steps:
        if s.get("summary"):
            continue
        a = luminance(out / f"{s['name']}.png")
        bp = out / f"{s['name']}.b.png"
        b = luminance(bp) if bp.exists() else None
        cells = score(a, b)
        filled = sum(1 for k in cells if k)
        strict = sum(1 for k in cells if k and k.isupper())
        moving = sum(1 for k in cells if k.lower() == "motion")
        frames.append({**s, "cells": cells, "share": filled / len(cells), "strict": strict / len(cells), "motion": moving / len(cells)})

    routes = {}
    for f in frames:
        key = f"{f['route']} @ {f['width']}"
        routes.setdefault(key, []).append(f)
    summary = []
    for key, fs in routes.items():
        shares = [f["share"] for f in fs]
        strict = [f["strict"] for f in fs]
        summary.append(
            {
                "route": key,
                "frames": len(fs),
                "mean": round(float(np.mean(shares)), 3),
                "below70": sum(1 for s in shares if s < 0.7),
                "worst": round(min(shares), 3),
                "strictMean": round(float(np.mean(strict)), 3),
                "strictBelow50": sum(1 for s in strict if s < 0.5),
                "motionMean": round(float(np.mean([f["motion"] for f in fs])), 3),
                "stillFrames": sum(1 for f in fs if f["motion"] < 0.03),
            }
        )
    (out / "density.json").write_text(json.dumps({"summary": summary, "frames": frames}, indent=1))
    for s in summary:
        print(
            f"{s['route']:<24} n {s['frames']:>3} | any {s['mean']:.0%} (<70%: {s['below70']:>2}, worst {s['worst']:.0%})"
            f" | strict {s['strictMean']:.0%} (<50%: {s['strictBelow50']:>2}) | moving cells {s['motionMean']:.0%}, near-still frames {s['stillFrames']}"
        )

    if "--sheets" in sys.argv:
        (out / "sheets").mkdir(exist_ok=True)
        for key, fs in routes.items():
            name = key.replace(" @ ", "_").strip("/").replace("/", "-") or "home"
            if name.startswith("_"):
                name = "home" + name
            sheet(out, fs, name)


if __name__ == "__main__":
    main()
