#!/usr/bin/env python3
"""Generate photorealistic article cover images with the Gemini API (Imagen).

Reads a manifest such as docs/article-image-generation-2026-10-29.json, generates one
16:9 image per pending entry, writes <slug>.webp / -768w / -480w next to the article's
current hero, and updates image_alt / image_caption / image_credit in the article
frontmatter. Authentication: either the environment's network secret adds the
`x-goog-api-key` header for generativelanguage.googleapis.com (preferred; the key
never enters the session), or GEMINI_API_KEY is set. The key is never printed.

Usage:
  python3 scripts/generate-cover-images.py --manifest docs/article-image-generation-2026-10-29.json --limit 5
  python3 scripts/generate-cover-images.py --manifest ... --only cologne-cathedral-632-years
  python3 scripts/generate-cover-images.py --manifest ... --from-png some.png --only <slug>   # offline pipeline test
"""
import argparse
import base64
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:{method}"
SIZES = ((1200, ""), (768, "-768w"), (480, "-480w"))


def generate(prompt, model, key):
    """Imagen models use :predict; Gemini image models use :generateContent."""
    if model.startswith("imagen"):
        method = "predict"
        body = {"instances": [{"prompt": prompt}],
                "parameters": {"sampleCount": 1, "aspectRatio": "16:9", "personGeneration": "allow_adult"}}
    else:
        method = "generateContent"
        body = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}}}
    headers = {"Content-Type": "application/json"}
    if key:
        headers["x-goog-api-key"] = key
    req = urllib.request.Request(API.format(model=model, method=method), data=json.dumps(body).encode(),
                                 method="POST", headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as res:
                data = json.load(res)
            if method == "predict":
                preds = data.get("predictions") or []
                if preds and "bytesBase64Encoded" in preds[0]:
                    return base64.b64decode(preds[0]["bytesBase64Encoded"])
            else:
                for cand in data.get("candidates") or []:
                    for part in (cand.get("content") or {}).get("parts") or []:
                        inline = part.get("inlineData") or part.get("inline_data")
                        if inline and inline.get("data"):
                            return base64.b64decode(inline["data"])
            raise RuntimeError(f"no image in response (possibly filtered): {str(data)[:300]}")
        except urllib.error.HTTPError as err:
            detail = err.read().decode(errors="replace")[:300]
            if err.code in (401, 403) and not key:
                raise RuntimeError(f"HTTP {err.code}: authentication failed. Check that the network secret "
                                   "uses header x-goog-api-key with an empty prefix for "
                                   f"generativelanguage.googleapis.com. {detail}") from None
            if err.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 ** (attempt + 2))
                continue
            raise RuntimeError(f"HTTP {err.code}: {detail}") from None


def export_webp(png_bytes, dest):
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    w, h = im.size
    target = 16 / 9
    if w / h > target:
        nw = round(h * target)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w / target)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    base = os.path.join(ROOT, dest)
    stem = base[: -len(".webp")]
    for width, suffix in SIZES:
        out = im.resize((width, round(width * 9 / 16)), Image.LANCZOS)
        out.save(f"{stem}{suffix}.webp", "WEBP", quality=78, method=6)
    return [f"{stem}{s}.webp" for _, s in SIZES]


def set_field(text, field, value):
    line = f'{field}: {json.dumps(value, ensure_ascii=False)}'
    pattern = re.compile(rf"^{field}:.*$", re.M)
    if pattern.search(text):
        return pattern.sub(lambda _: line, text, count=1)
    return text.replace("\n---\n", f"\n{line}\n---\n", 1)


def update_markdown(entry):
    path = os.path.join(ROOT, entry["markdown"])
    text = open(path, encoding="utf-8").read()
    head_end = text.index("\n---", 3)
    head, rest = text[:head_end], text[head_end:]
    head = set_field(head + "\n---\n", "image_alt", entry["alt"])
    head = set_field(head, "image_caption", entry["caption"])
    head = set_field(head, "image_credit", entry["credit"])
    open(path, "w", encoding="utf-8").write(head[: -len("\n---\n")] + rest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--model", default=os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image"))
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--from-png", help="use a local PNG instead of calling the API (pipeline test)")
    ap.add_argument("--raw-dir", default=os.environ.get("TMPDIR", "/tmp") + "/cover-raw",
                    help="where the original generated PNGs are kept (outside the repo)")
    args = ap.parse_args()

    manifest_path = os.path.join(ROOT, args.manifest)
    entries = json.load(open(manifest_path, encoding="utf-8"))
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key and not args.from_png:
        print("GEMINI_API_KEY is not set; relying on the environment's network secret "
              "to add x-goog-api-key for generativelanguage.googleapis.com.")
    os.makedirs(args.raw_dir, exist_ok=True)

    if args.only:
        todo = [e for e in entries if e["slug"] in args.only]
    else:
        todo = [e for e in entries if e.get("status") != "generated"]
    if args.limit:
        todo = todo[: args.limit]
    failed = []
    for entry in todo:
        slug = entry["slug"]
        try:
            png = open(args.from_png, "rb").read() if args.from_png else generate(entry["prompt"], args.model, key)
            open(os.path.join(args.raw_dir, f"{slug}.png"), "wb").write(png)
            files = export_webp(png, entry["dest"])
            update_markdown(entry)
            if not args.from_png:
                entry.update(status="generated", tool=f"Gemini API {args.model}")
            print(f"ok  {slug}: {', '.join(os.path.relpath(f, ROOT) for f in files)}")
        except Exception as err:  # keep going; report at the end
            failed.append(slug)
            print(f"ERR {slug}: {err}")
        json.dump(entries, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if failed:
        sys.exit(f"{len(failed)} failed: {' '.join(failed)}")


if __name__ == "__main__":
    main()
