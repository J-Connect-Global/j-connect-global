import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://j-connect-global.com';
const PRIMARY_JA_PATH = '/germany/ja/';
const PAGE_REGISTRY_PATH = 'content/registry/pages.json';
const DEFAULT_IMAGE = '/assets/img/placeholders/jconnect-default-card.webp';
let trackedFileSet;
const articleImageDirs = {
  living: '/assets/img/living',
  events: '/assets/img/events',
  'learn-german': '/assets/img/learn-german'
};
const pillarLabels = {
  home: 'ホーム',
  community: '交流・掲示板',
  living: '生活・手続き',
  jobs: '仕事・求人',
  events: 'ニュース・イベント',
  'learn-german': 'ドイツ語・学び',
  utility: 'J-CONNECTについて',
  legacy: '旧ページ'
};

const contentTypes = {
  living: {
    label: '生活・手続き',
    hubUrl: '/germany/ja/living/',
    hubPath: 'germany/ja/living/index.html',
    registryPath: 'content/registry/living.json',
    publicBase: 'germany/ja/living',
    gridMarker: 'living-grid',
    homeMarker: 'home-living',
    homeLimit: 3,
    homeSectionLimit: 5,
    cardText: '記事を読む',
    backText: '生活・手続き一覧へ戻る'
  },
  events: {
    label: 'ニュース・イベント',
    hubUrl: '/germany/ja/events/',
    hubPath: 'germany/ja/events/index.html',
    registryPath: 'content/registry/events.json',
    publicBase: 'germany/ja/events',
    gridMarker: 'events-grid',
    homeMarker: 'home-events',
    homeLimit: 3,
    cardText: 'イベント記事を読む',
    backText: 'イベント一覧へ戻る'
  },
  'learn-german': {
    label: 'ドイツ語・学び',
    hubUrl: '/germany/ja/learn-german/',
    hubPath: 'germany/ja/learn-german/index.html',
    registryPath: 'content/registry/learn-german.json',
    publicBase: 'germany/ja/learn-german',
    gridMarker: 'learn-german-grid',
    homeMarker: 'home-learn-german',
    homeLimit: 5,
    cardText: '記事を読む',
    backText: 'ドイツ語・学びへ戻る'
  }
};

const learnGermanContentTypes = new Set(['phrase', 'route', 'resource']);
const learnGermanMetadataFields = ['situation', 'goal', 'level', 'skill', 'duration'];
const learnGermanResourceFields = ['resource_skills', 'resource_format', 'resource_level', 'resource_price_type'];
const learnGermanLabels = {
  content_type: {
    phrase: '実用フレーズ',
    route: '学習ルート',
    resource: '教材・リソース'
  },
  situation: {
    phone: '電話',
    appointment: '予約',
    medical: '病院・薬局',
    pharmacy: '薬局',
    administration: '役所',
    anmeldung: 'Anmeldung',
    housing: '住まい',
    landlord: '大家',
    kita: 'Kita',
    school: '学校',
    work: '職場',
    'business-email': 'ビジネスメール',
    bank: '銀行',
    insurance: '保険',
    shopping: '買い物',
    parenting: '子育て'
  },
  goal: {
    'new-arrival': 'ドイツに来たばかり',
    'daily-life': '生活で使う',
    employment: '仕事',
    'housing-contract': '賃貸契約',
    healthcare: '医療・健康保険',
    parenting: '子育て',
    'school-kita': '学校・Kita'
  },
  skill: {
    speaking: '話す',
    listening: '聞く',
    reading: '読む',
    writing: '書く'
  },
  duration: {
    '5min': '5分',
    '15min': '15分',
    '30min': '30分'
  },
  resource_skills: {
    speaking: '話す',
    listening: '聞く',
    reading: '読む',
    writing: '書く'
  },
  resource_format: {
    app: 'アプリ',
    video: '動画',
    website: 'サイト',
    course: '講座',
    exam: '試験対策'
  },
  resource_level: {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2plus: 'B2以上'
  },
  resource_price_type: {
    free: '無料',
    freemium: '一部無料',
    paid: '有料'
  }
};

function main() {
  // Source of truth: registries and Markdown generate committed HTML, sitemap,
  // and search index. Do not hand-edit generated article output as primary data.
  const datasets = Object.fromEntries(
    Object.keys(contentTypes).map((type) => [type, loadContentType(type)])
  );
  const allItems = Object.values(datasets).flatMap((items) => items);
  const pages = loadPagesRegistry();

  for (const [type, items] of Object.entries(datasets)) {
    for (const item of items.filter((entry) => entry.published)) {
      writeArticlePage(type, item, allItems);
    }
    updateHub(type, items);
  }

  updateHome(datasets);
  updateSearchIndex(allItems, pages);
  updateSitemap(allItems, pages);

  console.log(`Content build complete: ${allItems.filter((item) => item.published).length} published article pages processed.`);
}

function loadContentType(type) {
  const config = contentTypes[type];
  const registry = readJson(config.registryPath);

  return registry.map((entry, index) => {
    const markdownRel = trimLeadingSlash(entry.markdown_path || `/content/${type}/${entry.slug}.md`);
    const markdownPath = path.join(root, markdownRel);
    const markdown = fs.existsSync(markdownPath) ? readText(markdownRel) : '';
    const frontMatter = parseFrontMatter(markdown).data;
    const merged = normalizeItem(type, { ...frontMatter, ...entry, __frontmatter: frontMatter }, index);

    return {
      ...merged,
      markdown,
      markdownRel
    };
  });
}

function loadPagesRegistry() {
  if (!fs.existsSync(path.join(root, PAGE_REGISTRY_PATH))) return [];
  const pages = readJson(PAGE_REGISTRY_PATH);
  if (!Array.isArray(pages)) {
    throw new Error(`${PAGE_REGISTRY_PATH} must contain a JSON array.`);
  }
  return pages.map((page) => ({
    ...page,
    url: normalizePageUrl(page.url),
    canonical_url: normalizePageUrl(page.canonical_url || page.url),
    tags: toArray(page.tags)
  }));
}

function normalizeItem(type, item, index) {
  const tags = toArray(item.tags?.length ? item.tags : item.chips);
  const slug = String(item.slug || '').trim();
  const published = item.published === true || item.published === 'true' || item.status === 'published';
  const url = item.url || `/germany/ja/${type}/${slug}/`;
  const summary = item.summary || item.description || '';
  const frontmatter = item.__frontmatter || {};
  const explicitImage = firstArticleImage(
    frontmatter.image,
    item.image,
    frontmatter.hero_image,
    item.hero_image,
    item.heroImage,
    item.cover_image,
    item.coverImage,
    item.thumbnail,
    item.thumbnail_url,
    item.imageUrl,
    item.image_url
  );
  const imageSrc = getArticleImageSrc({ ...item, image: explicitImage }, type);
  const hasLegacyPlaceholderImage = [
    item.image_url,
    item.imageUrl,
    item.thumbnail_url,
    item.thumbnail,
    item.cover_image,
    item.hero_image
  ].some(isLegacyPlaceholderImage);
  const imageAlt = getArticleImageAlt({
    ...item,
    image_alt: firstNonEmpty(frontmatter.image_alt, frontmatter.hero_image_alt, hasLegacyPlaceholderImage ? '' : item.image_alt, item.imageAlt, item.hero_image_alt, item.alt_text, item.alt)
  });

  const normalized = {
    ...item,
    __frontmatter: undefined,
    type,
    slug,
    url,
    summary,
    published,
    markdown_path: item.markdown_path || `/content/${type}/${slug}.md`,
    canonical_url: item.canonical_url || url,
    updated_at: item.updated_at || item.last_verified || item.published_at || '',
    tags,
    home_visible: item.home_visible !== false,
    home_order: Number.isFinite(Number(item.home_order)) ? Number(item.home_order) : 1000 + index,
    hub_visible: item.hub_visible !== false,
    search_visible: item.search_visible !== false,
    sitemap_visible: item.sitemap_visible !== false,
    official_sources: normalizeSources(item.official_sources?.length ? item.official_sources : item.sources),
    disclaimer_type: item.disclaimer_type || type,
    related_articles: toArray(item.related_articles),
    image: explicitImage,
    image_url: imageSrc,
    image_src: imageSrc,
    image_alt: imageAlt,
    image_caption: firstNonEmpty(frontmatter.image_caption, item.image_caption, item.imageCaption),
    image_credit: firstNonEmpty(frontmatter.image_credit, item.image_credit, item.imageCredit),
    review: normalizeReview(item)
  };

  if (type !== 'learn-german') return normalized;

  return normalizeLearnGermanItem(normalized);
}

function normalizeLearnGermanItem(item) {
  const normalized = { ...item };
  const contentType = String(item.content_type || '').trim();
  normalized.content_type = learnGermanContentTypes.has(contentType) ? contentType : 'phrase';
  for (const field of learnGermanMetadataFields) {
    normalized[field] = uniqueArray(toArray(item[field]));
  }
  for (const field of learnGermanResourceFields) {
    normalized[field] = uniqueArray(toArray(item[field]));
  }
  normalized.related_living_guides = uniqueArray(toArray(item.related_living_guides));
  return normalized;
}

function writeArticlePage(type, item, allItems) {
  const config = contentTypes[type];
  const publicPath = outputPathFromUrl(item.url || `/${config.publicBase}/${item.slug}/`);
  const bodyHtml = markdownToHtml(item.markdown, { type, item });
  const html = renderArticlePage(type, item, bodyHtml, allItems);
  writeText(publicPath, html);
}

function renderArticlePage(type, item, bodyHtml, allItems) {
  const config = contentTypes[type];
  const title = `${item.meta_title || item.title} | ${config.label} | J-Connect Germany`;
  const canonicalHref = absoluteUrl(item.canonical_url);
  const metaBlock = renderArticleMetaSpans(type, item);
  const ogMeta = renderOpenGraphMeta(type, item, title, canonicalHref);
  const structuredData = renderStructuredData(type, item, title, canonicalHref);
  const toc = extractArticleToc(item.markdown, item.title);
  const articleBodyHtml = renderArticleBodyHtml(type, item, bodyHtml);
  const extraScripts = renderArticleExtraScripts(type, item);
  const primaryHeroMedia = shouldRenderArticleHeroFigure(item)
    ? renderArticleHeroFigure(item)
    : renderArticleHeroMedia(type, item);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttribute(item.summary)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeAttribute(canonicalHref)}">
