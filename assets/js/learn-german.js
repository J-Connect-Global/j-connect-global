const LEARN_GERMAN_DATA_URL = "/assets/data/learn-german.json";

const articleCards = Array.from(document.querySelectorAll("[data-learn-article-card]"));
const articleSearchInput = document.getElementById("articleSearch");
const articleFilterFields = ["situation", "goal", "level", "skill", "duration"];
const articleFilterCards = Array.from(document.querySelectorAll("[data-article-filter]"));
const articleFilterStatus = document.getElementById("articleFilterStatus");
const articleFilterReset = document.getElementById("articleFilterReset");
const articleEmpty = document.getElementById("articleEmpty");
const articleEmptyTitle = document.getElementById("articleEmptyTitle");
const articleEmptyBody = document.getElementById("articleEmptyBody");
const articleEmptyActions = Array.from(document.querySelectorAll("[data-empty-command]"));
const selectedFilterChips = document.getElementById("selectedFilterChips");
const learnFilterToggle = document.getElementById("learnFilterToggle");
const learnFilterPanel = document.getElementById("learnFilterPanel");
const learnFilterGroups = Array.from(document.querySelectorAll("[data-filter-group]"));

const resourceGrid = document.getElementById("resourceGrid");
const resourceSearchInput = document.getElementById("resourceSearch");
const levelFilter = document.getElementById("levelFilter");
const layerFilter = document.getElementById("layerFilter");
const formatFilter = document.getElementById("formatFilter");
const purposeFilter = document.getElementById("purposeFilter");
const typeFilter = document.getElementById("typeFilter");
const priceFilter = document.getElementById("priceFilter");

let allResources = [];
let articleFilterState = {
  query: "",
  situation: "all",
  goal: "all",
  level: "all",
  skill: "all",
  duration: "all"
};

const articleFilterLabels = {
  situation: {
    "phone,appointment": "電話・予約",
    "medical,pharmacy": "病院・薬局",
    "administration,anmeldung": "役所・Anmeldung",
    "housing,landlord": "大家・住まい",
    "kita,school": "Kita・学校",
    "work,business-email": "職場・ビジネスメール",
    "bank,insurance": "銀行・保険",
    shopping: "買い物",
    parenting: "子育て"
  },
  goal: {
    "new-arrival": "ドイツに来たばかり",
    employment: "仕事を探したい",
    "housing-contract": "賃貸契約をしたい",
    healthcare: "病院を利用したい",
    parenting: "子育てをしたい",
    "school-kita": "学校・Kitaを探したい"
  },
  level: {
    A1: "A1",
    A2: "A2",
    B1: "B1",
    "A2,B1": "A2/B1",
    B2: "B2",
    "C1,C2": "C1-C2"
  },
  skill: {
    speaking: "話す",
    listening: "聞く",
    reading: "読む",
    writing: "書く"
  },
  duration: {
    "5min": "5分",
    "15min": "15分",
    "30min": "30分"
  }
};

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

function hydrateArticleFiltersFromUrl() {
  if (!articleCards.length) return;
  const params = new URLSearchParams(window.location.search);
  for (const field of articleFilterFields) {
    articleFilterState[field] = normalizeArticleFilterValue(field, params.get(field) || "all");
  }
  articleFilterState.query = (params.get("article_q") || "").trim().toLowerCase();
  if (articleSearchInput) articleSearchInput.value = articleFilterState.query;
  applyArticleFilters({ updateUrl: false });
}

function getArticleFilterState() {
  articleFilterState.query = (articleSearchInput?.value || "").trim().toLowerCase();
  return {
    ...articleFilterState
  };
}

