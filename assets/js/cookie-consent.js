// ===============================
// J-Connect Cookie Consent
// ===============================

(function () {
  const GA_MEASUREMENT_ID = "G-BSKBFKQY19";
  const STORAGE_KEY = "jconnect_cookie_consent"; // accepted / denied
  const LEGACY_STORAGE_KEY = "ng_cookie_consent";
  const IS_GERMANY_JA_PAGE = location.pathname === "/germany/ja" || location.pathname.indexOf("/germany/ja/") === 0;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  });

  // -------------------------------
  // GA4 Loader（同意後のみ実行）
  // -------------------------------
  function loadGA() {
    if (!IS_GERMANY_JA_PAGE) return;

    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });

    if (window.JCONNECT_GA_LOADED) return;
    window.JCONNECT_GA_LOADED = true;

    if (!document.querySelector('script[data-jconnect-ga4="true"]')) {
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
      script.async = true;
      script.dataset.jconnectGa4 = "true";
      document.head.appendChild(script);
    }

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_ad_personalization_signals: false,
      allow_google_signals: false
    });
  }

  function denyGA() {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied"
    });
  }

  function getConsent() {
    const consent = localStorage.getItem(STORAGE_KEY);
    const legacyConsent = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (consent === null && legacyConsent !== null) {
      localStorage.setItem(STORAGE_KEY, legacyConsent);
      return legacyConsent;
    }

    return consent;
  }

  // -------------------------------
  // UI生成
  // -------------------------------
  function createBanner() {
    const focusReturnTarget = document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
      && document.activeElement !== document.documentElement
      ? document.activeElement
      : null;
    const banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "cookie-consent-title");
    banner.setAttribute("aria-describedby", "cookie-consent-description");

    banner.innerHTML = `
      <div class="cookie-inner">
        <div class="cookie-text">
          <h2 class="cookie-title" id="cookie-consent-title">Cookie設定</h2>
          <p id="cookie-consent-description">このサイトでは、サイト改善のためにCookieを使用しています。</p>
        </div>
        <div class="cookie-actions" role="group" aria-label="Cookieの選択">
          <button id="cookie-accept" type="button">同意する</button>
          <button id="cookie-decline" type="button">拒否する</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    const acceptButton = banner.querySelector("#cookie-accept");
    const declineButton = banner.querySelector("#cookie-decline");

    acceptButton.onclick = function () {
      localStorage.setItem(STORAGE_KEY, "accepted");
      localStorage.setItem(LEGACY_STORAGE_KEY, "accepted");
      loadGA();
      removeBanner(focusReturnTarget);
    };

    declineButton.onclick = function () {
      localStorage.setItem(STORAGE_KEY, "denied");
      localStorage.setItem(LEGACY_STORAGE_KEY, "denied");
      denyGA();
      removeBanner(focusReturnTarget);
    };

    banner.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      focusPageContent(focusReturnTarget);
    });

    window.requestAnimationFrame(function () {
      acceptButton.focus();
    });
  }

  function focusPageContent(preferredTarget) {
    if (preferredTarget?.isConnected) {
      preferredTarget.focus();
      return;
    }
    const main = document.querySelector("main");
    if (!main) return;
    const hadTabindex = main.hasAttribute("tabindex");
    if (!hadTabindex) main.setAttribute("tabindex", "-1");
    main.focus();
    if (!hadTabindex) {
      main.addEventListener("blur", function () {
        main.removeAttribute("tabindex");
      }, { once: true });
    }
  }

  function removeBanner(focusReturnTarget) {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.remove();
    focusPageContent(focusReturnTarget);
  }

  function initCookieConsent() {
    const consent = getConsent();

    if (consent === "accepted") {
      loadGA();
    } else if (consent === null) {
      createBanner();
    } else {
      denyGA();
    }
  }

  // -------------------------------
  // 初期処理
  // -------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieConsent);
  } else {
    initCookieConsent();
  }
})();
