const NEWS_DATA_URL = "/assets/data/news.json";

const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("newsSearch");
const countryFilter = document.getElementById("countryFilter");
const cityFilter = document.getElementById("cityFilter");
const categoryFilter = document.getElementById("categoryFilter");
const importanceFilter = document.getElementById("importanceFilter");
const filterControls = [searchInput, countryFilter, cityFilter, categoryFilter, importanceFilter].filter(Boolean);

let allNews = [];

async function loadNews() {
  if (!newsGrid) return;

  try {
    const response = await fetch(NEWS_DATA_URL);
    allNews = await response.json();
    renderNews(allNews);
  } catch (error) {
    renderNews([]);
  }
}

function renderNews(items) {
  if (!items.length) {
    newsGrid.innerHTML = `
      <div class="news-events-empty news-empty">
        <h3>ニュースを準備中です</h3>
        <p>生活アップデート、サイトからのお知らせ、コミュニティ関連の情報を順次掲載します。</p>
      </div>
    `;
    return;
  }

  newsGrid.innerHTML = items.map(item => `
    <article class="news-card">
      <div class="news-card__badges">
        <span>${escapeHtml(item.country_ja)}</span>
        <span>${escapeHtml(item.city_ja)}</span>
        <span>${escapeHtml(item.category_ja)}</span>
        <span>${escapeHtml(item.importance_ja)}</span>
      </div>

      <h3>${escapeHtml(item.title)}</h3>

      <p>${escapeHtml(item.summary)}</p>

      <div class="news-card__meta">
        <span>出典: ${escapeHtml(item.source_name)}</span>
        <span>${escapeHtml(item.published_at)}</span>
      </div>

      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        出典で確認する
      </a>
    </article>
  `).join("");
}

function applyFilters() {
  const keyword = searchInput ? searchInput.value.toLowerCase() : "";
  const country = countryFilter ? countryFilter.value : "all";
  const city = cityFilter ? cityFilter.value : "all";
  const category = categoryFilter ? categoryFilter.value : "all";
  const importance = importanceFilter ? importanceFilter.value : "all";

  const filtered = allNews.filter(item => {
    const text = `${item.title} ${item.summary} ${item.source_name} ${item.category_ja} ${item.city_ja}`.toLowerCase();

    return (
      text.includes(keyword) &&
      (country === "all" || item.country === country) &&
      (city === "all" || item.city === city) &&
      (category === "all" || item.category === category) &&
      (importance === "all" || item.importance === importance)
    );
  });

  renderNews(filtered);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

filterControls.forEach(element => {
  element.addEventListener("input", applyFilters);
  element.addEventListener("change", applyFilters);
});

loadNews();
