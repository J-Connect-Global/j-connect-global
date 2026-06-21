const NEWS_DATA_URL = "/assets/data/news.json";

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

function initNewsSection() {
  const hub = document.querySelector("[data-news-hub]");
  const grid = document.getElementById("newsGrid");
  if (!hub || !grid) return;

  const empty = hub.querySelector("[data-news-empty]");
  const emptyTitle = hub.querySelector("[data-news-empty-title]");
  const emptyBody = hub.querySelector("[data-news-empty-body]");
  const emptyReset = hub.querySelector("[data-news-empty-reset]");
  const count = hub.querySelector("[data-news-count]");
  const reset = hub.querySelector("[data-news-reset]");
  const search = hub.querySelector("#newsSearch");
  const filters = Array.from(hub.querySelectorAll("[data-news-filter]"));
  let cards = [];
  let totalCount = 0;

  setupViewToggle(hub.querySelector('[data-view-toggle="news"]'), grid);

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
        : "ニュースを準備中です。";
    }

    if (empty) {
      const showEmpty = totalCount === 0 || filtered.length === 0;
      empty.hidden = !showEmpty;
      grid.hidden = showEmpty && totalCount === 0;
      if (emptyTitle) emptyTitle.textContent = totalCount === 0 || !hasFilters
        ? "ニュースを準備中です"
        : "条件に合うニュースはありません";
      if (emptyBody) emptyBody.textContent = totalCount === 0 || !hasFilters
        ? "生活アップデート、サイトからのお知らせ、コミュニティ関連の情報を順次掲載します。"
        : "条件を少し広げるか、絞り込みを解除してください。";
      if (emptyReset) emptyReset.hidden = !(totalCount > 0 && hasFilters);
    }
  }

  function resetNewsFilters() {
    if (search) search.value = "";
    filters.forEach((filter) => { filter.value = "all"; });
    updateNews();
  }

  async function loadNews() {
    try {
      const response = await fetch(NEWS_DATA_URL);
      const items = await response.json();
      renderNewsCards(Array.isArray(items) ? items : []);
    } catch (error) {
      renderNewsCards([]);
    }
  }

  function renderNewsCards(items) {
    totalCount = items.length;
    if (!items.length) {
      grid.innerHTML = "";
      cards = [];
      updateNews();
      return;
    }

    grid.hidden = false;
    grid.innerHTML = items.map(renderNewsCard).join("");
    cards = Array.from(grid.querySelectorAll("[data-news-card]"));
    updateNews();
  }

  if (search) search.addEventListener("input", updateNews);
  filters.forEach((filter) => filter.addEventListener("change", updateNews));
  if (reset) reset.addEventListener("click", resetNewsFilters);
  if (emptyReset) emptyReset.addEventListener("click", resetNewsFilters);

  loadNews();
}

function initEventSection() {
  const hub = document.querySelector("[data-events-hub]");
  const grid = document.getElementById("eventArticleGrid");
  if (!hub || !grid) return;

  const empty = hub.querySelector("[data-events-empty]");
  const emptyTitle = hub.querySelector("[data-event-empty-title]");
  const emptyBody = hub.querySelector("[data-event-empty-body]");
  const emptyReset = hub.querySelector("[data-event-empty-reset]");
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
    if (empty) {
      const hasFilters = hasActiveFilter(state);
      const showEmpty = visibleCards.length === 0;
      empty.hidden = !showEmpty;
      if (emptyTitle) emptyTitle.textContent = totalCount === 0
        ? "イベント情報を準備中です"
        : "条件に合うイベントはありません";
      if (emptyBody) emptyBody.textContent = totalCount === 0
        ? "交流会、セミナー、家族向けイベントなどを順次掲載します。"
        : "条件を少し広げるか、絞り込みを解除してください。";
      if (emptyReset) emptyReset.hidden = !(totalCount > 0 && hasFilters);
    }
  }

  function resetEventFilters() {
    if (search) search.value = "";
    filters.forEach((filter) => { filter.value = "all"; });
    updateEvents();
  }

  if (search) search.addEventListener("input", updateEvents);
  filters.forEach((filter) => filter.addEventListener("change", updateEvents));
  if (reset) reset.addEventListener("click", resetEventFilters);
  if (emptyReset) emptyReset.addEventListener("click", resetEventFilters);
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

