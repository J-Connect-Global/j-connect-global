(function (window) {
  const directoryDataEndpoint =
    "https://script.google.com/macros/s/AKfycbzpVvPrboEPZaFQHf87Q1LPhiU40J03ntX1JicNoA4NOo6ngNWh8knFwJ_9IVkKgTKx/exec";
  const communityDataEndpoint =
    "https://script.google.com/macros/s/AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM/exec";

  const directorySheets = Object.freeze({
    events: "Events",
    eat: "Eat",
    shopping: "Shopping",
    medical: "Medical",
    // The deployed GAS currently exposes Jobs data with the "job" sheet key.
    jobs: "job"
  });

  function buildUrl(endpoint, params) {
    const url = new URL(endpoint);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  window.JCONNECT_DATA_SOURCES = Object.freeze({
    // Directory spreadsheet: 1Z9pe8lZxbVAnjTvx3kUCWVZm-Qt_xhgJsrZ7W75Ktks
    directoryDataEndpoint,
    directorySheets,
    // Community spreadsheet: 1rWn1KsRgDkfli8tPN1ddm5s8Zp6yt8EG1Yr5I6sgtNc
    communityDataEndpoint,
    // TODO: Add the new public Community post image Drive folder URL/ID when provided.
    communityImagesFolderUrl: "",
    communityImagesFolderId: "",
    buildDirectoryUrl(params) {
      return buildUrl(directoryDataEndpoint, params);
    },
    buildCommunityUrl(params) {
      return buildUrl(communityDataEndpoint, params);
    }
  });
})(window);
