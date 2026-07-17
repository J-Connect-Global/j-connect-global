(function (window) {
  const DEFAULT_IMAGE = "/assets/img/placeholders/jconnect-default-card.webp";
  const INVALID_IMAGE_VALUES = new Set(["", "#", "n/a", "null", "undefined"]);
  const SITE_NAME = window.JCONNECT_SITE_IDENTITY.serviceName;

  function cleanImageValue(value) {
    const text = String(value ?? "").trim();
    return INVALID_IMAGE_VALUES.has(text.toLowerCase()) ? "" : text;
  }

  function imageValues(value) {
    if (Array.isArray(value)) return value.flatMap(imageValues);
    if (value && typeof value === "object") return Object.values(value).flatMap(imageValues);
    if (typeof value === "string") {
      const text = cleanImageValue(value);
      if (!text) return [];
      if (/^\s*[\[{]/.test(text)) {
        try {
          return imageValues(JSON.parse(text));
        } catch {
          return [text];
        }
      }
      return text.split(/[\n,;]/).map(cleanImageValue).filter(Boolean);
    }
    return [];
  }

  function isValidImageValue(value) {
    return Boolean(cleanImageValue(value));
  }

  function resolveContentImage(item) {
    const source = item || {};
    const candidates = [
      source.company_logo_url,
      source.logo_url,
      source.image,
      source.image_url,
      source.imageUrl,
      source.image_url_1,
      source.hero_image,
      source.heroImage,
      source.thumbnail,
      source.thumbnail_url,
      source.og_image,
      source.images
    ];
    const image = candidates.flatMap(imageValues).find(isValidImageValue);
    return image || DEFAULT_IMAGE;
  }

  function contentImageAlt(item) {
    const title = cleanImageValue(item && (item.title || item._title || item.name || item.position_title || item.company_name));
    const usesFallback = resolveContentImage(item) === DEFAULT_IMAGE;
    if (usesFallback) return title ? `${title} の案内用イメージ` : `${SITE_NAME} の案内用イメージ`;
    return title ? `${title} の画像` : `${SITE_NAME} のコンテンツ画像`;
  }

  function applyFallbackImage(img) {
    if (!img || img.dataset.jconnectFallbackBound === "true") return;
    if (!img.dataset.fallbackSrc) img.dataset.fallbackSrc = DEFAULT_IMAGE;
    img.dataset.jconnectFallbackBound = "true";
    img.addEventListener("error", function () {
      const fallback = this.dataset.fallbackSrc || DEFAULT_IMAGE;
      if (this.getAttribute("src") === fallback) return;
      this.src = fallback;
      this.classList.add("is-fallback-image");
    });
  }

  window.JCONNECT_IMAGE_FALLBACK = Object.freeze({
    DEFAULT_IMAGE,
    DEFAULT_IMAGE_ABSOLUTE: `https://j-connect-global.com${DEFAULT_IMAGE}`,
    resolveContentImage,
    contentImageAlt,
    applyFallbackImage,
    isValidImageValue
  });
})(window);

(function (window) {
  const COPY = Object.freeze({
    loading: Object.freeze({ title: "読み込み中です", body: "公開データを確認しています。しばらくお待ちください。" }),
    empty: Object.freeze({ title: "公開中の情報はありません", body: "公開できる情報が追加されると、ここに表示されます。" }),
    "not-available": Object.freeze({ title: "公開データを準備しています", body: "現在は基本ガイドをご利用ください。公開データは準備でき次第表示します。" }),
    error: Object.freeze({ title: "情報を読み込めませんでした", body: "時間をおいて再度お試しください。問題が続く場合は運営へお知らせください。" }),
    invalid: Object.freeze({ title: "情報が見つかりません", body: "URLが正しくないか、情報が公開されていません。" }),
    inactive: Object.freeze({ title: "現在は公開されていません", body: "募集終了、非公開、削除済み、または掲載期限終了の可能性があります。" })
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function dataStateHtml(kind, options = {}) {
    const state = COPY[kind] || COPY.empty;
    const title = options.title || state.title;
    const body = options.body || state.body;
    const headingLevel = [1, 2, 3, 4].includes(Number(options.headingLevel)) ? Number(options.headingLevel) : 3;
    const actions = Array.isArray(options.actions) ? options.actions : [];
    const actionHtml = actions.map((action) => {
      const label = escapeHtml(action?.label || "");
      if (!label) return "";
      const className = action.primary ? "btn btn-primary" : "btn btn-secondary";
      const href = String(action?.href || "").trim();
      if (/^\/(?!\/)/.test(href) || /^https:\/\//i.test(href)) {
        return `<a class="${className}" href="${escapeHtml(href)}">${label}</a>`;
      }
      const dataAction = String(action.action || "").replace(/[^a-z0-9_-]/gi, "");
      return dataAction ? `<button class="${className}" type="button" data-state-action="${escapeHtml(dataAction)}">${label}</button>` : "";
    }).join("");
    return `<div class="jc-data-state jc-data-state--${escapeHtml(kind)}" data-state-kind="${escapeHtml(kind)}">
      <h${headingLevel} class="status-title">${escapeHtml(title)}</h${headingLevel}>
      <p>${escapeHtml(body)}</p>
      ${actionHtml ? `<div class="status-actions">${actionHtml}</div>` : ""}
    </div>`;
  }

  function renderDataState(container, kind, options) {
    if (!container) return null;
    container.innerHTML = dataStateHtml(kind, options);
    container.dataset.stateKind = kind;
    return container;
  }

  window.JCONNECT_UI = Object.freeze({
    DATA_STATE_COPY: COPY,
    dataStateHtml,
    renderDataState
  });
})(window);

window.JCONNECT_THEME = (function () {
  const STORAGE_KEY = "jconnect-theme";
  const THEMES = new Set(["light", "dark"]);
  const DARK_LABEL = "ダークモードに切り替え";
  const LIGHT_LABEL = "ライトモードに切り替え";

  function defaultTheme() {
    return "light";
  }

  function savedTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return THEMES.has(value) ? value : "";
    } catch {
      return "";
    }
  }

  function currentTheme() {
    const value = document.documentElement.dataset.theme;
    return THEMES.has(value) ? value : savedTheme() || defaultTheme();
  }

  function updateButtons(theme) {
    const isDark = theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? LIGHT_LABEL : DARK_LABEL);
    });
  }

  function applyTheme(theme, persist) {
    const nextTheme = THEMES.has(theme) ? theme : "light";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        /* localStorage can be unavailable in restrictive browser modes. */
      }
    }
    updateButtons(nextTheme);
    return nextTheme;
  }

  function init() {
    applyTheme(currentTheme(), false);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeToggleBound === "true") return;
      button.dataset.themeToggleBound = "true";
      button.addEventListener("click", () => {
        applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
      });
    });
  }

  return Object.freeze({ init, applyTheme, currentTheme });
})();

document.addEventListener("DOMContentLoaded", () => {
  window.JCONNECT_THEME?.init();

  const s = document.getElementById("languageSelect");
  if (s) {
    s.addEventListener("change", (e) => {
      if (e.target.value) location.href = e.target.value;
    });
  }
  document.querySelectorAll("img[data-fallback-src]").forEach((img) => {
    window.JCONNECT_IMAGE_FALLBACK?.applyFallbackImage(img);
  });
});