function renderNewsCard(item) {
  const meta = newsMetadata(item);
  return `
    <article class="news-card" data-news-card data-title="${escapeAttribute(item.title)}" data-summary="${escapeAttribute(item.summary)}" data-search="${escapeAttribute(meta.search)}" data-news-category="${escapeAttribute(meta.category)}" data-news-area="${escapeAttribute(meta.area.join(" "))}" data-news-type="${escapeAttribute(meta.type)}" data-news-date="${escapeAttribute(meta.date)}">
      <div class="news-card__badges">
        <span>${escapeHtml(item.country_ja || "ドイツ")}</span>
        <span>${escapeHtml(item.city_ja || "全体")}</span>
        <span>${escapeHtml(item.category_ja || "ニュース")}</span>
        <span>${escapeHtml(item.importance_ja || "通常")}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="news-card__meta">
        <span>出典: ${escapeHtml(item.source_name)}</span>
        <span>${escapeHtml(item.published_at)}</span>
      </div>
      <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">出典で確認する</a>
    </article>
  `;
}

function newsMetadata(item) {
  const category = normalizeNewsCategory(item.category, item.category_ja, item.topic, item.topic_ja);
  const area = normalizeNewsArea(item.country, item.city, item.city_ja);
  const type = normalizeNewsType(item.source_type, item.source_name, item.importance);
  const date = parseDateValue(item.published_at);
  const search = [
    item.title,
    item.summary,
    item.source_name,
    item.category_ja,
    item.city_ja,
    item.country_ja,
    item.topic_ja,
    category,
    type,
    ...area
  ].join(" ");
  return { category, area, type, date, search };
}

function normalizeNewsCategory(category, categoryJa, topic, topicJa) {
  const text = normalize([category, categoryJa, topic, topicJa].join(" "));
  if (text.includes("visa") || text.includes("law") || text.includes("行政") || text.includes("手続")) return "admin";
  if (text.includes("work") || text.includes("job") || text.includes("仕事") || text.includes("求人")) return "work";
  if (text.includes("education") || text.includes("school") || text.includes("family") || text.includes("教育") || text.includes("家族")) return "education-family";
  if (text.includes("transport") || text.includes("strike") || text.includes("交通") || text.includes("ストライキ")) return "transport";
  if (text.includes("community") || text.includes("コミュニティ")) return "community";
  if (text.includes("j-connect") || text.includes("jconnect")) return "jconnect";
  return "life-update";
}

function normalizeNewsArea(country, city, cityJa) {
  const text = normalize([country, city, cityJa].join(" "));
  const areas = [];
  if (text.includes("germany") || text.includes("全国") || text.includes("nationwide")) areas.push("germany");
  if (text.includes("nrw")) areas.push("nrw");
  if (text.includes("dusseldorf") || text.includes("duesseldorf")) areas.push("duesseldorf");
  if (text.includes("koln") || text.includes("cologne")) areas.push("koln");
  if (text.includes("online")) areas.push("online");
  return unique(areas.length ? areas : ["germany"]);
}

function normalizeNewsType(sourceType, sourceName, importance) {
  const text = normalize([sourceType, sourceName, importance].join(" "));
  if (text.includes("important") || text.includes("check") || text.includes("alert") || text.includes("warning")) return "alert";
  if (text.includes("official") || text.includes("j-connect") || text.includes("jconnect")) return "notice";
  if (text.includes("update")) return "update";
  return "life-info";
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