${indent(renderJaHreflang(canonicalHref), 2)}
${indent(ogMeta, 2)}
  <link rel="icon" type="image/png" href="/assets/images/brand/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/ja-header-footer.css?v=portal5-nav-20260618">
  <link rel="stylesheet" href="/assets/css/jconnect-ui.css">
  <link rel="stylesheet" href="/assets/css/cookie-consent.css">
  <link rel="stylesheet" href="/assets/css/social-share.css">
<script src="/assets/js/cookie-consent.js" defer></script>
${indent(structuredData, 2)}
</head>
<body>
${renderHeader(type, item.url)}
  <main class="container article-main">
    <div class="article-layout">
      <article class="article-content-shell">
        <header class="article-header">
          <span class="article-kicker">${escapeHtml(item.category || config.label)}</span>
          <h1 class="article-title">${escapeHtml(item.title)}</h1>
          <p class="article-summary">${escapeHtml(item.summary)}</p>
          <div class="article-meta">
            ${item.tags.map((tag) => `<span class="article-chip">${escapeHtml(tag)}</span>`).join('\n          ')}
            <span>公開: ${escapeHtml(item.published_at || '')}</span>
            <span>最終確認: ${escapeHtml(item.last_verified || '')}</span>${metaBlock}
          </div>
        </header>

${indent(primaryHeroMedia, 8)}
${indent(renderArticleMobileToc(toc), 8)}
        <div class="article-body">
${indent(articleBodyHtml, 10)}
          <p><a class="article-back-link" href="${config.hubUrl}">${escapeHtml(config.backText)}</a></p>
${indent(renderDisclaimer(item), 10)}
        </div>
      </article>
${indent(renderArticleSidebar(type, item, allItems, toc), 6)}
    </div>
${indent(renderRelatedSection(item, allItems), 4)}
  </main>

${renderFooter()}
${extraScripts ? `${indent(extraScripts, 2)}\n` : ''}  <script src="/assets/js/common.js"></script>
  <script src="/assets/js/main.js"></script>
  <script src="/assets/js/social-share.js"></script>
</body>
</html>
`;
}

function renderArticleBodyHtml(type, item, bodyHtml) {
  if (type === 'learn-german' && item.slug === 'german-news-reading-guide') {
    return `${bodyHtml}\n${renderGermanNewsLearningPanel()}`;
  }
  return bodyHtml;
}

function renderArticleHeroFigure(item) {
  const src = resolveContentImage(item);
  const alt = getArticleImageAlt(item);
  const caption = firstNonEmpty(item.hero_image_caption);
  return `<figure class="article-hero-figure">
  <img ${renderArticleImageAttributes(src, alt, 'article-hero-image', 'eager')}>
${caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : ''}
</figure>`;
}

function shouldRenderArticleHeroFigure(item) {
  const heroImage = firstNonEmpty(item.hero_image);
  return item.slug === 'berlin-weekend-trip' && heroImage.endsWith('.svg');
}

function renderArticleExtraScripts(type, item) {
  if (type === 'learn-german' && item.slug === 'german-news-reading-guide') {
    return '<script src="/assets/js/german-news-learning.js"></script>';
  }
  return '';
}

function renderGermanNewsLearningPanel() {
  return `<section class="related-section german-news-learning-panel" data-german-news-learning aria-labelledby="germanNewsLearningTitle">
  <div class="jc-section-head">
    <div>
      <h2 id="germanNewsLearningTitle">ドイツ語ニュース素材</h2>
      <p>以下は外部メディアの記事をドイツ語学習の素材として表示するものです。J-Connectの日本語ニュース解説・編集記事ではありません。</p>
    </div>
  </div>
  <div class="jc-article-grid learn-card-grid" data-german-news-list aria-live="polite">
    <div class="news-events-empty">
      <h3>ドイツ語ニュース素材を読み込み中です</h3>
      <p>外部ニュースの取得に時間がかかる場合があります。</p>
    </div>
  </div>
</section>`;
}

function renderHeader(activeType, currentUrl) {
  return renderLayoutBlock('ja-header', renderHeaderTemplate(activeType, currentUrl));
}

function renderFooter() {
  return renderLayoutBlock('ja-footer', readLayoutTemplate('ja-footer'));
}

function renderHeaderTemplate(activeType, currentUrl) {
  const active = (type) => activeType === type ? ' class="active" aria-current="page"' : '';
  return fillTemplate(readLayoutTemplate('ja-header'), {
    active_home: active('home'),
    active_about: active('about'),
    active_community: active('community'),
    active_living: active('living'),
    active_jobs: active('jobs'),
    active_events: active('events'),
    active_learn_german: active('learn-german'),
    active_eat: active('eat'),
    active_shopping: active('shopping'),
    active_medical: active('medical'),
    current_url: escapeAttribute(currentUrl || '/germany/ja/')
  });
}

function renderLayoutBlock(name, html) {
  return `  <!-- LAYOUT:${name}:start -->\n${indent(html.trim(), 2)}\n  <!-- LAYOUT:${name}:end -->`;
}

function readLayoutTemplate(name) {
  return readText(`templates/layout/${name}.html`);
}

function fillTemplate(template, values) {
  return template.replace(/\{\{([a-z0-9_]+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return match;
    return values[key];
  });
}

function markdownToHtml(markdown, context) {
  const source = stripFrontMatter(markdown).replace(/\r\n/g, '\n').trim();
  if (!source) return '';

  const lines = source.split('\n');
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const headingText = stripInlineMarkdown(heading[2]).trim();
      if (heading[1].length === 1 && headingText === context.item.title) {
        index += 1;
        continue;
      }
      const level = Math.min(heading[1].length + (heading[1].length === 1 ? 1 : 0), 3);
      const headingId = createHeadingId(headingText);
      const classAttribute = context.item.slug === 'berlin-weekend-trip' && /^公式情報/.test(headingText)
        ? ' class="official-source-section"'
        : '';
html.push(`<h${level}${classAttribute} id="${escapeAttribute(headingId)}">${renderInline(heading[2], context)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (isBirdGridStart(lines, index)) {
      const birdGrid = collectBirdGrid(lines, index, context);
      html.push(birdGrid.html);
      index = birdGrid.nextIndex;
      continue;
    }

    if (isTableStart(lines, index)) {
      const table = collectTable(lines, index, context);
      html.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      const quote = quoteLines.filter((entry) => !/^\[![A-Z]+\]/.test(entry)).join(' ');
      html.push(`<blockquote><p>${renderInline(quote, context)}</p></blockquote>`);
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (image) {
      const [, alt, src, title] = image;
      html.push(`<figure class="article-inline-figure">
  <img src="${escapeAttribute(normalizeHref(src, context))}" alt="${escapeAttribute(stripInlineMarkdown(alt).trim())}" loading="lazy" decoding="async">
${title ? `  <figcaption>${escapeHtml(title)}</figcaption>` : ''}
</figure>`);
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const list = collectList(lines, index, false, context);
      html.push(list.html);
      index = list.nextIndex;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const list = collectList(lines, index, true, context);
      html.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(' '), context)}</p>`);
  }

  return html.join('\n');
}

function collectList(lines, start, ordered, context) {
  const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/;
  const tag = ordered ? 'ol' : 'ul';
  const rawItems = [];
  let index = start;

  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) break;
    rawItems.push(match[1]);
    index += 1;
  }

  const checklistItems = ordered
    ? []
    : rawItems.map((item) => item.match(/^\[( |x|X)\]\s+(.+)$/));

  if (checklistItems.length && checklistItems.every(Boolean)) {
    const items = checklistItems.map((match) => {
      const checked = match[1].toLowerCase() === 'x';
      const className = checked ? 'article-checklist-item is-checked' : 'article-checklist-item';
      const checkedAttribute = checked ? ' checked' : '';
      return `<li class="${className}"><label><input type="checkbox" class="article-check-input"${checkedAttribute}><span>${renderInline(match[2], context)}</span></label></li>`;
    });

    return {
      html: `<ul class="article-checklist">\n${indent(items.join('\n'), 2)}\n</ul>`,
      nextIndex: index
    };
  }

  const items = rawItems.map((item) => `<li>${renderInline(item, context)}</li>`);

  return {
    html: `<${tag}>\n${indent(items.join('\n'), 2)}\n</${tag}>`,
    nextIndex: index
  };
}

function isTableStart(lines, index) {
  if (!lines[index] || !lines[index + 1]) return false;
  return lines[index].includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
}

function collectTable(lines, start, context) {
  const header = splitTableRow(lines[start]);
  let index = start + 2;
  const rows = [];

  while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }

  const head = `<thead><tr>${header.map((cell) => `<th>${renderInline(cell, context)}</th>`).join('')}</tr></thead>`;
  const bodyRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell, context)}</td>`).join('')}</tr>`).join('\n');

  return {
    html: `<div class="jc-table-wrap">\n  <table class="jc-info-table">\n    ${head}\n    <tbody>\n${indent(bodyRows, 6)}\n    </tbody>\n  </table>\n</div>`,
    nextIndex: index
  };
}

function isBirdGridStart(lines, index) {
  return String(lines[index] || '').trim() === ':::bird-grid';
}

function collectBirdGrid(lines, start, context) {
  const records = [];
  let current = {};
  let index = start + 1;

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed === ':::') {
      if (Object.keys(current).length) records.push(current);
      index += 1;
      break;
    }

    if (trimmed === '---') {
      if (Object.keys(current).length) records.push(current);
      current = {};
      index += 1;
      continue;
    }

    const match = lines[index].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      current[match[1].toLowerCase()] = match[2].trim();
    }
    index += 1;
  }

  return {
    html: renderBirdGrid(records, context),
    nextIndex: index
  };
}

function renderBirdGrid(records, context) {
  const cards = records
    .filter((record) => record.de && record.jp)
    .map((record) => renderBirdCard(record, context))
    .join('\n');

  return `<div class="bird-profile-grid">\n${indent(cards, 2)}\n</div>`;
}

function renderBirdCard(record, context) {
  const src = record.image || '';
  const alt = record.alt || `ドイツで見られる ${record.de}（${record.jp}）のイメージ`;
  const image = src
    ? `<figure class="bird-card-media"><img ${renderArticleImageAttributes(src, alt, 'bird-card-image')}></figure>`
    : '';
  const title = `${record.jp}（${record.de}）`;

  return `<article class="bird-profile-card">
${image ? indent(image, 2) : ''}
  <div class="bird-card-body">
    <h3>${renderInline(title, context)}</h3>
    ${record.description ? `<p>${renderInline(record.description, context)}</p>` : ''}
    ${record.tip ? `<p><strong>見分けポイント：</strong>${renderInline(record.tip, context)}</p>` : ''}
    ${record.where ? `<p><strong>よく見る場所：</strong>${renderInline(record.where, context)}</p>` : ''}
    ${record.note ? `<p><strong>観察メモ：</strong>${renderInline(record.note, context)}</p>` : ''}
  </div>