function applyArticleFilters({ updateUrl = true, scroll = false } = {}) {
  if (!articleCards.length) return;
  const state = getArticleFilterState();
  let visibleCount = 0;

  for (const card of articleCards) {
    const matches = articleMatches(card, state);
    card.hidden = !matches;
    card.classList.toggle("is-filtered-out", !matches);
    card.setAttribute("aria-hidden", matches ? "false" : "true");
    if (matches) visibleCount += 1;
  }

  updateArticleFilterState(state, visibleCount);
  if (updateUrl) updateArticleUrl(state);
  if (scroll) document.getElementById("learningArticles")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function articleMatches(card, state) {
  const searchText = String(card.dataset.search || "").toLowerCase();
  return (
    (!state.query || searchText.includes(state.query)) &&
    matchesFilterValue(card.dataset.situation, state.situation) &&
    matchesFilterValue(card.dataset.goal, state.goal) &&
    matchesFilterValue(card.dataset.level, state.level) &&
    matchesFilterValue(card.dataset.skill, state.skill) &&
    matchesFilterValue(card.dataset.duration, state.duration)
  );
}

function matchesFilterValue(cardValue, selectedValue) {
  const selected = splitFilterValue(selectedValue);
  if (!selected.length) return true;
  const values = splitFilterValue(cardValue);
  return selected.some(value => values.includes(value));
}

function splitFilterValue(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map(entry => entry.trim())
    .filter(entry => entry && entry !== "all");
}

function updateArticleFilterState(state, visibleCount) {
  const hasActiveFilter = hasActiveArticleFilter(state);

  if (articleFilterStatus) {
    articleFilterStatus.textContent = hasActiveFilter
      ? `${articleCards.length}件中 ${visibleCount}件を表示しています。`
      : `すべての記事（${articleCards.length}件）を表示しています。`;
  }
  renderSelectedFilterChips(state);
  updateArticleEmptyState(state, visibleCount);
  if (articleFilterReset) articleFilterReset.disabled = !hasActiveFilter;

  for (const button of articleFilterCards) {
    const field = button.dataset.articleFilter;
    const value = button.dataset.filterValue || "all";
    const active = field && sameFilterValue(state[field], value);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function updateArticleEmptyState(state, visibleCount) {
  if (!articleEmpty) return;

  const isEmpty = visibleCount === 0;
  articleEmpty.hidden = !isEmpty;
  if (!isEmpty) return;

  const isAdvancedLevel = state.level !== "all" && matchesFilterValue("B2 C1 C2", state.level);
  const isPlannedDuration = state.duration !== "all" && matchesFilterValue("30min", state.duration);

  if (isAdvancedLevel) {
    setArticleEmptyCopy(
      "このレベルの記事は準備中です",
      "B2以上の職場・大学・専門的な表現は今後追加予定です。まずはA2/B1の記事から確認できます。"
    );
    setEmptyActionVisibility({ relatedLevels: true, reset: true, all: false });
    return;
  }

  if (isPlannedDuration) {
    setArticleEmptyCopy(
      "30分で学ぶ記事は準備中です",
      "応用表現や長めの練習記事は今後追加予定です。まずは5分・15分の記事から確認できます。"
    );
    setEmptyActionVisibility({ relatedLevels: false, reset: true, all: true });
    return;
  }

  setArticleEmptyCopy(
    "条件に合う記事はまだありません",
    "条件を少し広げるか、近い場面の記事から確認してください。"
  );
  setEmptyActionVisibility({ relatedLevels: false, reset: true, all: true });
}

function setArticleEmptyCopy(title, body) {
  if (articleEmptyTitle) articleEmptyTitle.textContent = title;
  if (articleEmptyBody) articleEmptyBody.textContent = body;
}

function setEmptyActionVisibility({ relatedLevels, reset, all }) {
  for (const action of articleEmptyActions) {
    const kind = action.dataset.emptyCommand;
    action.hidden =
      (kind === "related-levels" && !relatedLevels) ||
      (kind === "reset" && !reset) ||
      (kind === "all" && !all);
  }
}

function sameFilterValue(left, right) {
  const leftValues = splitFilterValue(left).sort();
  const rightValues = splitFilterValue(right).sort();
  return leftValues.length > 0 &&
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index]);
}

function updateArticleUrl(state) {
  if (!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  const keys = ["situation", "goal", "level", "skill", "duration", "article_q"];
  for (const key of keys) url.searchParams.delete(key);

  for (const key of ["situation", "goal", "level", "skill", "duration"]) {
    if (state[key] && state[key] !== "all") url.searchParams.set(key, state[key]);
  }
  if (state.query) url.searchParams.set("article_q", state.query);

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function setArticleFilter(field, value) {
  if (!articleFilterFields.includes(field)) return;
  const normalizedValue = normalizeArticleFilterValue(field, value);
  articleFilterState[field] = sameFilterValue(articleFilterState[field], normalizedValue) ? "all" : normalizedValue;
  applyArticleFilters({ scroll: true });
}

function removeArticleFilter(field) {
  if (field === "query") {
    articleFilterState.query = "";
    if (articleSearchInput) articleSearchInput.value = "";
  } else if (articleFilterFields.includes(field)) {
    articleFilterState[field] = "all";
  }
  applyArticleFilters();
}

function resetArticleFilters() {
  if (articleSearchInput) articleSearchInput.value = "";
  articleFilterState.query = "";
  for (const field of articleFilterFields) {
    articleFilterState[field] = "all";
  }
  applyArticleFilters();
}

function showRelatedLevelArticles() {
  if (articleSearchInput) articleSearchInput.value = "";
  articleFilterState.query = "";
  for (const field of articleFilterFields) {
    articleFilterState[field] = field === "level" ? "A2,B1" : "all";
  }
  applyArticleFilters({ scroll: true });
}

function hasActiveArticleFilter(state) {
  return Boolean(
    state.query ||
    articleFilterFields.some(field => state[field] && state[field] !== "all")
  );
}

function normalizeArticleFilterValue(field, value) {
  const rawValue = String(value || "all").trim();
  if (!rawValue || rawValue === "all") return "all";
  const labelsForField = articleFilterLabels[field] || {};
  if (Object.prototype.hasOwnProperty.call(labelsForField, rawValue)) return rawValue;

  const rawParts = splitFilterValue(rawValue);
  const matchingOption = Object.keys(labelsForField).find(optionValue => {
    const optionParts = splitFilterValue(optionValue);
    return rawParts.length && rawParts.every(part => optionParts.includes(part));
  });
  return matchingOption || rawValue;
}

function getArticleFilterLabel(field, value) {
  const labelsForField = articleFilterLabels[field] || {};
  if (labelsForField[value]) return labelsForField[value];
  const values = splitFilterValue(value);
  const label = Object.entries(labelsForField)
    .filter(([optionValue]) => values.some(valuePart => splitFilterValue(optionValue).includes(valuePart)))
    .map(([, optionLabel]) => optionLabel)
    .join(" / ");
  return label || value;
}

function renderSelectedFilterChips(state) {
  if (!selectedFilterChips) return;
  const chips = [];

  if (state.query) {
    chips.push(`<button class="learn-selected-chip" type="button" data-chip-remove="query">キーワード: ${escapeHtml(state.query)} <span aria-hidden="true">×</span></button>`);
  }

  for (const field of articleFilterFields) {
    if (!state[field] || state[field] === "all") continue;
    const label = getArticleFilterLabel(field, state[field]);
    chips.push(`<button class="learn-selected-chip" type="button" data-chip-remove="${escapeAttribute(field)}">${escapeHtml(label)} <span aria-hidden="true">×</span></button>`);
  }

  selectedFilterChips.innerHTML = chips.length
    ? chips.join("")
    : '<span class="learn-no-filters">条件は選択されていません</span>';
}

function setFilterPanelExpanded(expanded) {
  if (!learnFilterPanel || !learnFilterToggle) return;
  learnFilterPanel.classList.toggle("is-collapsed", !expanded);
  learnFilterToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  learnFilterToggle.textContent = expanded ? "フィルターを閉じる" : "条件を変更";
}

function setFilterGroupsOpen(open) {
  for (const group of learnFilterGroups) {
    if (open) {
      group.setAttribute("open", "");
    } else {
      group.removeAttribute("open");
    }
  }
}

function initializeResponsiveFilters() {
  if (!window.matchMedia) return;
  const mobileQuery = window.matchMedia("(max-width: 759px)");
  const sync = () => {
    const isMobile = mobileQuery.matches;
    setFilterPanelExpanded(!isMobile);
    setFilterGroupsOpen(!isMobile);
  };
  sync();
  mobileQuery.addEventListener?.("change", sync);
}

async function loadResources() {
  if (!resourceGrid) return;

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
  if (!resourceGrid) return;
  const published = items.filter(item => item.status !== "archived");

  if (!published.length) {
    const message = allResources.length
      ? "条件に合う学習リソースはありません。条件を少し広げて確認してください。"
      : "学習リソースを準備中です。アプリ、オンライン講座、動画教材などを順次整理します。";
    resourceGrid.innerHTML = `<p class="resource-empty">${message}</p>`;
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

function applyResourceFilters() {
  const keyword = (resourceSearchInput?.value || "").toLowerCase().trim();
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

articleFilterCards.forEach(button => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    setArticleFilter(button.dataset.articleFilter, button.dataset.filterValue || "all");
  });
});

articleSearchInput?.addEventListener("input", () => applyArticleFilters());
articleSearchInput?.addEventListener("change", () => applyArticleFilters());

articleFilterReset?.addEventListener("click", resetArticleFilters);

selectedFilterChips?.addEventListener("click", event => {
  const button = event.target.closest("[data-chip-remove]");
  if (!button) return;
  removeArticleFilter(button.dataset.chipRemove);
});

learnFilterToggle?.addEventListener("click", () => {
  const expanded = learnFilterToggle.getAttribute("aria-expanded") === "true";
  setFilterPanelExpanded(!expanded);
});

articleEmptyActions.forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.emptyCommand;
    if (action === "related-levels") {
      showRelatedLevelArticles();
      return;
    }
    resetArticleFilters();
  });
});

[resourceSearchInput, levelFilter, layerFilter, formatFilter, purposeFilter, typeFilter, priceFilter]
  .filter(Boolean)
  .forEach(element => {
    element.addEventListener("input", applyResourceFilters);
    element.addEventListener("change", applyResourceFilters);
  });

initializeResponsiveFilters();
hydrateArticleFiltersFromUrl();
loadResources();
