"""Turn the screencast frame folders from scripts/qa-record.mjs into WebM files.

    python scripts/qa-frames-to-video.py docs/qa/baseline/video [--fps=25] [--bitrate=1.8M] [--keep]

Chrome only sends a frame when the page changes, so frames are placed on a steady
timeline by their timestamps: a still screen holds its last frame for as long as it was
still, and the video runs in real time.

Encodes with the ffmpeg build Playwright caches (it has the VP8 encoder, the JPEG pipe
input and the WebM muxer), which gives a sane bitrate; falls back to OpenCV, whose
writer has no bitrate control and makes very large files.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/qa/baseline/video")
fps = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--fps=")), 25)
bitrate = next((a.split("=")[1] for a in sys.argv if a.startswith("--bitrate=")), "1.8M")


def find_ffmpeg():
    cache = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "ms-playwright"
    for d in sorted(cache.glob("ffmpeg-*"), reverse=True):
        exe = d / "ffmpeg-win64.exe"
        if exe.exists():
            return str(exe)
    return shutil.which("ffmpeg")


def timeline(frames):
    """For each output frame, the source frame on screen at that moment."""
    t0 = frames[0]["t"]
    end = frames[-1]["t"] - t0 + 1.0
    i = 0
    for n in range(int(end * fps)):
        t = n / fps
        while i + 1 < len(frames) and frames[i + 1]["t"] - t0 <= t:
            i += 1
        yield i
    return end


ffmpeg = find_ffmpeg()

for folder in sorted(p for p in root.iterdir() if p.is_dir()):
    meta = folder / "frames.json"
    if not meta.exists():
        continue
    frames = json.loads(meta.read_text())
    if not frames:
        continue
    out = root / f"{folder.name}.webm"
    seconds = frames[-1]["t"] - frames[0]["t"] + 1.0
    if ffmpeg:
        cmd = [ffmpeg, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
               "-c:v", "libvpx", "-b:v", bitrate, "-crf", "12", "-deadline", "good", "-cpu-used", "4", "-an", str(out)]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        cache: dict[int, bytes] = {}
        for i in timeline(frames):
            if i not in cache:
                cache.clear()
                cache[i] = (folder / frames[i]["file"]).read_bytes()
            proc.stdin.write(cache[i])
        proc.stdin.close()
        proc.wait()
    else:
        import cv2

        first = cv2.imread(str(folder / frames[0]["file"]))
        h, w = first.shape[:2]
        writer = cv2.VideoWriter(str(out), cv2.VideoWriter_fourcc(*"VP80"), fps, (w, h))
        last, img = -1, first
        for i in timeline(frames):
            if i != last:
                img = cv2.imread(str(folder / frames[i]["file"]))
                last = i
            writer.write(img if img.shape[:2] == (h, w) else cv2.resize(img, (w, h)))
        writer.release()
    size = out.stat().st_size / 1e6 if out.exists() else 0
    print(f"{out.name}: {seconds:.1f} s, {len(frames)} source frames, {size:.1f} MB")
    if "--keep" not in sys.argv:
        shutil.rmtree(folder)
