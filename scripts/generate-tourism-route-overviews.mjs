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
  const expectedIllustration = `/assets/images/living/routes/${route.slug}-illustrated-map.webp`;
  if (route.illustration?.asset !== expectedIllustration) {
    throw new Error(`Missing or unexpected illustrated map background for ${route.slug}`);
  }
  const illustrationPath = path.join(root, route.illustration.asset.replace(/^\//, ''));
  if (!fs.existsSync(illustrationPath)) throw new Error(`Missing illustrated map file: ${route.illustration.asset}`);
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
    if (!/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(node.source || '')) {
      throw new Error(`Missing OpenStreetMap object source in ${route.slug}: ${node.id}`);
    }
  }
  if (route.geography) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(route.geography.verified_at || '')) {
      throw new Error(`Invalid geography verification date in ${route.slug}`);
    }
    if (route.geography.orientation !== 'north-up' || !/^https:\/\//.test(route.geography.source || '')) {
      throw new Error(`Geographic routes must be north-up and cite an HTTPS source: ${route.slug}`);
    }
    for (const node of route.nodes) {
      if (!Number.isFinite(node.latitude) || node.latitude < -90 || node.latitude > 90
        || !Number.isFinite(node.longitude) || node.longitude < -180 || node.longitude > 180) {
        throw new Error(`Missing or invalid verified coordinates in ${route.slug}: ${node.id}`);
      }
    }
    validateCardinalLayout(route);
  }
  for (const [from, to] of [...(route.edges || []), ...(route.optionalEdges || [])]) {
    if (!ids.has(from) || !ids.has(to)) throw new Error(`Unknown edge ${from}->${to} in ${route.slug}`);
  }
}

function validateCardinalLayout(route) {
  const tolerance = 0.0015;
  for (let leftIndex = 0; leftIndex < route.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < route.nodes.length; rightIndex += 1) {
      const left = route.nodes[leftIndex];
      const right = route.nodes[rightIndex];
      if (left.inset || right.inset) continue;
      const longitudeDifference = right.longitude - left.longitude;
      const latitudeDifference = right.latitude - left.latitude;
      if (Math.abs(longitudeDifference) >= tolerance && Math.sign(right.x - left.x) !== Math.sign(longitudeDifference)) {
        throw new Error(`East/west placement contradicts verified coordinates in ${route.slug}: ${left.id}/${right.id}`);
      }
      if (Math.abs(latitudeDifference) >= tolerance && Math.sign(left.y - right.y) !== Math.sign(latitudeDifference)) {
        throw new Error(`North/south placement contradicts verified coordinates in ${route.slug}: ${left.id}/${right.id}`);
      }
    }
  }
}

function renderDesktop(route) {
  const nodes = new Map(route.nodes.map((node) => [node.id, node]));
  const edges = renderEdges(route.edges, nodes, false);
  const optionalEdges = renderEdges(route.optionalEdges, nodes, true);
  const markers = renderMarkers(route.nodes);
  const callouts = renderDesktopCallouts(route.nodes);
  const titleSize = fitTextSize(shortenTitle(route.title), 22, 14, 22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(route.title)}</title>
  <desc id="desc">${escapeXml(route.alt)}。背景街並みはAI生成の編集イメージ。番号付き地点の相対位置はOpenStreetMapで確認。実線は基本ルート、破線は任意の分岐。縮尺と道路形状は正確ではありません。</desc>
  ${defs()}
  <g clip-path="url(#map-clip)">
    <image href="${escapeXml(route.illustration.asset)}" x="1" y="1" width="818" height="518" preserveAspectRatio="xMidYMid slice"/>
    <rect x="1" y="1" width="818" height="518" fill="url(#map-wash)"/>
  </g>
  <rect x="1" y="1" width="818" height="518" rx="20" fill="none" stroke="#173f68" stroke-width="2"/>
  <g aria-hidden="true">${edges}${optionalEdges}${markers}${callouts}</g>
  <g aria-hidden="true" filter="url(#card-shadow)">
    <rect x="14" y="14" width="550" height="72" rx="12" fill="#fffaf0" fill-opacity="0.95" stroke="#173f68" stroke-width="2"/>
    <text x="30" y="43" fill="#092f55" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}" font-weight="900">${escapeXml(shortenTitle(route.title))}</text>
    <text x="31" y="67" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" letter-spacing="1.2">ILLUSTRATED ROUTE MAP</text>
  </g>
  ${northCompass(770, 48, 27)}
  <g transform="translate(20 478)" aria-hidden="true">
    <rect x="-8" y="-18" width="443" height="28" rx="8" fill="#fffaf0" fill-opacity="0.94"/>
    <line x1="0" y1="-4" x2="34" y2="-4" stroke="#092f55" stroke-width="6" stroke-linecap="round"/>
    <text x="43" y="1" fill="#294b66" font-family="system-ui, -apple-system, sans-serif" font-size="12">基本</text>
    <line x1="84" y1="-4" x2="118" y2="-4" stroke="#147d75" stroke-width="5" stroke-dasharray="8 6" stroke-linecap="round"/>
    <text x="127" y="1" fill="#294b66" font-family="system-ui, -apple-system, sans-serif" font-size="12">任意</text>
    <text x="178" y="1" fill="#526c7f" font-family="system-ui, -apple-system, sans-serif" font-size="12">AI背景／OSM地点確認 ${escapeXml(route.geography.verified_at)}／縮尺不正確</text>
  </g>
