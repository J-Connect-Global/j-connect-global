(function (window) {
  // Static JSON is the primary browser source and GAS is the runtime fallback.
  // Do not inject fictional jobs when both sources are unavailable.
  window.JCONNECT_FALLBACK_JOBS = [];
})(window);
