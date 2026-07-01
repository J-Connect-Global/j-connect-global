(function () {
  const GLOBAL_KEY = "__JCONNECT_SOCIAL_SHARE_STATE__";
  const existingState = window[GLOBAL_KEY];

  if (existingState?.initialized) {
    existingState.refresh?.();
    return;
  }

  const state = existingState || {};
  state.initialized = true;
  window[GLOBAL_KEY] = state;

  const SITE_NAME = "J-Connect Germany";
  const DEFAULT_TEXT = "\u004a\u002d\u0043\u006f\u006e\u006e\u0065\u0063\u0074\u0020\u0047\u0065\u0072\u006d\u0061\u006e\u0079\u306e\u8a18\u4e8b\u3092\u5171\u6709\u3057\u307e\u3059\u3002";
  const INSTAGRAM_COPY_MESSAGE = "\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002\u0049\u006e\u0073\u0074\u0061\u0067\u0072\u0061\u006d\u306e\u0044\u004d\u30fb\u30b9\u30c8\u30fc\u30ea\u30fc\u30ba\u30fb\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u7b49\u306b\u8cbc\u308a\u4ed8\u3051\u3066\u5171\u6709\u3067\u304d\u307e\u3059\u3002";
  const COPY_SUCCESS_MESSAGE = "\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\u3002";
  const COPY_ERROR_MESSAGE = "\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u0055\u0052\u004c\u3092\u9078\u629e\u3057\u3066\u30b3\u30d4\u30fc\u3057\u3066\u304f\u3060\u3055\u3044\u3002";
  const SHARE_SELECTOR = "[data-social-share]";
  const DIALOG_SELECTOR = "[data-social-share-dialog]";
  const MOBILE_NATIVE_QUERY = "(max-width: 720px)";
  const LABELS = {
    trigger: "\u30b7\u30a7\u30a2\u3059\u308b",
    triggerShort: "\u30b7\u30a7\u30a2",
    dialogTitle: "\u3053\u306e\u30da\u30fc\u30b8\u3092\u30b7\u30a7\u30a2",
    close: "\u9589\u3058\u308b",
    native: "\u5171\u6709",
    email: "\u30e1\u30fc\u30eb",
    copy: "\u30ea\u30f3\u30af\u30b3\u30d4\u30fc",
    instagram: "Instagram\u7528"
  };
  const SERVICES = [
    ["native", LABELS.native, "\u3053\u306e\u30da\u30fc\u30b8\u3092\u5171\u6709", "share"],
    ["whatsapp", "WhatsApp", "WhatsApp\u3067\u5171\u6709", "wa"],
    ["line", "LINE", "LINE\u3067\u5171\u6709", "ln"],
    ["x", "X", "X\u3067\u5171\u6709", "x"],
    ["facebook", "Facebook", "Facebook\u3067\u5171\u6709", "f"],
    ["linkedin", "LinkedIn", "LinkedIn\u3067\u5171\u6709", "in"],
    ["email", LABELS.email, "\u30e1\u30fc\u30eb\u3067\u5171\u6709", "@"],
    ["copy", LABELS.copy, "\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc", "link"],
    ["instagram", LABELS.instagram, "Instagram\u7528\u306b\u30ea\u30f3\u30af\u3092\u30b3\u30d4\u30fc", "ig"]
  ];

  let toastTimer = 0;
  let refreshTimer = 0;
  let activeTrigger = null;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function pageUrl() {
    const current = new URL(window.location.href);
    current.hash = "";

    if (current.pathname === "/germany/ja/community/post/" && current.searchParams.get("id")) {
      return current.href;
    }

    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (canonical) return canonical;
    return current.href;
  }

  function cleanTitle(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function pageTitle() {
    const detailTitle = cleanTitle(document.querySelector(".detail-panel h1, #detailTitle")?.textContent);
    if (detailTitle && document.body.classList.contains("detail-mode-active")) {
      return detailTitle.includes(SITE_NAME) ? detailTitle : `${detailTitle} | ${SITE_NAME}`;
    }

    const h1 = cleanTitle(document.querySelector("main h1, h1")?.textContent);
    const title = cleanTitle(document.title);
    const genericTitles = [
      "\u6295\u7a3f\u30d5\u30a9\u30fc\u30e0 | J-Connect Germany",
      "\u6295\u7a3f\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093 | J-Connect Germany"
    ];

    if (h1 && (!title || genericTitles.includes(title))) {
      return h1.includes(SITE_NAME) ? h1 : `${h1} | ${SITE_NAME}`;
    }

    if (h1 && title && !title.includes(h1) && document.body.classList.contains("detail-mode-active")) {
      return `${h1} | ${SITE_NAME}`;
    }

    return title || h1 || SITE_NAME;
  }

  function pageText() {
    const meta = document.querySelector('meta[name="description"]')?.content;
    if (meta && meta.trim()) return meta.trim();

    const detailBody = document.querySelector(".detail-body")?.textContent;
    if (detailBody && detailBody.trim()) return truncate(detailBody.trim(), 120);

    const summary = document.querySelector(".article-summary, .hero-desc, main p")?.textContent;
    if (summary && summary.trim()) return truncate(summary.trim(), 120);

    return DEFAULT_TEXT;
  }

  function truncate(value, max) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
  }

  function shareData() {
    const url = pageUrl();
    const title = pageTitle();
    const text = pageText();
    return {
      url,
      title,
      text,
      encodedUrl: encodeURIComponent(url),
      encodedTitle: encodeURIComponent(title),
      encodedText: encodeURIComponent(`${title} ${url}`)
    };
  }

  function serviceHref(service, data) {
    if (service === "whatsapp") return `https://wa.me/?text=${data.encodedText}`;
    if (service === "line") return `https://social-plugins.line.me/lineit/share?url=${data.encodedUrl}&text=${data.encodedTitle}`;
    if (service === "x") return `https://twitter.com/intent/tweet?text=${data.encodedTitle}&url=${data.encodedUrl}`;
    if (service === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${data.encodedUrl}`;
    if (service === "linkedin") return `https://www.linkedin.com/sharing/share-offsite/?url=${data.encodedUrl}`;
    if (service === "email") return `mailto:?subject=${data.encodedTitle}&body=${data.encodedText}`;
    return "#";
  }

  function createShareTrigger() {
    const root = document.createElement("div");
    root.className = "social-share";
    root.dataset.socialShare = "trigger";
    root.append(createTriggerButton());
    return root;
  }

  function createTriggerButton() {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "social-share__trigger";
    trigger.dataset.shareTrigger = "true";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", LABELS.trigger);
    trigger.append(createShareIcon("social-share__trigger-icon"), textSpan(LABELS.trigger, "social-share__trigger-label"), textSpan(LABELS.triggerShort, "social-share__trigger-label social-share__trigger-label--short"));
    return trigger;
  }

  function createShareIcon(className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = '<path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.9 12.7a3.3 3.3 0 0 0 0-1.39l7.05-4.12A2.98 2.98 0 1 0 15 5c0 .24.03.47.08.69L8.03 9.81a3 3 0 1 0 0 4.38l7.12 4.18c-.05.2-.07.42-.07.63a2.92 2.92 0 1 0 2.92-2.9Z" fill="currentColor"/>';
    return svg;
  }

  function textSpan(text, className) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
  }

  function ensureDialog() {
    let layer = document.querySelector(DIALOG_SELECTOR);
    if (layer) return layer;

    layer = document.createElement("div");
    layer.className = "social-share-layer";
    layer.dataset.socialShareDialog = "true";
    layer.hidden = true;

    const backdrop = document.createElement("div");
    backdrop.className = "social-share-layer__backdrop";
    backdrop.dataset.shareClose = "true";

    const dialog = document.createElement("section");
    dialog.className = "social-share-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "false");
    dialog.setAttribute("aria-labelledby", "social-share-title");
    dialog.tabIndex = -1;

    const header = document.createElement("div");
    header.className = "social-share-dialog__header";

    const title = document.createElement("h2");
    title.className = "social-share-dialog__title";
    title.id = "social-share-title";
    title.textContent = LABELS.dialogTitle;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "social-share-dialog__close";
    close.dataset.shareClose = "true";
    close.setAttribute("aria-label", LABELS.close);
    close.textContent = "\u00d7";

    const grid = document.createElement("div");
    grid.className = "social-share-dialog__grid";

    SERVICES.forEach(([service, label, ariaLabel, icon]) => {
      grid.append(createServiceControl(service, label, ariaLabel, icon));
    });

    header.append(title, close);
    dialog.append(header, grid);
    layer.append(backdrop, dialog);
    document.body.appendChild(layer);
    return layer;
  }

  function createServiceControl(service, label, ariaLabel, icon) {
    const element = ["whatsapp", "line", "x", "facebook", "linkedin", "email"].includes(service)
      ? document.createElement("a")
      : document.createElement("button");

    element.className = `social-share-option social-share-option--${service}`;
    element.dataset.shareService = service;
    element.setAttribute("aria-label", ariaLabel);

    if (element.tagName === "A") {
      element.target = service === "email" ? "" : "_blank";
      element.rel = service === "email" ? "" : "noopener noreferrer";
    } else {
      element.type = "button";
    }

    const mark = document.createElement("span");
    mark.className = "social-share-option__icon";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = icon;

    const text = document.createElement("span");
    text.className = "social-share-option__label";
    text.textContent = label;

    element.append(mark, text);

    if (["native", "copy", "instagram"].includes(service)) {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        handleServiceClick(element, event);
      });
    }

    return element;
  }

  function placeTrigger() {
    const target = findTarget();
    if (!target) return;

    const shares = Array.from(document.querySelectorAll(SHARE_SELECTOR));
    const root = shares.shift() || createShareTrigger();
    shares.forEach((share) => share.remove());
    root.className = `social-share social-share--${target.type}`;

    const anchor = findAnchor(target);
    if (anchor?.parentElement) {
      if (root.previousElementSibling !== anchor || root.parentElement !== anchor.parentElement) {
        anchor.insertAdjacentElement("afterend", root);
      }
      return;
    }

    if (root.parentElement !== target.root) {
      target.root.insertAdjacentElement("afterbegin", root);
    }
  }

  function findAnchor(target) {
    if (target.type === "article") {
      return target.root.querySelector(".article-meta") || target.root.querySelector(".article-summary") || target.root.querySelector(".article-title, h1");
    }

    if (target.type === "detail") {
      return target.root.querySelector(".detail-title, h1, h2, h3");
    }

    const hero = target.root.querySelector(".jc-page-hero, .post-hero, .home-hero, section");
    return hero?.querySelector("h1") || target.root.querySelector("h1");
  }

  function findTarget() {
    const article = document.querySelector("main article.article-content-shell, main article.article-content");
    if (isVisibleContainer(article)) return { root: article, type: "article" };

    const detail = document.querySelector(".detail-panel");
    if (isVisibleContainer(detail)) return { root: detail, type: "detail" };

    const main = document.querySelector("main");
    if (main) return { root: main, type: "page" };

    return null;
  }

  function isVisibleContainer(element) {
    if (!element || element.closest("[hidden]")) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return element.getClientRects().length > 0;
  }

  function refresh() {
    placeTrigger();
    updateShareLinks();
  }

  function updateShareLinks() {
    const data = shareData();
    document.querySelectorAll("[data-share-service]").forEach((element) => {
      const service = element.dataset.shareService;
      if (service === "native") {
        element.hidden = !navigator.share;
        return;
      }

      if (element.tagName === "A") {
        element.setAttribute("href", serviceHref(service, data));
      }
    });
  }

  function openDialog(trigger) {
    activeTrigger = trigger;
    updateShareLinks();

    const layer = ensureDialog();
    const dialog = layer.querySelector(".social-share-dialog");
    layer.hidden = false;
    layer.classList.add("is-open");
    trigger?.setAttribute("aria-expanded", "true");
    positionDialog(dialog, trigger);
    window.requestAnimationFrame(() => {
      dialog.focus({ preventScroll: true });
    });
  }

  function positionDialog(dialog, trigger) {
    dialog.style.removeProperty("--share-dialog-left");
    dialog.style.removeProperty("--share-dialog-top");

    if (!trigger || window.matchMedia(MOBILE_NATIVE_QUERY).matches) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const top = rect.bottom + 10;
    dialog.style.setProperty("--share-dialog-left", `${left}px`);
    dialog.style.setProperty("--share-dialog-top", `${top}px`);
  }

  function closeDialog(options = {}) {
    const layer = document.querySelector(DIALOG_SELECTOR);
    if (!layer || layer.hidden) return;

    layer.classList.remove("is-open");
    layer.hidden = true;
    activeTrigger?.setAttribute("aria-expanded", "false");

    if (options.returnFocus !== false) {
      activeTrigger?.focus({ preventScroll: true });
    }

    activeTrigger = null;
  }

  async function copyUrl(url) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.top = "-999px";
    document.body.appendChild(input);
    input.select();

    try {
      return document.execCommand("copy");
    } finally {
      input.remove();
    }
  }

  async function nativeShare(data) {
    if (!navigator.share) return false;
    await navigator.share({ title: data.title, text: data.text, url: data.url });
    return true;
  }

  async function handleTriggerClick(trigger) {
    const shouldUseNative = window.matchMedia(MOBILE_NATIVE_QUERY).matches && navigator.share;

    if (!shouldUseNative) {
      openDialog(trigger);
      return;
    }

    try {
      await nativeShare(shareData());
    } catch (error) {
      if (error && error.name === "AbortError") return;
      openDialog(trigger);
    }
  }

  async function handleServiceClick(control, event) {
    const service = control.dataset.shareService;
    if (!["native", "copy", "instagram"].includes(service)) return;

    event.preventDefault();
    const data = shareData();

    try {
      if (service === "native") {
        await nativeShare(data);
        closeDialog();
        return;
      }

      if (service === "instagram") {
        if (navigator.share) {
          await nativeShare(data);
          closeDialog();
          return;
        }
        await copyUrl(`${data.title}\n${data.url}`);
        showToast(INSTAGRAM_COPY_MESSAGE);
        closeDialog({ returnFocus: false });
        return;
      }

      await copyUrl(data.url);
      showToast(COPY_SUCCESS_MESSAGE);
      closeDialog({ returnFocus: false });
    } catch (error) {
      if (error && error.name === "AbortError") return;
      showToast(COPY_ERROR_MESSAGE);
    }
  }

  function onClick(event) {
    const close = event.target.closest("[data-share-close]");
    if (close) {
      event.preventDefault();
      closeDialog();
      return;
    }

    const trigger = event.target.closest("[data-share-trigger]");
    if (trigger) {
      event.preventDefault();
      handleTriggerClick(trigger);
      return;
    }

    const control = event.target.closest("[data-share-service]");
    if (control) {
      handleServiceClick(control, event);
      return;
    }

    const layer = document.querySelector(DIALOG_SELECTOR);
    if (layer && !layer.hidden && !event.target.closest(".social-share-dialog")) {
      closeDialog();
    }
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      closeDialog();
    }
  }

  function onResize() {
    const layer = document.querySelector(DIALOG_SELECTOR);
    if (!layer || layer.hidden) return;
    positionDialog(layer.querySelector(".social-share-dialog"), activeTrigger);
  }

  function showToast(message) {
    let toast = document.querySelector(".social-share-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "social-share-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3600);
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, 80);
  }

  function observeDynamicContent() {
    const main = document.querySelector("main");
    if (!main || !window.MutationObserver) return;
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(main, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  ready(() => {
    ensureDialog();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", onResize);
    refresh();
    observeDynamicContent();
    state.refresh = refresh;
    state.shareData = shareData;
    window.JCONNECT_SOCIAL_SHARE = Object.freeze({
      version: "compact-popover",
      refresh,
      shareData
    });
  });
})();
