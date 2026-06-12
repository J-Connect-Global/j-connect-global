const LEARN_GERMAN_DATA_URL = "/assets/data/learn-german.json";

const resourceGrid = document.getElementById("resourceGrid");
const searchInput = document.getElementById("resourceSearch");
const levelFilter = document.getElementById("levelFilter");
const layerFilter = document.getElementById("layerFilter");
const formatFilter = document.getElementById("formatFilter");
const purposeFilter = document.getElementById("purposeFilter");
const typeFilter = document.getElementById("typeFilter");
const priceFilter = document.getElementById("priceFilter");
const levelButtons = document.querySelectorAll("[data-level-shortcut]");
const categoryButtons = document.querySelectorAll("[data-layer-shortcut]");

let allResources = [];

const labels = {
  layer1: {
    roadmap: "ロードマップ",
    daily: "日常ドイツ語",
    business: "ビジネスドイツ語",
    exam: "試験対策",
    "apps-ai": "アプリ・AI",
    media: "動画・音声",
    speaking: "会話・先生",
    community: "コミュニティ"
  },
  content_type: {
    original: "Original",
    external: "External",
    ai_tool: "AI Tool",
    community: "Community",
    teacher_class: "Teacher/Class"
  },
  price: {
    free: "無料",
    freemium: "一部無料",
    paid: "有料"
  }
};

async function loadResources() {
  try {
    const response = await fetch(LEARN_GERMAN_DATA_URL);

    if (!response.ok) {
      throw new Error(`Failed to load learn-german.json: ${response.status}`);
    }

    allResources = await response.json();
    renderResources(allResources);
  } catch (error) {
    console.error(error);
    resourceGrid.innerHTML = `
      <p class="resource-empty">
        学習リソースを読み込めませんでした。時間をおいてもう一度お試しください。
      </p>
    `;
  }
}

function renderResources(items) {
  const published = items.filter(item => item.status !== "archived");

  if (!published.length) {
    resourceGrid.innerHTML = `<p class="resource-empty">条件に合う教材はありません。</p>`;
    return;
  }

  resourceGrid.innerHTML = published.map(item => {
    const url = getResourceUrl(item);
    return `
      <article class="resource-card">
        <div class="resource-card__badges">
          <span>${escapeHtml(labels.content_type[item.content_type] || item.content_type)}</span>
          <span>${escapeHtml(formatArray(item.level).join("-"))}</span>
          <span>${escapeHtml(labels.layer1[item.layer1] || item.layer1)}</span>
          <span>${escapeHtml(labels.price[item.price] || item.price)}</span>
        </div>

        <h3>${escapeHtml(item.title_ja)}</h3>

        <p>${escapeHtml(item.summary_ja)}</p>

        <dl class="resource-card__meta">
          <div>
            <dt>おすすめ</dt>
            <dd>${escapeHtml(item.recommended_use_ja || "")}</dd>
          </div>
          <div>
            <dt>形式</dt>
            <dd>${escapeHtml(formatArray(item.format).join(" / "))}</dd>
          </div>
        </dl>

        <a class="resource-card__link" href="${escapeAttribute(url)}" ${isExternalUrl(url) ? 'target="_blank" rel="noopener noreferrer"' : ""}>
          ${escapeHtml(item.cta_label || "開く")}
        </a>
      </article>
    `;
  }).join("");
}

function applyFilters() {
  const keyword = (searchInput?.value || "").toLowerCase().trim();
  const level = levelFilter?.value || "all";
  const layer = layerFilter?.value || "all";
  const format = formatFilter?.value || "all";
  const purpose = purposeFilter?.value || "all";
  const type = typeFilter?.value || "all";
  const price = priceFilter?.value || "all";

  const filtered = allResources.filter(item => {
    const searchableText = `
      ${item.title_ja || ""}
      ${item.summary_ja || ""}
      ${item.recommended_use_ja || ""}
      ${item.layer1 || ""}
      ${item.layer2 || ""}
      ${formatArray(item.level).join(" ")}
      ${formatArray(item.purpose).join(" ")}
      ${formatArray(item.scene).join(" ")}
      ${formatArray(item.skill).join(" ")}
      ${formatArray(item.format).join(" ")}
      ${item.content_type || ""}
      ${item.price || ""}
    `.toLowerCase();

    return (
      (!keyword || searchableText.includes(keyword)) &&
      (level === "all" || formatArray(item.level).includes(level)) &&
      (layer === "all" || item.layer1 === layer) &&
      (format === "all" || formatArray(item.format).includes(format)) &&
      (purpose === "all" || formatArray(item.purpose).includes(purpose)) &&
      (type === "all" || item.content_type === type) &&
      (price === "all" || item.price === price)
    );
  });

  renderResources(filtered);
}

function setLevelShortcut(level) {
  if (levelFilter) levelFilter.value = level;
  applyFilters();
  document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" });
}

function setLayerShortcut(layer) {
  if (layerFilter) layerFilter.value = layer;
  applyFilters();
  document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" });
}

function formatArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function getResourceUrl(item) {
  const url = String(item?.url || "").trim();
  return url && url !== "#" ? url : "/germany/ja/learn-german/#resources";
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
  return escapeHtml(value);
}

[searchInput, levelFilter, layerFilter, formatFilter, purposeFilter, typeFilter, priceFilter]
  .filter(Boolean)
  .forEach(element => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

levelButtons.forEach(button => {
  button.addEventListener("click", () => {
    setLevelShortcut(button.dataset.levelShortcut);
  });
});

categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    setLayerShortcut(button.dataset.layerShortcut);
  });
});

loadResources();
