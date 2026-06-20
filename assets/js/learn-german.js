const phraseCards = Array.from(document.querySelectorAll("[data-learn-article-card]"));
const phraseSearchInput = document.getElementById("articleSearch");
const phraseFilterFields = ["situation", "goal"];
const phraseFilterButtons = Array.from(document.querySelectorAll("[data-article-filter]"));
const phraseFilterStatus = document.getElementById("articleFilterStatus");
const phraseFilterReset = document.getElementById("articleFilterReset");
const phraseEmpty = document.getElementById("articleEmpty");
const phraseEmptyActions = Array.from(document.querySelectorAll("[data-empty-command]"));
const selectedFilterChips = document.getElementById("selectedFilterChips");
const learnFilterToggle = document.getElementById("learnFilterToggle");
const learnFilterPanel = document.getElementById("learnFilterPanel");
const learnFilterGroups = Array.from(document.querySelectorAll("[data-filter-group]"));
const learnViewToggles = Array.from(document.querySelectorAll("[data-learn-view-toggle]"));

const resourceCards = Array.from(document.querySelectorAll("[data-resource-article-card]"));
const resourceSearchInput = document.getElementById("resourceSearch");
const resourceFilterFields = ["skill", "format", "level", "price"];
const resourceFilterButtons = Array.from(document.querySelectorAll("[data-resource-filter]"));
const resourceFilterStatus = document.getElementById("resourceFilterStatus");
const resourceFilterReset = document.getElementById("resourceFilterReset");
const resourceEmpty = document.getElementById("resourceEmpty");
const resourceFilterToggle = document.getElementById("resourceFilterToggle");
const resourceFilterPanel = document.getElementById("resourceFilterPanel");
const resourceFilterGroups = Array.from(document.querySelectorAll("[data-resource-filter-group]"));

let phraseFilterState = {
  query: "",
  situation: "all",
  goal: "all"
};

let resourceFilterState = {
  query: "",
  skill: "all",
  format: "all",
  level: "all",
  price: "all"
};

const phraseFilterLabels = {
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
  }
};

const resourceFilterLabels = {
  skill: {
    speaking: "話す",
    listening: "聞く",
    reading: "読む",
    writing: "書く"
  },
  format: {
    app: "アプリ",
    video: "動画",
    website: "サイト",
    course: "講座",
    exam: "試験対策"
  },
  level: {
    A1: "A1",
    A2: "A2",
    B1: "B1",
    B2plus: "B2以上"
  },
  price: {
    free: "無料",
    freemium: "一部無料",
    paid: "有料"
  }
};

function hydratePhraseFiltersFromUrl() {
  if (!phraseCards.length) return;
  const params = new URLSearchParams(window.location.search);
  for (const field of phraseFilterFields) {
    phraseFilterState[field] = normalizeFilterValue(field, params.get(field) || "all", phraseFilterLabels);
  }
  phraseFilterState.query = (params.get("article_q") || "").trim().toLowerCase();
  if (phraseSearchInput) phraseSearchInput.value = phraseFilterState.query;
  applyPhraseFilters({ updateUrl: false });
}

function getPhraseFilterState() {
  phraseFilterState.query = (phraseSearchInput?.value || "").trim().toLowerCase();
  return { ...phraseFilterState };
}

