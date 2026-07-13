(function (window) {
  const masterDataEndpoint =
    "https://script.google.com/macros/s/AKfycbxwP2QkpK0-k4_WPgJ5zaHSC_I0vqytH-n3xbb62NS0XHtQVdSTyXBT2r_lyBuQcuM/exec";
  const directoryDataEndpoint = masterDataEndpoint;
  const communityDataEndpoint = masterDataEndpoint;

  const directorySheets = Object.freeze({
    eat: "eat",
    shopping: "shopping",
    medical: "medical",
    jobs: "jobs"
  });

  const staticData = Object.freeze({
    communityPosts: "/assets/data/community/posts.json",
    communityCategories: "/assets/data/community/categories.json",
    jobs: "/assets/data/jobs/jobs.json",
    jobCategories: "/assets/data/jobs/categories.json",
    eat: "/assets/data/eat/items.json",
    shopping: "/assets/data/shopping/items.json",
    medical: "/assets/data/medical/items.json"
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
    staticData,
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
