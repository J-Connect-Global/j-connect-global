"""Compare existing FreeDict/J-Connect headwords with official PDF headword columns.
Usage: python3 scripts/audit-german-vocabulary.py --pdf-dir /path/to/local/pdfs
Requires PyMuPDF. PDFs are audit inputs, never published. No example text is copied.
"""
import argparse,collections,hashlib,json,re,unicodedata
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'content/learn-german/flashcards'
SPECS=[('A1','a1.pdf',9,27,[(142,234)],range(5,8)),('A2','a2.pdf',8,31,[(34,106),(304,375)],range(4,7)),('B1','b1.pdf',16,102,[(34,139),(314,419)],range(7,15))]
URLS={'A1':'https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf','A2':'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf','B1':'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf'}

def extract(pdf,start,end,ranges,group_pages):
    doc=fitz.open(pdf);entries={};groups={}
    for pno in range(start-1,min(end,len(doc))):
        words=doc[pno].get_text('words')
        for lo,hi in ranges:
            lines=collections.defaultdict(list)
            for word in words:
                if lo<=word[0]<hi and 75<word[1]<775:lines[round(word[1])].append(word)
            previous='';previous_y=0
            for y,row_words in sorted(lines.items()):
                line=' '.join(w[4] for w in sorted(row_words,key=lambda w:w[0])).strip()
                clean=re.sub(r'^\s*(?:(?:der|die|das)\s+)?','',line)
                clean=re.sub(r'\(sich\)','',clean).strip()
                clean=re.split(r'[,;(/→]',clean)[0].strip()
                if not re.fullmatch(r'[A-Za-zÄÖÜäöüßẞ][A-Za-zÄÖÜäöüßẞ -]*',clean):continue
                if previous.endswith('-') and y-previous_y<20 and len(previous)>5:clean=previous[:-1]+clean
                previous=''
                if clean.endswith('-'):previous=clean;previous_y=y;continue
                if len(clean)>=2:entries.setdefault(clean,[]).append(pno+1)
    for pno in group_pages:
        for word in doc[pno].get_text('words'):
            value=word[4].strip(',;().:!?/–-')
            if re.fullmatch('[A-Za-zÄÖÜäöüßẞ]{2,}',value):groups.setdefault(value,[]).append(pno+1)
    return entries,groups

def comparison_keys(lemma):
    value=unicodedata.normalize('NFC',lemma)
    values=[value,re.sub('^sich ','',value)]
    if value=='Schmerzen':values.append('Schmerz')
    return list(dict.fromkeys(values))

def identity(lemma,pos):
    return (comparison_keys(lemma)[-1].casefold(),pos)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--pdf-dir',type=Path,required=True);args=parser.parse_args()
    index=json.loads((DATA/'legacy-card-index.json').read_text())
    source=json.loads((DATA/'cefr-lexicon-source.json').read_text())
    source_by_lemma={s['lemma']:s for s in source['entries']}
    docs=[];lookups={}
    for level,name,start,end,ranges,groups in SPECS:
        pdf=args.pdf_dir/name
        lookups[level]=extract(pdf,start,end,ranges,groups)
        docs.append(dict(source_id='goethe-'+level.lower(),level=level,url=URLS[level],sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),pages=len(fitz.open(pdf)),headword_pages=[start,end]))
    assignments={};used={}
    # Prefer existing practical cards over duplicate dictionary headwords. IDs never change meaning.
    records=sorted(enumerate(index['entries']),key=lambda row:(not row[1][4],row[0]))
    for _,(cid,lemma,old,pos,practical) in records:
        source_entry=source_by_lemma.get(lemma,{})
        key=identity(lemma,pos)
        matches=[]
        for level,(headwords,groups) in lookups.items():
            for candidate in comparison_keys(lemma):
                if candidate in headwords or candidate in groups:
                    matches.append(dict(source_id='goethe-'+level.lower(),level=level,pages=sorted(set(headwords.get(candidate,groups.get(candidate,[])))),match_kind='headword' if candidate in headwords else 'word-group',matched_lemma=candidate))
                    break
        entry=dict(level=None,status='practical-only' if practical else 'withheld-unclassified',matches=matches)
        if key in used:
            entry.update(status='duplicate',duplicate_of=used[key])
        elif source_entry.get('proper_name') and not practical:
            entry.update(status='withheld-proper-name')
        elif matches:
            entry.update(level=matches[0]['level'],status='exam-list-attestation')
            used[key]=cid
        elif practical:used[key]=cid
        assignments[cid]=entry
    payload=dict(schema_version=1,audited_at='2026-10-18',source_commit=index['source_commit'],method='Exact headword or word-group attestation in the cited official PDF, with explicit reflexive/plural aliases. Earliest attested list is a learning-placement reference, not a certified minimum CEFR level. No frequency quotas or missing-word promotion.',documents=docs,assignments={row[0]:assignments[row[0]] for row in index['entries']})
    (DATA/'level-evidence.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    print('Audit status:',dict(collections.Counter(e['status'] for e in assignments.values())))
    print('Attested placements:',dict(collections.Counter(e['level'] for e in assignments.values() if e['level'])))
if __name__=='__main__':main()
