#!/usr/bin/env python3
"""Replace seven high-priority German Christmas market covers with curated archival Commons photos.

Every source has been editorially selected for this *specific* market. Historical
capture year is disclosed. Do not infer or claim the photos depict 2026 editions.
"""
from __future__ import annotations
import hashlib
import io
import json
import math
import re
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
DATE = "2026-11-23"
ROWS = [
  dict(slug="advent-wreath-calendar-origin",
       file="Advent wreath 01.jpg",author="Eugenio Hansen, OFS",
       license="CC BY-SA 3.0",license_url="https://creativecommons.org/licenses/by-sa/3.0",
       year="2011",place="アドベントリース",
       caption="2011年撮影のアドベントリースの写真。起源の説明に添える参考写真で、歴史資料そのものではありません。"),
  dict(slug="gluehwein-christmas-market-guide",
       file="Glühwein Weinnachtsmarkt OS.JPG",author="Basotxerri",
       license="CC BY-SA 4.0",license_url="https://creativecommons.org/licenses/by-sa/4.0",
       year="2015",place="オスナブリュックのクリスマスマーケットのグリューワイン",
       caption="2015年にオスナブリュックのクリスマスマーケットで撮影されたグリューワイン。一般的な飲み方の参考写真です。"),
  dict(slug="germany-silvester-fireworks-rules",
       file="Silvester Frankfurt.jpg",author="Thomas Wolf / www.foto-tw.de",
       license="CC BY-SA 3.0",license_url="https://creativecommons.org/licenses/by-sa/3.0",
       year="2009",place="フランクフルトの大晦日の花火",
       caption="2009年1月1日撮影のフランクフルトの花火。2026年末の実際の規制・禁止区域を示す画像ではありません。"),
  dict(slug="duesseldorf-carnival-2026-27-guide",
       file="Duesseldorf-kinderkarneval.jpg",author="Solches",
       license="CC BY-SA 4.0",license_url="https://creativecommons.org/licenses/by-sa/4.0",
       year="2015",place="デュッセルドルフ・ケーニヒスアレーの子どもカーニバル",
       caption="2015年撮影のデュッセルドルフの子どもカーニバル。2026/27年の行事や山車を撮影したものではありません。"),
  dict(slug="christmas-tree-origin-germany",
       file="Weihnachtsbaum. IMG 8111WI.jpg",author="Kora27",
       license="CC BY-SA 4.0",license_url="https://creativecommons.org/licenses/by-sa/4.0",
       year="2014",place="ケムニッツのクリスマスツリーの装飾",
       caption="2014年に撮影されたケムニッツのクリスマスツリー装飾。クリスマスツリーの起源を記録した歴史写真ではありません。"),
]

def source_url(filename):
    return "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_"), safe="()-._~")
def download_url(filename):
    name = filename.replace(" ", "_")
    md5 = hashlib.md5(name.encode("utf-8")).hexdigest()
    return ("https://upload.wikimedia.org/wikipedia/commons/" + md5[0] + "/" +
            md5[:2] + "/" + urllib.parse.quote(name, safe="()-._~"))
def fetch_image(filename):
    request = urllib.request.Request(download_url(filename),
               headers={"User-Agent": "JConnectGlobalEditorial/1.0 (https://j-connect-global.com/; editorial image verification)"})
    with urllib.request.urlopen(request,timeout=90) as response:
        if not response.headers.get("Content-Type","").lower().startswith("image/"):
            raise ValueError("Unexpected Content-Type for " + filename)
        data = response.read(34_000_001)
    if len(data)>34_000_000: raise ValueError("Source file >34 MB: "+filename)
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.verify()
        with Image.open(io.BytesIO(data)) as im:
            image=ImageOps.exif_transpose(im).convert("RGB")
    except UnidentifiedImageError as error:
        raise ValueError("Corrupt source image: "+filename) from error
    if image.width<1100 or image.height<650:
        raise ValueError("Source image too small: "+filename+" "+str(image.size))
    return image

def rewrite_frontmatter(raw, fields, slug):
    m = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n",raw,re.S)
    if not m or not re.search(r'(?m)^slug:\s*["\x27]?'+re.escape(slug)+r'["\x27]?\s*$',m.group(1)):
        raise ValueError("Missing or wrong frontmatter slug: "+slug)
    head=m.group(1)
    if re.search(r"(?m)^image_url:",head):
        fields["image_url"]=fields["image"]
    for key,value in fields.items():
        line=key+": "+json.dumps(value,ensure_ascii=False)
        pattern=r"(?m)^"+re.escape(key)+r":.*$"
        if re.search(pattern,head): head=re.sub(pattern,lambda _:line,head,count=1)
        else: head+="\n"+line
    return raw[:m.start(1)]+head+raw[m.end(1):]

