const NEWS_DATA_URL = "/assets/data/news.json";

const newsGrid = document.getElementById("newsGrid");
const searchInput = document.getElementById("newsSearch");
const countryFilter = document.getElementById("countryFilter");
const cityFilter = document.getElementById("cityFilter");
const categoryFilter = document.getElementById("categoryFilter");
const importanceFilter = document.getElementById("importanceFilter");

let allNews = [];

async function loadNews() {
  try {
    const response = await fetch(NEWS_DATA_URL);
    allNews = await response.json();
    renderNews(allNews);
  } catch (error) {
    newsGrid.innerHTML = `
      <p class="news-error">
        ニュースを読み込めませんでした。時間をおいて再度お試しください。
      </p>
    `;
  }
}

function renderNews(items) {
  if (!items.length) {
    newsGrid.innerHTML = `<p class="news-empty">条件に合うニュースはありません。</p>`;
    return;
  }

  newsGrid.innerHTML = items.map(item => `
    <article class="news-card">
      <div class="news-card__badges">
        <span>${item.country_ja}</span>
        <span>${item.city_ja}</span>
        <span>${item.category_ja}</span>
        <span>${item.importance_ja}</span>
      </div>

      <h2>${escapeHtml(item.title)}</h2>

      <p>${escapeHtml(item.summary)}</p>

      <div class="news-card__meta">
        <span>出典: ${escapeHtml(item.source_name)}</span>
        <span>${escapeHtml(item.published_at)}</span>
      </div>

      <a href="${item.url}" target="_blank" rel="noopener noreferrer">
        続きを読む
      </a>
    </article>
  `).join("");
}

function applyFilters() {
  const keyword = searchInput.value.toLowerCase();
  const country = countryFilter.value;
  const city = cityFilter.value;
  const category = categoryFilter.value;
  const importance = importanceFilter.value;

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

[searchInput, countryFilter, cityFilter, categoryFilter, importanceFilter].forEach(element => {
  element.addEventListener("input", applyFilters);
  element.addEventListener("change", applyFilters);
});

loadNews();
