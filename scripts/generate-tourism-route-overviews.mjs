import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data', 'tourism-route-overviews.json');
const outputDir = path.join(root, 'assets', 'images', 'living', 'routes');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!Array.isArray(data.routes) || data.routes.length !== 20) {
  throw new Error(`Expected 20 tourism routes, found ${data.routes?.length ?? 0}`);
}

const slugs = new Set();
for (const route of data.routes) {
  validateRoute(route);
  if (slugs.has(route.slug)) throw new Error(`Duplicate route slug: ${route.slug}`);
  slugs.add(route.slug);
}

const svgRoutes = data.routes.filter((route) => !route.asset);

fs.mkdirSync(outputDir, { recursive: true });

for (const route of svgRoutes) {
  fs.writeFileSync(path.join(outputDir, `${route.slug}-route-overview.svg`), renderDesktop(route), 'utf8');
  fs.writeFileSync(path.join(outputDir, `${route.slug}-route-overview-mobile.svg`), renderMobile(route), 'utf8');
}

console.log(`Generated ${svgRoutes.length * 2} responsive tourism route diagrams in ${path.relative(root, outputDir)}; ${data.routes.length - svgRoutes.length} route uses an external raster map.`);

function validateRoute(route) {
  if (!/^[a-z0-9-]+$/.test(route.slug || '')) throw new Error(`Invalid slug: ${route.slug}`);
  if (route.asset && !/^\/assets\/img\/[a-z0-9._/-]+\.webp$/i.test(route.asset)) {
    throw new Error(`Invalid external route asset for ${route.slug}: ${route.asset}`);
  }
  if (!route.title || !route.alt) throw new Error(`Missing accessible copy for ${route.slug}`);
  if (!Array.isArray(route.nodes) || route.nodes.length < 4 || route.nodes.length > 7) {
    throw new Error(`${route.slug} must have 4-7 nodes`);
  }
  const ids = new Set(route.nodes.map((node) => node.id));
  if (ids.size !== route.nodes.length) throw new Error(`Duplicate node id in ${route.slug}`);
  for (const node of route.nodes) {
    if (!node.label || !Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw new Error(`Invalid node in ${route.slug}: ${node.id}`);
    }
    if (node.x < 100 || node.x > 720 || node.y < 100 || node.y > 440) {
      throw new Error(`Desktop coordinates out of bounds in ${route.slug}: ${node.id}`);
    }
  }
  for (const [from, to] of [...(route.edges || []), ...(route.optionalEdges || [])]) {
    if (!ids.has(from) || !ids.has(to)) throw new Error(`Unknown edge ${from}->${to} in ${route.slug}`);
  }
}

function renderDesktop(route) {
  const nodes = new Map(route.nodes.map((node) => [node.id, node]));
  const edges = renderEdges(route.edges, nodes, false);
  const optionalEdges = renderEdges(route.optionalEdges, nodes, true);
  const cards = route.nodes.map((node) => renderNode(node, false)).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(route.title)}</title>
  <desc id="desc">${escapeXml(route.alt)}。実線は基本ルート、破線は任意の分岐。縮尺は正確ではありません。</desc>
  ${defs()}
  <rect x="1" y="1" width="818" height="518" rx="20" fill="#f8fbfe" stroke="#a9c5dc" stroke-width="2"/>
  <text x="34" y="44" fill="#062f55" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800">${escapeXml(route.title)}</text>
  <g transform="translate(34 72)" aria-hidden="true">
    <line x1="0" y1="0" x2="44" y2="0" stroke="#075b9a" stroke-width="7" stroke-linecap="round"/>
    <text x="56" y="6" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="16">基本ルート</text>
    <line x1="178" y1="0" x2="222" y2="0" stroke="#147d75" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>
    <text x="234" y="6" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="16">任意の追加</text>
  </g>
  <g aria-hidden="true">${edges}${optionalEdges}</g>
  ${cards}
  <text x="786" y="493" text-anchor="end" fill="#526c7f" font-family="system-ui, -apple-system, sans-serif" font-size="15">概略図／縮尺は正確ではありません</text>
