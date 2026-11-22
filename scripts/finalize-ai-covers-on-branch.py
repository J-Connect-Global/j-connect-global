#!/usr/bin/env python3
"""Finalize explicitly changed AI-generated cover files on the J-Connect draft branch."""
import json, re, subprocess
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parent.parent
ENTRIES={
 "christmas-post-germany-to-japan-2026":("living","content/living/christmas-post-germany-to-japan-2026.md","ドイツの郵便窓口でクリスマス前に日本宛ての荷物を準備する人のAI生成イメージ","AI生成の編集イメージ。実在の郵便局、人物、配送書類を撮影したものではありません。"),
 "cologne-carnival-2026-27-guide":("events","content/events/cologne-carnival-2026-27-guide.md","ケルン大聖堂の近くで華やかな衣装を着てカーニバルを祝う人々のAI生成イメージ","AI生成の編集イメージ。実際の2026/27年のパレードや参加者の記録写真ではありません。"),
 "christmas-new-year-greetings":("learn-german","content/learn-german/christmas-new-year-greetings.md","クリスマスの飾りがある机でドイツ語のグリーティングカードを書く人のAI生成イメージ","AI生成の編集イメージ。実在の人物やカードを撮影したものではありません。"),
 "germany-january-2027-changes":("events","content/events/news/germany-january-2027-changes.md","ドイツの制度変更を調べるためカレンダーと書類とユーロ紙幣を整理した机のAI生成イメージ","AI生成の編集イメージ。公式の制度書類や金額を示すものではありません。"),
 "rundfunkbeitrag-meldedatenabgleich-2026":("events","content/events/news/rundfunkbeitrag-meldedatenabgleich-2026.md","ドイツの自宅に届いた行政通知を読んで確認する人のAI生成イメージ","AI生成の編集イメージ。実際の放送負担金事務局の通知書を再現したものではありません。"),
 "euro-7-germany-2026":("events","content/events/news/euro-7-germany-2026.md","ドイツの自動車販売店で新車の特徴を相談する二人のAI生成イメージ","AI生成の編集イメージ。特定の車種のEuro 7適合や認証を示すものではありません。")
}
def head_update(raw, values, slug):
    m=re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n",raw,re.S)
    if not m or not re.search(r'(?m)^slug:\s*["\x27]?'+re.escape(slug)+r'["\x27]?\s*$',m.group(1)): raise ValueError("Article frontmatter mismatch: "+slug)
    hd=m.group(1)
    if re.search(r"(?m)^image_url:",hd):values["image_url"]=values["image"]
    for key,value in values.items():
        text=key+": "+json.dumps(value,ensure_ascii=False)
        expression=r"(?m)^"+re.escape(key)+r":.*$"
        if re.search(expression,hd):hd=re.sub(expression,lambda _:text,hd,count=1)
        else:hd+="\n"+text
    return raw[:m.start(1)]+hd+raw[m.end(1):]
def main():
    changes=subprocess.check_output(["git","diff","--name-only","HEAD^","HEAD"],cwd=ROOT,text=True).splitlines()
    slugs=[]
    for slug,(section,*_) in ENTRIES.items():
        if "assets/img/"+section+"/"+slug+".webp" in changes:slugs.append(slug)
    if not slugs:raise RuntimeError("No changed AI cover files in pushed commit")
    registries={}
    for slug in slugs:
        section,md,alt,caption=ENTRIES[slug]
        src=ROOT/"assets/img"/section/(slug+".webp")
        with Image.open(src) as im:
            im=im.convert("RGB")
            if im.size!=(1200,675):raise ValueError("Hero must be 1200x675: "+slug)
            for w,h,suffix in [(768,432,"-768w.webp"),(480,270,"-480w.webp")]:
                ImageOps.fit(im,(w,h),method=Image.Resampling.LANCZOS).save(src.with_name(slug+suffix),"WEBP",quality=78,method=6)
            ImageOps.fit(im,(1200,630),method=Image.Resampling.LANCZOS).save(src.with_name(slug+"-og.jpg"),"JPEG",quality=72,optimize=True,progressive=True)
        credit="AI-generated editorial image / J-Connect Global"
        vals={"image":"/assets/img/"+section+"/"+slug+".webp","image_alt":alt,"image_caption":caption,"image_credit":credit,"updated_at":"2026-11-22"}
        path=ROOT/md
        path.write_text(head_update(path.read_text(encoding="utf-8"),vals.copy(),slug),encoding="utf-8")
        regpath=ROOT/"content/registry"/(section+".json")
        if regpath not in registries:registries[regpath]=json.loads(regpath.read_text(encoding="utf-8"))
        hits=[r for r in registries[regpath] if r.get("slug")==slug and r.get("published")==True]
        if len(hits)!=1:raise RuntimeError("Registry mismatch: "+slug)
        hits[0].update(vals)
        if "image_url" in hits[0]:hits[0]["image_url"]=vals["image"]
        print("Finalized",slug,flush=True)
    for p,data in registries.items():p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__": main()
