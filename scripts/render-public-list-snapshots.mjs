import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublicDetailUrl } from "./public-detail-routes.mjs";
import {
  assertNoPrivateFields,
  classifyJob,
  isPublicCommunityPost
} from "./sync-public-data.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_IMAGE = "/assets/img/placeholders/jconnect-default-card.webp";
const SNAPSHOT_PATHS = Object.freeze({
  home: "germany/ja/index.html",
  jobs: "germany/ja/jobs/index.html",
  community: "germany/ja/community/index.html",
  jobsData: "assets/data/jobs/jobs.json",
  communityData: "assets/data/community/posts.json"
});
const HOME_LIMIT = 4;

function text(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function readJson(root, relativePath) {
  const file = path.join(root, relativePath);
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${relativePath} is missing or invalid JSON: ${error.message}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.items)) {
    throw new Error(`${relativePath} must contain an items array.`);
  }
  if (payload.count !== payload.items.length) {
    throw new Error(`${relativePath} count does not match items.length.`);
  }
  assertNoPrivateFields(payload, relativePath);
  return payload;
}

function parseDate(value) {
  const timestamp = Date.parse(text(value));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function publicSnapshotItems(payload, kind, now = new Date()) {
  if (!payload || !Array.isArray(payload.items)) throw new Error(`${kind} payload must contain items.`);
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(timestamp)) throw new Error("Snapshot lifecycle reference must be a valid date.");
  if (kind === "community") {
    return payload.items.filter((item) => isPublicCommunityPost(item, timestamp));
  }
  if (kind === "jobs") {
    return payload.items.filter((item) => classifyJob(item, timestamp).eligible);
  }
  throw new Error(`Unsupported public snapshot kind: ${kind}`);
}

export function loadPublicSnapshotData({
  root = rootDir,
  now = new Date()
} = {}) {
  const communityPayload = readJson(root, SNAPSHOT_PATHS.communityData);
  const jobsPayload = readJson(root, SNAPSHOT_PATHS.jobsData);
  return {
    communityPayload,
    jobsPayload,
    community: sortCommunity(publicSnapshotItems(communityPayload, "community", now)),
    jobs: sortJobs(publicSnapshotItems(jobsPayload, "jobs", now))
  };
}

function preferredJobDate(item) {
  return [
    item.last_modified_at,
    item.updated_at,
    item.published_at,
    item.posted_at,
    item.created_at
  ].find((value) => parseDate(value) !== null) || "";
}

function preferredCommunityDate(item) {
  return [item.published_at, item.created_at].find((value) => parseDate(value) !== null) || "";
}

function sortJobs(items) {
  return [...items].sort((left, right) => {
    const date = (parseDate(preferredJobDate(right)) || 0) - (parseDate(preferredJobDate(left)) || 0);
    if (date) return date;
    const priority = Number(left.priority || 0) - Number(right.priority || 0);
    return priority || text(left.id).localeCompare(text(right.id), "ja");
  });
}

function sortCommunity(items) {
  return [...items].sort((left, right) => {
    const date = (parseDate(preferredCommunityDate(right)) || 0) - (parseDate(preferredCommunityDate(left)) || 0);
    return date || text(left.id).localeCompare(text(right.id), "ja");
  });
}

function isoDay(value) {
  const timestamp = parseDate(value);
  if (timestamp === null) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function displayDay(value) {
  const day = isoDay(value);
  return day ? day.replaceAll("-", ".") : "";
}

function displayDigestDay(value) {
  const day = isoDay(value);
  if (!day) return "";
  const [, month, date] = day.split("-").map(Number);
  return `${month}月${date}日`;
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/[,、;；|/\n]/).map(text).filter(Boolean);
}

function compact(value, maximum = 180) {
  const output = text(value).replace(/\s+/g, " ");
  return output.length > maximum ? `${output.slice(0, maximum - 1).trimEnd()}…` : output;
}

function salaryLabel(job) {
  const supplied = text(job.salary_label);
  if (supplied) return supplied;
  const minimum = Number(job.salary_min_eur);
  const maximum = Number(job.salary_max_eur);
  if (!(minimum > 0) && !(maximum > 0)) return "";
  const periods = { HOUR: "時給", DAY: "日給", WEEK: "週給", MONTH: "月給", YEAR: "年収" };
  const period = periods[text(job.salary_unit).toUpperCase()];
  const currency = /^[A-Z]{3}$/.test(text(job.salary_currency).toUpperCase())
    ? text(job.salary_currency).toUpperCase()
    : "EUR";
  const amount = minimum > 0 && maximum > 0
    ? `${minimum.toLocaleString("en-US")}–${maximum.toLocaleString("en-US")} ${currency}`
    : minimum > 0
      ? `${minimum.toLocaleString("en-US")} ${currency} 以上`
      : `${maximum.toLocaleString("en-US")} ${currency} 以下`;
  return period ? `${period} ${amount}` : `給与額 ${amount}（支給期間は各求人で確認）`;
}

