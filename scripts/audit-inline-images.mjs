import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = process.env.INLINE_AUDIT_FROM || '2026-10-22';
const to = process.env.INLINE_AUDIT_TO || '2026-11-22';
const idx = process.argv.indexOf('--out');
const output = idx >= 0 ? process.argv[idx + 1] : null;
if (idx >= 0 && !output) throw Error('Expected path after --out');
const records = [], errors = [];
const patterns = [
  /!\[([^\]]*)\]\(\s*<?(\/assets\/[^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g,
  /<img\b[^>]*\bsrc=["'](\/assets\/[^"']+)["'][^>]*>/g
];
for (const section of ['events','living','learn-german']) {
  const registry = JSON.parse(fs.readFileSync(path.join(root,'content/registry',section+'.json'),'utf8'));
  for (const item of registry.filter(x => x.published && x.published_at >= from && x.published_at <= to)) {
    const mdPath = path.join(root,String(item.markdown_path || '').replace(/^\/+/, ''));
    if (!item.markdown_path || !fs.existsSync(mdPath)) {
      errors.push(item.slug + ': markdown not found: ' + item.markdown_path); continue;
    }
    const md = fs.readFileSync(mdPath,'utf8');
    const found = [];
    for (let type=0; type<patterns.length; type++) {
      for (const m of md.matchAll(patterns[type])) {
        const tag = m[0];
        found.push({offset:m.index,asset:type===0?m[2]:m[1],alt:type===0?m[1]:(tag.match(/\balt=["']([^"']*)["']/)?.[1] || '')});
      }
    }
    found.sort((a,b)=>a.offset-b.offset);
    const images = found.map((x,i)=>{
      const asset=x.asset.split('?')[0].split('#')[0];
      const file=path.join(root,asset.replace(/^\/+/, ''));
      const exists=fs.existsSync(file);
      const type=path.extname(asset).replace('.','').toLowerCase();
      const bytes=exists?fs.readFileSync(file):null;
      return {image_number:i+2,path:asset,alt:x.alt,file_type:type,exists,
        sha256:bytes?crypto.createHash('sha256').update(bytes).digest('hex'):null,
        svg_accessible:type==='svg'?(!!bytes && /<title\b/.test(bytes.toString('utf8')) && /<desc\b/.test(bytes.toString('utf8'))):null,
        visual_review:'not_assessed'};
    });
    records.push({slug:item.slug,title:item.title,section,published_at:item.published_at,
      url:item.canonical_url||item.url,markdown_path:item.markdown_path,images});
  }
}
records.sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.slug.localeCompare(b.slug));
const bySha = new Map();
for (const a of records) for (const im of a.images) {
  const key=im.sha256||im.path;
  if (!bySha.has(key)) bySha.set(key,[]);
  bySha.get(key).push({slug:a.slug,path:im.path,image_number:im.image_number});
}
const reused_assets=[...bySha.values()].filter(v=>new Set(v.map(x=>x.slug)).size>1);
const images=records.flatMap(a=>a.images);
const summary={articles:records.length,inline_images:images.length,
  svg:images.filter(x=>x.file_type==='svg').length,webp:images.filter(x=>x.file_type==='webp').length,
  other:images.filter(x=>!['svg','webp'].includes(x.file_type)).length,
  missing_assets:images.filter(x=>!x.exists).length,missing_alt:images.filter(x=>!x.alt.trim()).length,
  svg_without_title_or_desc:images.filter(x=>x.file_type==='svg'&&!x.svg_accessible).length,
  reused_asset_groups:reused_assets.length,read_errors:errors.length};
const report={scope:{from,to,cover_excluded:true},summary,
  methodology:'Published registry markdown. Inline Markdown and HTML images; same-content reuse detected via SHA-256. Quality requires human visual inspection.',
  reused_assets,errors,articles:records};
if(output){const dest=path.resolve(root,output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n','utf8');console.log('Inventory: '+path.relative(root,dest));}
console.log(JSON.stringify(summary,null,2));
if(errors.length||summary.missing_assets) process.exitCode=1;
