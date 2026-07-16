import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoPrivateFields } from "./sync-public-data.mjs";
import { assertPublicDetailUrl, publicDetailOutputPath } from "./public-detail-routes.mjs";

const ORIGIN = "https://j-connect-global.com";
const SITE_NAME = "J-Connect Global";
const DEFAULT_IMAGE = `${ORIGIN}/assets/img/placeholders/jconnect-default-card.webp`;
const GENERATED_MARKER = "data-generated-public-detail";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function text(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function compact(value, maximum = 155) {
  const output = String(value ?? "").replace(/\s+/g, " ").trim();
  return output.length > maximum ? `${output.slice(0, maximum - 1).trimEnd()}…` : output;
}

function validDate(value) {
  const timestamp = Date.parse(text(value));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function displayDate(value) {
  const timestamp = validDate(value);
  return timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);
}

function isExpired(item, now) {
  if (!text(item.expires_at)) return false;
  const timestamp = validDate(item.expires_at);
  return timestamp !== null && timestamp < now.getTime();
}

function safeHttpsUrl(value) {
  const input = text(value);
  if (!input || /@/.test(input)) return "";
  try {
    const url = new URL(input, ORIGIN);
    if (url.protocol !== "https:") return "";
    if (url.username || url.password || /^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) return "";
    for (const key of url.searchParams.keys()) {
      if (/(?:token|secret|password|auth|key|email|manage|credential|signature)/i.test(key)) return "";
    }
    return url.origin === ORIGIN ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    return "";
  }
}

function safeImageUrl(value) {
  const url = safeHttpsUrl(value);
  return url || "";
}

function hasSafeApplication(job) {
  if (safeHttpsUrl(job.apply_url || job.application_url || job.apply_link)) return true;
  const method = text(job.apply_method);
  if (!method || /@|(?:javascript|mailto):|(?:token|secret|password|manage|admin|internal|credential)/i.test(method)) return false;
  const urls = [...method.matchAll(/https?:\/\/[^\s<>"']+/gi)].map((match) => match[0]);
  if (/https?:\/\//i.test(method) && (!urls.length || urls.some((url) => !safeHttpsUrl(url)))) return false;
  return true;
}

export function isIndexableJob(job, now = new Date()) {
  if (text(job.status) !== "active" || isExpired(job, now)) return false;
  if (text(job.expires_at) && validDate(job.expires_at) === null) return false;
  const published = validDate(job.published_at);
  if (published === null || published > now.getTime() + 86_400_000) return false;
  return [job.id || job.job_id, job.company_name, job.position_title, job.description || job.job_details, job.location || job.city || job.region]
    .every((value) => Boolean(text(value)));
}

function employmentType(value) {
  const source = text(value);
  const normalized = source.normalize("NFKC").toLowerCase();
  const map = [
    [/正社員|full.?time/, "FULL_TIME"], [/パート|part.?time/, "PART_TIME"],
    [/契約|contract/, "CONTRACTOR"], [/派遣|temporary/, "TEMPORARY"],
    [/インターン|intern/, "INTERN"], [/ボランティア|volunteer/, "VOLUNTEER"],
    [/日雇い|per.?diem/, "PER_DIEM"], [/その他|other/, "OTHER"]
  ];
  return map.find(([pattern]) => pattern.test(normalized))?.[1] || "";
}

export function buildJobPosting(job, canonical, now = new Date()) {
  if (!isIndexableJob(job, now) || !hasSafeApplication(job)) return null;
  const location = text(job.location || job.city || job.region);
  const posting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: text(job.position_title),
    description: text(job.description || job.job_details),
    datePosted: new Date(validDate(job.published_at)).toISOString().slice(0, 10),
    url: canonical,
    hiringOrganization: {
      "@type": "Organization",
      name: text(job.company_name)
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: text(job.city || location),
        addressRegion: text(job.region),
        addressCountry: "DE"
      }
    }
  };
  const companyUrl = safeHttpsUrl(job.company_url);
  if (companyUrl) posting.hiringOrganization.sameAs = companyUrl;
  const type = employmentType(job.employment_type);
  if (type) posting.employmentType = type;
  if (text(job.expires_at) && validDate(job.expires_at) !== null) {
    posting.validThrough = new Date(validDate(job.expires_at)).toISOString();
  }
  const minimum = Number(job.salary_min_eur);
  const maximum = Number(job.salary_max_eur);
  const unit = text(job.salary_unit).toUpperCase();
  if ((Number.isFinite(minimum) && minimum > 0 || Number.isFinite(maximum) && maximum > 0)
      && ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"].includes(unit)) {
    const value = {};
    if (Number.isFinite(minimum) && minimum > 0) value.minValue = minimum;
    if (Number.isFinite(maximum) && maximum > 0) value.maxValue = maximum;
    value.unitText = unit;
    posting.baseSalary = {
      "@type": "MonetaryAmount",
      currency: /^[A-Z]{3}$/.test(text(job.salary_currency).toUpperCase()) ? text(job.salary_currency).toUpperCase() : "EUR",
      value: { "@type": "QuantitativeValue", ...value }
    };
  }
  return posting;
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/[<>&]/g, (character) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" })[character]);
}

function extractLayout(html, name) {
  const pattern = new RegExp(`<!-- LAYOUT:${name}:start -->[\\s\\S]*?<!-- LAYOUT:${name}:end -->`);
  const match = html.match(pattern);
  if (!match) throw new Error(`Unable to extract ${name} from copied Pages source.`);
  return match[0];
}

function metaHead({ title, description, canonical, robots, image, type = "article", jsonLd = null }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  return `<title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <link rel="canonical" href="${safeCanonical}">
  <link rel="alternate" hreflang="ja" href="${safeCanonical}">
  <link rel="alternate" hreflang="x-default" href="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:image" content="${escapeHtml(image || DEFAULT_IMAGE)}">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${escapeHtml(image || DEFAULT_IMAGE)}">${jsonLd ? `
  <script type="application/ld+json">${jsonForHtml(jsonLd)}</script>` : ""}`;
}

function documentShell({ head, header, footer, kind, body }) {
  return `<!doctype html>
<html lang="ja" ${GENERATED_MARKER}="${escapeHtml(kind)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script data-jconnect-theme-init>(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
  ${head}
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/ja-header-footer.css">
  <link rel="stylesheet" href="/assets/css/jconnect-ui.css">
  <link rel="stylesheet" href="/assets/css/cookie-consent.css">
  <link rel="stylesheet" href="/assets/css/public-detail-pages.css">
</head>
<body>
${header}
${body}
${footer}
<script src="/assets/js/common.js"></script>
<script src="/assets/js/cookie-consent.js" defer></script>
<script src="/assets/js/public-detail-pages.js" defer></script>
</body>
</html>
`;
}

function facts(items) {
  const visible = items.filter(([, value]) => text(value));
  if (!visible.length) return "";
  return `<ul class="public-detail-facts">${visible.map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function relatedCommunity(post, all) {
  return all.filter((candidate) => candidate.id !== post.id)
    .sort((left, right) => {
      const category = Number(text(right.category1) === text(post.category1)) - Number(text(left.category1) === text(post.category1));
      return category || (validDate(right.published_at) || 0) - (validDate(left.published_at) || 0);
    }).slice(0, 3);
}

function communityPage(post, all, layout, now) {
  const route = assertPublicDetailUrl("community", post.detail_url, post.id || post.post_id);
  const canonical = `${ORIGIN}${route}`;
  const title = `${text(post.title) || "交流・掲示板の投稿"} | ${SITE_NAME}`;
  const description = compact(post.summary || post.body || post.title) || `${SITE_NAME}の交流・掲示板の公開投稿です。`;
  const images = [...new Set([...(Array.isArray(post.image_urls) ? post.image_urls : []), post.image_url].map(safeImageUrl).filter(Boolean))];
  const related = relatedCommunity(post, all);
  const contactHref = `/germany/ja/community/contact/?post_id=${encodeURIComponent(post.id)}`;
  const reportHref = `/germany/ja/community/report/?post_id=${encodeURIComponent(post.id)}`;
  const canContact = text(post.status) === "active" && !isExpired(post, now);
  const imageAlt = text(post.image_alt) || text(post.title) || "投稿画像";
  const gallery = images.length ? `<section class="public-detail-section" aria-label="投稿画像"><div class="public-detail-gallery">${images.map((image, index) => {
    const alt = `${imageAlt}${images.length > 1 ? ` ${index + 1}` : ""}`;
    return `<button class="public-detail-gallery-item" type="button" data-lightbox-open data-lightbox-index="${index}" aria-label="${escapeHtml(alt)}を拡大"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></button>`;
  }).join("")}</div></section>
        <dialog class="public-detail-lightbox" data-public-lightbox aria-label="投稿画像の拡大表示">
          <button class="public-detail-lightbox-close" type="button" data-lightbox-close aria-label="拡大表示を閉じる">×</button>
          <button class="public-detail-lightbox-nav public-detail-lightbox-prev" type="button" data-lightbox-prev aria-label="前の画像">‹</button>
          <figure><img data-lightbox-image alt=""><figcaption data-lightbox-caption aria-live="polite"></figcaption></figure>
          <button class="public-detail-lightbox-nav public-detail-lightbox-next" type="button" data-lightbox-next aria-label="次の画像">›</button>
        </dialog>` : "";
  const body = `<main class="public-detail-page" id="main-content">
  <div class="public-detail-shell">
    <nav class="public-detail-breadcrumbs" aria-label="パンくず"><a href="/germany/ja/">ホーム</a> / <a href="/germany/ja/community/">交流・掲示板</a> / 投稿詳細</nav>
    <article class="public-detail-card">
      <div class="public-detail-content">
        <p class="public-detail-eyebrow">${escapeHtml(text(post.category1) || "交流・掲示板")}</p>
        <h1>${escapeHtml(text(post.title) || "投稿タイトル未設定")}</h1>
        <ul class="public-detail-meta"><li>投稿日 ${escapeHtml(displayDate(post.published_at || post.created_at) || "日付未設定")}</li>${displayDate(post.updated_at) ? `<li>更新日 ${escapeHtml(displayDate(post.updated_at))}</li>` : ""}</ul>
        ${facts([["カテゴリ", [post.category1, post.category2].map(text).filter(Boolean).join(" / ")], ["地域", [post.city, post.region].map(text).filter(Boolean).join(" / ")], ["価格・条件", post.price], ["予定日", post.event_date || post.availability_date]])}
        ${gallery}
        <section class="public-detail-section"><h2>投稿内容</h2><div class="public-detail-copy">${escapeHtml(post.body || post.summary || "内容はありません。")}</div></section>
        <section class="public-detail-section"><h2>連絡・通報</h2><p>投稿者のメールアドレスを公開せず、${SITE_NAME} がメッセージを取り次ぎます。</p><div class="public-detail-actions">${canContact ? `<a class="public-detail-button" href="${escapeHtml(contactHref)}">投稿者に連絡</a>` : '<span class="public-detail-button public-detail-button--disabled" aria-disabled="true">この投稿の受付は終了しました</span>'}<a class="public-detail-button public-detail-button--secondary" href="${escapeHtml(reportHref)}">投稿を通報</a></div></section>
        <section class="public-detail-section"><h2>関連する投稿</h2><div class="public-detail-related">${related.length ? related.map((item) => `<a href="${escapeHtml(assertPublicDetailUrl("community", item.detail_url, item.id || item.post_id))}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.category1, item.city || item.region].map(text).filter(Boolean).join(" / "))}</span></a>`).join("") : "<p>関連する公開投稿はまだありません。</p>"}</div></section>
      </div>
    </article>
  </div>
</main>`;
  return documentShell({
    head: metaHead({ title, description, canonical, robots: "noindex, follow", image: images[0] || DEFAULT_IMAGE }),
    header: layout.header, footer: layout.footer, kind: "community", body
  });
}

function salaryLabel(job) {
  if (text(job.salary_label)) return text(job.salary_label);
  const minimum = Number(job.salary_min_eur);
  const maximum = Number(job.salary_max_eur);
  const unitLabels = { HOUR: "時給", DAY: "日給", WEEK: "週給", MONTH: "月給", YEAR: "年収" };
  const period = unitLabels[text(job.salary_unit).toUpperCase()] || "支給期間未指定";
  const currency = /^[A-Z]{3}$/.test(text(job.salary_currency).toUpperCase()) ? text(job.salary_currency).toUpperCase() : "EUR";
  if (minimum > 0 && maximum > 0) return `${period} ${minimum.toLocaleString("en-US")}–${maximum.toLocaleString("en-US")} ${currency}`;
  if (minimum > 0) return `${period} ${minimum.toLocaleString("en-US")} ${currency} 以上`;
  if (maximum > 0) return `${period} ${maximum.toLocaleString("en-US")} ${currency} 以下`;
  return "";
}

function jobPage(job, layout, now) {
  const route = assertPublicDetailUrl("jobs", job.detail_url, job.id || job.job_id);
  const canonical = `${ORIGIN}${route}`;
  const indexable = isIndexableJob(job, now);
  const expired = isExpired(job, now);
  const jsonLd = buildJobPosting(job, canonical, now);
  const title = `${text(job.position_title) || "求人詳細"} | ${text(job.company_name) || SITE_NAME}`;
  const description = compact(job.summary || job.description || job.job_details || job.position_title) || `${SITE_NAME}の公開求人情報です。`;
  const applicationUrl = safeHttpsUrl(job.apply_url || job.application_url || job.apply_link);
  const applicationMethod = text(job.apply_method);
  const image = safeImageUrl(job.company_logo_url || job.logo_url || job.image_url) || DEFAULT_IMAGE;
  const body = `<main class="public-detail-page" id="main-content">
  <div class="public-detail-shell">
    <nav class="public-detail-breadcrumbs" aria-label="パンくず"><a href="/germany/ja/">ホーム</a> / <a href="/germany/ja/jobs/">仕事・求人</a> / 求人詳細</nav>
    <article class="public-detail-card">
      <div class="public-detail-content">
        <p class="public-detail-eyebrow">${escapeHtml(text(job.company_name) || "公開求人")}</p>
        <h1>${escapeHtml(text(job.position_title) || "求人タイトル未設定")}</h1>
        <ul class="public-detail-meta"><li>掲載日 ${escapeHtml(displayDate(job.published_at) || "日付未設定")}</li>${displayDate(job.updated_at) ? `<li>更新日 ${escapeHtml(displayDate(job.updated_at))}</li>` : ""}</ul>
        ${facts([["勤務地", job.location || job.city || job.region], ["雇用形態", job.employment_type], ["勤務形態", job.work_style], ["給与", salaryLabel(job)], ["言語", job.language], ["ビザ支援", job.visa_support]])}
        <section class="public-detail-section"><h2>仕事内容</h2><div class="public-detail-copy">${escapeHtml(job.description || job.job_details || job.summary || "仕事内容は未掲載です。")}</div></section>
        ${text(job.requirements) ? `<section class="public-detail-section"><h2>応募条件</h2><div class="public-detail-copy">${escapeHtml(job.requirements)}</div></section>` : ""}
        ${text(job.benefits) ? `<section class="public-detail-section"><h2>待遇・福利厚生</h2><div class="public-detail-copy">${escapeHtml(job.benefits)}</div></section>` : ""}
        ${expired ? "" : applicationUrl ? `<section class="public-detail-section"><h2>応募方法</h2><div class="public-detail-actions"><a class="public-detail-button" href="${escapeHtml(applicationUrl)}" rel="noopener noreferrer">応募先を開く</a></div></section>` : applicationMethod && hasSafeApplication(job) ? `<section class="public-detail-section"><h2>応募方法</h2><div class="public-detail-copy">${escapeHtml(applicationMethod)}</div></section>` : ""}
        <section class="public-detail-section"><div class="public-detail-actions"><a class="public-detail-button public-detail-button--secondary" href="/germany/ja/jobs/">求人一覧へ戻る</a><a class="public-detail-button public-detail-button--secondary" href="/germany/ja/contact/?subject=${encodeURIComponent(`求人 ${job.id} の通報`)}">求人を通報</a></div></section>
      </div>
    </article>
  </div>
</main>`;
  return {
    html: documentShell({
      head: metaHead({ title, description, canonical, robots: indexable ? "index, follow" : "noindex, follow", image, type: "website", jsonLd }),
      header: layout.header, footer: layout.footer, kind: "jobs", body
    }),
    indexable,
    canonical
  };
}

async function readPayload(siteDir, relative) {
  const file = path.join(siteDir, ...relative.split("/"));
  let payload;
  try {
    payload = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${relative} is missing or invalid JSON: ${error.message}`);
  }
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) throw new Error(`${relative} must contain an items array.`);
  if (!Number.isInteger(payload.count) || payload.count !== payload.items.length) throw new Error(`${relative} count does not match items.`);
  if (payload.validation && payload.validation.generated_count !== payload.count) throw new Error(`${relative} generated count does not match validation report.`);
  assertNoPrivateFields(payload, relative);
  return payload;
}

