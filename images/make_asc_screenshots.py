#!/usr/bin/env python3
"""
Adjourned ASC screenshot composites.

Takes frameless 1320x2868 device captures and produces captioned
composites at the same resolution: cream canvas, Fraunces caption block
top, rounded-corner screenshot beneath with a soft shadow, scaled to fit.

Usage: python3 make_asc_screenshots.py
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1320, 2868
CREAM = (0xFA, 0xF5, 0xEC)
INK = (0x2A, 0x21, 0x18)
ACCENT = (0xE5, 0x8A, 0x4E)

CAPTION_TOP = 96
CAPTION_SIZE = 76
EYEBROW_SIZE = 30
SHOT_TOP = 430          # where the device capture begins
SHOT_MARGIN = 72        # left/right margin around the capture
CORNER_RADIUS = 56

UPLOADS = "/mnt/user-data/uploads"

SHOTS = [
    # (source file, eyebrow, caption lines, output)
    ("Screenshot_iPhone_17_Pro_Max_08-30-2026_at_10_06_23_PM.png",
     "THE STACK",
     ["Your standing meetings,", "priced honestly."],
     "asc-01-stack.png"),
    ("Screenshot_iPhone_17_Pro_Max_08-30-2026_at_10_05_38_PM.png",
     "THE RITUAL",
     ["One question,", "then a decision."],
     "asc-02-ritual.png"),
    ("Screenshot_iPhone_17_Pro_Max_08-30-2026_at_10_04_22_PM.png",
     "PENDING",
     ["Decisions do not lower", "the number. Actions do."],
     "asc-03-pending.png"),
    ("Screenshot_iPhone_17_Pro_Max_08-30-2026_at_10_08_29_PM.png",
     "THE RECORD",
     ["Every meeting,", "on the record."],
     "asc-04-detail.png"),
    ("Screenshot_iPhone_17_Pro_Max_08-30-2026_at_10_08_01_PM.png",
     "THE WIDGET",
     ["The day, burning down", "or clearing up."],
     "asc-05-widget.png"),
]


def load_fonts():
    caption = ImageFont.truetype("fraunces.ttf", CAPTION_SIZE)
    caption.set_variation_by_axes([0, 0, 72, 500])
    # Liberation Sans as the Inter stand-in for the mono-ish eyebrow;
    # letterspacing applied manually.
    eyebrow = ImageFont.truetype(
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        EYEBROW_SIZE)
    return caption, eyebrow


def rounded(img, radius):
    mask = Image.new("L", (img.width * 4, img.height * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.width * 4 - 1, img.height * 4 - 1], radius * 4, fill=255)
    mask = mask.resize(img.size, Image.LANCZOS)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask=mask)
    return out


def letterspaced(draw, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def compose(src, eyebrow_text, caption_lines, out_name):
    canvas = Image.new("RGBA", (W, H), CREAM + (255,))
    draw = ImageDraw.Draw(canvas)
    caption_font, eyebrow_font = load_fonts()

    # Eyebrow
    letterspaced(draw, (SHOT_MARGIN, CAPTION_TOP), eyebrow_text,
                 eyebrow_font, ACCENT, 6)

    # Caption
    y = CAPTION_TOP + 64
    for line in caption_lines:
        draw.text((SHOT_MARGIN, y), line, font=caption_font, fill=INK)
        y += CAPTION_SIZE + 14

    # Device capture, scaled to fit remaining height
    shot = Image.open(os.path.join(UPLOADS, src)).convert("RGBA")
    avail_w = W - 2 * SHOT_MARGIN
    avail_h = H - SHOT_TOP  # bleeds off the bottom edge deliberately
    scale = avail_w / shot.width
    shot = shot.resize((avail_w, int(shot.height * scale)), Image.LANCZOS)
    shot = rounded(shot, CORNER_RADIUS)

    # Shadow
    pad = 90
    shadow = Image.new("RGBA", (shot.width + pad * 2, shot.height + pad * 2), (0, 0, 0, 0))
    alpha = shot.split()[-1]
    black = Image.new("RGBA", shot.size, (0, 0, 0, 70))
    shadow.paste(black, (pad, pad), mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))

    canvas.alpha_composite(shadow, (SHOT_MARGIN - pad, SHOT_TOP - pad + 18))
    canvas.alpha_composite(shot, (SHOT_MARGIN, SHOT_TOP))

    # Crop back to exact frame (shot bleeds past bottom)
    canvas = canvas.crop((0, 0, W, H)).convert("RGB")
    canvas.save(out_name)
    print("wrote", out_name)


if __name__ == "__main__":
    for spec in SHOTS:
        compose(*spec)