function publicDetail(kind, item) {
  return assertPublicDetailUrl(kind, item.detail_url, item.id || item.post_id || item.job_id);
}

function replaceSnapshot(html, name, content) {
  const start = `<!-- PUBLIC-SNAPSHOT:${name}:start -->`;
  const end = `<!-- PUBLIC-SNAPSHOT:${name}:end -->`;
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error(`Missing ${name} public snapshot markers.`);
  }
  const before = html.slice(0, startIndex + start.length);
  const after = html.slice(endIndex);
  const normalizedContent = String(content || "").replace(/[ \t]+$/gm, "");
  return `${before}\n${normalizedContent ? `${normalizedContent}\n` : ""}${after}`;
}

function communityImage(post) {
  const candidates = [
    ...(Array.isArray(post.image_urls) ? post.image_urls : []),
    post.image_url,
    post.image_url_1
  ].map(text).filter(Boolean);
  return candidates[0] || DEFAULT_IMAGE;
}

function communityThumbnail(post, width) {
  const source = communityImage(post);
  const requestedWidth = Number.parseInt(width, 10);
  const safeWidth = Number.isFinite(requestedWidth)
    ? Math.min(Math.max(requestedWidth, 64), 480)
    : 480;
  try {
    const url = new URL(source);
    const isDriveThumbnail = url.hostname.toLowerCase() === "drive.google.com"
      && /^\/thumbnail\/?$/.test(url.pathname)
      && Boolean(url.searchParams.get("id"));
    if (!isDriveThumbnail) return source;
    url.searchParams.set("sz", `w${safeWidth}`);
    return url.href;
  } catch {
    return source;
  }
}

function homeCommunityMini(posts) {
  return posts.slice(0, 3).map((post) => {
    const href = publicDetail("community", post);
    const label = text(post.category1) || "質問";
    const country = text(post.country) || "ドイツ";
    const date = displayDigestDay(preferredCommunityDate(post));
    return `          <a class="portal3-mini portal3-community-mini" href="${escapeHtml(href)}" data-post-id="${escapeHtml(post.id)}" data-public-snapshot-item="community">
            <span class="portal3-thumb thumb-office has-photo">
              <img src="${escapeHtml(communityThumbnail(post, 128))}" alt="${escapeHtml(post.title)} のイメージ" width="62" height="52" sizes="62px" loading="lazy" decoding="async" data-fallback-src="${DEFAULT_IMAGE}">
            </span>
            <span class="portal3-community-copy">
              <span class="portal3-community-meta"><em>${escapeHtml(label)}</em><small class="portal3-community-date">${escapeHtml([country, date].filter(Boolean).join("・"))}</small></span>
              <strong>${escapeHtml(post.title)}</strong>
            </span>
          </a>`;
  }).join("\n");
}

function homeCommunityCards(posts) {
  return posts.slice(0, 5).map((post) => {
    const href = publicDetail("community", post);
    const label = text(post.category1) || "質問";
    const location = [post.city, post.region].map(text).filter(Boolean).join(" / ");
    const date = displayDay(preferredCommunityDate(post));
    return `        <a class="portal3-card" href="${escapeHtml(href)}" data-post-id="${escapeHtml(post.id)}" data-public-snapshot-item="community">
          <span class="portal3-card-img img-doc has-photo">
            <img src="${escapeHtml(communityThumbnail(post, 480))}" alt="${escapeHtml(post.title)} のイメージ" width="480" height="270" sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1180px) calc((100vw - 64px) / 3), 220px" loading="lazy" decoding="async" data-fallback-src="${DEFAULT_IMAGE}">
            <span class="portal3-card-badges"><em>${escapeHtml(label)}</em>${text(post.price) ? `<b>${escapeHtml(post.price)}</b>` : ""}</span>
          </span>
          <strong>${escapeHtml(post.title)}</strong>
          <small>${escapeHtml([location, date].filter(Boolean).join("・") || text(post.category2))}</small>
        </a>`;
  }).join("\n");
}

function homeJobsMini(jobs) {
  const icons = ["▦", "▥", "▣", "▤"];
  return jobs.slice(0, HOME_LIMIT).map((job, index) => {
    const meta = [
      job.company_name,
      job.location || job.city || job.region,
      salaryLabel(job),
      job.employment_type
    ].map(text).filter(Boolean).join("・");
    return `          <a class="portal3-job-mini" href="${escapeHtml(publicDetail("jobs", job))}" data-job-id="${escapeHtml(job.id)}" data-public-snapshot-item="jobs">
            <span class="portal3-job-icon">${icons[index % icons.length]}</span>
            <span><strong>${escapeHtml(job.position_title || "求人タイトル未設定")}</strong><small>${escapeHtml(meta || "詳細ページで確認してください")}</small></span>
          </a>`;
  }).join("\n");
}

