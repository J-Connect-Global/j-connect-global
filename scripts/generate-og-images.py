#!/usr/bin/env python3
"""Generate JPEG social-preview images (<name>-og.jpg, 1200x630) next to article heroes.

Threads / Facebook link previews do not reliably read WebP og:image files. When the
og:image cannot be used, Threads falls back to another image on the page (the wide
header logo) and crops it. build-content.mjs points og:image / twitter:image to the
-og.jpg sibling whenever it exists, so run this after adding or replacing a hero image:

  python3 scripts/generate-og-images.py          # create missing / stale files
  python3 scripts/generate-og-images.py --force  # regenerate everything
"""
import argparse
import os
import re
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMAGE_DIRS = [os.path.join(ROOT, "assets", "img")]
CONTENT_DIR = os.path.join(ROOT, "content")
# Hero images outside assets/img (e.g. assets/images/...) referenced from article frontmatter.
FRONTMATTER_IMAGE = re.compile(r"""^(?:image|image_url|hero_image|og_image):\s*["']?(/assets/[^"'\s]+\.webp)""", re.M)
SIZE = (1200, 630)
VARIANT = re.compile(r"-(?:\d+w)\.webp$")


def cover(img):
    img = img.convert("RGB")
    tw, th = SIZE
    scale = max(tw / img.width, th / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - tw) // 2
    top = (img.height - th) // 2
    return img.crop((left, top, left + tw, top + th))


def sources():
    for base in IMAGE_DIRS:
        for dirpath, _, files in os.walk(base):
            for name in files:
                if name.endswith(".webp") and not VARIANT.search(name):
                    yield os.path.join(dirpath, name)
    for dirpath, _, files in os.walk(CONTENT_DIR):
        for name in files:
            if not name.endswith(".md"):
                continue
            with open(os.path.join(dirpath, name), encoding="utf-8") as fh:
                head = fh.read(4000)
            for src in FRONTMATTER_IMAGE.findall(head):
                path = os.path.join(ROOT, src.lstrip("/"))
                if not src.startswith("/assets/img/") and os.path.isfile(path):
                    yield path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    made = 0
    for src in sorted(set(sources())):
        dst = src[: -len(".webp")] + "-og.jpg"
        if not args.force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        with Image.open(src) as img:
            if img.width < 600:
                continue
            cover(img).save(dst, "JPEG", quality=65, optimize=True, progressive=True)
        made += 1
    print(f"generated {made} og images", file=sys.stderr)


if __name__ == "__main__":
    main()
