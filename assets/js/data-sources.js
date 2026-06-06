(function (window) {
  // Contents Deployment ID: AKfycbxg5RQDOZn64GHiC5uMhohfn0OKTp595iPn09vSOCQrmMv36tpsm0fq7opjzA2h7Wyz
  // Contents Spreadsheet ID: 1Z9pe8lZxbVAnjTvx3kUCWVZm-Qt_xhgJsrZ7W75Ktks
  const directoryDataEndpoint =
    "https://script.google.com/macros/s/AKfycbxg5RQDOZn64GHiC5uMhohfn0OKTp595iPn09vSOCQrmMv36tpsm0fq7opjzA2h7Wyz/exec";

  // Community Deployment ID: AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM
  // Community Spreadsheet ID: 1rWn1KsRgDkfli8tPN1ddm5s8Zp6yt8EG1Yr5I6sgtNc
  // Community image Drive folder ID: 1ezKSoBNrXeWgIFGQFCqGn6875arnBasQ
  const communityDataEndpoint =
    "https://script.google.com/macros/s/AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM/exec";

  const directorySheets = Object.freeze({
    events: "events",
    eat: "eat",
    shopping: "shopping",
    medical: "medical",
    jobs: "jobs"
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

  function normalizePayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (payload.ok === false) {
      throw new Error(payload.error || "Data source returned ok:false");
    }
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.posts)) return payload.posts;
    return [];
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 12000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status} for ${url}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  window.JCONNECT_DATA_SOURCES = Object.freeze({
    directoryDataEndpoint,
    directorySheets,
    communityDataEndpoint,
    buildDirectoryUrl(params) {
      return buildUrl(directoryDataEndpoint, params);
    },
    buildCommunityUrl(params) {
      return buildUrl(communityDataEndpoint, params);
    },
    normalizePayload,
    fetchJsonWithTimeout
  });
})(window);