</svg>
`;
}

function renderMobile(route) {
  const mobileNodes = route.nodes.map((node, index) => ({
    ...node,
    x: 240,
    y: route.nodes.length === 1 ? 340 : 140 + index * (500 / (route.nodes.length - 1))
  }));
  const nodes = new Map(mobileNodes.map((node) => [node.id, node]));
  const edges = renderEdges(route.edges, nodes, false, true);
  const optionalEdges = renderEdges(route.optionalEdges, nodes, true, true);
  const cards = mobileNodes.map((node) => renderNode(node, true)).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="720" viewBox="0 0 480 720" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(route.title)}（モバイル）</title>
  <desc id="desc">${escapeXml(route.alt)}。読み順を優先した縦配置で、実線は基本ルート、破線は任意の分岐。縮尺は正確ではありません。</desc>
  ${defs()}
  <rect x="1" y="1" width="478" height="718" rx="18" fill="#f8fbfe" stroke="#a9c5dc" stroke-width="2"/>
  <text x="24" y="40" fill="#062f55" font-family="system-ui, -apple-system, sans-serif" font-size="23" font-weight="800">${escapeXml(shortenTitle(route.title))}</text>
  <g transform="translate(25 68)" aria-hidden="true">
    <line x1="0" y1="0" x2="34" y2="0" stroke="#075b9a" stroke-width="7" stroke-linecap="round"/>
    <text x="44" y="6" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="16">基本</text>
    <line x1="128" y1="0" x2="162" y2="0" stroke="#147d75" stroke-width="5" stroke-dasharray="9 7" stroke-linecap="round"/>
    <text x="172" y="6" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="16">任意</text>
  </g>
  <g aria-hidden="true">${edges}${optionalEdges}</g>
  ${cards}
  <text x="456" y="695" text-anchor="end" fill="#526c7f" font-family="system-ui, -apple-system, sans-serif" font-size="16">概略図／縮尺は正確ではありません</text>
</svg>
`;
}

function defs() {
  return `<defs>
    <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#075b9a"/></marker>
    <marker id="optional-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#147d75"/></marker>
    <filter id="card-shadow" x="-15%" y="-20%" width="130%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#12324a" flood-opacity="0.15"/></filter>
  </defs>`;
}

function renderEdges(edgeList = [], nodes, optional, mobile = false) {
  return edgeList.map(([from, to]) => {
    const start = nodes.get(from);
    const end = nodes.get(to);
    const dash = optional ? ' stroke-dasharray="12 10"' : '';
    const color = optional ? '#147d75' : '#075b9a';
    const marker = optional ? 'optional-arrow' : 'route-arrow';
    const curve = mobile
      ? `M${round(start.x)} ${round(start.y + 34)} L${round(end.x)} ${round(end.y - 34)}`
      : `M${round(start.x)} ${round(start.y)} L${round(end.x)} ${round(end.y)}`;
    return `\n    <path d="${curve}" fill="none" stroke="${color}" stroke-width="${optional ? 5 : 7}"${dash} stroke-linecap="round" marker-end="url(#${marker})"/>`;
  }).join('');
}

function renderNode(node, mobile) {
  const width = mobile ? 408 : 224;
  const height = 68;
  const x = node.x - width / 2;
  const y = node.y - height / 2;
  const lines = wrapLabel(node.label);
  const optional = Boolean(node.optional);
  const fill = optional ? '#edf9f6' : '#ffffff';
  const stroke = optional ? '#4c9f96' : '#75a9d2';
  const dot = optional ? '#147d75' : '#075b9a';
  const labelY = lines.length === 1 ? node.y - 4 : node.y - 13;
  const textLines = lines.map((line, index) => `<tspan x="${round(node.x)}" dy="${index === 0 ? 0 : 20}">${escapeXml(line)}</tspan>`).join('');
  const noteY = node.y + (lines.length === 1 ? 19 : 25);
  return `<g filter="url(#card-shadow)">
    <rect x="${round(x)}" y="${round(y)}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <circle cx="${round(x + 20)}" cy="${round(node.y)}" r="9" fill="${dot}"/>
    <text x="${round(node.x)}" y="${round(labelY)}" text-anchor="middle" fill="#092f4e" font-family="system-ui, -apple-system, sans-serif" font-size="${mobile ? 17 : 18}" font-weight="800">${textLines}</text>
    <text x="${round(node.x)}" y="${round(noteY)}" text-anchor="middle" fill="#4d6779" font-family="system-ui, -apple-system, sans-serif" font-size="${mobile ? 16 : 15}">${escapeXml(node.note || '')}</text>
  </g>`;
}

function wrapLabel(value) {
  const text = String(value);
  if (text.length <= 18) return [text];
  const candidates = [' / ', '・', ' '];
  for (const separator of candidates) {
    const index = text.indexOf(separator, 7);
    if (index > 0 && index < text.length - separator.length) {
      return [text.slice(0, index + (separator === ' ' ? 0 : separator.length)).trim(), text.slice(index + separator.length).trim()];
    }
  }
  return [text.slice(0, 16), text.slice(16)];
}

function shortenTitle(value) {
  return String(value).replace(/の基本ルート$/, ' 基本ルート').replace(/を東へ進む/, '東進').replace(/を北から南へ進む/, '南下');
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
