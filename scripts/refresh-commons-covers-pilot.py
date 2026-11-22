#!/usr/bin/env python3
"""Curated archival Commons photography for 3 J-Connect cover images; draft PR only."""
from __future__ import annotations
import hashlib, io, json, re, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parent.parent
DATE="2026-11-22"
ROWS=[
 {"slug":"cologne-christmas-markets-2026-guide","file":"Weihnachtsmarkt am Kölner Dom.jpg",
  "source":"https://commons.wikimedia.org/wiki/File:Weihnachtsmarkt_am_K%C3%B6lner_Dom.jpg",
  "author":"Franz Gerd Frank","license":"CC BY-SA 4.0","license_url":"https://creativecommons.org/licenses/by-sa/4.0",
  "alt":"2011年撮影のケルン大聖堂前クリスマスマーケットの実写真",
  "caption":"2011年撮影の過去の会場風景。2026年の会場配置・屋台状況を示すものではありません。",
  "markdown":"content/events/cologne-christmas-markets-2026-guide.md"},
 {"slug":"berlin-christmas-markets-2026-guide","file":"2016-11-22 Christmas market on Gendarmenmarkt, Berlin.jpg",
  "source":"https://commons.wikimedia.org/wiki/File:2016-11-22_Christmas_market_on_Gendarmenmarkt%2C_Berlin.jpg",
  "author":"Sergey Galyonkin","license":"CC BY-SA 2.0","license_url":"https://creativecommons.org/licenses/by-sa/2.0",
  "alt":"2016年撮影のベルリン・ジャンダルメンマルクトのクリスマスマーケットの実写真",
  "caption":"2016年撮影の過去の会場風景。2026年の会場配置・料金・出店内容は本文をご確認ください。",
  "markdown":"content/events/berlin-christmas-markets-2026-guide.md"},
 {"slug":"nrw-christmas-market-day-trips-2026","file":"Monschau, Dezember 2013, 020.jpg",
  "source":"https://commons.wikimedia.org/wiki/File:Monschau%2C_Dezember_2013%2C_020.jpg",
  "author":"L.1951a","license":"CC BY-SA 3.0","license_url":"https://creativecommons.org/licenses/by-sa/3.0",
  "alt":"2013年12月に撮影されたモンシャウの冬の街並みの写真",
  "caption":"2013年12月のモンシャウの写真。日帰り候補の1地点で、2026年の全会場を撮影したものではありません。",
  "markdown":"content/events/nrw-christmas-market-day-trips-2026.md"},
]
def image_url(filename):
    name=filename.replace(" ","_")
    d=hashlib.md5(name.encode("utf-8")).hexdigest()
    return "https://upload.wikimedia.org/wikipedia/commons/"+d[0]+"/"+d[:2]+"/"+urllib.parse.quote(name,safe="()-._~")
def download(filename):
    req=urllib.request.Request(image_url(filename),headers={"User-Agent":"JConnectPhotoEditorial/1.0 (https://j-connect-global.com)"})
    with urllib.request.urlopen(req,timeout=55) as response:
        if "image/" not in response.headers.get("Content-Type",""): raise ValueError("Not an image: "+filename)
        data=response.read(18000001)
        if len(data)>18000000: raise ValueError("Original >18MB: "+filename)
    with Image.open(io.BytesIO(data)) as source:
        source.verify()
    with Image.open(io.BytesIO(data)) as source:
        return ImageOps.exif_transpose(source).convert("RGB")
def rewrite_frontmatter(raw, fields, slug):
    m=re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n",raw,re.S)
    if not m or not re.search(r'(?m)^slug:\s*["\x27]?'+re.escape(slug)+r'["\x27]?\s*$',m.group(1)):
        raise ValueError("Missing or wrong frontmatter slug: "+slug)
    head=m.group(1)
    if re.search(r"(?m)^image_url:",head): fields["image_url"]=fields["image"]
    for key,value in fields.items():
        line=key+": "+json.dumps(value,ensure_ascii=False)
        patt=r"(?m)^"+re.escape(key)+r":.*$"
        if re.search(patt,head):head=re.sub(patt,lambda _:line,head,count=1)
        else:head+="\n"+line
    return raw[:m.start(1)]+head+raw[m.end(1):]
def main():
    regpath=ROOT/"content/registry/events.json"
    creditpath=ROOT/"content/article-photo-credits.json"
    registry=json.loads(regpath.read_text(encoding="utf-8"))
    credits=json.loads(creditpath.read_text(encoding="utf-8"))
    oldpaths={p for rec in credits["images"] for p in rec["files"]}
    for rec in ROWS:
        slug=rec["slug"]
        matches=[x for x in registry if x.get("slug")==slug and x.get("published") is True]
        if len(matches)!=1:raise ValueError("Registry entry not unique: "+slug)
        md=ROOT/rec["markdown"]
        raw=md.read_text(encoding="utf-8")
        photo=download(rec["file"])
        print("Downloaded",slug,photo.size,flush=True)
        stem="/assets/img/events/"+slug
        sizes=[(1200,675,stem+".webp"),(768,432,stem+"-768w.webp"),(480,270,stem+"-480w.webp")]
        for w,h,webpath in sizes:
            target=ROOT/webpath.lstrip("/")
            target.parent.mkdir(parents=True,exist_ok=True)
            ImageOps.fit(photo,(w,h),method=Image.Resampling.LANCZOS).save(target,"WEBP",quality=76,method=6)
            if target.stat().st_size>750000:raise ValueError("Image over site budget: "+str(target))
        ImageOps.fit(photo,(1200,630),method=Image.Resampling.LANCZOS).save(ROOT/(stem+"-og.jpg").lstrip("/"),"JPEG",quality=70,progressive=True,optimize=True)
        fields={"image":stem+".webp","image_alt":rec["alt"],"image_caption":rec["caption"],
                "image_credit":"Wikimedia Commons / "+rec["author"]+" / "+rec["license"],"updated_at":DATE}
        md.write_text(rewrite_frontmatter(raw,fields.copy(),slug),encoding="utf-8")
        entry=matches[0]
        entry.update(fields)
        if "image_url" in entry:entry["image_url"]=fields["image"]
        credited=[f for _,_,f in sizes]
        if any(f in oldpaths for f in credited):raise ValueError("Already credited photo: "+slug)
        credits["images"].append({"source_name":"Wikimedia Commons","source_url":rec["source"],"author":rec["author"],
                "license":rec["license"],"license_url":rec["license_url"],
                "modifications":"横長トリミング・縮小・WebP/JPEG変換（改変版を元画像と同じCC BY-SAライセンスで公開）","files":credited})
    regpath.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    creditpath.write_text(json.dumps(credits,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Ready",len(ROWS),"archival licensed photo covers.")
if __name__=="__main__":
    main()