</article>`;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const trimmed = lines[index].trim();
  return /^(#{1,3})\s+/.test(trimmed)
    || /^(-{3,}|\*{3,})$/.test(trimmed)
    || /^>\s?/.test(trimmed)
    || /^\s*[-*]\s+/.test(lines[index])
    || /^\s*\d+\.\s+/.test(lines[index])
    || isBirdGridStart(lines, index)
    || isTableStart(lines, index);
}

function renderInline(value, context) {
  const codeTokens = [];
  const linkTokens = [];
  let text = String(value || '').replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeTokens.length}\u0000`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  text = escapeHtml(text);
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const normalized = normalizeHref(href, context);
    if (normalized === '#') return label;
    const token = `\u0000LINK${linkTokens.length}\u0000`;
    linkTokens.push(`<a href="${escapeAttribute(normalized)}">${label}</a>`);
    return token;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s（(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[\s（(])((?:https?:\/\/)[^\s<>"）)]+[^\s<>"）).,!?])/g, (_, prefix, url) => {
    return `${prefix}<a href="${escapeAttribute(url)}">${url}</a>`;
  });

  for (const [index, html] of codeTokens.entries()) {
    text = text.replace(`\u0000CODE${index}\u0000`, html);
  }

  for (const [index, html] of linkTokens.entries()) {
    text = text.replace(`\u0000LINK${index}\u0000`, html);
  }

  return text;
}

function normalizeHref(href, context) {
  const cleanHref = String(href || '').trim();
  if (!cleanHref) return '';
  if (/^(https?:|mailto:|tel:)/i.test(cleanHref)) return cleanHref;
  if (cleanHref.startsWith('/') || cleanHref.startsWith('#')) return cleanHref;

  const [withoutHash, hash = ''] = cleanHref.split('#');
  if (withoutHash.endsWith('.md')) {
    const slug = path.basename(withoutHash, '.md');
    return `/germany/ja/${context.type}/${slug}/${hash ? `#${hash}` : ''}`;
  }

  return cleanHref;
}

function stripInlineMarkdown(value) {
  return String(value || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '');
}

function renderArticleMetaSpans(type, item) {
  const rows = [];

  if (type === 'events') {
    if (item.content_type === 'news') {
      if (item.area || item.city) rows.push(`<span>対象地域: ${escapeHtml(item.area || item.city)}</span>`);
      if (item.source_type === 'manual') rows.push('<span>種別: J-Connect編集部の日本語解説</span>');
    } else {
      if (item.event_date) rows.push(`<span>日程: ${escapeHtml(item.event_date)}</span>`);
      if (item.city) rows.push(`<span>地域: ${escapeHtml(item.city)}</span>`);
      if (item.location) rows.push(`<span>会場: ${escapeHtml(item.location)}</span>`);
    }
  }

  if (type === 'learn-german') {
    rows.push(`<span>種類: ${escapeHtml(formatLearnGermanMeta('content_type', item.content_type))}</span>`);
    if (item.level?.length) rows.push(`<span>レベル: ${escapeHtml(formatLearnGermanMeta('level', item.level))}</span>`);
    if (item.situation?.length) rows.push(`<span>場面: ${escapeHtml(formatLearnGermanMeta('situation', item.situation))}</span>`);
    if (item.goal?.length) rows.push(`<span>目的: ${escapeHtml(formatLearnGermanMeta('goal', item.goal))}</span>`);
    if (item.skill?.length) rows.push(`<span>スキル: ${escapeHtml(formatLearnGermanMeta('skill', item.skill))}</span>`);
    if (item.duration?.length) rows.push(`<span>学習時間: ${escapeHtml(formatLearnGermanMeta('duration', item.duration))}</span>`);
    if (item.content_type === 'resource') {
      if (item.resource_skills?.length) rows.push(`<span>リソーススキル: ${escapeHtml(formatLearnGermanMeta('resource_skills', item.resource_skills))}</span>`);
      if (item.resource_format?.length) rows.push(`<span>形式: ${escapeHtml(formatLearnGermanMeta('resource_format', item.resource_format))}</span>`);
      if (item.resource_price_type?.length) rows.push(`<span>料金: ${escapeHtml(formatLearnGermanMeta('resource_price_type', item.resource_price_type))}</span>`);
    }
  }

  if (item.review?.next_review_due) {
    rows.push(`<span>次回確認目安: ${escapeHtml(item.review.next_review_due)}</span>`);
  }

  return rows.length ? `\n          ${rows.join('\n          ')}` : '';
}

function renderOpenGraphMeta(type, item, title, canonicalHref) {
  const crawlableImage = getCrawlableLocalImageUrl(item);
  const imageUrl = crawlableImage || absoluteUrl(getArticleImageSrc(item, type));
  const tags = [
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', 'J-Connect Germany'],
    ['property', 'og:locale', 'ja_JP'],
    ['property', 'og:title', title],
    ['property', 'og:description', item.summary],
    ['property', 'og:url', canonicalHref],
    ['property', 'og:image', imageUrl],
    ['property', 'og:image:alt', getArticleImageAlt(item)],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', item.summary],
    ['name', 'twitter:image', imageUrl],
    ['name', 'twitter:image:alt', getArticleImageAlt(item)],
    ['property', 'article:section', contentTypes[type].label],
    ['property', 'article:published_time', item.published_at],
    ['property', 'article:modified_time', item.updated_at || item.last_verified || item.published_at]
  ];

  return tags
    .filter(([, , content]) => content)
    .map(([attr, key, content]) => `<meta ${attr}="${key}" content="${escapeAttribute(content)}">`)
    .concat(item.tags.map((tag) => `<meta property="article:tag" content="${escapeAttribute(tag)}">`))
    .join('\n');
}

function renderJaHreflang(canonicalHref) {
  if (!isCanonicalJaUrl(canonicalHref)) return '';

  // JA is the current primary public version. Do not add unfinished DE/EN
  // placeholders to hreflang until those localized pages are complete.
  return [
    `<link rel="alternate" hreflang="ja" href="${escapeAttribute(canonicalHref)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttribute(canonicalHref)}">`
  ].join('\n');
}

function renderStructuredData(type, item, title, canonicalHref) {
  const image = getCrawlableLocalImageUrl(item) || absoluteUrl(getArticleImageSrc(item, type));
  const keywords = type === 'learn-german'
    ? uniqueArray([
      ...item.tags,
      item.content_type,
      ...learnGermanMetadataFields.flatMap((field) => toArray(item[field])),
      ...learnGermanResourceFields.flatMap((field) => toArray(item[field]))
    ])
    : item.tags;
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title,
    description: item.summary,
    inLanguage: 'ja',
    url: canonicalHref,
    image,
    mainEntityOfPage: canonicalHref,
    datePublished: item.published_at || undefined,
    dateModified: item.updated_at || item.last_verified || item.published_at || undefined,
    articleSection: contentTypes[type].label,
    keywords,
    author: {
      '@type': 'Organization',
      name: 'J-Connect Germany'
    },
    publisher: {
      '@type': 'Organization',
      name: 'J-Connect Germany',
      url: SITE_ORIGIN
    },
    citation: item.official_sources.map((source) => source.url).filter(Boolean)
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'ホーム',
        item: absoluteUrl('/germany/ja/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: contentTypes[type].label,
        item: absoluteUrl(contentTypes[type].hubUrl)
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: item.title,
        item: canonicalHref
      }
    ]
  };

  return `<script type="application/ld+json">${escapeJsonForHtml(article)}</script>
<script type="application/ld+json">${escapeJsonForHtml(breadcrumb)}</script>`;
}

function getCrawlableLocalImageUrl(item) {
  if (item.slug !== 'berlin-weekend-trip') return '';
  const src = firstNonEmpty(item.hero_image, item.image_url);
  if (!src || !src.startsWith('/')) return '';
  const rel = trimLeadingSlash(src);
  const fullPath = path.join(root, rel);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return '';
  return absoluteUrl(src);
}

function renderDisclaimer(item) {
  if (item.disclaimer_type === 'tourism' && item.slug === 'berlin-weekend-trip') {
    return `<div class="article-disclaimer">
  観光スポットの開館時間、チケット、展示、交通機関の運行、ストライキ、工事、イベントによる閉鎖、天候条件は変わることがあります。出発前に公式情報を確認してください。
</div>`;
  }

  if (item.disclaimer_type === 'event') {
    return `<div class="article-disclaimer">
  開催日・会場・プログラムは年により異なるため、参加前に主催者や自治体、交通機関などの公式情報を確認してください。
</div>`;
  }

  if (item.disclaimer_type === 'news_explainer') {
    return `<div class="article-disclaimer">
  本記事はJ-Connect編集部による日本語の生活解説です。速報や公式発表の代替ではありません。制度、交通、健康、安全に関わる判断は、自治体・交通機関・医療機関などの公式情報を確認してください。
</div>`;
  }

  if (item.disclaimer_type === 'language_learning' || item.disclaimer_type === 'business_language') {
    return `<div class="article-disclaimer">
  本記事はドイツ語学習の補助情報です。実際の会話やメールでは、相手・地域・状況に合わせて表現を調整してください。
</div>`;
  }

  if (item.disclaimer_type === 'medical_language') {
    return `<div class="article-disclaimer">
  本記事はドイツ語表現の学習補助です。医療判断や緊急対応の助言ではありません。症状が強い場合や緊急時は、医療機関・116117・救急番号など公式の案内を確認してください。
</div>`;
  }

  return `<div class="article-disclaimer">
  本記事は一般情報です。行政・税務・医療・保険などの条件は自治体、滞在資格、雇用状況、家族構成、申請時期により異なる場合があります。必ず公式窓口や専門家の最新情報を確認してください。
</div>`;
}
function createHeadingId(value) {
  const text = stripInlineMarkdown(value)
    .trim()
    .normalize('NFKC')
    .toLowerCase();

  const id = text
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return id || 'section';
}