</svg>
`;
}

function renderMobile(route) {
  const mobileNodes = route.nodes.map((node) => ({
    ...node,
    x: 46 + ((node.x - 100) / 620) * 388,
    y: 82 + ((node.y - 100) / 340) * 206
  }));
  const nodes = new Map(mobileNodes.map((node) => [node.id, node]));
  const edges = renderEdges(route.edges, nodes, false);
  const optionalEdges = renderEdges(route.optionalEdges, nodes, true);
  const markers = renderMarkers(mobileNodes, 11, 12);
  const list = renderMobileList(route.nodes);
  const titleSize = fitTextSize(shortenTitle(route.title), 18, 12, 20);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="740" viewBox="0 0 480 740" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(route.title)}（モバイル）</title>
  <desc id="desc">${escapeXml(route.alt)}。上部は北向きの位置関係、下部は番号順の地点一覧。背景街並みはAI生成の編集イメージで、地点はOpenStreetMapで確認しています。</desc>
  ${defs()}
  <g clip-path="url(#mobile-map-clip)">
    <image href="${escapeXml(route.illustration.asset)}" x="1" y="1" width="478" height="318" preserveAspectRatio="xMidYMid slice"/>
    <rect x="1" y="1" width="478" height="318" fill="url(#map-wash)"/>
  </g>
  <rect x="1" y="1" width="478" height="738" rx="18" fill="none" stroke="#173f68" stroke-width="2"/>
  <g aria-hidden="true">${edges}${optionalEdges}${markers}</g>
  <g aria-hidden="true" filter="url(#card-shadow)">
    <rect x="12" y="12" width="400" height="58" rx="11" fill="#fffaf0" fill-opacity="0.96" stroke="#173f68" stroke-width="2"/>
    <text x="25" y="37" fill="#092f55" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}" font-weight="900">${escapeXml(shortenTitle(route.title))}</text>
    <text x="26" y="57" fill="#405e72" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="800" letter-spacing="1">ILLUSTRATED ROUTE MAP</text>
  </g>
  ${northCompass(442, 40, 22)}
  <rect x="1" y="318" width="478" height="420" fill="#fffaf0" fill-opacity="0.97"/>
  ${list}
  <text x="24" y="719" fill="#526c7f" font-family="system-ui, -apple-system, sans-serif" font-size="12">AI背景／OSM地点確認 ${escapeXml(route.geography.verified_at)}／縮尺・道路形状は不正確</text>
</svg>
`;
}

function defs() {
  return `<defs>
    <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#075b9a"/></marker>
    <marker id="optional-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#147d75"/></marker>
    <filter id="card-shadow" x="-15%" y="-20%" width="130%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#12324a" flood-opacity="0.15"/></filter>
    <clipPath id="map-clip"><rect x="1" y="1" width="818" height="518" rx="20"/></clipPath>
    <clipPath id="mobile-map-clip"><path d="M19 1h442a18 18 0 0 1 18 18v299H1V19A18 18 0 0 1 19 1z"/></clipPath>
    <linearGradient id="map-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0" stop-opacity="0.03"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0.16"/></linearGradient>
  </defs>`;
}

function renderEdges(edgeList = [], nodes, optional) {
  return edgeList.map(([from, to]) => {
    const start = nodes.get(from);
    const end = nodes.get(to);
    const dash = optional ? ' stroke-dasharray="12 10"' : '';
    const color = optional ? '#147d75' : '#075b9a';
    const marker = optional ? 'optional-arrow' : 'route-arrow';
    const curve = `M${round(start.x)} ${round(start.y)} L${round(end.x)} ${round(end.y)}`;
    return `\n    <path d="${curve}" fill="none" stroke="#fffaf0" stroke-opacity="0.92" stroke-width="${optional ? 9 : 12}"${dash} stroke-linecap="round"/>\n    <path d="${curve}" fill="none" stroke="${color}" stroke-width="${optional ? 5 : 7}"${dash} stroke-linecap="round" marker-end="url(#${marker})"/>`;
  }).join('');
}

function renderMarkers(nodes, radius = 14, fontSize = 15) {
  return nodes.map((node, index) => {
    const fill = node.optional ? '#147d75' : '#092f55';
    return `<g filter="url(#card-shadow)">
      <circle cx="${round(node.x)}" cy="${round(node.y)}" r="${radius + 3}" fill="#fffaf0" fill-opacity="0.95"/>
      <circle cx="${round(node.x)}" cy="${round(node.y)}" r="${radius}" fill="${fill}"/>
      <text x="${round(node.x)}" y="${round(node.y + fontSize * 0.34)}" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="900">${index + 1}</text>
    </g>`;
  }).join('\n');
}

