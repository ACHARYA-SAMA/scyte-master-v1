"""Builds src/app/fonts/archivo-var.woff2, the site's only font file.

Google Fonts' `text=` endpoint returns Archivo with both variation axes (wght 100-900,
wdth 62-125) cut down to the characters we ask for; fontTools then drops hinting and
the layout features the site never uses. Run when the character set needs to grow:

    python scripts/build-font.py

Needs fontTools and brotli (pip install fonttools brotli).
"""

import io
import pathlib
import re
import urllib.parse
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "app" / "fonts" / "archivo-var.woff2"

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


if __name__ == "__main__":
    main()