function assertActiveItems(items, label, now, { rejectExpired = false } = {}) {
  for (const [index, item] of items.entries()) {
    if (text(item.status) !== "active") throw new Error(`${label}[${index}] is not exactly status=active.`);
    if (rejectExpired && isExpired(item, now)) throw new Error(`${label}[${index}] is expired but remains in public JSON.`);
  }
}

async function clearGeneratedPages(siteDir) {
  const communityRoot = path.resolve(siteDir, "germany", "ja", "community", "posts");
  const expectedRoot = path.resolve(siteDir, "germany", "ja", "community");
  if (!communityRoot.startsWith(`${expectedRoot}${path.sep}`)) throw new Error("Community generated root escaped the Pages artifact.");
  await rm(communityRoot, { recursive: true, force: true });

  const jobsRoot = path.resolve(siteDir, "germany", "ja", "jobs");
  for (const entry of await readdir(jobsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || ["detail", "posting"].includes(entry.name)) continue;
    const indexFile = path.join(jobsRoot, entry.name, "index.html");
    try {
      const html = await readFile(indexFile, "utf8");
      if (html.includes(`${GENERATED_MARKER}="jobs"`)) await rm(path.join(jobsRoot, entry.name), { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function writeGenerated(siteDir, relative, html, outputPaths) {
  if (outputPaths.has(relative)) throw new Error(`Duplicate generated detail path: ${relative}`);
  outputPaths.add(relative);
  const file = path.resolve(siteDir, ...relative.split("/"));
  const root = path.resolve(siteDir);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Generated detail path escapes _site: ${relative}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

async function updateSearchIndex(siteDir, community, jobs) {
  const file = path.join(siteDir, "assets", "js", "search-index.js");
  const source = await readFile(file, "utf8");
  const match = source.match(/window\.JCONNECT_SEARCH_INDEX\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) throw new Error("Copied search index has an unsupported format.");
  let entries;
  try { entries = JSON.parse(match[1]); } catch (error) { throw new Error(`Copied search index is invalid: ${error.message}`); }
  const dynamicPrefixes = ["/germany/ja/community/posts/", "/germany/ja/jobs/"];
  entries = entries.filter((entry) => !dynamicPrefixes.some((prefix) => text(entry.url).startsWith(prefix)));
  for (const post of community) {
    entries.push({ title: text(post.title), description: compact(post.summary || post.body, 240), url: post.detail_url, category: "交流・掲示板", tags: [post.category1, post.category2, post.city, post.region].map(text).filter(Boolean) });
  }
  for (const job of jobs) {
    entries.push({ title: text(job.position_title), description: compact(job.summary || job.description || job.job_details, 240), url: job.detail_url, category: "仕事・求人", tags: [job.company_name, job.location || job.city || job.region, job.employment_type].map(text).filter(Boolean) });
  }
  const serialized = JSON.stringify(entries, null, 2).replace(/</g, "\\u003c");
  await writeFile(file, `window.JCONNECT_SEARCH_INDEX = ${serialized};\n`, "utf8");
}

function sitemapOutputPath(siteDir, url) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN || parsed.search || parsed.hash) throw new Error(`Unsafe sitemap URL: ${url}`);
  const relative = parsed.pathname === "/" ? "index.html" : parsed.pathname.endsWith("/") ? `${parsed.pathname.slice(1)}index.html` : parsed.pathname.slice(1);
  const segments = relative.split("/").map((segment) => decodeURIComponent(segment));
  if (segments.some((segment) => segment === ".." || /[\\/]/.test(segment))) throw new Error(`Unsafe sitemap output path: ${url}`);
  const output = path.resolve(siteDir, ...segments);
  if (!output.startsWith(`${path.resolve(siteDir)}${path.sep}`)) throw new Error(`Sitemap URL escapes _site: ${url}`);
  return output;
}

async function updateSitemap(siteDir, indexableJobUrls) {
  const file = path.join(siteDir, "sitemap.xml");
  const source = await readFile(file, "utf8");
  const staticUrls = [...source.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => {
      const pathname = new URL(url).pathname;
      if (/^\/germany\/ja\/community\/posts\/[^/]+\/$/.test(pathname)) return false;
      const jobMatch = pathname.match(/^\/germany\/ja\/jobs\/([^/]+)\/$/);
      return !jobMatch || ["detail", "posting"].includes(jobMatch[1]);
    });
  const urls = [...staticUrls, ...indexableJobUrls];
  if (new Set(urls).size !== urls.length) throw new Error("Sitemap contains duplicate URLs.");
  for (const url of urls) {
    const html = await readFile(sitemapOutputPath(siteDir, url), "utf8");
    if (/<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
        || /<meta\s+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html)) {
      throw new Error(`Sitemap URL is noindex: ${url}`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`).join("\n")}\n</urlset>\n`;
  await writeFile(file, xml, "utf8");
}

export async function generatePublicDetails({ siteDir = path.join(rootDir, "_site"), now = new Date() } = {}) {
  const resolvedSite = path.resolve(siteDir);
  const communityPayload = await readPayload(resolvedSite, "assets/data/community/posts.json");
  const jobsPayload = await readPayload(resolvedSite, "assets/data/jobs/jobs.json");
  assertActiveItems(communityPayload.items, "community", now, { rejectExpired: true });
  assertActiveItems(jobsPayload.items, "jobs", now, { rejectExpired: true });
  await clearGeneratedPages(resolvedSite);

  const communitySource = await readFile(path.join(resolvedSite, "germany", "ja", "community", "index.html"), "utf8");
  const jobsSource = await readFile(path.join(resolvedSite, "germany", "ja", "jobs", "index.html"), "utf8");
  const layouts = {
    community: { header: extractLayout(communitySource, "ja-header"), footer: extractLayout(communitySource, "ja-footer") },
    jobs: { header: extractLayout(jobsSource, "ja-header"), footer: extractLayout(jobsSource, "ja-footer") }
  };
  const outputPaths = new Set();
  for (const post of communityPayload.items) {
    const relative = publicDetailOutputPath("community", post.detail_url, post.id || post.post_id);
    await writeGenerated(resolvedSite, relative, communityPage(post, communityPayload.items, layouts.community, now), outputPaths);
  }
  const indexableJobUrls = [];
  for (const job of jobsPayload.items) {
    const relative = publicDetailOutputPath("jobs", job.detail_url, job.id || job.job_id);
    const rendered = jobPage(job, layouts.jobs, now);
    await writeGenerated(resolvedSite, relative, rendered.html, outputPaths);
    if (rendered.indexable) indexableJobUrls.push(rendered.canonical);
  }
  if (outputPaths.size !== communityPayload.count + jobsPayload.count) throw new Error("Generated detail count does not match public JSON counts.");
  await updateSearchIndex(resolvedSite, communityPayload.items, jobsPayload.items);
  await updateSitemap(resolvedSite, indexableJobUrls);
  return { community: communityPayload.count, jobs: jobsPayload.count, indexableJobs: indexableJobUrls.length, outputPaths: [...outputPaths] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteArg = process.argv.indexOf("--site-dir");
  const siteDir = siteArg >= 0 && process.argv[siteArg + 1] ? path.resolve(process.argv[siteArg + 1]) : path.join(rootDir, "_site");
  generatePublicDetails({ siteDir }).then((result) => {
    console.log(`Generated ${result.community} Community and ${result.jobs} Jobs detail pages; ${result.indexableJobs} Jobs are indexable.`);
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