function homeJobsCards(jobs) {
  const icons = ["▦", "▥", "▣", "▤"];
  return jobs.slice(0, HOME_LIMIT).map((job, index) => {
    const location = text(job.location || job.city || job.region) || "勤務地未設定";
    const salary = salaryLabel(job);
    const employment = text(job.employment_type);
    return `        <a class="portal3-job-card" href="${escapeHtml(publicDetail("jobs", job))}" data-job-id="${escapeHtml(job.id)}" data-public-snapshot-item="jobs">
          <span class="portal3-job-icon">${icons[index % icons.length]}</span>
          <strong>${escapeHtml(job.position_title || "求人タイトル未設定")}</strong>
          <small>${escapeHtml([job.company_name, location].map(text).filter(Boolean).join("・"))}</small>
          ${salary ? `<b>${escapeHtml(salary)}</b>` : ""}
          ${employment ? `<em>${escapeHtml(employment)}</em>` : ""}
        </a>`;
  }).join("\n");
}

function communityListCards(posts) {
  return posts.map((post) => {
    const postType = text(post.category1) || "質問";
    const subcategory = text(post.category2) || "その他";
    const location = [post.city, post.region].map(text).filter(Boolean).join(" / ");
    const date = displayDay(preferredCommunityDate(post));
    const excerpt = compact(post.summary || post.body) || "詳細は投稿ページで確認してください。";
    const imageCount = Array.isArray(post.image_urls) ? post.image_urls.filter(text).length : Number(Boolean(text(post.image_url)));
    return `          <article class="card jc-result-card" data-post-id="${escapeHtml(post.id)}" data-status="active" data-photo-count="${imageCount}" data-public-snapshot-item="community">
            <button class="save-button" type="button" data-save-id="${escapeHtml(post.id)}" aria-pressed="false" aria-label="保存する">☆</button>
            <a class="card-link" href="${escapeHtml(publicDetail("community", post))}" aria-label="${escapeHtml(post.title)}の詳細ページを開く">
              <div class="card-media">
                <div class="placeholder-art" data-icon="掲"></div>
                <img src="${escapeHtml(communityImage(post))}" alt="${escapeHtml(post.title)} のイメージ" width="480" height="300" loading="lazy" decoding="async" data-fallback-src="${DEFAULT_IMAGE}">
                ${imageCount ? `<span class="image-count">写真 ${imageCount}</span>` : ""}
              </div>
              <div class="card-body">
                <div class="card-top community-post-meta"><span class="category-badge">${escapeHtml(postType)}</span><span class="subcategory-badge">${escapeHtml(subcategory)}</span></div>
                <h3 class="card-title jc-result-title">${escapeHtml(post.title || "投稿タイトル未設定")}</h3>
                ${text(post.price) ? `<div class="card-price">${escapeHtml(post.price)}</div>` : ""}
                <div class="card-meta jc-result-meta">${location ? `<span>${escapeHtml(location)}</span>` : ""}${date ? `<span>${escapeHtml(date)}</span>` : ""}</div>
                <p class="card-excerpt">${escapeHtml(excerpt)}</p>
              </div>
            </a>
            <div class="card-actions jc-result-actions"><a class="detail-open-link" href="${escapeHtml(publicDetail("community", post))}" target="_blank" rel="noopener noreferrer">詳細を見る</a></div>
          </article>`;
  }).join("\n");
}

function jobMetaItem(label, value) {
  return text(value)
    ? `<div class="jobs-card-meta-item"><span class="jobs-card-meta-label">${escapeHtml(label)}</span><span class="jobs-card-meta-value">${escapeHtml(value)}</span></div>`
    : "";
}

