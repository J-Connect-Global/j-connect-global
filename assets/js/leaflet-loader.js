(function (window, document) {
  "use strict";

  const stylesheetHref = "/assets/vendor/leaflet/leaflet.css";
  const scriptSrc = "/assets/vendor/leaflet/leaflet.js";
  let loadingPromise = null;

  function loadStylesheet() {
    const existing = document.querySelector(`link[href="${stylesheetHref}"]`);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = stylesheetHref;
      link.dataset.jconnectLeaflet = "stylesheet";
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", () => reject(new Error("Leaflet stylesheet failed to load.")), { once: true });
      document.head.append(link);
    });
  }

  function loadScript() {
    if (window.L) return Promise.resolve();
    const existing = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Leaflet script failed to load.")), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = scriptSrc;
      script.dataset.jconnectLeaflet = "script";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Leaflet script failed to load.")), { once: true });
      document.head.append(script);
    });
  }

  window.JCONNECT_LEAFLET = Object.freeze({
    load() {
      if (window.L) return Promise.resolve(window.L);
      if (!loadingPromise) {
        loadingPromise = Promise.all([loadStylesheet(), loadScript()]).then(() => {
          if (!window.L) throw new Error("Leaflet did not initialize.");
          return window.L;
        });
      }
      return loadingPromise;
    }
  });
})(window, document);
