import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://j-connect-global.com';

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
    homeLimit: 3,
    cardText: '記事を読む',
    backText: 'ドイツ語・学びへ戻る'
  }
};

function main() {
  const datasets = Object.fromEntries(
    Object.keys(contentTypes).map((type) => [type, loadContentType(type)])
  );
  const allItems = Object.values(datasets).flatMap((items) => items);

  for (const [type, items] of Object.entries(datasets)) {
    for (const item of items.filter((entry) => entry.published)) {
      writeArticlePage(type, item, allItems);
    }
    updateHub(type, items);
  }

  updateHome(datasets);
  updateSearchIndex(allItems);
  updateSitemap(allItems);

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
    const merged = normalizeItem(type, { ...frontMatter, ...entry }, index);

    return {
      ...merged,
      markdown,
      markdownRel
    };
  });
}

function normalizeItem(type, item, index) {
  const tags = toArray(item.tags?.length ? item.tags : item.chips);
  const slug = String(item.slug || '').trim();
  const published = item.published === true || item.published === 'true' || item.status === 'published';
  const url = item.url || `/germany/ja/${type}/${slug}/`;
  const summary = item.summary || item.description || '';

  return {
    ...item,
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
    official_sources: normalizeSources(item.official_sources),
    disclaimer_type: item.disclaimer_type || type,
    related_articles: toArray(item.related_articles),
    review: normalizeReview(item)
  };
}

function writeArticlePage(type, item, allItems) {
  const config = contentTypes[type];
  const publicPath = path.join(config.publicBase, item.slug, 'index.html');
  const bodyHtml = markdownToHtml(item.markdown, { type, item });
  const html = renderArticlePage(type, item, bodyHtml, allItems);
  writeText(publicPath, html);
}

function renderArticlePage(type, item, bodyHtml, allItems) {
  const config = contentTypes[type];
  const title = `${item.title} | ${config.label} | J-Connect Germany`;
  const canonicalHref = absoluteUrl(item.canonical_url);
  const metaBlock = renderArticleMetaSpans(type, item);
  const ogMeta = renderOpenGraphMeta(type, item, title, canonicalHref);
  const structuredData = renderStructuredData(type, item, title, canonicalHref);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttribute(item.summary)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeAttribute(canonicalHref)}">
${indent(ogMeta, 2)}
  <link rel="icon" type="image/png" href="/assets/images/brand/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/jconnect-ui.css">
  <link rel="stylesheet" href="/assets/css/cookie-consent.css">
  <script src="/assets/js/cookie-consent.js" defer></script>
${indent(structuredData, 2)}
</head>
<body>
${renderHeader(type, item.url)}
  <main class="container article-main">
    <article>
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

      <div class="article-body">
${indent(bodyHtml, 8)}
        <p><a class="article-back-link" href="${config.hubUrl}">${escapeHtml(config.backText)}</a></p>
${indent(renderDisclaimer(item), 8)}
      </div>
    </article>
${indent(renderRelatedSection(item, allItems), 4)}
  </main>

${renderFooter()}
  <script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

