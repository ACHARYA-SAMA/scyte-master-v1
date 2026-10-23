"""Processes team portraits for the /team page.

For every public/team/<slug>.(jpg|jpeg|png|webp) that is not itself a generated file:
  - <slug>-1200.webp   the portrait, 1200 px tall, for the hologram and the dossier
  - <slug>-thumb.webp  a 320 x 400 crop for the dock
  - <slug>-depth.png   a 512 px depth map (near = white)
and writes src/data/team-assets.json with the paths, the dominant colour and a
face point the HUD aims its reticle at.

Depth comes from a monocular depth model when one is present at
scripts/models/depth-anything-v2-small.onnx (Depth Anything V2 Small, Apache-2.0,
run with onnxruntime). Without it, a luminance height-field with a centre-weighted
prior is used, which reads well for head-and-shoulders portraits.

    python scripts/team-assets.py

Needs Pillow and NumPy; onnxruntime only for the model path.
"""

from __future__ import annotations

import json
import pathlib

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEAM_DIR = ROOT / "public" / "team"
OUT = ROOT / "src" / "data" / "team-assets.json"
MODEL = ROOT / "scripts" / "models" / "depth-anything-v2-small.onnx"
GENERATED = ("-1200", "-thumb", "-depth")


def model_depth(img: Image.Image) -> np.ndarray | None:
    if not MODEL.exists():
        return None
    try:
        import onnxruntime as ort  # noqa: PLC0415
    except ImportError:
        return None
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    size = 518
    x = np.asarray(img.convert("RGB").resize((size, size), Image.BICUBIC), dtype=np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    x = ((x - mean) / std).transpose(2, 0, 1)[None]
    name = sess.get_inputs()[0].name
    d = sess.run(None, {name: x})[0].squeeze()
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    return np.asarray(Image.fromarray((d * 255).astype(np.uint8)).resize(img.size, Image.BICUBIC), dtype=np.float32) / 255.0


def luminance_depth(img: Image.Image) -> np.ndarray:
    g = ImageOps.grayscale(img).filter(ImageFilter.GaussianBlur(radius=max(2, img.width // 90)))
    lum = np.asarray(g, dtype=np.float32) / 255.0
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    # people sit in the middle of a portrait, nearer than the background
    prior = np.exp(-(((xx - w * 0.5) / (w * 0.42)) ** 2 + ((yy - h * 0.48) / (h * 0.55)) ** 2))
    d = 0.55 * lum + 0.45 * prior
    return (d - d.min()) / max(1e-6, d.max() - d.min())


def face_point(depth: np.ndarray) -> list[float]:
    h, w = depth.shape
    top = depth[: int(h * 0.6)]
    mask = top > np.quantile(top, 0.85)
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return [0.5, 0.35]
    return [round(float(xs.mean() / w), 3), round(float(ys.mean() / h), 3)]


def dominant(img: Image.Image) -> str:
    small = np.asarray(img.convert("RGB").resize((64, 80)), dtype=np.float32)
    lum = small.mean(axis=2)
    mid = small[(lum > 50) & (lum < 205)]
    c = (mid.mean(axis=0) if len(mid) else small.reshape(-1, 3).mean(axis=0)).astype(int)
    return "#%02x%02x%02x" % tuple(c)


def main() -> None:
    out: dict[str, dict] = {}
    for src in sorted(TEAM_DIR.iterdir()):
        if src.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp") or src.stem.endswith(GENERATED):
            continue
        slug = src.stem
        img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        big = img.copy()
        big.thumbnail((int(1200 * img.width / img.height), 1200), Image.LANCZOS)
        big.save(TEAM_DIR / f"{slug}-1200.webp", quality=86)
        thumb = ImageOps.fit(img, (320, 400), Image.LANCZOS, centering=(0.5, 0.35))
        thumb.save(TEAM_DIR / f"{slug}-thumb.webp", quality=84)
        small = img.copy()
        small.thumbnail((512, 512), Image.LANCZOS)
        depth = model_depth(small)
        source = "model"
        if depth is None:
            depth = luminance_depth(small)
            source = "luminance"
        Image.fromarray((depth * 255).astype(np.uint8)).save(TEAM_DIR / f"{slug}-depth.png")
        out[slug] = {
            "photo": f"/team/{slug}-1200.webp",
            "thumb": f"/team/{slug}-thumb.webp",
            "depth": f"/team/{slug}-depth.png",
            "color": dominant(img),
            "face": face_point(depth),
            "depthSource": source,
        }
        print(f"{slug}: {source} depth, face at {out[slug]['face']}")
    OUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(out)} portraits)")


if __name__ == "__main__":
    main()
