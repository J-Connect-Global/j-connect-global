(function () {
  const searchIndex = Array.isArray(window.JCONNECT_SEARCH_INDEX) ? window.JCONNECT_SEARCH_INDEX : [];
  const categoryLinks = [
    ["/germany/ja/guides/", "手続き・制度"],
    ["/germany/ja/living/", "住まい・生活"],
    ["/germany/ja/jobs/", "仕事・求人"],
    ["/germany/ja/medical/", "医療・緊急"],
    ["/germany/ja/eat/", "グルメ・飲食"],
    ["/germany/ja/shopping/", "買い物・サービス"],
    ["/germany/ja/community/", "交流・掲示板"],
    ["/germany/ja/events/", "おでかけ・イベント"],
    ["/germany/ja/learn-german/", "ドイツ語・学び"],
    ["/germany/ja/news/", "ニュース・読みもの"]
  ];

  const els = {
    input: document.getElementById("searchInput"),
    meta: document.getElementById("searchMeta"),
    results: document.getElementById("searchResults"),
    languageSelect: document.getElementById("languageSelect")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").trim();
  }

  function tokensFor(query) {
    return normalizeText(query).split(/[\s　]+/).filter(Boolean);
  }

  function itemText(item) {
    return normalizeText([
      item.title,
      item.description,
      item.category,
      item.url,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].join(" "));
  }

  function scoreItem(item, query) {
    const normalizedQuery = normalizeText(query);
    const tokens = tokensFor(query);
    const title = normalizeText(item.title);
    const description = normalizeText(item.description);
    const category = normalizeText(item.category);
    const url = normalizeText(item.url);
    const tags = normalizeText((item.tags || []).join(" "));
    const allText = itemText(item);
    let score = 0;

    if (!tokens.length) return 0;
    if (title === normalizedQuery) score += 80;
    if (title.includes(normalizedQuery)) score += 45;
    if (category.includes(normalizedQuery)) score += 24;
    if (tags.includes(normalizedQuery)) score += 20;
    if (description.includes(normalizedQuery)) score += 14;
    if (url.includes(normalizedQuery)) score += 8;

    for (const token of tokens) {
      if (!allText.includes(token)) continue;
      score += 4;
      if (title.includes(token)) score += 22;
      if (category.includes(token)) score += 12;
      if (tags.includes(token)) score += 10;
      if (description.includes(token)) score += 6;
      if (url.includes(token)) score += 3;
    }

    return score;
  }

  function search(query) {
    return searchIndex
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "ja"))
      .map((entry) => entry.item);
  }

  function renderCategoryLinks(label) {
    return `
      <div class="search-link-grid" aria-label="${escapeHtml(label)}">
        ${categoryLinks.map(([href, text]) => `<a class="site-chip" href="${escapeHtml(href)}">${escapeHtml(text)}</a>`).join("")}
      </div>
    `;
  }

  function renderCategoryOverview() {
    els.meta.textContent = "カテゴリから探すか、キーワードで検索してください。";
    els.results.innerHTML = `
      <h2 class="section-title">カテゴリ一覧</h2>
      <p>目的に近いカテゴリから主要ページへ移動できます。</p>
      ${renderCategoryLinks("主なカテゴリ")}
    `;
  }

  function renderNoResults(query) {
    els.meta.textContent = `「${query}」の検索結果は0件です。`;
    els.results.innerHTML = `
      <div class="empty-search">該当するページが見つかりませんでした。カテゴリ一覧から探してください。</div>
      ${renderCategoryLinks("カテゴリ一覧")}
    `;
  }

  function renderResults(query, results) {
    els.meta.textContent = `「${query}」の検索結果: ${results.length}件`;
    els.results.innerHTML = `
      <h2 class="section-title">検索結果</h2>
      <div class="search-result-list">
        ${results.map((item) => `
          <a class="search-result-card" href="${escapeHtml(item.url)}">
            <span class="result-kicker">${escapeHtml(item.category)}</span>
            <span class="result-title">${escapeHtml(item.title)}</span>
            <span class="result-desc">${escapeHtml(item.description)}</span>
            <span class="result-url">${escapeHtml(item.url)}</span>
          </a>
        `).join("")}
      </div>
      <div class="search-link-grid" aria-label="カテゴリショートカット">
        ${categoryLinks.slice(0, 5).map(([href, text]) => `<a class="site-chip" href="${escapeHtml(href)}">${escapeHtml(text)}</a>`).join("")}
      </div>
    `;
  }

  function renderSearchPage() {
    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "").trim();
    els.input.value = query;

    if (!query) {
      renderCategoryOverview();
      return;
    }

    const results = search(query);
    if (!results.length) {
      renderNoResults(query);
      return;
    }

    renderResults(query, results);
  }

  if (els.languageSelect) {
    els.languageSelect.addEventListener("change", (event) => {
      const target = event.target.value;
      if (target) window.location.href = target;
    });
  }

  renderSearchPage();
})();