def main():
    registry_path=ROOT/"content/registry/events.json"
    credits_path=ROOT/"content/article-photo-credits.json"
    budget_path=ROOT/"content/quality-baselines/image-asset-budget.json"
    registry=json.loads(registry_path.read_text(encoding="utf-8"))
    credits=json.loads(credits_path.read_text(encoding="utf-8"))
    credited_files={name for record in credits["images"] for name in record["files"]}
    successful=[]
    failures=[]
    for row in ROWS:
        slug=row["slug"]
        matches=[x for x in registry if x.get("slug")==slug and x.get("published") is True]
        if len(matches)!=1:raise ValueError("No unique published registry entry: "+slug)
        md=ROOT/str(matches[0].get("markdown_path") or ("content/events/"+slug+".md")).lstrip("/")
        if not md.is_file():raise ValueError("Article missing: "+str(md))
        try: image=fetch_image(row["file"])
        except Exception as error:
            failures.append((slug,str(error)))
            print("SKIPPED",slug,type(error).__name__,str(error),flush=True)
            continue
        stem="/assets/img/events/"+slug
        imgpaths=[]
        for width,height,suffix in [(1200,675,".webp"),(768,432,"-768w.webp"),(480,270,"-480w.webp")]:
            webpath=stem+suffix
            dest=ROOT/webpath.lstrip("/")
            ImageOps.fit(image,(width,height),method=Image.Resampling.LANCZOS).save(
                dest,"WEBP",quality=74,method=6)
            if dest.stat().st_size>750_000:raise ValueError("Cover asset exceeds per-file budget: "+webpath)
            imgpaths.append(webpath)
        og=ROOT/(stem+"-og.jpg").lstrip("/")
        ImageOps.fit(image,(1200,630),method=Image.Resampling.LANCZOS).save(
            og,"JPEG",quality=68,progressive=True,optimize=True)
        if og.stat().st_size>750_000:raise ValueError("OG asset exceeds budget: "+str(og))
        if any(f in credited_files for f in imgpaths):
            raise ValueError("Photo credit already assigned to a replacement cover: "+slug)
        vals={
            "image":stem+".webp",
            "image_alt":row["year"]+"年撮影の"+row["place"]+"の実写真",
            "image_caption":row["caption"],
            "image_credit":"Wikimedia Commons / "+row["author"]+" / "+row["license"],
            "updated_at":DATE
        }
        md.write_text(rewrite_frontmatter(md.read_text(encoding="utf-8"),vals.copy(),slug),encoding="utf-8")
        matches[0].update(vals)
        if "image_url" in matches[0]:matches[0]["image_url"]=vals["image"]
        credits["images"].append(dict(source_name="Wikimedia Commons",source_url=source_url(row["file"]),
            author=row["author"],license=row["license"],license_url=row["license_url"],
            modifications="横長トリミング・縮小・WebP/JPEG変換（変更した画像を元画像のライセンス条件に従い公開）",
            files=imgpaths))
        credited_files.update(imgpaths)
        successful.append(slug)
        print("UPDATED",slug,"original",image.size,"credit",row["author"],flush=True)
    if len(successful)<3:raise ValueError("Too few verified covers: "+str(successful)+" failures "+str(failures))
    registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    credits_path.write_text(json.dumps(credits,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    budget=json.loads(budget_path.read_text(encoding="utf-8"))
    image_dirs=[ROOT/"assets/img",ROOT/"assets/images"]
    extensions={".webp",".jpg",".jpeg",".png",".gif",".avif"}
    total=sum(p.stat().st_size for folder in image_dirs for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in extensions)
    old_limit=budget["max_total_bytes"]
    if total>old_limit:
        new_limit=math.ceil((total+350_000)/1_000_000)*1_000_000
        if new_limit>old_limit+4_000_000:raise ValueError("Unexpected cumulative image size jump")
        budget["max_total_bytes"]=new_limit
        budget_path.write_text(json.dumps(budget,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    log=ROOT/"docs/article-cover-seasonal-wave3-20261123.md"
    log.write_text("# Seasonal photo covers wave 3 — 2026-11-23\n\n"
        "This image batch uses curated historical photographs from Wikimedia Commons. "
        "Author, original file page, CC license, crop conversion and historical capture year "
        "are registered in content/article-photo-credits.json. No photo claims to depict the 2026 event.\n\n"
        "## Updated covers\n"+ "\n".join("- "+x for x in successful)+
        "\n\n## Skipped sources for manual review\n"+
        ("\n".join("- "+x+": "+why for x,why in failures) if failures else "- None")+
        "\n\n## Image asset budget\n"+str(total)+" bytes after update, limit "+
        str(budget["max_total_bytes"])+" bytes, per-file cap 750,000 bytes unchanged.\n",
        encoding="utf-8")
    print("BATCH_SUCCESS",len(successful),"BATCH_SKIPPED",len(failures),"TOTAL_IMAGE_BYTES",total,flush=True)

if __name__=="__main__":main()
