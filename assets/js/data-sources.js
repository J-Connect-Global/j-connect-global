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

  // Community posts are published on submission without review. The static
  // snapshot renders first; the live list then adds new posts and drops posts
  // hidden since the last sync. Static detail URLs are kept for synced posts.
  async function fetchLiveCommunityPosts(staticPayload, timeoutMs) {
    const live = await fetchJsonWithTimeout(buildUrl(communityDataEndpoint, { action: "getPosts" }), timeoutMs || 15000);
    const items = normalizePayload(live);
    if (!live || live.ok !== true || !Array.isArray(live.items || live.posts)) throw new Error("Live community posts unavailable");
    const known = new Map((staticPayload ? normalizePayload(staticPayload) : []).map((post) => [String(post.post_id || post.id || ""), post]));
    return {
      ok: true,
      source: "live",
      items: items.map((post) => {
        const synced = known.get(String(post.post_id || post.id || ""));
        return synced && synced.detail_url && !post.detail_url ? Object.assign({}, post, { detail_url: synced.detail_url }) : post;
      })
    };
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
    fetchJsonWithTimeout,
    fetchLiveCommunityPosts
  });
})(window);