function extractArticleToc(markdown, title) {
  const source = stripFrontMatter(markdown).replace(/\r\n/g, '\n').trim();
  const skipTitles = new Set([
    title,
    '関連記事'
  ]);

  return source
    .split('\n')
    .map((line) => line.trim().match(/^##\s+(.+)$/))
    .filter(Boolean)
    .map((match) => stripInlineMarkdown(match[1]).trim())
    .filter((text) => text && !skipTitles.has(text))
    .map((text) => ({
      id: createHeadingId(text),
      text
    }));
}

function renderArticleMobileToc(toc = []) {
  if (!toc.length) return '';

  const links = toc
    .map((entry) => `<a href="#${escapeAttribute(entry.id)}">${escapeHtml(entry.text)}</a>`)
    .join('\n');

  return `<details class="article-mobile-toc">
  <summary>目次を開く</summary>
  <nav aria-label="記事内目次">
${indent(links, 4)}
  </nav>
</details>`;
}

function renderArticleSidebar(type, item, allItems, toc = []) {
  const config = contentTypes[type];
  const tocLinks = toc
    .map((entry) => `<a href="#${escapeAttribute(entry.id)}">${escapeHtml(entry.text)}</a>`)
    .join('\n');

  const sourceLinks = [];
  if (item.official_url) {
    sourceLinks.push(`<li><a href="${escapeAttribute(item.official_url)}">公式情報を確認する</a></li>`);
  }
  for (const source of item.official_sources) {
    if (!source.url) continue;
    sourceLinks.push(`<li><a href="${escapeAttribute(source.url)}">${escapeHtml(source.title || '公式情報・参考ソース')}</a></li>`);
  }

  const related = type === 'learn-german'
    ? []
    : getExplicitRelatedItems(item, allItems).slice(0, 4);
  const relatedLinks = related
    .map((relatedItem) => `<li><a href="${escapeAttribute(relatedItem.url)}">${escapeHtml(relatedItem.title)}</a></li>`)
    .join('\n');

  const sections = [];

  if (tocLinks) {
    sections.push(`<nav class="article-sidebar-card article-sidebar-toc" aria-label="記事内目次">
  <h2>目次</h2>
  <div class="article-sidebar-toc-list">
${indent(tocLinks, 4)}
  </div>
</nav>`);
  }

  if (sourceLinks.length) {
    sections.push(`<section class="article-sidebar-card">
  <h2>公式情報</h2>
  <ul class="article-sidebar-links">
${indent(sourceLinks.join('\n'), 4)}
  </ul>
</section>`);
  }

  if (type !== 'learn-german' && relatedLinks) {
    sections.push(`<section class="article-sidebar-card">
  <h2>関連ガイド</h2>
  <ul class="article-sidebar-links">
${indent(relatedLinks, 4)}
  </ul>
</section>`);
  }

  sections.push(`<section class="article-sidebar-card">
  <h2>${escapeHtml(config.label)}</h2>
  <a class="article-sidebar-back" href="${escapeAttribute(config.hubUrl)}">${escapeHtml(config.backText)}</a>
</section>`);

  return `<aside class="article-sidebar" aria-label="記事補助情報">
${indent(sections.join('\n'), 2)}
</aside>`;
}

function renderArticleSidebarFacts(type, item) {
  const config = contentTypes[type];
  const facts = [];

  if (type === 'living' && item.slug === 'rundfunkbeitrag-guide') {
    facts.push(['金額', '月18.36ユーロ']);
    facts.push(['単位', '原則、住居単位']);
    facts.push(['注意', 'WGは重複支払いに注意']);
  }

  facts.push(['カテゴリ', item.category || config.label]);

  if (item.last_verified) {
    facts.push(['最終確認', item.last_verified]);
  }

  if (item.review?.next_review_due) {
    facts.push(['次回確認', item.review.next_review_due]);
  }

  return `<dl class="article-sidebar-facts">
${indent(facts.map(([label, value]) => `<div>
  <dt>${escapeHtml(label)}</dt>
  <dd>${escapeHtml(value)}</dd>
</div>`).join('\n'), 2)}
</dl>`;
}
function renderRelatedSection(item, allItems) {
  const related = item.type === 'learn-german'
    ? getRelatedLearnGermanItems(item, allItems)
    : getExplicitRelatedItems(item, allItems);
  const relatedLinks = related.map((relatedItem) => `<li><a href="${escapeAttribute(relatedItem.url)}">${escapeHtml(relatedItem.title)}</a></li>`);
  const livingGuideLinks = item.type === 'learn-german'
    ? getRelatedLivingGuideItems(item, allItems).map((relatedItem) => `<li><a href="${escapeAttribute(relatedItem.url)}">${escapeHtml(relatedItem.title)}</a></li>`)
    : [];
  const sourceLinks = [];

  if (item.official_url) {
    sourceLinks.push(`<li><a href="${escapeAttribute(item.official_url)}">公式情報を確認する</a></li>`);
  }
  for (const source of item.official_sources) {
    if (!source.url) continue;
    sourceLinks.push(`<li><a href="${escapeAttribute(source.url)}">${escapeHtml(source.title || '公式情報・参考ソース')}</a></li>`);
  }

  const sections = [];
  const markdownHasOfficialSources = item.slug === 'berlin-weekend-trip' && /^##\s+公式情報/m.test(stripFrontMatter(item.markdown || ''));
  if (sourceLinks.length && !markdownHasOfficialSources) {
    sections.push(`<section class="related-section official-source-section">
  <h3>公式情報・参考ソース</h3>
  <ul>
${indent(sourceLinks.join('\n'), 4)}
  </ul>
</section>`);
  }

  if (relatedLinks.length) {
    sections.push(`<section class="related-section">
  <h3>関連記事</h3>
  <ul>
${indent(relatedLinks.join('\n'), 4)}
  </ul>
</section>`);
  }

  if (livingGuideLinks.length) {
    sections.push(`<section class="related-section">
  <h3>関連する生活ガイド</h3>
  <ul>
${indent(livingGuideLinks.join('\n'), 4)}
  </ul>
</section>`);
  }

  return sections.join('\n');
}

function getExplicitRelatedItems(item, allItems, references = item.related_articles) {
  return uniqueItems(
    toArray(references)
      .map((reference) => findRelatedItem(reference, allItems))
      .filter(Boolean)
      .filter((relatedItem) => relatedItem.slug !== item.slug)
  );
}

function getRelatedLearnGermanItems(item, allItems) {
  const explicit = getExplicitRelatedItems(item, allItems)
    .filter((relatedItem) => relatedItem.type === 'learn-german');
  const automatic = allItems
    .filter((candidate) => candidate.type === 'learn-german' && candidate.slug !== item.slug && candidate.published && candidate.related_auto_visible !== false)
    .map((candidate) => ({
      item: candidate,
      score: scoreLearnGermanRelationship(item, candidate)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || compareDateDesc(a.item.published_at, b.item.published_at))
    .map((entry) => entry.item);

  return uniqueItems([...explicit, ...automatic]).slice(0, 6);
}

function getRelatedLivingGuideItems(item, allItems) {
  const references = getLearnGermanLivingGuideRefs(item);
  return getExplicitRelatedItems(item, allItems, references)
    .filter((relatedItem) => relatedItem.type === 'living')
    .slice(0, 6);
}

function getLearnGermanLivingGuideRefs(item) {
  const refs = [...toArray(item.related_living_guides)];
  const meta = new Set(learnGermanMetadataFields.flatMap((field) => toArray(item[field])));
  const relations = [
    {
      match: ['new-arrival', 'administration', 'anmeldung'],
      refs: ['germany-first-30-days', 'anmeldung-guide', 'moving-checklist-germany']
    },
    {
      match: ['bank'],
      refs: ['bank-account-germany', 'schufa-guide', 'tax-id-steuernummer-steuerklasse']
    },
    {
      match: ['insurance', 'healthcare', 'medical'],
      refs: ['health-insurance-guide', 'pregnancy-birth-germany']
    },
    {
      match: ['housing', 'landlord', 'housing-contract'],
      refs: ['rent-apartment-germany', 'schufa-guide', 'moving-checklist-germany', 'rundfunkbeitrag-guide']
    },
    {
      match: ['kita', 'school', 'parenting', 'school-kita'],
      refs: ['kita-u3-tagesmutter-guide', 'pregnancy-birth-germany', 'health-insurance-guide']
    },
    {
      match: ['employment', 'work', 'business-email'],
      refs: ['tax-id-steuernummer-steuerklasse', 'bank-account-germany']
    }
  ];

  for (const relation of relations) {
    if (relation.match.some((value) => meta.has(value))) refs.push(...relation.refs);
  }

  return uniqueArray(refs);
}

function scoreLearnGermanRelationship(item, candidate) {
  let score = 0;
  if (hasOverlap(item.situation, candidate.situation)) score += 4;
  if (hasOverlap(item.goal, candidate.goal)) score += 3;
  if (hasOverlap(item.skill, candidate.skill)) score += 2;
  if (hasOverlap(item.level, candidate.level)) score += 1;
  if (hasOverlap(item.duration, candidate.duration)) score += 1;
  return score;
}

function hasOverlap(left, right) {
  const rightSet = new Set(toArray(right));
  return toArray(left).some((value) => rightSet.has(value));
}

function uniqueItems(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = item?.url || item?.slug || item?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function findRelatedItem(reference, allItems) {
  const value = String(reference || '').trim();
  return allItems.find((item) => item.id === value || item.slug === value) || null;
}

function updateHub(type, items) {
  if (type === 'learn-german') {
    updateLearnGermanHub(items);
    return;
  }
  if (type === 'events') {
    updateEventsHub(items);
    return;
  }

  const config = contentTypes[type];
  const hubPath = config.hubPath;
  const cards = sortForHub(items)
    .filter((item) => item.published && item.hub_visible)
    .map((item) => renderHubCard(type, item))
    .join('\n\n');

  const html = readText(hubPath);
  const nextHtml = replaceMarkedDivContent(
    html,
    config.gridMarker,
    hubGridPattern(type),
    cards,
    8
  );

  writeText(hubPath, nextHtml);
}

function updateEventsHub(items) {
  const config = contentTypes.events;
  const hubPath = config.hubPath;
  let html = readText(hubPath);

  const eventCards = sortForHub(items)
    .filter((item) => item.published && item.hub_visible && item.content_type !== 'news')
    .map((item) => renderHubCard('events', item))
    .join('\n\n');
  const newsCards = sortForHub(items)
    .filter((item) => item.published && item.content_type === 'news')
    .map(renderManualNewsHubCard)
    .join('\n\n');

  html = replaceMarkedDivContent(
    html,
    config.gridMarker,
    hubGridPattern('events'),
    eventCards,
    8
  );
  html = replaceMarkedDivContent(
    html,
    'events-news-grid',
    /<div class="news-card-grid news-events-grid is-list-view" id="newsGrid"[^>]*>/,
    newsCards,
    14
  );

  writeText(hubPath, html);
}

function updateLearnGermanHub(items) {
  const config = contentTypes['learn-german'];
  const hubPath = config.hubPath;
  let html = readText(hubPath);
  const published = sortForHub(items).filter((item) => item.published && item.hub_visible);

  const phraseCards = published
    .filter((item) => item.content_type === 'phrase')
    .map(renderLearnGermanPhraseHubCard)
    .join('\n\n');
  const routeCards = published
    .filter((item) => item.content_type === 'route')
    .map(renderLearnGermanRouteHubCard)
    .join('\n\n');
  const resourceCards = published
    .filter((item) => item.content_type === 'resource')
    .map(renderLearnGermanResourceHubCard)
    .join('\n\n');

  html = replaceMarkedDivContent(
    html,
    config.gridMarker,
    /<div class="jc-article-grid learn-card-grid is-grid-view" id="learningArticleGrid"[^>]*>/,
    phraseCards,
    8
  );
  html = replaceMarkedDivContent(
    html,
    'learn-german-route-grid',
    /<div class="learn-route-grid" id="learningRouteGrid"[^>]*>/,
    routeCards,
    8
  );
  html = replaceMarkedDivContent(
    html,
    'learn-german-resource-grid',
    /<div class="jc-article-grid learn-resource-grid learn-card-grid is-grid-view" id="resourceArticleGrid"[^>]*>/,
    resourceCards,
    8
  );

  writeText(hubPath, html);
}

function hubGridPattern(type) {
  if (type === 'events') return /<div class="[^"]*\bjc-article-grid\b[^"]*" id="eventArticleGrid"[^>]*>/;
  if (type === 'living') return /<div class="[^"]*\bjc-article-grid\b[^"]*"[^>]*data-living-results[^>]*>/;
  if (type === 'learn-german') return /<div class="jc-article-grid">/;
  return /<div class="jc-article-grid">/;
}

function renderHubCard(type, item) {
  if (type === 'events') return renderEventHubCard(item);
  if (type === 'learn-german') return renderLearnGermanHubCard(item);
  return renderLivingHubCard(item);
}

function renderLivingHubCard(item) {
  const searchText = [
    item.title,
    item.summary,
    item.category,
    ...item.tags
  ].join(' ');
  const reviewDate = item.review?.last_reviewed_at || item.last_verified || '';
  const nextReview = item.review?.next_review_due || '';
  const dateText = reviewDate || item.updated_at || item.published_at || '';
  const media = renderCardMedia(item, 'living');
  const mediaClass = media ? ' card--has-media' : '';

  return `<article class="jc-article-card living-hub-card living-column-card${mediaClass}" data-living-card data-url="${escapeAttribute(item.url)}" data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-category="${escapeAttribute(item.category || '')}" data-tags="${escapeAttribute(item.tags.join(' '))}" data-search="${escapeAttribute(searchText)}" data-published="${escapeAttribute(item.published_at || '')}" data-reviewed="${escapeAttribute(reviewDate)}" data-updated="${escapeAttribute(item.updated_at || '')}">
  <button class="living-column-save" type="button" data-living-save aria-pressed="false" aria-label="${escapeAttribute(`保存: ${item.title}`)}">☆</button>
${media ? indent(media, 2) : ''}
  <div class="jc-card-meta">
    <span class="jc-chip">${escapeHtml(item.category || '生活ガイド')}</span>
${indent(item.tags.map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('\n'), 4)}
  </div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="living-card-dates">
    ${dateText ? `<time datetime="${escapeAttribute(dateText)}">最終確認: ${escapeHtml(dateText)}</time>` : ''}
    ${nextReview ? `<span>次回確認目安: ${escapeHtml(nextReview)}</span>` : ''}
  </div>
  <a class="jc-read-more" href="${escapeAttribute(item.url)}">記事を読む</a>
</article>`;
}

function renderEventHubCard(item) {
  const tags = item.tags.slice(0, 4).map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('');
  const eventFilters = eventHubFilterValues(item);
  const searchText = [
    item.title,
    item.summary,
    item.category,
    item.city,
    item.location,
    item.event_date,
    ...item.tags
  ].join(' ');
  const filterText = [
    item.category,
    item.city,
    item.location,
    ...item.tags
  ].join(' ');
  const media = renderCardMedia(item, 'events');
  const mediaClass = media ? ' card--has-media' : '';

  return `<a class="jc-article-card events-hub-card${mediaClass}" href="${escapeAttribute(item.url)}" data-events-card data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-category="${escapeAttribute(item.category || '')}" data-location="${escapeAttribute([item.city, item.location].filter(Boolean).join(' '))}" data-tags="${escapeAttribute(item.tags.join(' '))}" data-search="${escapeAttribute(searchText)}" data-filter="${escapeAttribute(filterText)}" data-published="${escapeAttribute(item.published_at || '')}" data-event-date="${escapeAttribute(eventFilters.date)}" data-event-area="${escapeAttribute(eventFilters.area.join(' '))}" data-event-category="${escapeAttribute(eventFilters.category.join(' '))}" data-event-format="${escapeAttribute(eventFilters.format.join(' '))}" data-event-language="${escapeAttribute(eventFilters.language.join(' '))}" data-event-price="${escapeAttribute(eventFilters.price.join(' '))}">
${media ? indent(media, 2) : ''}
  <div class="jc-card-meta"><span>${escapeHtml(item.event_date || '日程確認中')}</span><span>${escapeHtml(item.city || item.location || 'ドイツ')}</span><span>${escapeHtml(item.category || 'イベント')}</span></div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="jc-chip-row">${tags}</div>
  <span class="jc-read-more">イベント記事を読む</span>
</a>`;
}

function renderManualNewsHubCard(item) {
  const newsFilters = manualNewsFilterValues(item);
  const searchText = [
    item.title,
    item.summary,
    item.category,
    item.area,
    item.city,
    ...item.tags,
    ...newsFilters.category,
    ...newsFilters.area,
    ...newsFilters.type
  ].join(' ');
  const media = renderCardMedia(item, 'events');
  const mediaClass = media ? ' card--has-media' : '';
  const badges = [
    item.category || '生活ニュース',
    item.area || item.city || 'ドイツ全体',
    'J-Connect解説'
  ];
  const meta = [
    `公開: ${item.published_at || ''}`,
    item.last_verified ? `最終確認: ${item.last_verified}` : ''
  ].filter(Boolean);

  return `<article class="news-card manual-news-card${mediaClass}" data-news-card data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-search="${escapeAttribute(searchText)}" data-news-category="${escapeAttribute(newsFilters.category.join(' '))}" data-news-area="${escapeAttribute(newsFilters.area.join(' '))}" data-news-type="${escapeAttribute(newsFilters.type.join(' '))}" data-news-date="${escapeAttribute(item.published_at || '')}">
${media ? indent(media, 2) : ''}
  <div class="news-card__badges">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}</div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="news-card__meta">${meta.map((entry) => `<span>${escapeHtml(entry)}</span>`).join('')}</div>
  <a href="${escapeAttribute(item.url)}">解説を読む</a>
</article>`;
}

function manualNewsFilterValues(item) {
  const text = normalizeFilterText([
    item.title,
    item.summary,
    item.category,
    item.area,
    item.city,
    ...item.tags
  ].join(' '));
  const category = [];
  const area = ['germany'];
  const type = ['life-info'];

  if (text.includes('行政') || text.includes('制度') || text.includes('手続')) category.push('admin');
  if (text.includes('仕事') || text.includes('求人') || text.includes('work')) category.push('work');
  if (text.includes('学校') || text.includes('教育') || text.includes('家族')) category.push('education-family');
  if (text.includes('交通') || text.includes('db') || text.includes('bahn')) category.push('transport');
  if (text.includes('イベント') || text.includes('community') || text.includes('ワールドカップ')) category.push('community');
  if (text.includes('j-connect') || text.includes('jconnect')) category.push('jconnect');
  if (text.includes('生活') || text.includes('気候') || text.includes('熱波') || text.includes('健康')) category.push('life-update');
  if (!category.length) category.push('life-update');

  if (text.includes('nrw')) area.push('nrw');
  if (text.includes('düsseldorf') || text.includes('duesseldorf')) area.push('duesseldorf');
  if (text.includes('köln') || text.includes('koln') || text.includes('cologne')) area.push('koln');
  if (text.includes('online')) area.push('online');

  if (text.includes('注意') || text.includes('熱波') || text.includes('健康')) type.push('alert');
  if (text.includes('更新')) type.push('update');
  if (text.includes('お知らせ')) type.push('notice');

  return {
    category: uniqueArray(category),
    area: uniqueArray(area),
    type: uniqueArray(type)
  };
}

function eventHubFilterValues(item) {
  const text = [
    item.category,
    item.city,
    item.location,
    item.event_date,
    ...item.tags
  ].join(' ');
  return {
    date: extractIsoDate(item.event_date || item.date || ''),
    area: classifyEventArea(text),
    category: classifyEventCategory(text),
    format: classifyExplicitEventFormat(item),
    language: classifyExplicitEventLanguage(item),
    price: classifyExplicitEventPrice(item)
  };
}

function classifyEventArea(value) {
  const text = normalizeFilterText(value);
  const values = ['germany'];
  if (text.includes('dusseldorf') || text.includes('duesseldorf')) values.push('duesseldorf');
  if (text.includes('koln') || text.includes('cologne')) values.push('koln');
  if (text.includes('nrw')) values.push('nrw');
  if (text.includes('online')) values.push('online');
  return uniqueArray(values);
}

function classifyEventCategory(value) {
  const text = normalizeFilterText(value);
  const values = [];
  if (text.includes('交流') || text.includes('meetup')) values.push('meetup');
  if (text.includes('セミナー') || text.includes('seminar')) values.push('seminar');
  if (text.includes('家族') || text.includes('子連れ') || text.includes('family')) values.push('family');
  if (text.includes('キャリア') || text.includes('仕事') || text.includes('career')) values.push('career');
  if (text.includes('学習') || text.includes('learn')) values.push('learning');
  if (text.includes('文化') || text.includes('映画') || text.includes('culture') || text.includes('film')) values.push('culture');
  if (text.includes('おでかけ') || text.includes('マーケット') || text.includes('market')) values.push('outing');
  if (text.includes('季節') || text.includes('冬') || text.includes('クリスマス') || text.includes('seasonal')) values.push('seasonal');
  return uniqueArray(values);
}

function classifyExplicitEventFormat(item) {
  const values = explicitMetadataValues(item, ['format', 'event_format', 'delivery_format']);
  const text = normalizeFilterText(values.join(' '));
  const output = [];
  if (text.includes('対面') || text.includes('in-person') || text.includes('in person') || text.includes('offline')) output.push('in-person');
  if (text.includes('オンライン') || text.includes('online')) output.push('online');
  if (text.includes('ハイブリッド') || text.includes('hybrid')) output.push('hybrid');
  return uniqueArray(output);
}

function classifyExplicitEventLanguage(item) {
  const values = explicitMetadataValues(item, ['language', 'languages', 'event_language']);
  const text = normalizeFilterText(values.join(' '));
  const output = [];
  if (text.includes('日本語') || text.includes('japanese') || /\bja\b/.test(text)) output.push('ja');
  if (text.includes('ドイツ語') || text.includes('german') || /\bde\b/.test(text)) output.push('de');
  if (text.includes('英語') || text.includes('english') || /\ben\b/.test(text)) output.push('en');
  if (text.includes('多言語') || text.includes('multi')) output.push('multi');
  return uniqueArray(output);
}

function classifyExplicitEventPrice(item) {
  const values = explicitMetadataValues(item, ['price', 'fee', 'cost', 'admission']);
  const text = normalizeFilterText(values.join(' '));
  const output = [];
  if (text.includes('一部') || text.includes('partial')) output.push('partial');
  else if (text.includes('無料') || text.includes('free')) output.push('free');
  else if (text.includes('有料') || text.includes('paid')) output.push('paid');
  return uniqueArray(output);
}

function explicitMetadataValues(item, keys) {
  return keys.flatMap((key) => toArray(item[key]));
}

function extractIsoDate(value) {
  const match = String(value || '').match(/\b\d{4}-\d{2}-\d{2}\b/);
  return match ? match[0] : '';
}

function normalizeFilterText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function renderLearnGermanHubCard(item) {
  if (item.content_type === 'route') return renderLearnGermanRouteHubCard(item);
  if (item.content_type === 'resource') return renderLearnGermanResourceHubCard(item);
  return renderLearnGermanPhraseHubCard(item);
}

function renderLearnGermanPhraseHubCard(item) {
  const tags = item.tags.slice(0, 4).map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('');
  const metadata = learnGermanMetadataFields.flatMap((field) => toArray(item[field]));
  const searchText = [
    item.title,
    item.summary,
    item.category,
    ...item.tags,
    ...metadata,
    ...learnGermanMetadataFields.map((field) => formatLearnGermanMeta(field, item[field]))
  ].join(' ');
  const metaChips = [
    item.category || formatLearnGermanMeta('situation', item.situation),
    formatLearnGermanMeta('goal', item.goal),
    formatLearnGermanMeta('level', item.level),
    formatLearnGermanMeta('skill', item.skill),
    formatLearnGermanMeta('duration', item.duration)
  ].filter(Boolean);
  const media = renderCardMedia(item, 'learn-german');
  const mediaClass = media ? ' card--has-media' : '';

  return `<a class="jc-article-card learn-article-card${mediaClass}" href="${escapeAttribute(item.url)}" data-learn-article-card data-content-type="phrase" data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-category="${escapeAttribute(item.category || '')}" data-tags="${escapeAttribute(item.tags.join(' '))}" data-situation="${escapeAttribute(toArray(item.situation).join(' '))}" data-goal="${escapeAttribute(toArray(item.goal).join(' '))}" data-level="${escapeAttribute(toArray(item.level).join(' '))}" data-skill="${escapeAttribute(toArray(item.skill).join(' '))}" data-duration="${escapeAttribute(toArray(item.duration).join(' '))}" data-search="${escapeAttribute(searchText)}" data-published="${escapeAttribute(item.published_at || '')}">
${media ? indent(media, 2) : ''}
  <div class="jc-card-meta">${metaChips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}</div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="jc-chip-row">${tags}</div>
  <span class="jc-read-more">記事を読む</span>
</a>`;
}

function renderLearnGermanRouteHubCard(item) {
  const metaChips = [
    formatLearnGermanMeta('level', item.level),
    formatLearnGermanMeta('goal', item.goal),
    formatLearnGermanMeta('duration', item.duration)
  ].filter(Boolean);
  const media = renderCardMedia(item, 'learn-german');
  const mediaClass = media ? ' card--has-media' : '';

  return `<a class="jc-card learn-route-card${mediaClass}" href="${escapeAttribute(item.url)}" data-learn-route-card>
${media ? indent(media, 2) : ''}
  <div class="jc-card-meta">${metaChips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}</div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <span class="jc-read-more">ルートを見る</span>
</a>`;
}

function renderLearnGermanResourceHubCard(item) {
  const searchText = [
    item.title,
    item.summary,
    item.category,
    ...item.tags,
    ...learnGermanMetadataFields.flatMap((field) => toArray(item[field])),
    ...learnGermanResourceFields.flatMap((field) => toArray(item[field])),
    ...learnGermanResourceFields.map((field) => formatLearnGermanMeta(field, item[field]))
  ].join(' ');
  const badges = [
    formatLearnGermanMeta('resource_skills', item.resource_skills),
    formatLearnGermanMeta('resource_format', item.resource_format),
    formatLearnGermanMeta('resource_level', item.resource_level),
    formatLearnGermanMeta('resource_price_type', item.resource_price_type)
  ].filter(Boolean);
  const media = renderCardMedia(item, 'learn-german');
  const mediaClass = media ? ' card--has-media' : '';

  return `<a class="jc-article-card learn-resource-card${mediaClass}" href="${escapeAttribute(item.url)}" data-resource-article-card data-content-type="resource" data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-tags="${escapeAttribute(item.tags.join(' '))}" data-resource-skill="${escapeAttribute(toArray(item.resource_skills).join(' '))}" data-resource-format="${escapeAttribute(toArray(item.resource_format).join(' '))}" data-resource-level="${escapeAttribute(toArray(item.resource_level).join(' '))}" data-resource-price="${escapeAttribute(toArray(item.resource_price_type).join(' '))}" data-search="${escapeAttribute(searchText)}" data-published="${escapeAttribute(item.published_at || '')}">
${media ? indent(media, 2) : ''}
  <div class="jc-card-meta">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}</div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="jc-chip-row">${item.tags.slice(0, 4).map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('')}</div>
  <span class="jc-read-more">リソースを見る</span>
</a>`;
}

function updateHome(datasets) {
  const homePath = 'germany/ja/index.html';
  let html = readText(homePath);
  html = updateHomeTopPanelChrome(html);
  const latestDigestCards = homeLatestDigestItems(datasets).map(renderHomeLatestDigestCard).join('\n\n');
  const livingSectionCards = homeItems(datasets.living, contentTypes.living.homeSectionLimit)
    .map((item) => renderHomeStandardArticleCard(item, 'living', 'portal3-card-img'))
    .join('\n\n');
  const newsList = renderHomeNewsList(homeNewsItems(datasets.events, 3));
  const eventCards = homeItems(datasets.events, contentTypes.events.homeLimit, (item) => item.content_type !== 'news').map(renderHomeEventCard).join('\n\n');
  const learnGermanContent = homeItems(datasets['learn-german'], contentTypes['learn-german'].homeLimit).map(renderHomeLearnGermanCard).join('\n\n');
  const homeArticleItemsByUrl = new Map(Object.values(datasets).flatMap((items) => items).map((item) => [item.url, item]));

  html = replaceHomePanelContent(html, contentTypes.living.homeMarker, '新着コンテンツ', latestDigestCards, 8);
  html = replaceHomeSectionCardRow(html, 'living', livingSectionCards);
  html = replaceHomeNewsList(html, newsList);
  html = replaceMarkedDivContent(html, contentTypes.events.homeMarker, /<div class="portal3-event-row">/, eventCards, 10);
  html = replaceMarkedDivContent(html, contentTypes['learn-german'].homeMarker, /<div class="portal3-learn-row">/, learnGermanContent, 8);
  html = upgradeStaticHomeArticleCardImages(html, homeArticleItemsByUrl);
  writeText(homePath, html);
}

function updateHomeTopPanelChrome(html) {
  return html
    .replace(
      /<h2>(?:<a class="portal3-panel-title-link" href="\/germany\/ja\/community\/">)?掲示板トピック(?:<\/a>)?<\/h2>\s*<a\b[^>]*href="\/germany\/ja\/community\/"[^>]*>[^<]*<\/a>/,
      '<h2><a class="portal3-panel-title-link" href="/germany/ja/community/">掲示板トピック</a></h2>\n          <a class="portal3-panel-more" href="/germany/ja/community/">掲示板一覧へ</a>'
    )
    .replace(
      /<h2>(?:<a class="portal3-panel-title-link" href="\/germany\/ja\/living\/">)?(?:新着記事|新着コンテンツ)(?:<\/a>)?<\/h2>\s*<a\b[^>]*href="\/germany\/ja\/living\/"[^>]*>[^<]*<\/a>/,
      '<h2><a class="portal3-panel-title-link" href="/germany/ja/living/">新着コンテンツ</a></h2>'
    )
    .replace(
      /<h2>(?:<a class="portal3-panel-title-link" href="\/germany\/ja\/living\/">)?(?:新着記事|新着コンテンツ)(?:<\/a>)?<\/h2>/,
      '<h2><a class="portal3-panel-title-link" href="/germany/ja/living/">新着コンテンツ</a></h2>'
    )
    .replace(
      /<h2>(?:<a class="portal3-panel-title-link" href="\/germany\/ja\/jobs\/">)?求人ピックアップ(?:<\/a>)?<\/h2>\s*<a\b[^>]*href="\/germany\/ja\/jobs\/"[^>]*>[^<]*<\/a>/,
      '<h2><a class="portal3-panel-title-link" href="/germany/ja/jobs/">求人ピックアップ</a></h2>\n          <a class="portal3-panel-more" href="/germany/ja/jobs/">求人一覧へ</a>'
    );
}

function homeLatestDigestItems(datasets) {
  return [
    { item: latestHomeDigestItem(datasets.living), section: 'living', sourceLabel: '生活', thumbClass: 'thumb-laptop' },
    { item: latestHomeDigestItem(datasets.events), section: 'events', sourceLabel: 'ニュース・イベント', thumbClass: 'thumb-office' },
    { item: latestHomeDigestItem(datasets['learn-german']), section: 'learn-german', sourceLabel: 'ドイツ語', thumbClass: 'thumb-mountain' }
  ].map((entry) => {
    if (!entry.item) {
      throw new Error(`Unable to find published Home latest digest item for ${entry.section}`);
    }
    return entry;
  });
}

function latestHomeDigestItem(items) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.published && item.home_visible)
    .sort(compareHomeItemEntries)
    .map(({ item }) => item)[0];
}

function renderHomeLatestDigestCard({ item, section, sourceLabel, thumbClass }) {
  const dateText = formatDateJa(getPreferredHomeDateValue(item));

  return `<a class="portal3-mini portal3-latest-mini" href="${escapeAttribute(item.url)}" data-home-latest-source="${escapeAttribute(section)}">
  ${renderHomeCardImage(item, section, `portal3-thumb ${thumbClass}`)}
  <span class="portal3-latest-copy">
    <span class="portal3-latest-meta"><em>${escapeHtml(sourceLabel)}</em>${dateText ? `<small class="portal3-latest-date">${escapeHtml(dateText)}</small>` : ''}</span>
    <strong>${escapeHtml(item.title)}</strong>
  </span>
</a>`;
}

function renderHomeEventCard(item, index) {
  const imageClasses = ['img-japan-day', 'img-market', 'img-movie'];
  const badge = eventBadge(item);

  return `<a class="portal3-event-card" href="${escapeAttribute(item.url)}">
  <span class="event-date"><b>${escapeHtml(badge.top)}</b><strong>${escapeHtml(badge.main)}</strong><small>${escapeHtml(badge.sub)}</small></span>
  ${renderHomeCardImage(item, 'events', `event-img ${imageClasses[index % imageClasses.length]}`)}
  <strong>${escapeHtml(item.title)}</strong>
  <small>${escapeHtml(item.city || item.location || '')}</small>
  <em>${escapeHtml(item.category || 'イベント')}</em>
</a>`;
}

function renderHomeLearnGermanCard(item) {
  const tagText = item.tags.slice(0, 2).join('・') || item.category;
  const imageClass = item.home_image_class || 'img-study';

  return `<a class="portal3-card" href="${escapeAttribute(item.url)}">
  ${renderHomeCardImage(item, 'learn-german', `portal3-card-img ${imageClass}`)}
  <strong>${escapeHtml(item.title)}</strong>
  <small>${escapeHtml(formatDateJa(item.published_at))}・${escapeHtml(tagText)}</small>
</a>`;
}

function renderHomeStandardArticleCard(item, section, imageClass) {
  return `<a class="portal3-card" href="${escapeAttribute(item.url)}">
  ${renderHomeCardImage(item, section, imageClass)}
  <strong>${escapeHtml(item.title)}</strong>
  <small>${escapeHtml(formatDateJa(item.published_at))}・${escapeHtml(item.category || '')}</small>
</a>`;
}

function renderHomeNewsList(items) {
  const newsItems = items.map(renderHomeNewsListItem).join('\n');
  return `<article class="portal3-news-list">
  <h3>制度・生活アップデート</h3>
${indent(newsItems, 2)}
  <a class="more-news" href="/germany/ja/events/#life-updates">ニュース・生活アップデートへ</a>
</article>`;
}

function renderHomeNewsListItem(item) {
  const dateText = formatDateJa(getPreferredHomeDateValue(item));
  const meta = [dateText, item.category].filter(Boolean).join('・');
  return `<a href="${escapeAttribute(item.url || '/germany/ja/events/#life-updates')}"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(meta)}</small></a>`;
}

function upgradeStaticHomeArticleCardImages(html, itemsByUrl) {
  return html.replace(
    /(<a class="portal3-card" href="([^"]+)">\s*)<span class="([^"]*\bportal3-card-img\b[^"]*)"[^>]*>[\s\S]*?<\/span>/g,
    (match, prefix, href, className) => {
      const item = itemsByUrl.get(href);
      if (!item) return match;
      return `${prefix}${renderHomeCardImage(item, item.type, className)}`;
    }
  );
}

function renderHomeCardImage(item, section, className) {
  const src = getExistingHomeArticleImageSrc(item, section);
  const alt = getArticleImageAlt(item);
  const classes = [...new Set(String(className || '').split(/\s+/).filter(Boolean))];
  if (!classes.includes('has-photo')) classes.push('has-photo');
  return `<span class="${escapeAttribute(classes.join(' '))}"><img ${renderArticleImageAttributes(src, alt, 'home-card-image')}></span>`;
}

function eventBadge(item) {
  const date = String(item.event_date || '');
  const isoDate = date.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoDate) {
    return {
      top: '開催日',
      main: `${Number(isoDate[2])}/${Number(isoDate[3])}`,
      sub: isoDate[1]
    };
  }
  if (date.includes('週末')) return { top: '週末', main: 'イベント', sub: '随時' };
  if (item.tags.includes('冬') || item.category.includes('季節')) return { top: '冬の', main: 'イベント', sub: '' };
  if (date.includes('年') || date.includes('異なる') || date.includes('変動')) return { top: '開催時期', main: '変動制', sub: '' };
  return { top: '公式情報', main: '確認中', sub: '' };
}

function homeItems(items, limit, predicate = () => true) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.published && item.home_visible && predicate(item))
    .sort(compareHomeItemEntries)
    .slice(0, limit)
    .map(({ item }) => item);
}