function renderDesktopCallouts(nodes) {
  const placements = desktopCalloutPlacements(nodes);
  return nodes.map((node, index) => {
    const placement = placements.get(node.id);
    const cardWidth = 210;
    const cardX = placement.side === 'left' ? 18 : 820 - 18 - cardWidth;
    const cardY = placement.y - 24;
    const anchorX = placement.side === 'left' ? cardX + cardWidth : cardX;
    const anchorY = placement.y;
    const fill = node.optional ? '#edf9f3' : '#fffaf0';
    const stroke = node.optional ? '#147d75' : '#173f68';
    const labelSize = fitTextSize(node.label, 13.5, 10.5, 17);
    const noteSize = fitTextSize(node.note || '', 11.5, 9.5, 22);
    return `<path d="M${round(node.x)} ${round(node.y)} L${anchorX} ${round(anchorY)}" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/>
    <path d="M${round(node.x)} ${round(node.y)} L${anchorX} ${round(anchorY)}" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    <g filter="url(#card-shadow)">
      <rect x="${cardX}" y="${round(cardY)}" width="${cardWidth}" height="48" rx="9" fill="${fill}" fill-opacity="0.96" stroke="${stroke}" stroke-width="1.5"/>
      <rect x="${cardX + 7}" y="${round(cardY + 8)}" width="28" height="32" rx="7" fill="${stroke}"/>
      <text x="${cardX + 21}" y="${round(cardY + 30)}" text-anchor="middle" fill="#fff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900">${index + 1}</text>
      <text x="${cardX + 43}" y="${round(cardY + 20)}" fill="#092f4e" font-family="system-ui, -apple-system, sans-serif" font-size="${labelSize}" font-weight="850">${escapeXml(node.label)}</text>
      <text x="${cardX + 43}" y="${round(cardY + 37)}" fill="#4d6779" font-family="system-ui, -apple-system, sans-serif" font-size="${noteSize}">${escapeXml(node.note || '')}</text>
    </g>`;
  }).join('\n');
}

function desktopCalloutPlacements(nodes) {
  const left = [];
  const right = [];
  nodes.forEach((node) => (node.x < 410 ? left : right).push(node));
  while (left.length > 4) right.push(left.splice(left.findIndex((node) => Math.abs(node.x - 410) === Math.min(...left.map((item) => Math.abs(item.x - 410)))), 1)[0]);
  while (right.length > 4) left.push(right.splice(right.findIndex((node) => Math.abs(node.x - 410) === Math.min(...right.map((item) => Math.abs(item.x - 410)))), 1)[0]);
  const placements = new Map();
  for (const [side, items] of [['left', left], ['right', right]]) {
    items.sort((a, b) => a.y - b.y);
    items.forEach((node, index) => {
      const y = items.length === 1 ? 260 : 126 + index * (294 / (items.length - 1));
      placements.set(node.id, { side, y });
    });
  }
  return placements;
}

function renderMobileList(nodes) {
  const startY = 346;
  const rowHeight = Math.min(50, 344 / nodes.length);
  return nodes.map((node, index) => {
    const centerY = startY + index * rowHeight;
    const fill = node.optional ? '#147d75' : '#092f55';
    return `<g aria-hidden="true">
      <circle cx="30" cy="${round(centerY)}" r="14" fill="${fill}"/>
      <text x="30" y="${round(centerY + 5)}" text-anchor="middle" fill="#fff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900">${index + 1}</text>
      <text x="54" y="${round(centerY - 2)}" fill="#092f4e" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="850">${escapeXml(node.label)}</text>
      <text x="54" y="${round(centerY + 16)}" fill="#4d6779" font-family="system-ui, -apple-system, sans-serif" font-size="12.5">${escapeXml(node.note || '')}${node.optional ? '（任意）' : ''}</text>
      <line x1="20" y1="${round(centerY + rowHeight / 2 - 3)}" x2="460" y2="${round(centerY + rowHeight / 2 - 3)}" stroke="#d7c8a7" stroke-width="1"/>
    </g>`;
  }).join('\n');
}

function northCompass(cx, cy, radius) {
  return `<g aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#fffaf0" fill-opacity="0.94" stroke="#173f68" stroke-width="2"/>
    <path d="M${cx} ${cy - radius + 5} L${cx - 6} ${cy + 4} L${cx} ${cy + 1} L${cx + 6} ${cy + 4} Z" fill="#092f55"/>
    <text x="${cx}" y="${cy - radius - 5}" text-anchor="middle" fill="#092f55" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900">N</text>
  </g>`;
}

function fitTextSize(value, preferred, minimum, comfortableLength) {
  const length = [...String(value || '')].reduce((total, character) => total + (/^[\x00-\xff]$/.test(character) ? 0.58 : 1), 0);
  if (length <= comfortableLength) return preferred;
  return Math.max(minimum, Math.round((preferred * comfortableLength / length) * 10) / 10);
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
