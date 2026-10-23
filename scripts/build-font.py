"""Builds src/app/fonts/archivo-var.woff2, the site's only font file.

Google Fonts' `text=` endpoint returns Archivo with both variation axes (wght 100-900,
wdth 62-125) cut down to the characters we ask for; fontTools then drops hinting and
the layout features the site never uses. Run when the character set needs to grow:

    python scripts/build-font.py

It also writes two static instances to assets/og/ for the share images, because the
image renderer cannot read variable fonts or WOFF2. `--og` rebuilds only those, from
the WOFF2 already in the repo, with no network.

Needs fontTools and brotli (pip install fonttools brotli).
"""

import io
import pathlib
import re
import sys
import urllib.parse
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "app" / "fonts" / "archivo-var.woff2"
OG = ROOT / "assets" / "og"
# the share images' two voices: the condensed display cut and the body cut
OG_CUTS = {"archivo-display.ttf": {"wght": 820, "wdth": 70}, "archivo-text.ttf": {"wght": 460, "wdth": 100}}

# Basic Latin, the Latin-1 symbols we print, typographic punctuation, rupee, arrows, maths.
CHARS = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + " ¡¢£¥§©«®°±´·»¿×÷"
    + "‘’‚“”„–—…•′″‹›€₹←↑→↓−≈≤≥"
)
FEATURES = ["kern", "liga", "tnum", "ccmp", "locl", "rvrn", "mark", "mkmk"]
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"


def fetch() -> bytes:
    url = (
        "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&text="
        + urllib.parse.quote(CHARS)
    )
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read().decode()
    src = re.search(r"url\((.*?)\)", css).group(1)
    return urllib.request.urlopen(src).read()


def main() -> None:
    font = TTFont(io.BytesIO(fetch()))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = FEATURES
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=CHARS)
    sub.subset(font)
    font.flavor = "woff2"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT)
    axes = [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes]
    print(f"{OUT.name}: {OUT.stat().st_size // 1024} KB, {len(font.getGlyphOrder())} glyphs, axes {axes}")


def og() -> None:
    OG.mkdir(parents=True, exist_ok=True)
    for name, axes in OG_CUTS.items():
        font = TTFont(OUT)
        static = instancer.instantiateVariableFont(font, axes)
        static.flavor = None
        static.save(OG / name)
        print(f"{name}: {(OG / name).stat().st_size // 1024} KB at {axes}")


if __name__ == "__main__":
    if "--og" not in sys.argv:
        main()
    og()
