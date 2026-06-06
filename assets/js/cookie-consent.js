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
    const banner = document.createElement("div");
    banner.id = "cookie-banner";

    banner.innerHTML = `
      <div class="cookie-inner">
        <div class="cookie-text">
          このサイトでは、サイト改善のためにCookieを使用しています。
        </div>
        <div class="cookie-actions">
          <button id="cookie-accept">同意する</button>
          <button id="cookie-decline">拒否する</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("cookie-accept").onclick = function () {
      localStorage.setItem(STORAGE_KEY, "accepted");
      localStorage.setItem(LEGACY_STORAGE_KEY, "accepted");
      loadGA();
      removeBanner();
    };

    document.getElementById("cookie-decline").onclick = function () {
      localStorage.setItem(STORAGE_KEY, "denied");
      localStorage.setItem(LEGACY_STORAGE_KEY, "denied");
      denyGA();
      removeBanner();
    };
  }

  function removeBanner() {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.remove();
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