function renderHeader(activeType, currentUrl) {
  const livingActive = activeType === 'living' ? ' class="active" aria-current="page"' : '';
  const eventsActive = activeType === 'events' ? ' class="active" aria-current="page"' : '';
  const learnGermanActive = activeType === 'learn-german' ? ' class="active" aria-current="page"' : '';

  return `  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/germany/ja/" aria-label="J-Connect Germany ホーム">
        <img class="brand-logo" src="/assets/images/brand/logo_header.png" alt="J-Connect Germany">
        <span class="brand-copy">
          <span class="brand-title">J-CONNECT GERMANY</span>
          <span class="brand-sub">ドイツと日本をつなぐ総合ポータル</span>
        </span>
      </a>
      <div class="header-actions">
        <nav class="header-nav" aria-label="主要ナビゲーション">
          <a href="/germany/ja/">ホーム</a>
          <a href="/germany/ja/about/">このサイトについて</a>
        </nav>
        <div class="header-category header-category-menu" aria-label="カテゴリ選択">
          <button type="button" class="header-category-trigger">カテゴリ</button>
          <div class="category-dropdown">
            <a href="/germany/ja/community/">交流・掲示板</a>
            <a href="/germany/ja/living/"${livingActive}>生活・手続き</a>
            <a href="/germany/ja/jobs/">仕事・求人</a>
            <a href="/germany/ja/events/"${eventsActive}>ニュース・イベント</a>
            <a href="/germany/ja/learn-german/"${learnGermanActive}>ドイツ語・学び</a>
            <a href="/germany/ja/about/">J-CONNECTについて</a>
          </div>
        </div>
        <form class="header-search" action="/germany/ja/search/" method="get" role="search">
          <label class="search-box" aria-label="サイト内検索">
            <span aria-hidden="true">⌕</span>
            <input type="search" name="q" placeholder="検索">
          </label>
          <button class="search-btn" type="submit" aria-label="検索">⌕</button>
        </form>
        <details class="header-language header-language-menu" aria-label="言語切り替え">
          <summary class="header-language-trigger">
            <span>Language</span>
            <span class="header-language-current" lang="ja">日本語</span>
          </summary>
          <div class="language-dropdown">
            <a href="${escapeAttribute(currentUrl)}" class="active" aria-current="page" lang="ja">日本語</a>
            <a href="/germany/en/coming-soon/" lang="en">English</a>
            <a href="/germany/de/coming-soon/" lang="de">Deutsch</a>
          </div>
        </details>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `  <footer class="page-footer">
    <div class="footer-inner">
      <div class="footer-left">
        <img class="footer-logo" src="/assets/images/brand/logo_footer.png" alt="J-Connect Germany">
        <div class="footer-copy">
          <div class="footer-title">J-CONNECT GERMANY</div>
          <div class="footer-sub">ドイツと日本をつなぐ総合ポータル</div>
          <div class="footer-meta">© 2026 J-Connect Germany</div>
        </div>
      </div>
      <div class="footer-links" aria-label="フッターサイトマップ">
        <div class="footer-group">
          <div class="footer-heading">交流・掲示板</div>
          <a href="/germany/ja/community/">新着投稿</a>
          <a href="/germany/ja/community/post/">投稿する</a>
          <a href="/germany/ja/terms/">ルール・ガイドライン</a>
        </div>
        <div class="footer-group">
          <div class="footer-heading">生活・手続き</div>
          <a href="/germany/ja/living/">手続き</a>
          <a href="/germany/ja/medical/">医療</a>
          <a href="/germany/ja/eat/">食べる</a>
          <a href="/germany/ja/shopping/">買い物</a>
          <a href="/germany/ja/events/">観光・レジャー</a>
        </div>
        <div class="footer-group">
          <div class="footer-heading">仕事・求人</div>
          <a href="/germany/ja/jobs/">求人一覧</a>
          <a href="/germany/ja/jobs/posting/">求人掲載について</a>
        </div>
        <div class="footer-group">
          <div class="footer-heading">ニュース・イベント</div>
          <a href="/germany/ja/news/">最新ニュース</a>
          <a href="/germany/ja/events/">イベントカレンダー</a>
        </div>
        <div class="footer-group">
          <div class="footer-heading">ドイツ語・学び</div>
          <a href="/germany/ja/learn-german/">学習コンテンツ</a>
          <a href="/germany/ja/learn-german/appointment-phrase/">フレーズ集</a>
          <a href="/germany/ja/learn-german/">学習法</a>
        </div>
        <div class="footer-group">
          <div class="footer-heading">J-CONNECTについて</div>
          <a href="/germany/ja/about/">このサイトについて</a>
          <a href="/germany/ja/contact/">お問い合わせ</a>
          <a href="/germany/ja/terms/">利用規約</a>
          <a href="/germany/ja/privacy/">プライバシー</a>
          <a href="/germany/ja/impressum/">運営者情報</a>
        </div>
      </div>
    </div>
  </footer>`;
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
      html.push(`<h${level}>${renderInline(heading[2], context)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      html.push('<hr>');
      index += 1;
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
  const items = [];
  let index = start;

  while (index < lines.length) {
    const match = lines[index].match(pattern);
    if (!match) break;
    items.push(`<li>${renderInline(match[1], context)}</li>`);
    index += 1;
  }

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
    || isTableStart(lines, index);
}

function renderInline(value, context) {
  const codeTokens = [];
  let text = String(value || '').replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeTokens.length}\u0000`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  text = escapeHtml(text);
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const normalized = normalizeHref(href, context);
    if (normalized === '#') return label;
    return `<a href="${escapeAttribute(normalized)}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s（(])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  for (const [index, html] of codeTokens.entries()) {
    text = text.replace(`\u0000CODE${index}\u0000`, html);
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
    if (item.event_date) rows.push(`<span>日程: ${escapeHtml(item.event_date)}</span>`);
    if (item.city) rows.push(`<span>地域: ${escapeHtml(item.city)}</span>`);
    if (item.location) rows.push(`<span>会場: ${escapeHtml(item.location)}</span>`);
  }

  if (type === 'learn-german') {
    if (item.level) rows.push(`<span>レベル: ${escapeHtml(item.level)}</span>`);
    if (item.situation) rows.push(`<span>場面: ${escapeHtml(item.situation)}</span>`);
  }

  if (item.review?.next_review_due) {
    rows.push(`<span>次回確認目安: ${escapeHtml(item.review.next_review_due)}</span>`);
  }

  return rows.length ? `\n          ${rows.join('\n          ')}` : '';
}