function homeNewsItems(items, limit) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.published && item.content_type === 'news')
    .sort(compareHomeItemEntries)
    .slice(0, limit)
    .map(({ item }) => item);
}

function compareHomeItemEntries(a, b) {
  const aTime = getHomeDateTimestamp(a.item);
  const bTime = getHomeDateTimestamp(b.item);
  const aHasDate = Number.isFinite(aTime);
  const bHasDate = Number.isFinite(bTime);
  if (aHasDate && bHasDate && aTime !== bTime) return bTime - aTime;
  if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
  return a.index - b.index;
}

function getPreferredHomeDateValue(item) {
  for (const field of ['lastModifiedAt', 'last_modified_at', 'updatedAt', 'updated_at', 'publishedAt', 'published_at', 'postedAt', 'posted_at', 'date', 'createdAt', 'created_at']) {
    const value = String(item?.[field] || '').trim();
    if (value && Number.isFinite(Date.parse(value))) return value;
  }
  return '';
}

function getHomeDateTimestamp(item) {
  const value = getPreferredHomeDateValue(item);
  return value ? Date.parse(value) : NaN;
}

function sortForHub(items) {
  return [...items].sort((a, b) => compareDateDesc(a.published_at, b.published_at) || a.home_order - b.home_order);
}

function updateSearchIndex(allItems, pages) {
  const searchPath = 'assets/js/search-index.js';
  const current = readSearchIndex(searchPath);
  const pageEntries = pages
    .filter((page) => page.status === 'published' && page.search_visible === true)
    .map(pageToSearchEntry);
  const contentEntries = allItems
    .filter((item) => item.published && item.search_visible)
    .map((item) => ({
      title: item.title,
      description: item.summary,
      url: item.url,
      category: contentTypes[item.type].label,
      tags: item.type === 'learn-german'
        ? uniqueArray([
          ...item.tags,
          item.content_type,
          ...learnGermanMetadataFields.flatMap((field) => toArray(item[field])),
          ...learnGermanResourceFields.flatMap((field) => toArray(item[field]))
        ])
        : item.tags
    }));

  const registryUrls = new Set([
    ...pages.map((page) => page.url),
    ...allItems.map((item) => item.url)
  ]);
  const next = [];
  const seen = new Set();

  for (const entry of current) {
    if (!entry || !entry.url || registryUrls.has(entry.url) || seen.has(entry.url)) continue;
    next.push(entry);
    seen.add(entry.url);
  }

  for (const entry of [...pageEntries, ...contentEntries]) {
    if (seen.has(entry.url)) continue;
    next.push(entry);
    seen.add(entry.url);
  }

  writeText(searchPath, `window.JCONNECT_SEARCH_INDEX = ${JSON.stringify(next, null, 2)};\n`);
}

