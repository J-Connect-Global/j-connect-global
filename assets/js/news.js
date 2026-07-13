(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNewsEventsHub);
  } else {
    initNewsEventsHub();
  }
})();

function initNewsEventsHub() {
  initNewsSection();
  initEventSection();
  initNewsEventsToc();
}

function renderSectionEmptyState(container, { show, title, body, resetAttribute, showReset }) {
  if (!container) return;
  container.hidden = !show;
  if (!show) {
    container.replaceChildren();
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = body;
  const children = [heading, description];

  if (showReset) {
    const actions = document.createElement("div");
    actions.className = "news-events-empty-actions";
    const button = document.createElement("button");
    button.className = "living-reset-button news-events-reset";
    button.type = "button";
    button.setAttribute(resetAttribute, "");
    button.textContent = "絞り込みを解除";
    actions.append(button);
    children.push(actions);
  }

  container.replaceChildren(...children);
}

function initNewsSection() {
  const hub = document.querySelector("[data-news-hub]");
  const grid = document.getElementById("newsGrid");
  if (!hub || !grid) return;

  const empty = hub.querySelector("[data-news-empty]");
  const count = hub.querySelector("[data-news-count]");
  const reset = hub.querySelector("[data-news-reset]");
  const search = hub.querySelector("#newsSearch");
  const filters = Array.from(hub.querySelectorAll("[data-news-filter]"));
  const cards = Array.from(grid.querySelectorAll("[data-news-card]"));
  const totalCount = cards.length;

  setupViewToggle(hub.querySelector('[data-view-toggle="news"]'), grid);
  setupLinkedCards(cards, (card) => {
    const link = card.querySelector('a[href]');
    return link ? link.getAttribute("href") : "";
  });

  function activeFilters() {
    return {
      keyword: normalize(search ? search.value : ""),
      category: valueOf(hub.querySelector("#newsCategoryFilter")),
      area: valueOf(hub.querySelector("#newsAreaFilter")),
      type: valueOf(hub.querySelector("#newsTypeFilter")),
      period: valueOf(hub.querySelector("#newsPeriodFilter"))
    };
  }

  function hasActiveFilter(state) {
    return Boolean(state.keyword)
      || state.category !== "all"
      || state.area !== "all"
      || state.type !== "all"
      || state.period !== "all";
  }

  function newsMatches(card, state) {
    return (!state.keyword || normalize(card.dataset.search).includes(state.keyword))
      && matchesToken(card.dataset.newsCategory, state.category)
      && matchesToken(card.dataset.newsArea, state.area)
      && matchesToken(card.dataset.newsType, state.type)
      && matchesNewsPeriod(card.dataset.newsDate, state.period);
  }

  function updateNews() {
    const state = activeFilters();
    const filtered = cards.filter((card) => newsMatches(card, state));

    cards.forEach((card) => setCardVisibility(card, filtered.includes(card)));

    const hasFilters = hasActiveFilter(state);
    if (count) {
      count.textContent = totalCount
        ? `${totalCount}件中${filtered.length}件を表示しています`
        : "現在公開中のニュース解説はありません。";
    }

    const showEmpty = totalCount === 0 || filtered.length === 0;
    grid.hidden = showEmpty && totalCount === 0;
    renderSectionEmptyState(empty, {
      show: showEmpty,
      title: totalCount === 0 || !hasFilters
        ? "現在公開中のニュース解説はありません"
        : "条件に合うニュースはありません",
      body: totalCount === 0 || !hasFilters
        ? "生活情報や注意点は、生活・手続きガイドからも確認できます。"
        : "条件を少し広げるか、絞り込みを解除してください。",
      resetAttribute: "data-news-empty-reset",
      showReset: totalCount > 0 && hasFilters
    });
  }

  function resetNewsFilters() {
    if (search) search.value = "";
    filters.forEach((filter) => { filter.value = "all"; });
    updateNews();
  }

  if (search) search.addEventListener("input", updateNews);
  filters.forEach((filter) => filter.addEventListener("change", updateNews));
  if (reset) reset.addEventListener("click", resetNewsFilters);
  if (empty) empty.addEventListener("click", (event) => {
    if (event.target.closest("[data-news-empty-reset]")) resetNewsFilters();
  });

  updateNews();
}

function initEventSection() {
  const hub = document.querySelector("[data-events-hub]");
  const grid = document.getElementById("eventArticleGrid");
  if (!hub || !grid) return;

  const empty = hub.querySelector("[data-events-empty]");
  const count = hub.querySelector("[data-event-count]");
  const reset = hub.querySelector("[data-event-reset]");
  const search = hub.querySelector("[data-event-search]");
  const filters = Array.from(hub.querySelectorAll("[data-event-filter]"));
  const cards = Array.from(grid.querySelectorAll("[data-events-card]"));
  const totalCount = cards.length;

  setupViewToggle(hub.querySelector('[data-view-toggle="events"]'), grid);

  function activeFilters() {
    return {
      keyword: normalize(search ? search.value : ""),
      period: valueOf(hub.querySelector("#eventPeriodFilter")),
      area: valueOf(hub.querySelector("#eventAreaFilter")),
      category: valueOf(hub.querySelector("#eventCategoryFilter")),
      format: valueOf(hub.querySelector("#eventFormatFilter")),
      language: valueOf(hub.querySelector("#eventLanguageFilter")),
      price: valueOf(hub.querySelector("#eventPriceFilter"))
    };
  }

  function hasActiveFilter(state) {
    return Boolean(state.keyword)
      || state.period !== "all"
      || state.area !== "all"
      || state.category !== "all"
      || state.format !== "all"
      || state.language !== "all"
      || state.price !== "all";
  }

  function eventMatches(card, state) {
    return (!state.keyword || normalize(card.dataset.search).includes(state.keyword))
      && matchesEventPeriod(card.dataset.eventDate, state.period)
      && matchesToken(card.dataset.eventArea, state.area)
      && matchesToken(card.dataset.eventCategory, state.category)
      && matchesToken(card.dataset.eventFormat, state.format)
      && matchesToken(card.dataset.eventLanguage, state.language)
      && matchesToken(card.dataset.eventPrice, state.price);
  }

  function updateEvents() {
    const state = activeFilters();
    const visibleCards = cards.filter((card) => eventMatches(card, state));

    cards.forEach((card) => setCardVisibility(card, visibleCards.includes(card)));

    if (count) count.textContent = `${totalCount}件中${visibleCards.length}件を表示しています`;
    const hasFilters = hasActiveFilter(state);
    const showEmpty = visibleCards.length === 0;
    renderSectionEmptyState(empty, {
      show: showEmpty,
      title: totalCount === 0
        ? "現在公開中のイベント情報はありません"
        : "条件に合うイベントはありません",
      body: totalCount === 0
        ? "新しいイベント情報が公開されたときに、この一覧へ追加されます。"
        : "条件を少し広げるか、絞り込みを解除してください。",
      resetAttribute: "data-event-empty-reset",
      showReset: totalCount > 0 && hasFilters
    });
  }

  function resetEventFilters() {
    if (search) search.value = "";
    filters.forEach((filter) => { filter.value = "all"; });
    updateEvents();
  }

  if (search) search.addEventListener("input", updateEvents);
  filters.forEach((filter) => filter.addEventListener("change", updateEvents));
  if (reset) reset.addEventListener("click", resetEventFilters);
  if (empty) empty.addEventListener("click", (event) => {
    if (event.target.closest("[data-event-empty-reset]")) resetEventFilters();
  });
  updateEvents();
}

function initNewsEventsToc() {
  const toc = document.querySelector(".news-events-toc");
  if (!toc) return;

  const links = Array.from(toc.querySelectorAll('a[href="#news"], a[href="#events"]'));
  const linkById = new Map(links.map((link) => [(link.getAttribute("href") || "").slice(1), link]));
  const sections = ["news", "events"].map((id) => document.getElementById(id)).filter(Boolean);
  if (!links.length || !sections.length) return;

  let ticking = false;

  function setActive(id) {
    links.forEach((link) => {
      link.classList.toggle("is-active", link === linkById.get(id));
    });
  }

  function activeSectionId() {
    const offset = Math.max(120, Math.min(window.innerHeight * 0.35, 220));
    return sections.reduce((current, section) => (
      section.getBoundingClientRect().top <= offset ? section.id : current
    ), sections[0].id);
  }

  function updateActiveSection() {
    setActive(activeSectionId());
    ticking = false;
  }

  function requestActiveSectionUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateActiveSection);
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = (link.getAttribute("href") || "").slice(1);
      if (linkById.has(id)) setActive(id);
      window.setTimeout(requestActiveSectionUpdate, 300);
    });
  });

  window.addEventListener("hashchange", () => {
    if (linkById.has(window.location.hash.slice(1))) {
      setActive(window.location.hash.slice(1));
    }
    window.setTimeout(requestActiveSectionUpdate, 100);
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(requestActiveSectionUpdate, {
      rootMargin: "-20% 0px -55% 0px",
      threshold: [0, 0.1, 0.35, 0.6]
    });
    sections.forEach((section) => observer.observe(section));
  } else {
    window.addEventListener("scroll", requestActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", requestActiveSectionUpdate);
  }

  const initialId = linkById.has(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "news";
  setActive(initialId);
  window.setTimeout(requestActiveSectionUpdate, initialId === "events" ? 150 : 0);
}

function setupViewToggle(toggle, container) {
  if (!toggle || !container) return;
  const buttons = Array.from(toggle.querySelectorAll("[data-view-mode]"));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-view-mode") || "grid";
      container.classList.toggle("is-list-view", mode === "list");
      container.classList.toggle("is-grid-view", mode !== "list");
      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  });
}