function applyPhraseFilters({ updateUrl = true, scroll = false } = {}) {
  if (!phraseCards.length) return;
  const state = getPhraseFilterState();
  let visibleCount = 0;

  for (const card of phraseCards) {
    const matches = phraseMatches(card, state);
    setCardVisible(card, matches);
    if (matches) visibleCount += 1;
  }

  updatePhraseFilterState(state, visibleCount);
  if (updateUrl) updatePhraseUrl(state);
  if (scroll) document.getElementById("phrase-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function phraseMatches(card, state) {
  const searchText = String(card.dataset.search || "").toLowerCase();
  return (
    (!state.query || searchText.includes(state.query)) &&
    matchesFilterValue(card.dataset.situation, state.situation) &&
    matchesFilterValue(card.dataset.goal, state.goal)
  );
}

function updatePhraseFilterState(state, visibleCount) {
  const hasActiveFilter = hasActiveFilterState(state, phraseFilterFields);

  if (phraseFilterStatus) {
    phraseFilterStatus.textContent = hasActiveFilter
      ? `${phraseCards.length}件中 ${visibleCount}件を表示しています。`
      : `すべての記事（${phraseCards.length}件）を表示しています。`;
  }

  renderSelectedFilterChips(state);
  if (phraseEmpty) phraseEmpty.hidden = visibleCount !== 0;
  if (phraseFilterReset) phraseFilterReset.disabled = !hasActiveFilter;

  for (const button of phraseFilterButtons) {
    const field = button.dataset.articleFilter;
    const value = button.dataset.filterValue || "all";
    const active = field && sameFilterValue(state[field], value);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function updatePhraseUrl(state) {
  if (!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  for (const key of ["situation", "goal", "level", "skill", "duration", "article_q"]) {
    url.searchParams.delete(key);
  }
  for (const key of phraseFilterFields) {
    if (state[key] && state[key] !== "all") url.searchParams.set(key, state[key]);
  }
  if (state.query) url.searchParams.set("article_q", state.query);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function setPhraseFilter(field, value) {
  if (!phraseFilterFields.includes(field)) return;
  const normalizedValue = normalizeFilterValue(field, value, phraseFilterLabels);
  phraseFilterState[field] = sameFilterValue(phraseFilterState[field], normalizedValue) ? "all" : normalizedValue;
  applyPhraseFilters({ scroll: true });
}

function removePhraseFilter(field) {
  if (field === "query") {
    phraseFilterState.query = "";
    if (phraseSearchInput) phraseSearchInput.value = "";
  } else if (phraseFilterFields.includes(field)) {
    phraseFilterState[field] = "all";
  }
  applyPhraseFilters();
}

function resetPhraseFilters() {
  if (phraseSearchInput) phraseSearchInput.value = "";
  phraseFilterState = {
    query: "",
    situation: "all",
    goal: "all"
  };
  applyPhraseFilters();
}

function renderSelectedFilterChips(state) {
  if (!selectedFilterChips) return;
  const chips = [];

  if (state.query) {
    chips.push(`<button class="learn-selected-chip" type="button" data-chip-remove="query">キーワード: ${escapeHtml(state.query)} <span aria-hidden="true">×</span></button>`);
  }

  for (const field of phraseFilterFields) {
    if (!state[field] || state[field] === "all") continue;
    const label = getFilterLabel(field, state[field], phraseFilterLabels);
    chips.push(`<button class="learn-selected-chip" type="button" data-chip-remove="${escapeAttribute(field)}">${escapeHtml(label)} <span aria-hidden="true">×</span></button>`);
  }

  selectedFilterChips.innerHTML = chips.length
    ? chips.join("")
    : '<span class="learn-no-filters">条件は選択されていません</span>';
}

function getResourceFilterState() {
  resourceFilterState.query = (resourceSearchInput?.value || "").trim().toLowerCase();
  return { ...resourceFilterState };
}

function applyResourceFilters({ scroll = false } = {}) {
  if (!resourceCards.length) return;
  const state = getResourceFilterState();
  let visibleCount = 0;

  for (const card of resourceCards) {
    const matches = resourceMatches(card, state);
    setCardVisible(card, matches);
    if (matches) visibleCount += 1;
  }

  updateResourceFilterState(state, visibleCount);
  if (scroll) document.getElementById("learning-resources")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resourceMatches(card, state) {
  const searchText = String(card.dataset.search || "").toLowerCase();
  return (
    (!state.query || searchText.includes(state.query)) &&
    matchesFilterValue(card.dataset.resourceSkill, state.skill) &&
    matchesFilterValue(card.dataset.resourceFormat, state.format) &&
    matchesFilterValue(card.dataset.resourceLevel, state.level) &&
    matchesFilterValue(card.dataset.resourcePrice, state.price)
  );
}

function updateResourceFilterState(state, visibleCount) {
  const hasActiveFilter = hasActiveFilterState(state, resourceFilterFields);

  if (resourceFilterStatus) {
    resourceFilterStatus.textContent = hasActiveFilter
      ? `${resourceCards.length}件中 ${visibleCount}件を表示しています。`
      : `すべてのリソース（${resourceCards.length}件）を表示しています。`;
  }

  if (resourceEmpty) resourceEmpty.hidden = visibleCount !== 0;
  if (resourceFilterReset) resourceFilterReset.disabled = !hasActiveFilter;

  for (const button of resourceFilterButtons) {
    const field = button.dataset.resourceFilter;
    const value = button.dataset.filterValue || "all";
    const active = field && sameFilterValue(state[field], value);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function setResourceFilter(field, value) {
  if (!resourceFilterFields.includes(field)) return;
  const normalizedValue = normalizeFilterValue(field, value, resourceFilterLabels);
  resourceFilterState[field] = sameFilterValue(resourceFilterState[field], normalizedValue) ? "all" : normalizedValue;
  applyResourceFilters({ scroll: true });
}

function resetResourceFilters() {
  if (resourceSearchInput) resourceSearchInput.value = "";
  resourceFilterState = {
    query: "",
    skill: "all",
    format: "all",
    level: "all",
    price: "all"
  };
  applyResourceFilters();
}

function setCardVisible(card, visible) {
  card.hidden = !visible;
  card.classList.toggle("is-filtered-out", !visible);
  card.setAttribute("aria-hidden", visible ? "false" : "true");
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

function sameFilterValue(left, right) {
  const leftValues = splitFilterValue(left).sort();
  const rightValues = splitFilterValue(right).sort();
  return leftValues.length > 0 &&
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index]);
}

function hasActiveFilterState(state, fields) {
  return Boolean(
    state.query ||
    fields.some(field => state[field] && state[field] !== "all")
  );
}

function normalizeFilterValue(field, value, labels) {
  const rawValue = String(value || "all").trim();
  if (!rawValue || rawValue === "all") return "all";
  const labelsForField = labels[field] || {};
  if (Object.prototype.hasOwnProperty.call(labelsForField, rawValue)) return rawValue;

  const rawParts = splitFilterValue(rawValue);
  const matchingOption = Object.keys(labelsForField).find(optionValue => {
    const optionParts = splitFilterValue(optionValue);
    return rawParts.length && rawParts.every(part => optionParts.includes(part));
  });
  return matchingOption || rawValue;
}

function getFilterLabel(field, value, labels) {
  const labelsForField = labels[field] || {};
  if (labelsForField[value]) return labelsForField[value];
  const values = splitFilterValue(value);
  const label = Object.entries(labelsForField)
    .filter(([optionValue]) => values.some(valuePart => splitFilterValue(optionValue).includes(valuePart)))
    .map(([, optionLabel]) => optionLabel)
    .join(" / ");
  return label || value;
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

function setResourceFilterPanelExpanded(expanded) {
  if (!resourceFilterPanel || !resourceFilterToggle) return;
  resourceFilterPanel.classList.toggle("is-collapsed", !expanded);
  resourceFilterToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  resourceFilterToggle.textContent = expanded ? "フィルターを閉じる" : "条件を変更";
}

function setResourceFilterGroupsOpen(open) {
  for (const group of resourceFilterGroups) {
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
    setResourceFilterPanelExpanded(!isMobile);
    setResourceFilterGroupsOpen(!isMobile);
  };
  sync();
  mobileQuery.addEventListener?.("change", sync);
}

function setViewMode(toggle, mode) {
  const targetId = toggle?.dataset.viewTarget;
  const container = targetId ? document.getElementById(targetId) : null;
  if (!toggle || !container || !["grid", "list"].includes(mode)) return;

  container.classList.toggle("is-grid-view", mode === "grid");
  container.classList.toggle("is-list-view", mode === "list");

  const buttons = Array.from(toggle.querySelectorAll("[data-view-mode]"));
  for (const button of buttons) {
    const active = button.dataset.viewMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function initializeViewToggles() {
  for (const toggle of learnViewToggles) {
    const activeButton = toggle.querySelector("[data-view-mode].is-active") || toggle.querySelector("[data-view-mode='grid']");
    setViewMode(toggle, activeButton?.dataset.viewMode || "grid");
    toggle.addEventListener("click", event => {
      const button = event.target.closest("[data-view-mode]");
      if (!button || !toggle.contains(button)) return;
      setViewMode(toggle, button.dataset.viewMode || "grid");
    });
  }
}

function initializePageGuide() {
  const guideLinks = Array.from(document.querySelectorAll(".learn-page-guide a"));
  if (!guideLinks.length || !("IntersectionObserver" in window)) return;
  const linkById = new Map(guideLinks.map(link => [link.getAttribute("href")?.slice(1), link]));

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    for (const link of guideLinks) link.classList.remove("is-active");
    linkById.get(visible.target.id)?.classList.add("is-active");
  }, {
    rootMargin: "-20% 0px -55% 0px",
    threshold: [0.1, 0.35, 0.6]
  });

  for (const id of linkById.keys()) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
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

phraseFilterButtons.forEach(button => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    setPhraseFilter(button.dataset.articleFilter, button.dataset.filterValue || "all");
  });
});

phraseSearchInput?.addEventListener("input", () => applyPhraseFilters());
phraseSearchInput?.addEventListener("change", () => applyPhraseFilters());
phraseFilterReset?.addEventListener("click", resetPhraseFilters);

selectedFilterChips?.addEventListener("click", event => {
  const button = event.target.closest("[data-chip-remove]");
  if (!button) return;
  removePhraseFilter(button.dataset.chipRemove);
});

learnFilterToggle?.addEventListener("click", () => {
  const expanded = learnFilterToggle.getAttribute("aria-expanded") === "true";
  setFilterPanelExpanded(!expanded);
});

resourceFilterToggle?.addEventListener("click", () => {
  const expanded = resourceFilterToggle.getAttribute("aria-expanded") === "true";
  setResourceFilterPanelExpanded(!expanded);
});

phraseEmptyActions.forEach(button => {
  button.addEventListener("click", resetPhraseFilters);
});

resourceFilterButtons.forEach(button => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    setResourceFilter(button.dataset.resourceFilter, button.dataset.filterValue || "all");
  });
});

resourceSearchInput?.addEventListener("input", () => applyResourceFilters());
resourceSearchInput?.addEventListener("change", () => applyResourceFilters());
resourceFilterReset?.addEventListener("click", resetResourceFilters);

initializeResponsiveFilters();
initializeViewToggles();
hydratePhraseFiltersFromUrl();
applyResourceFilters();
initializePageGuide();
