// ===============================
// J-Connect Cookie Consent
// ===============================

(function () {
  const STORAGE_KEY = "ng_cookie_consent"; // accepted / denied

  // -------------------------------
  // GA4 Loader（同意後のみ実行）
  // -------------------------------
  function loadGA() {
    if (window.GA_LOADED) return;
    window.GA_LOADED = true;

    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-0300YC5NF8";
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag("js", new Date());

    // IP匿名化など最低限設定
    gtag("config", "G-0300YC5NF8", {
      anonymize_ip: true,
      ad_storage: "denied",
      analytics_storage: "granted"
    });
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
      loadGA();
      removeBanner();
    };

    document.getElementById("cookie-decline").onclick = function () {
      localStorage.setItem(STORAGE_KEY, "denied");
      removeBanner();
    };
  }

  function removeBanner() {
    const banner = document.getElementById("cookie-banner");
    if (banner) banner.remove();
  }

  // -------------------------------
  // 初期処理
  // -------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    const consent = localStorage.getItem(STORAGE_KEY);

    if (consent === "accepted") {
      loadGA();
    } else if (consent === null) {
      createBanner();
    }
    // denied の場合は何もしない
  });
})();
