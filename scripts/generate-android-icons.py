#!/usr/bin/env python3
"""Generate SleepX Android launcher icons (legacy + adaptive)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("android/app/src/main/res")
SIZE = 864
CRIMSON = (220, 18, 52)
WHITE = (246, 244, 245)
BLACK = (8, 8, 10)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def make_art(transparent: bool):
    scale = SIZE / 432
    bg = (0, 0, 0, 0) if transparent else (*BLACK, 255)
    base = Image.new("RGBA", (SIZE, SIZE), bg)

    # Soft crimson halo behind the crescent.
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy, radius = 216 * scale, 157 * scale, 91 * scale
    gd.ellipse((cx-radius-12*scale, cy-radius-12*scale,
                cx+radius+12*scale, cy+radius+12*scale),
               fill=(220, 18, 52, 105))
    glow = glow.filter(ImageFilter.GaussianBlur(34 * scale))
    base.alpha_composite(glow)

    # Crimson crescent, with a transparent inner cut-out.
    moon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    md = ImageDraw.Draw(moon)
    bbox = (cx-radius, cy-radius, cx+radius, cy+radius)
    md.ellipse(bbox, fill=(225, 20, 55, 255))
    cut_r = 83 * scale
    cut_cx, cut_cy = cx + 39 * scale, cy - 31 * scale
    md.ellipse((cut_cx-cut_r, cut_cy-cut_r, cut_cx+cut_r, cut_cy+cut_r),
               fill=(0, 0, 0, 0))
    # Subtle highlight along the outer crescent edge.
    edge = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ed = ImageDraw.Draw(edge)
    ed.arc(bbox, start=105, end=300, fill=(255, 112, 132, 190), width=3 * int(scale))
    moon.alpha_composite(edge)
    base.alpha_composite(moon)

    # Wordmark: only "SleepX"; X is crimson.
    font = ImageFont.truetype(FONT_PATH, int(39 * scale))
    draw = ImageDraw.Draw(base)
    y = int(296 * scale)
    left = "Sleep"
    right = "X"
    left_box = draw.textbbox((0, 0), left, font=font)
    right_box = draw.textbbox((0, 0), right, font=font)
    left_w = left_box[2] - left_box[0]
    right_w = right_box[2] - right_box[0]
    gap = 1 * scale
    x = (SIZE - left_w - right_w - gap) / 2
    draw.text((int(x), y), left, font=font, fill=WHITE, stroke_width=0)
    draw.text((int(x + left_w + gap), y), right, font=font, fill=CRIMSON, stroke_width=0)
    return base


def save_png(image, path, size):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(path, format="PNG", optimize=True)


def main():
    foreground = make_art(transparent=True)
    save_png(foreground, ROOT / "drawable-nodpi" / "sleepx_launcher_foreground.png", 432)

    legacy = make_art(transparent=False)
    for density, size in {
        "mdpi": 48, "hdpi": 72, "xhdpi": 96,
        "xxhdpi": 144, "xxxhdpi": 192,
    }.items():
        folder = ROOT / f"mipmap-{density}"
        save_png(legacy, folder / "ic_launcher.png", size)
        save_png(legacy, folder / "ic_launcher_round.png", size)

    adaptive = ROOT / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/sleepx_icon_background" />
    <foreground android:drawable="@drawable/sleepx_launcher_foreground" />
</adaptive-icon>
"""
    (adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

    colors = ROOT / "values"
    colors.mkdir(parents=True, exist_ok=True)
    color_file = colors / "sleepx_icon_colors.xml"
    color_file.write_text("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="sleepx_icon_background">#08080A</color>
</resources>
""", encoding="utf-8")
    print("Generated SleepX crimson crescent launcher icons.")


if __name__ == "__main__":
    main()