function renderOpenGraphMeta(type, item, title, canonicalHref) {
  const tags = [
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', 'J-Connect Germany'],
    ['property', 'og:locale', 'ja_JP'],
    ['property', 'og:title', title],
    ['property', 'og:description', item.summary],
    ['property', 'og:url', canonicalHref],
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

function renderStructuredData(type, item, title, canonicalHref) {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title,
    description: item.summary,
    inLanguage: 'ja',
    url: canonicalHref,
    mainEntityOfPage: canonicalHref,
    datePublished: item.published_at || undefined,
    dateModified: item.updated_at || item.last_verified || item.published_at || undefined,
    articleSection: contentTypes[type].label,
    keywords: item.tags,
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

function renderDisclaimer(item) {
  if (item.disclaimer_type === 'event') {
    return `<div class="article-disclaimer">
  開催日・会場・プログラムは年により異なるため、参加前に主催者や自治体、交通機関などの公式情報を確認してください。
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

function renderRelatedSection(item, allItems) {
  const related = toArray(item.related_articles)
    .map((reference) => findRelatedItem(reference, allItems))
    .filter(Boolean);

  const links = related.map((relatedItem) => `<li><a href="${escapeAttribute(relatedItem.url)}">${escapeHtml(relatedItem.title)}</a></li>`);

  if (item.official_url) {
    links.push(`<li><a href="${escapeAttribute(item.official_url)}">公式情報を確認する</a></li>`);
  }

  for (const source of item.official_sources) {
    if (!source.url) continue;
    links.push(`<li><a href="${escapeAttribute(source.url)}">${escapeHtml(source.title || '公式情報・参考ソース')}</a></li>`);
  }

  if (!links.length) return '';

  return `<section class="related-section">
  <h3>関連記事・関連リンク</h3>
  <ul>
${indent(links.join('\n'), 4)}
  </ul>
</section>`;
}

function findRelatedItem(reference, allItems) {
  const value = String(reference || '').trim();
  return allItems.find((item) => item.id === value || item.slug === value) || null;
}

function updateHub(type, items) {
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

function hubGridPattern(type) {
  if (type === 'events') return /<div class="jc-article-grid" id="eventArticleGrid">/;
  if (type === 'learn-german') return /<div class="jc-article-grid">/;
  return /<div class="jc-article-grid">/;
}

function renderHubCard(type, item) {
  if (type === 'events') return renderEventHubCard(item);
  if (type === 'learn-german') return renderLearnGermanHubCard(item);
  return renderLivingHubCard(item);
}

function renderLivingHubCard(item) {
  return `<a href="${escapeAttribute(item.url)}" class="jc-article-card">
  <div class="jc-card-meta">
${indent(item.tags.map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('\n'), 4)}
  </div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <time datetime="${escapeAttribute(item.last_verified)}">最終確認: ${escapeHtml(item.last_verified)}</time>
  <span class="jc-read-more">記事を読む</span>
</a>`;
}

function renderEventHubCard(item) {
  const tags = item.tags.slice(0, 4).map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('');

  return `<a class="jc-article-card" href="${escapeAttribute(item.url)}">
  <div class="jc-card-meta"><span>${escapeHtml(item.event_date || '')}</span><span>${escapeHtml(item.city || '')}</span><span>${escapeHtml(item.category || '')}</span></div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="jc-chip-row">${tags}</div>
</a>`;
}

function renderLearnGermanHubCard(item) {
  const tags = item.tags.slice(0, 4).map((tag) => `<span class="jc-chip">${escapeHtml(tag)}</span>`).join('');

  return `<a class="jc-article-card" href="${escapeAttribute(item.url)}">
  <div class="jc-card-meta"><span>${escapeHtml(item.published_at || '')}</span><span>${escapeHtml(item.level || '')}</span><span>${escapeHtml(item.situation || item.category || '')}</span></div>
  <h3>${escapeHtml(item.title)}</h3>
  <p>${escapeHtml(item.summary)}</p>
  <div class="jc-chip-row">${tags}</div>
</a>`;
}

function updateHome(datasets) {
  const homePath = 'germany/ja/index.html';
  let html = readText(homePath);
  const livingCards = homeItems(datasets.living, contentTypes.living.homeLimit).map(renderHomeLivingCard).join('\n\n');
  const eventCards = homeItems(datasets.events, contentTypes.events.homeLimit).map(renderHomeEventCard).join('\n\n');
  const learnGermanContent = renderHomeLearnGermanContent(homeItems(datasets['learn-german'], contentTypes['learn-german'].homeLimit));

  html = replaceHomePanelContent(html, contentTypes.living.homeMarker, '新着記事', livingCards, 8);
  html = replaceMarkedDivContent(html, contentTypes.events.homeMarker, /<div class="portal3-event-row">/, eventCards, 10);
  html = replaceMarkedDivContent(html, contentTypes['learn-german'].homeMarker, /<div class="portal3-learn-row">/, learnGermanContent, 8);
  writeText(homePath, html);
}

function renderHomeLivingCard(item, index) {
  const thumbClasses = ['thumb-laptop', 'thumb-medical', 'thumb-mountain'];
  const tagText = item.tags.slice(0, 2).join('・') || item.category;
  return `<a class="portal3-mini" href="${escapeAttribute(item.url)}">
  <span class="portal3-thumb ${thumbClasses[index % thumbClasses.length]}"></span>
  <span>
    <strong>${escapeHtml(item.title)}</strong>
    <small>${escapeHtml(formatDateJa(item.published_at))}・${escapeHtml(tagText)}</small>
  </span>
</a>`;
}

function renderHomeEventCard(item, index) {
  const imageClasses = ['img-japan-day', 'img-market', 'img-movie'];
  const badge = eventBadge(item);

  return `<a class="portal3-event-card" href="${escapeAttribute(item.url)}">
  <span class="event-date"><b>${escapeHtml(badge.top)}</b><strong>${escapeHtml(badge.main)}</strong><small>${escapeHtml(badge.sub)}</small></span>
  <span class="event-img ${imageClasses[index % imageClasses.length]}"></span>
  <strong>${escapeHtml(item.title)}</strong>
  <small>${escapeHtml(item.city || item.location || '')}</small>
  <em>${escapeHtml(item.category || 'イベント')}</em>
</a>`;
}

function renderHomeLearnGermanContent(items) {
  const cards = items.map(renderHomeLearnGermanCard);
  const phrase = items.find((item) => item.home_phrase)?.home_phrase || { de: 'Ich hätte gern einen Termin.', ja: '予約を取りたいです。' };
  const phraseCard = `<article class="portal3-phrase">
  <span>今日のフレーズ</span>
  <strong lang="de">${escapeHtml(phrase.de)}</strong>
  <p>${escapeHtml(phrase.ja)}</p>
  <button type="button">発音を聞く　🔊</button>
</article>`;

  return [
    ...cards.slice(0, 2),
    phraseCard,
    ...cards.slice(2)
  ].join('\n\n');
}

function renderHomeLearnGermanCard(item) {
  const tagText = item.tags.slice(0, 2).join('・') || item.category;
  const imageClass = item.home_image_class || 'img-study';

  return `<a class="portal3-card" href="${escapeAttribute(item.url)}">
  <span class="portal3-card-img ${escapeAttribute(imageClass)}"></span>
  <strong>${escapeHtml(item.title)}</strong>
  <small>${escapeHtml(formatDateJa(item.published_at))}・${escapeHtml(tagText)}</small>
</a>`;
}

function eventBadge(item) {
  const date = String(item.event_date || '');
  if (date.includes('週末')) return { top: '週末', main: '確認', sub: '' };
  if (item.tags.includes('冬') || item.category.includes('季節')) return { top: '冬', main: '確認', sub: '' };
  if (date.includes('年')) return { top: '日程', main: '変動', sub: '' };
  return { top: '日程', main: '確認', sub: '' };
}

function homeItems(items, limit) {
  return items
    .filter((item) => item.published && item.home_visible)
    .sort((a, b) => a.home_order - b.home_order || compareDateDesc(a.published_at, b.published_at))
    .slice(0, limit);
}

function sortForHub(items) {
  return [...items].sort((a, b) => compareDateDesc(a.published_at, b.published_at) || a.home_order - b.home_order);
}

function updateSearchIndex(allItems) {
  const searchPath = 'assets/js/search-index.js';
  const current = readSearchIndex(searchPath);
  const contentEntries = allItems
    .filter((item) => item.published && item.search_visible)
    .map((item) => ({
      title: item.title,
      description: item.summary,
      url: item.url,
      category: contentTypes[item.type].label,
      tags: item.tags
    }));

  const registryUrls = new Set(allItems.map((item) => item.url));
  const next = [];
  const seen = new Set();

  for (const entry of current) {
    if (!entry || !entry.url || registryUrls.has(entry.url) || seen.has(entry.url)) continue;
    next.push(entry);
    seen.add(entry.url);
  }

  for (const entry of contentEntries) {
    if (seen.has(entry.url)) continue;
    next.push(entry);
    seen.add(entry.url);
  }

  writeText(searchPath, `window.JCONNECT_SEARCH_INDEX = ${JSON.stringify(next, null, 2)};\n`);
}

function readSearchIndex(searchPath) {
  const sandbox = { window: {} };
  vm.runInNewContext(readText(searchPath), sandbox, { filename: searchPath, timeout: 1000 });
  return Array.isArray(sandbox.window.JCONNECT_SEARCH_INDEX) ? sandbox.window.JCONNECT_SEARCH_INDEX : [];
}

function updateSitemap(allItems) {
  const sitemapPath = 'sitemap.xml';
  const current = parseSitemap(readText(sitemapPath));
  const byLoc = new Map();
  const registryLocs = new Set(allItems.map((item) => absoluteUrl(item.url)));

  for (const entry of current) {
    if (registryLocs.has(entry.loc)) continue;
    if (!byLoc.has(entry.loc)) byLoc.set(entry.loc, entry);
  }

  for (const item of allItems.filter((entry) => entry.published && entry.sitemap_visible)) {
    byLoc.set(absoluteUrl(item.url), {
      loc: absoluteUrl(item.url),
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
    const headingIndex = source.indexOf(`<h2>${heading}</h2>`);
    if (headingIndex === -1) throw new Error(`Unable to find Home panel heading: ${heading}`);

    const headStart = source.lastIndexOf('<div class="portal3-panel-head"', headingIndex);
    const headClose = findMatchingTag(source, headStart, 'div');
    const headEnd = source.indexOf('>', headClose) + 1;
    const articleEnd = source.indexOf('</article>', headEnd);
    if (headStart === -1 || articleEnd === -1) throw new Error(`Unable to find Home panel article for ${heading}`);

    return `${source.slice(0, headEnd)}\n\n${indent(marked, spaces)}\n${source.slice(articleEnd)}`;
  });
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

function toArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => String(entry).trim()).map(String);
  if (!value) return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
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
