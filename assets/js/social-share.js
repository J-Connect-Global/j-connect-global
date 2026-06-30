(function () {
  const SITE_NAME = "J-Connect Germany";
  const DEFAULT_TEXT = "J-Connect Germanyの記事を共有します。";
  const INSTAGRAM_COPY_MESSAGE = "リンクをコピーしました。InstagramのDM・ストーリーズ・プロフィール等に貼り付けて共有できます。";
  const COPY_SUCCESS_MESSAGE = "リンクをコピーしました。";
  const COPY_ERROR_MESSAGE = "リンクをコピーできませんでした。URLを選択してコピーしてください。";
  const SHARE_SELECTOR = "[data-social-share]";
  const TOP_MARKER = "social-share-top";
  const BOTTOM_MARKER = "social-share-bottom";

  let toastTimer = 0;
  let refreshTimer = 0;

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
    const h1 = cleanTitle(document.querySelector("main h1, h1")?.textContent);
    const title = cleanTitle(document.title);
    const genericTitles = [
      "投稿フォーム | J-Connect Germany",
      "投稿が見つかりません | J-Connect Germany"
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
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
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

  function createShareBlock(position) {
    const block = document.createElement("section");
    block.className = "social-share";
    block.dataset.socialShare = position;
    block.setAttribute("aria-label", "このページを共有");

    const title = document.createElement("p");
    title.className = "social-share__title";
    title.textContent = "共有";

    const buttons = document.createElement("div");
    buttons.className = "social-share__buttons";

    buttons.append(
      button("native", "共有", "このページを共有", { modifier: "native" }),
      link("whatsapp", "WhatsApp", "WhatsAppで共有"),
      link("line", "LINE", "LINEで共有"),
      link("x", "X", "Xで共有"),
      link("facebook", "Facebook", "Facebookで共有"),
      link("linkedin", "LinkedIn", "LinkedInで共有"),
      link("email", "メール", "メールで共有"),
      button("copy", "リンクコピー", "リンクをコピー"),
      button("instagram", "Instagram用にコピー", "Instagram用にリンクをコピー")
    );

    block.append(title, buttons);
    return block;
  }

  function link(service, label, ariaLabel) {
    const element = document.createElement("a");
    element.className = "social-share__button";
    element.dataset.shareService = service;
    element.textContent = label;
    element.setAttribute("aria-label", ariaLabel);
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    return element;
  }

  function button(service, label, ariaLabel, options) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `social-share__button${options?.modifier ? ` social-share__button--${options.modifier}` : ""}`;
    element.dataset.shareService = service;
    element.textContent = label;
    element.setAttribute("aria-label", ariaLabel);
    return element;
  }

  function placeBlocks() {
    const target = findTarget();
    if (!target) return;

    const existingBlocks = Array.from(document.querySelectorAll(SHARE_SELECTOR));
    if (existingBlocks.length && existingBlocks.every((block) => target.root.contains(block))) return;
    existingBlocks.forEach((block) => block.remove());

    const top = createShareBlock("top");
    const bottom = createShareBlock("bottom");

    if (target.type === "article") {
      const header = target.root.querySelector(".article-header, header");
      const body = target.root.querySelector(".article-body");
      if (header) header.insertAdjacentElement("afterend", top);
      else target.root.insertAdjacentElement("afterbegin", top);
      if (body) body.insertAdjacentElement("beforeend", bottom);
      else target.root.insertAdjacentElement("beforeend", bottom);
      return;
    }

    if (target.type === "detail") {
      target.root.insertAdjacentElement("beforeend", top);
      return;
    }

    top.classList.add("social-share--compact");
    const heading = target.root.querySelector("h1");
    if (heading) heading.insertAdjacentElement("afterend", top);
    else target.root.insertAdjacentElement("beforeend", top);
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
    placeBlocks();
    const data = shareData();

    document.querySelectorAll(SHARE_SELECTOR).forEach((block) => {
      if (block.dataset.socialShare === BOTTOM_MARKER || block.dataset.socialShare === TOP_MARKER) {
        block.dataset.socialShare = block.dataset.socialShare.replace("social-share-", "");
      }

      block.querySelectorAll("[data-share-service]").forEach((element) => {
        const service = element.dataset.shareService;
        if (service === "native") {
          element.hidden = !navigator.share;
          return;
        }
        if (element.tagName === "A") {
          element.setAttribute("href", serviceHref(service, data));
        }
      });
    });
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

  async function onClick(event) {
    const trigger = event.target.closest("[data-share-service]");
    if (!trigger) return;

    const service = trigger.dataset.shareService;
    if (!["native", "copy", "instagram"].includes(service)) return;

    event.preventDefault();
    const data = shareData();

    try {
      if (service === "native") {
        await nativeShare(data);
        return;
      }

      if (service === "instagram") {
        if (navigator.share) {
          await nativeShare(data);
          return;
        }
        await copyUrl(data.url);
        showToast(INSTAGRAM_COPY_MESSAGE);
        return;
      }

      await copyUrl(data.url);
      showToast(COPY_SUCCESS_MESSAGE);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      showToast(COPY_ERROR_MESSAGE);
    }
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
    document.addEventListener("click", onClick);
    refresh();
    observeDynamicContent();
    window.JCONNECT_SOCIAL_SHARE = Object.freeze({
      refresh,
      shareData
    });
  });
})();