function setupLinkedCards(cards, getHref) {
  cards.forEach((card) => {
    const href = getHref(card);
    if (!href) return;
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    if (!card.getAttribute("aria-label")) {
      card.setAttribute("aria-label", card.dataset.title || card.textContent.trim());
    }

    card.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.target.closest("a, button, input, select, textarea, label, [role='button']")) return;
      window.location.href = href;
    });

    card.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.target.closest("a, button, input, select, textarea, label, [role='button']")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.location.href = href;
    });
  });
}

function setCardVisibility(card, isVisible) {
  card.hidden = !isVisible;
  card.classList.toggle("is-filtered-out", !isVisible);
  card.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function matchesToken(value, selected) {
  if (!selected || selected === "all") return true;
  return String(value || "").split(/\s+/).filter(Boolean).includes(selected);
}

function matchesNewsPeriod(value, selected) {
  if (!selected || selected === "all") return true;
  const date = parseComparableDate(value);
  if (!date) return false;
  const days = Number(selected);
  if (!Number.isFinite(days)) return true;
  const now = startOfDay(new Date());
  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return date >= start && date <= now;
}

function matchesEventPeriod(value, selected) {
  if (!selected || selected === "all") return true;
  const date = parseComparableDate(value);
  if (!date) return false;
  const today = startOfDay(new Date());

  if (selected === "upcoming") return date >= today;
  if (selected === "past") return date < today;
  if (selected === "week") {
    const end = new Date(today);
    end.setDate(today.getDate() + 7);
    return date >= today && date <= end;
  }
  if (selected === "month") {
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth();
  }
  return true;
}

function parseDateValue(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseComparableDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return startOfDay(new Date(`${parsed}T00:00:00`));
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function valueOf(element) {
  return element ? element.value || "all" : "all";
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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
