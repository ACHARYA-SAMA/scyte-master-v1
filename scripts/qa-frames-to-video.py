"""Turn the screencast frame folders from scripts/qa-record.mjs into WebM files.

    python scripts/qa-frames-to-video.py docs/qa/baseline/video [--fps=25] [--keep]

Chrome only sends a frame when the page changes, so frames are placed on a steady
timeline by their timestamps: a still screen holds its last frame for as long as it was
still, and the video runs in real time.
"""

import json
import shutil
import sys
from pathlib import Path

import cv2

root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/qa/baseline/video")
fps = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--fps=")), 25)

for folder in sorted(p for p in root.iterdir() if p.is_dir()):
    meta = folder / "frames.json"
    if not meta.exists():
        continue
    frames = json.loads(meta.read_text())
    if not frames:
        continue
    first = cv2.imread(str(folder / frames[0]["file"]))
    h, w = first.shape[:2]
    out = root / f"{folder.name}.webm"
    writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*"VP80"), fps, (w, h))
    t0 = frames[0]["t"]
    end = frames[-1]["t"] - t0 + 1.0
    i = 0
    img = first
    for n in range(int(end * fps)):
        t = n / fps
        while i + 1 < len(frames) and frames[i + 1]["t"] - t0 <= t:
            i += 1
            img = cv2.imread(str(folder / frames[i]["file"]))
        if img.shape[:2] != (h, w):
            img = cv2.resize(img, (w, h))
        writer.write(img)
    writer.release()
    print(f"{out.name}: {end:.1f} s, {len(frames)} source frames")
    if "--keep" not in sys.argv:
        shutil.rmtree(folder)
