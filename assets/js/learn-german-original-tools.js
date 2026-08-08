(function initializeOriginalWebTools() {
  "use strict";

  const root = document.querySelector("[data-original-web-tools]");
  if (!root) return;

  const DATA_URL = "/assets/data/learn-german/flashcards/decks.json";
  const VIEW_KEY = "jconnect-flashcards-deck-view";
  const LAST_DECK_KEY = "jconnect-flashcards-last-deck";
  const elements = {
    search: root.querySelector("#deckSearch"),
    filterPanel: root.querySelector("#deckFilterPanel"),
    filterToggle: root.querySelector("#deckFilterToggle"),
    selected: root.querySelector("#deckSelectedFilters"),
    reset: root.querySelector("#deckFilterReset"),
    status: root.querySelector("#deckFilterStatus"),
    grid: root.querySelector("#originalDeckGrid"),
    empty: root.querySelector("#deckEmpty"),
    emptyReset: root.querySelector("[data-deck-empty-reset]"),
    filterButtons: Array.from(root.querySelectorAll("[data-deck-filter]")),
    viewButtons: Array.from(root.querySelectorAll("[data-deck-view]")),
    groups: Array.from(root.querySelectorAll("[data-deck-filter-group]"))
  };
  const filterState = { keyword: "", level: "", scene: "", status: "" };
  const filterLabels = {
    level: "レベル",
    scene: "場面",
    status: "学習状態"
  };
  const valueLabels = {
    A1: "A1",
    A2: "A2",
    B1: "B1",
    B2: "B2",
    C1: "C1",
    C2: "C2",
    daily: "日常",
    shopping: "買い物",
    administration: "外国人局・役所",
    medical: "病院・薬局",
    housing: "住まい",
    "kita-school": "Kita・学校",
    work: "仕事",
    general: "総合語彙",
    unstarted: "未学習",
    reviewing: "復習中",
    mastered: "習得済み"
  };
  let decks = [];
  let progressByCardId = new Map();

  function safeViewMode(value) {
    return value === "list" ? "list" : "grid";
  }

  function getSavedViewMode() {
    try {
      return safeViewMode(localStorage.getItem(VIEW_KEY));
    } catch {
      return "grid";
    }
  }

  function setViewMode(mode, persist = true) {
    const safeMode = safeViewMode(mode);
    elements.grid.classList.toggle("is-grid-view", safeMode === "grid");
    elements.grid.classList.toggle("is-list-view", safeMode === "list");
    elements.viewButtons.forEach(button => {
      const active = button.dataset.deckView === safeMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (persist) {
      try {
        localStorage.setItem(VIEW_KEY, safeMode);
      } catch {
        // The view still changes when browser storage is unavailable.
      }
    }
  }

  function deckProgress(deck) {
    let reviewed = 0;
    let mastered = 0;
    for (const cardId of deck.card_ids) {
      const progress = progressByCardId.get(cardId);
      if (Number(progress?.attempts || 0) > 0) reviewed += 1;
      if (progress?.status === "mastered") mastered += 1;
    }
    const percent = deck.card_count ? Math.round((reviewed / deck.card_count) * 100) : 0;
    const status = mastered === deck.card_count && deck.card_count > 0
      ? "mastered"
      : reviewed > 0 ? "reviewing" : "unstarted";
    return { reviewed, mastered, percent, status };
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderDeckCard(deck) {
    const stats = deckProgress(deck);
    const article = createElement("article", "learn-deck-card");
    article.dataset.deckId = deck.deck_id;
    article.dataset.level = deck.target_level || deck.primary_level || deck.levels.join(" ");
    article.dataset.scene = deck.scenes.join(" ");
    article.dataset.status = stats.status;

    const head = createElement("div", "learn-deck-card__head");
    head.append(createElement("span", "learn-deck-card__level", deck.target_level || deck.levels.join(" / ")));
    head.append(createElement("span", "learn-deck-card__state", valueLabels[stats.status]));
    head.lastElementChild.dataset.state = stats.status;
    article.append(head);

    article.append(createElement("h3", "", deck.title_ja));
    article.append(createElement("p", "", deck.description_ja));

    const scenes = createElement("div", "learn-deck-card__head");
    const sceneLabels = deck.deck_kind === "cefr-comprehensive" ? ["累積総合語彙"] : deck.scene_labels;
    sceneLabels.forEach(label => scenes.append(createElement("span", "learn-deck-card__scene", label)));
    article.append(scenes);

    const meta = createElement("div", "learn-deck-card__meta");
    meta.append(createElement("span", "", `${deck.card_count}枚`));
    meta.append(createElement("span", "", `目安${deck.estimated_minutes}分`));
    article.append(meta);

    const progress = createElement("div", "learn-deck-card__progress");
    const track = createElement("div", "learn-deck-card__progress-track");
    const bar = createElement("span", "learn-deck-card__progress-bar");
    bar.style.width = `${stats.percent}%`;
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", `${deck.title_ja}の学習進捗`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(stats.percent));
    track.append(bar);
    const status = createElement("div", "learn-deck-card__status");
    status.append(createElement("span", "", `${stats.percent}%`));
    status.append(createElement("span", "", `${stats.reviewed}/${deck.card_count}枚を学習`));
    progress.append(track, status);
    article.append(progress);

    const actionRow = createElement("div", "learn-deck-card__action-row");
    const action = createElement("a", "learn-deck-card__action", stats.reviewed ? "続きから学習" : "学習を始める");
    action.href = `/germany/ja/learn-german/flashcards/?deck=${encodeURIComponent(deck.deck_id)}`;
    action.addEventListener("click", () => {
      try {
        localStorage.setItem(LAST_DECK_KEY, deck.deck_id);
      } catch {
        // Deep linking still works without browser preferences.
      }
    });
    actionRow.append(action);
    article.append(actionRow);
    return article;
  }

  function searchableText(deck) {
    return [deck.title_ja, deck.description_ja, ...deck.levels, ...deck.scene_labels]
      .join(" ")
      .toLocaleLowerCase("ja");
  }

  function matches(deck) {
    const stats = deckProgress(deck);
    if (filterState.keyword && !searchableText(deck).includes(filterState.keyword)) return false;
    if (filterState.level && (deck.target_level || deck.primary_level) !== filterState.level) return false;
    if (filterState.scene && !deck.scenes.includes(filterState.scene)) return false;
    if (filterState.status && stats.status !== filterState.status) return false;
    return true;
  }

  function renderSelectedFilters() {
    elements.selected.replaceChildren();
    const filters = Object.entries(filterState).filter(([, value]) => value);
    if (!filters.length) {
      elements.selected.append(createElement("span", "learn-no-filters", "条件は選択されていません"));
      return;
    }

    filters.forEach(([key, value]) => {
      const button = createElement(
        "button",
        "learn-selected-chip",
        key === "keyword" ? `キーワード: ${value}` : `${filterLabels[key]}: ${valueLabels[value] || value} ×`
      );
      button.type = "button";
      button.dataset.deckFilterRemove = key;
      button.setAttribute("aria-label", `${button.textContent.replace(/ ×$/, "")}を解除`);
      elements.selected.append(button);
    });
  }

  function render() {
    const visibleDecks = decks.filter(matches);
    elements.grid.replaceChildren(...visibleDecks.map(renderDeckCard));
    elements.grid.setAttribute("aria-busy", "false");
    elements.empty.hidden = visibleDecks.length > 0;
    elements.status.textContent = `${visibleDecks.length}件 / 全${decks.length}件`;
    elements.reset.disabled = !Object.values(filterState).some(Boolean);
    renderSelectedFilters();
  }

  function resetFilters() {
    Object.keys(filterState).forEach(key => { filterState[key] = ""; });
    if (elements.search) elements.search.value = "";
    elements.filterButtons.forEach(button => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    });
    render();
  }

  function setFilterButton(button) {
    const key = button.dataset.deckFilter;
    const value = button.dataset.filterValue || "";
    const nextValue = filterState[key] === value ? "" : value;
    filterState[key] = nextValue;
    elements.filterButtons
      .filter(candidate => candidate.dataset.deckFilter === key)
      .forEach(candidate => {
        const active = candidate.dataset.filterValue === nextValue;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", active ? "true" : "false");
      });
    render();
  }

  function setFilterPanelExpanded(expanded) {
    elements.filterPanel.classList.toggle("is-collapsed", !expanded);
    elements.filterToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function initializeResponsiveFilters() {
    const media = window.matchMedia("(max-width: 759px)");
    const sync = () => {
      setFilterPanelExpanded(!media.matches);
      elements.groups.forEach(group => { group.open = !media.matches; });
    };
    sync();
    media.addEventListener?.("change", sync);
  }

  async function load() {
    try {
      const [response, progress] = await Promise.all([
        fetch(DATA_URL, { credentials: "same-origin" }),
        window.JConnectFlashcardStorage?.getAllProgress?.() || Promise.resolve([])
      ]);
      if (!response.ok) throw new Error(`教材データの取得に失敗しました (${response.status})`);
      const payload = await response.json();
      if (![1, 2].includes(payload.schema_version) || !Array.isArray(payload.decks)) throw new Error("教材データの形式が正しくありません。");
      decks = payload.decks;
      progressByCardId = new Map(progress.map(entry => [entry.card_id, entry]));
      render();
    } catch (error) {
      elements.grid.setAttribute("aria-busy", "false");
      elements.grid.replaceChildren(createElement("p", "flashcards-error", "教材データを読み込めませんでした。時間を置いて再度お試しください。"));
      elements.status.textContent = "読み込みに失敗しました。";
      console.error(error);
    }
  }

  elements.filterButtons.forEach(button => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => setFilterButton(button));
  });
  elements.search?.addEventListener("input", () => {
    filterState.keyword = elements.search.value.trim().toLocaleLowerCase("ja");
    render();
  });
  elements.reset?.addEventListener("click", resetFilters);
  elements.emptyReset?.addEventListener("click", resetFilters);
  elements.selected?.addEventListener("click", event => {
    const button = event.target.closest("[data-deck-filter-remove]");
    if (!button) return;
    const key = button.dataset.deckFilterRemove;
    filterState[key] = "";
    if (key === "keyword" && elements.search) elements.search.value = "";
    elements.filterButtons
      .filter(candidate => candidate.dataset.deckFilter === key)
      .forEach(candidate => {
        candidate.classList.remove("is-active");
        candidate.setAttribute("aria-pressed", "false");
      });
    render();
  });
  elements.viewButtons.forEach(button => button.addEventListener("click", () => setViewMode(button.dataset.deckView)));
  elements.filterToggle?.addEventListener("click", () => {
    setFilterPanelExpanded(elements.filterToggle.getAttribute("aria-expanded") !== "true");
  });
  window.addEventListener("pageshow", async () => {
    if (!decks.length) return;
    const progress = await (window.JConnectFlashcardStorage?.getAllProgress?.() || Promise.resolve([]));
    progressByCardId = new Map(progress.map(entry => [entry.card_id, entry]));
    render();
  });

  initializeResponsiveFilters();
  setViewMode(getSavedViewMode(), false);
  load();
})();