function jobsListCards(jobs) {
  return jobs.map((job, index) => {
    const location = text(job.location || job.city || job.region);
    const summary = text(job.short_description || job.summary || job.description || job.job_details);
    const tags = splitList(job.tags || job.skills).slice(0, 3);
    const chips = [job.employment_type, job.work_style, job.language, job.visa_support].map(text).filter(Boolean);
    const dateValue = preferredJobDate(job);
    const datePrefix = text(job.last_modified_at || job.updated_at) ? "更新" : text(job.published_at) ? "掲載" : text(job.created_at) ? "作成" : "";
    const date = displayDay(dateValue);
    return `        <article class="card job-card jobs-card jc-result-card${index === 0 ? " active" : ""}" data-id="${escapeHtml(job.id)}" data-public-snapshot-item="jobs">
          <button class="save-button" type="button" data-save-id="${escapeHtml(job.id)}" aria-label="保存する">☆</button>
          <div class="job-card-body">
            <div class="job-main">
              <h3 class="job-title jobs-card-title jc-result-title">${escapeHtml(job.position_title || "求人タイトル未設定")}</h3>
              ${text(job.company_name) ? `<div class="jobs-card-company">${escapeHtml(job.company_name)}</div>` : ""}
              ${summary ? `<p class="job-summary jobs-card-summary">${escapeHtml(summary)}</p>` : ""}
            </div>
            <div class="job-side">
              <div class="jobs-card-meta jc-result-meta">
                ${jobMetaItem("勤務地", location)}
                ${jobMetaItem("雇用形態", job.employment_type)}
                ${jobMetaItem("勤務形態", job.work_style)}
                ${jobMetaItem("言語", job.language)}
                ${jobMetaItem("ビザ", job.visa_support)}
                ${jobMetaItem("給与", salaryLabel(job))}
              </div>
              <div class="job-chip-row jobs-card-pill-row">${chips.map((chip, chipIndex) => `<span class="job-chip${chipIndex === 0 ? " primary" : ""}">${escapeHtml(chip)}</span>`).join("")}${tags.map((tag) => `<span class="job-chip">${escapeHtml(tag)}</span>`).join("")}</div>
              ${date && datePrefix ? `<div class="jobs-card-date">${datePrefix} ${escapeHtml(date)}</div>` : ""}
            </div>
            <div class="job-card-actions jc-result-actions"><a class="card-action primary" href="${escapeHtml(publicDetail("jobs", job))}" data-detail-page-link="${escapeHtml(job.id)}">詳細を見る</a></div>
          </div>
        </article>`;
  }).join("\n");
}

function emptySnapshot(kind) {
  if (kind === "community") {
    return `          <div class="jc-data-state"><h3>現在公開中の投稿はありません</h3><p>最初の投稿を作成できます。</p><a href="/germany/ja/community/post/">投稿する</a></div>`;
  }
  return `        <div class="jc-data-state"><h3>現在公開中の求人はありません</h3><p>求人情報は準備でき次第公開します。</p><a href="/germany/ja/jobs/posting/">求人を無料掲載する</a></div>`;
}

export function renderPublicListSnapshots({
  root = rootDir,
  now = new Date(),
  write = true
} = {}) {
  const { communityPayload, jobsPayload, community, jobs } = loadPublicSnapshotData({ root, now });

  let home = fs.readFileSync(path.join(root, SNAPSHOT_PATHS.home), "utf8");
  home = replaceSnapshot(home, "home-community-mini", community.length ? homeCommunityMini(community) : emptySnapshot("community"));
  home = replaceSnapshot(home, "home-community-cards", community.length ? homeCommunityCards(community) : emptySnapshot("community"));
  home = replaceSnapshot(home, "home-jobs-mini", jobs.length ? homeJobsMini(jobs) : emptySnapshot("jobs"));
  home = replaceSnapshot(home, "home-jobs-cards", jobs.length ? homeJobsCards(jobs) : emptySnapshot("jobs"));

  let jobsHtml = fs.readFileSync(path.join(root, SNAPSHOT_PATHS.jobs), "utf8");
  jobsHtml = replaceSnapshot(jobsHtml, "jobs-summary", `公開中の求人を${jobs.length}件表示しています。`);
  jobsHtml = replaceSnapshot(jobsHtml, "jobs-updated", `データ最終更新: ${displayDay(jobsPayload.generated_at) || "不明"}`);
  jobsHtml = replaceSnapshot(jobsHtml, "jobs-list", jobs.length ? jobsListCards(jobs) : emptySnapshot("jobs"));

  let communityHtml = fs.readFileSync(path.join(root, SNAPSHOT_PATHS.community), "utf8");
  communityHtml = replaceSnapshot(communityHtml, "community-summary", `${community.length}件の公開中の投稿を表示しています。`);
  communityHtml = replaceSnapshot(communityHtml, "community-list", community.length ? communityListCards(community) : emptySnapshot("community"));

  if (write) {
    fs.writeFileSync(path.join(root, SNAPSHOT_PATHS.home), home, "utf8");
    fs.writeFileSync(path.join(root, SNAPSHOT_PATHS.jobs), jobsHtml, "utf8");
    fs.writeFileSync(path.join(root, SNAPSHOT_PATHS.community), communityHtml, "utf8");
  }

  return {
    community,
    jobs,
    html: { home, jobs: jobsHtml, community: communityHtml }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = renderPublicListSnapshots();
  console.log(`Rendered crawler-first public snapshots: ${result.community.length} Community, ${result.jobs.length} Jobs.`);
}
