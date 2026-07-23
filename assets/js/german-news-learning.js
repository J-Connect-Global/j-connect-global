const GERMAN_NEWS_DATA_URL = "/assets/data/news.json";

(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGermanNewsLearning);
  } else {
    initGermanNewsLearning();
  }
})();

function initGermanNewsLearning() {
  const panel = document.querySelector("[data-german-news-learning]");
  const list = panel?.querySelector("[data-german-news-list]");
  if (!panel || !list) return;

  renderGermanNewsLearningLoading(list);
  loadGermanNewsLearningItems(list);
}

function renderGermanNewsLearningLoading(list) {
  list.setAttribute("aria-busy", "true");
  list.innerHTML = `
    <div class="news-events-empty" role="status">
      <h3>ドイツ語ニュース素材を読み込んでいます</h3>
      <p>外部ニュースの公開データを確認しています。</p>
    </div>
  `;
}

async function loadGermanNewsLearningItems(list) {
  try {
    const response = await fetch(GERMAN_NEWS_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = await response.json();
    const germanItems = Array.isArray(items)
      ? items.filter(isVerifiedGermanNewsItem).slice(0, 6)
      : [];
    renderGermanNewsLearningItems(list, germanItems);
  } catch (error) {
    console.warn("German news learning data load failed:", GERMAN_NEWS_DATA_URL, error);
    renderGermanNewsLearningError(list);
  }
}

function renderGermanNewsLearningItems(list, items) {
  list.setAttribute("aria-busy", "false");
  if (!items.length) {
    list.innerHTML = `
      <div class="news-events-empty" role="status">
        <h3>現在利用できるドイツ語ニュース素材はありません</h3>
        <p>このページの読解手順や、ほかの教材・リソースも学習に利用できます。</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(renderGermanNewsLearningCard).join("");
}

function renderGermanNewsLearningError(list) {
  list.setAttribute("aria-busy", "false");
  list.innerHTML = `
    <div class="news-events-empty" role="status">
      <h3>ドイツ語ニュース素材を一時的に表示できません</h3>
      <p>時間をおいて再読み込みしてください。このページの読解手順は引き続き利用できます。</p>
    </div>
  `;
}

function renderGermanNewsLearningCard(item) {
  const title = decodeHtml(firstNonEmpty(item.title, "External news"));
  const summary = decodeHtml(firstNonEmpty(item.summary, "ドイツ語ニュースを読む練習素材です。"));
  const sourceName = firstNonEmpty(item.source_name, "External source");
  const date = firstNonEmpty(item.published_at, "");

  return `<a class="jc-article-card learn-resource-card german-news-learning-card" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">
  <div class="jc-card-meta"><span>外部ニュース</span><span>ドイツ語ニュース素材</span>${date ? `<span>${escapeHtml(date)}</span>` : ""}</div>
  <h3>${escapeHtml(title)}</h3>
  <p>${escapeHtml(summary)}</p>
  <div class="jc-chip-row"><span class="jc-chip">${escapeHtml(sourceName)}</span><span class="jc-chip">読解</span><span class="jc-chip">語彙</span></div>
  <span class="jc-read-more">外部記事で読む</span>
</a>`;
}

function isVerifiedGermanNewsItem(item) {
  if (!item || item.language !== "de") return false;
  try {
    const url = new URL(item.url);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "dw.com" || hostname.endsWith(".dw.com"));
  } catch (_error) {
    return false;
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function decodeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
