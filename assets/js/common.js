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

document.addEventListener("DOMContentLoaded", () => {
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