function pageToSearchEntry(page) {
  return {
    title: page.title,
    description: page.description,
    url: page.url,
    category: pillarLabels[page.pillar] || page.pillar || 'J-CONNECTについて',
    tags: page.tags.length ? page.tags : [page.type, page.pillar].filter(Boolean)
  };
}

function readSearchIndex(searchPath) {
  const sandbox = { window: {} };
  vm.runInNewContext(readText(searchPath), sandbox, { filename: searchPath, timeout: 1000 });
  return Array.isArray(sandbox.window.JCONNECT_SEARCH_INDEX) ? sandbox.window.JCONNECT_SEARCH_INDEX : [];
}

function updateSitemap(allItems, pages) {
  const sitemapPath = 'sitemap.xml';
  const byLoc = new Map();

  // JA is the current primary public version. DE/EN placeholders are
  // intentionally noindex until completed, so do not preserve or add unfinished
  // language placeholders, redirect-only pages, or non-JA URLs to the sitemap.
  for (const page of pages.filter((entry) => entry.status === 'published' && entry.sitemap_visible === true)) {
    const loc = absoluteUrl(page.canonical_url || page.url);
    if (!isCanonicalJaUrl(loc)) continue;
    byLoc.set(loc, {
      loc,
      lastmod: page.lastmod || ''
    });
  }

  for (const item of allItems.filter((entry) => entry.published && entry.sitemap_visible)) {
    const loc = absoluteUrl(item.canonical_url || item.url);
    if (!isCanonicalJaUrl(loc)) continue;
    byLoc.set(loc, {
      loc,
      lastmod: item.updated_at || item.last_verified || item.published_at
    });
  }

  const entries = [...byLoc.values()];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderSitemapEntry).join('\n')}
