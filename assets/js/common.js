(function (window) {
  const DEFAULT_IMAGE = "/assets/img/placeholders/jconnect-default-card.webp";
  const INVALID_IMAGE_VALUES = new Set(["", "#", "n/a", "null", "undefined"]);

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
    return title ? `${title} のイメージ` : "J-Connect Germany のイメージ";
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