</urlset>
`;
  writeText(sitemapPath, xml);
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    return {
      loc: getXmlTag(block, 'loc'),
      lastmod: getXmlTag(block, 'lastmod')
    };
  }).filter((entry) => entry.loc);
}

function renderSitemapEntry(entry) {
  const lastmod = entry.lastmod ? `\n    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>` : '';
  return `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>${lastmod}
  </url>`;
}

function getXmlTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : '';
}

function replaceMarkedDivContent(html, marker, divPattern, content, spaces) {
  return replaceMarkedContent(html, marker, content, spaces, (source, marked) => {
    const match = source.match(divPattern);
    if (!match || match.index === undefined) {
      throw new Error(`Unable to find container for ${marker}`);
    }

    const openEnd = source.indexOf('>', match.index) + 1;
    const closeStart = findMatchingTag(source, match.index, 'div');
    return `${source.slice(0, openEnd)}\n${indent(marked, spaces)}\n${source.slice(closeStart)}`;
  });
}

function replaceHomePanelContent(html, marker, heading, content, spaces) {
  return replaceMarkedContent(html, marker, content, spaces, (source, marked) => {
    let headingIndex = source.indexOf(`<h2>${heading}</h2>`);
    if (headingIndex === -1) {
      headingIndex = source.search(new RegExp(`<h2>\\s*<a\\b[^>]*>${escapeRegExp(heading)}<\\/a>\\s*<\\/h2>`));
    }
    if (headingIndex === -1) throw new Error(`Unable to find Home panel heading: ${heading}`);

    const headStart = source.lastIndexOf('<div class="portal3-panel-head"', headingIndex);
    const headClose = findMatchingTag(source, headStart, 'div');
    const headEnd = source.indexOf('>', headClose) + 1;
    const articleEnd = source.indexOf('</article>', headEnd);
    if (headStart === -1 || articleEnd === -1) throw new Error(`Unable to find Home panel article for ${heading}`);

    return `${source.slice(0, headEnd)}\n\n${indent(marked, spaces)}\n${source.slice(articleEnd)}`;
  });
}

function replaceHomeSectionCardRow(html, sectionId, content) {
  const sectionStart = html.search(new RegExp(`<section class="portal3-section[^"]*" id="${escapeRegExp(sectionId)}"`));
  if (sectionStart === -1) throw new Error(`Unable to find Home section: ${sectionId}`);
  const sectionEnd = findMatchingTag(html, sectionStart, 'section');
  const section = html.slice(sectionStart, sectionEnd + '</section>'.length);
  const rowMatch = section.match(/<div class="portal3-card-row">/);
  if (!rowMatch || rowMatch.index === undefined) throw new Error(`Unable to find card row for Home section: ${sectionId}`);
  const rowStart = sectionStart + rowMatch.index;
  const openEnd = html.indexOf('>', rowStart) + 1;
  const rowEnd = findMatchingTag(html, rowStart, 'div');
  return `${html.slice(0, openEnd)}\n${indent(content, 8)}\n${html.slice(rowEnd)}`;
}

function replaceHomeNewsList(html, content) {
  const match = html.match(/<article class="portal3-news-list">/);
  if (!match || match.index === undefined) throw new Error('Unable to find Home news list');
  const start = match.index;
  const end = findMatchingTag(html, start, 'article') + '</article>'.length;
  return `${html.slice(0, start)}${content}${html.slice(end)}`;
}

function replaceMarkedContent(html, marker, content, spaces, fallback) {
  const start = `<!-- CONTENT:${marker}:start -->`;
  const end = `<!-- CONTENT:${marker}:end -->`;
  const marked = `${start}\n${content}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

  if (pattern.test(html)) {
    return html.replace(pattern, indent(marked, spaces).trimStart());
  }

  return fallback(html, marked);
}

function findMatchingTag(html, startIndex, tag) {
  const pattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  pattern.lastIndex = startIndex;
  let depth = 0;

  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    if (match[0].startsWith(`</${tag}`)) {
      depth -= 1;
      if (depth === 0) return match.index;
    } else {
      depth += 1;
    }
  }

  throw new Error(`Unable to find matching </${tag}>`);
}

function parseFrontMatter(markdown) {
  const match = String(markdown || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: markdown };

  return {
    data: parseYamlSubset(match[1]),
    body: markdown.slice(match[0].length)
  };
}

function stripFrontMatter(markdown) {
  return parseFrontMatter(markdown).body;
}

function parseYamlSubset(source) {
  const data = {};
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2].trim();
    if (rawValue === '') {
      const values = [];
      while (lines[index + 1] && /^\s*-\s+/.test(lines[index + 1])) {
        index += 1;
        values.push(unquote(lines[index].replace(/^\s*-\s+/, '').trim()));
      }
      data[key] = values;
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return data;
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '[]') return [];
  if (/^\[.*\]$/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return unquote(value);
}

function unquote(value) {
  return String(value || '').replace(/^["']|["']$/g, '');
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function readText(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function writeText(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function trimLeadingSlash(value) {
  return String(value || '').replace(/^\/+/, '');
}

function normalizePageUrl(value) {
  const url = String(value || '').trim();
  if (!url || url === '/') return url || '';
  return url.endsWith('/') ? url : `${url}/`;
}

function outputPathFromUrl(value) {
  const pathname = String(value || '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('#')[0]
    .split('?')[0]
    .replace(/^\/+/, '');
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return path.join(normalized, 'index.html');
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => String(entry).trim()).map(String);
  if (!value) return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function firstArticleImage(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (isValidContentImageValue(text) && !isLegacyPlaceholderImage(text)) return text;
  }
  return '';
}

function getArticleFallbackImageSrc() {
  return DEFAULT_IMAGE;
}

function getArticleImageSrc(article, section) {
  const explicitImage = resolveContentImage(article);
  if (explicitImage !== DEFAULT_IMAGE && imageSourceExists(explicitImage)) return explicitImage;

  const baseDir = articleImageDirs[section || article.type] || '';
  if (baseDir && article.slug) {
    const derivedImage = `${baseDir}/${article.slug}.webp`;
    if (imageSourceExists(derivedImage)) return derivedImage;
  }

  return getArticleFallbackImageSrc();
}

function getExistingHomeArticleImageSrc(article, section) {
  const src = getArticleImageSrc(article, section);
  return imageSourceExists(src) ? src : getArticleFallbackImageSrc();
}

function imageSourceExists(src) {
  const value = String(src || '').trim();
  if (!value) return false;
  if (/^(?:https?:)?\/\//i.test(value) || /^data:/i.test(value)) return true;
  const rel = normalizeRepoPath(value.startsWith('/') ? value.slice(1) : value);
  const trackedFiles = getTrackedFileSet();
  if (trackedFiles) return trackedFiles.has(rel);
  return fs.existsSync(path.join(root, rel));
}

function getTrackedFileSet() {
  if (trackedFileSet !== undefined) return trackedFileSet;
  try {
    trackedFileSet = new Set(
      execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
        .split(/\r?\n/)
        .filter(Boolean)
        .map(normalizeRepoPath)
    );
  } catch {
    trackedFileSet = null;
  }
  return trackedFileSet;
}

function normalizeRepoPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function getArticleImageAlt(article) {
  return article.title ? `${article.title} のイメージ` : 'J-Connect Germany のイメージ';
}

function isLegacyPlaceholderImage(value) {
  const text = String(value || '');
  return /^\/assets\/images\/[^/]+\/[^/]+\.svg$/i.test(text) || /^\/assets\/img\/placeholders\/[^/]+\.svg$/i.test(text);
}

function isValidContentImageValue(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && !['#', 'n/a', 'null', 'undefined'].includes(text.toLowerCase());
}

function contentImageValues(value) {
  if (Array.isArray(value)) return value.flatMap(contentImageValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(contentImageValues);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!isValidContentImageValue(text)) return [];
    if (/^\s*[\[{]/.test(text)) {
      try {
        return contentImageValues(JSON.parse(text));
      } catch {
        return [text];
      }
    }
    return text.split(/[\n,;]/).map((entry) => entry.trim()).filter(isValidContentImageValue);
  }
  return [];
}

function resolveContentImage(item) {
  const source = item || {};
  const candidates = [
    source.image,
    source.image_url,
    source.imageUrl,
    source.image_url_1,
    source.hero_image,
    source.heroImage,
    source.thumbnail,
    source.thumbnail_url,
    source.og_image,
    source.images
  ];
  return candidates.flatMap(contentImageValues).find((src) => !isLegacyPlaceholderImage(src)) || DEFAULT_IMAGE;
}

function renderArticleImageAttributes(src, alt, className, loading = 'lazy') {
  const fallback = getArticleFallbackImageSrc();
  const safeSrc = isValidContentImageValue(src) ? src : fallback;
  const onError = `if(this.dataset.fallbackSrc&&this.getAttribute('src')!==this.dataset.fallbackSrc){this.onerror=null;this.src=this.dataset.fallbackSrc;this.classList.add('is-fallback-image');}`;
  return `src="${escapeAttribute(safeSrc)}" alt="${escapeAttribute(alt)}" class="${escapeAttribute(className)}" loading="${escapeAttribute(loading)}" decoding="async" data-fallback-src="${escapeAttribute(fallback)}" onerror="${escapeAttribute(onError)}"`;
}

function renderCardMedia(item, section) {
  const src = getArticleImageSrc(item, section);
  const alt = getArticleImageAlt(item);
  return `<div class="article-card-media card-media"><img ${renderArticleImageAttributes(src, alt, 'article-card-image')}></div>`;
}

function renderArticleHeroMedia(type, item) {
  const src = getArticleImageSrc(item, type);
  const alt = getArticleImageAlt(item);
  const captionParts = [
    item.image_caption,
    item.image_credit ? `Credit: ${item.image_credit}` : ''
  ].filter(Boolean);
  const caption = captionParts.length
    ? `\n  <figcaption class="article-image-caption">${captionParts.map(escapeHtml).join(' / ')}</figcaption>`
    : '';

  return `<figure class="article-hero-media">
  <img ${renderArticleImageAttributes(src, alt, 'article-hero-image', 'eager')}>${caption}
</figure>`;
}

function uniqueArray(values) {
  return [...new Set(toArray(values))];
}

function formatLearnGermanMeta(field, value) {
  const labels = learnGermanLabels[field] || {};
  return toArray(value).map((entry) => labels[entry] || entry).join(' / ');
}

function normalizeSources(value) {
  if (!Array.isArray(value)) return [];
  return value.map((source) => {
    if (typeof source === 'string') {
      return { title: source, url: source };
    }

    return {
      title: source?.title || source?.name || source?.url || '',
      url: source?.url || ''
    };
  }).filter((source) => source.title || source.url);
}

function normalizeReview(item) {
  const reviewed = item.review?.last_reviewed_at || item.last_verified || item.updated_at || item.published_at || '';
  return {
    status: item.review?.status || (reviewed ? 'reviewed' : 'pending'),
    reviewed_by: item.review?.reviewed_by || 'J-Connect Germany editorial',
    last_reviewed_at: reviewed,
    next_review_due: item.review?.next_review_due || ''
  };
}

function compareDateDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

function formatDateJa(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value || '';
  return `${Number(match[2])}月${Number(match[3])}日`;
}

function absoluteUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

function isCanonicalJaUrl(url) {
  const absolute = absoluteUrl(url);
  return absolute === `${SITE_ORIGIN}${PRIMARY_JA_PATH}` || absolute.startsWith(`${SITE_ORIGIN}${PRIMARY_JA_PATH}`);
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return String(value || '').split('\n').map((line) => line ? `${prefix}${line}` : line).join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value, (_key, data) => data === undefined ? undefined : data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
