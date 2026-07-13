(function (window) {
  const imageFallback = window.JCONNECT_IMAGE_FALLBACK;
  const DEFAULT_IMAGE = imageFallback?.DEFAULT_IMAGE || "/assets/img/placeholders/jconnect-default-card.webp";
  const INVALID_IMAGE_VALUES = new Set(["", "#", "n/a", "null", "undefined"]);
  const COMMUNITY_LOCATION_CONFIG = Object.freeze({
    countries: Object.freeze(["ドイツ", "オーストリア", "スイス", "オンライン", "その他"]),
    regionsByCountry: Object.freeze({
      "ドイツ": Object.freeze(["デュッセルドルフ周辺", "ケルン・ボン周辺", "フランクフルト周辺", "ベルリン周辺", "ハンブルク周辺", "ミュンヘン周辺", "シュトゥットガルト周辺", "ハノーファー周辺", "ライプツィヒ・ドレスデン周辺", "その他"]),
      "オーストリア": Object.freeze(["ウィーン周辺", "グラーツ周辺", "リンツ周辺", "ザルツブルク周辺", "インスブルック周辺", "その他"]),
      "スイス": Object.freeze(["チューリッヒ周辺", "ジュネーブ周辺", "バーゼル周辺", "ベルン周辺", "ローザンヌ周辺", "その他"])
    })
  });
  const COMMUNITY_COUNTRY_ALIASES = Object.freeze({
    "germany": "ドイツ",
    "austria": "オーストリア",
    "switzerland": "スイス",
    "schweiz": "スイス",
    "online": "オンライン"
  });
  const fallbackPosts = Object.freeze([
    {
      post_id: "community-fallback-moving-sale-duesseldorf",
      title: "引っ越し前の家具・生活用品まとめ",
      body: "デュッセルドルフ市内で、引っ越し前に家具や生活用品をまとめて整理しています。受け渡し日時は相談できます。",
      category1: "売ります",
      category2: "家具・家電",
      city: "Düsseldorf",
      region: "NRW",
      price: "応相談",
      created_at: "2026-06-10"
    },
    {
      post_id: "community-fallback-anmeldung-question",
      title: "住民登録予約前に確認したいこと",
      body: "初めての住民登録で必要書類や予約時の注意点を確認したい方向けの相談投稿です。",
      category1: "質問",
      category2: "住民登録・役所",
      city: "Köln",
      region: "NRW",
      price: "",
      created_at: "2026-06-09"
    },
    {
      post_id: "community-fallback-language-exchange",
      title: "週末の日本語・ドイツ語ランゲージ交換",
      body: "カフェで日本語とドイツ語をゆっくり練習できる相手を探しています。初心者歓迎です。",
      category1: "友達募集",
      category2: "言語交換",
      city: "Düsseldorf",
      region: "NRW",
      price: "",
      created_at: "2026-06-08"
    },
    {
      post_id: "community-fallback-piano-lesson",
      title: "子ども向けピアノ・音楽レッスン相談",
      body: "日本語で相談できる音楽レッスンの空き時間について案内しています。体験希望も相談できます。",
      category1: "レッスン",
      category2: "音楽",
      city: "Frankfurt am Main",
      region: "Hessen",
      price: "初回相談無料",
      created_at: "2026-06-07"
    },
    {
      post_id: "community-fallback-weekend-help",
      title: "週末イベント運営のお手伝い募集",
      body: "日本文化イベントの受付や会場案内を手伝える方を探しています。短時間から相談できます。",
      category1: "アルバイト",
      category2: "単発",
      city: "München",
      region: "Bayern",
      price: "時給相談",
      created_at: "2026-06-06"
    }
  ]);

  function pick(post, keys) {
    for (const key of keys) {
      const value = post && post[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  }

  function normalizeCommunityCountry(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (COMMUNITY_LOCATION_CONFIG.countries.includes(raw)) return raw;
    return COMMUNITY_COUNTRY_ALIASES[raw.toLowerCase()] || "";
  }

  function communityRegionsForCountry(country) {
    return COMMUNITY_LOCATION_CONFIG.regionsByCountry[normalizeCommunityCountry(country)] || [];
  }

  function isCustomCommunityRegion(country, city) {
    const value = String(city || "").trim();
    if (!value) return false;
    const fixedRegions = communityRegionsForCountry(country).filter((region) => region !== "その他");
    return !fixedRegions.includes(value);
  }

  function splitMediaValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(splitMediaValue);
    if (typeof value === "object") return Object.values(value).flatMap(splitMediaValue);
    const text = String(value).trim();
    if (!text || INVALID_IMAGE_VALUES.has(text.toLowerCase())) return [];
    if (/^\s*[\[{]/.test(text)) {
      try {
        return splitMediaValue(JSON.parse(text));
      } catch {
        return [text];
      }
    }
    return text.split(/[\n,;]/).map((item) => item.trim()).filter((item) => item && !INVALID_IMAGE_VALUES.has(item.toLowerCase()));
  }

  function isAllowedCommunityImageUrl(src) {
    const value = String(src || "").trim();
    if (!value) return false;
    if (/^(javascript|data|blob|file):/i.test(value) || value.startsWith("//")) return false;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("/")) {
      try {
        return new URL(value, window.location.href).origin === window.location.origin;
      } catch {
        return false;
      }
    }

    try {
      const url = new URL(value, window.location.href);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const host = url.hostname.toLowerCase();
        if (url.origin === window.location.origin) {
          return true;
        }
        return host === "drive.google.com" ||
          host === "lh3.googleusercontent.com" ||
          host === "googleusercontent.com" ||
          host.endsWith(".googleusercontent.com");
      }
      if (url.origin === window.location.origin) {
        return true;
      }
      return false;
    } catch {
      return !value.startsWith("/") || value.startsWith("/assets/");
    }
  }

  function normalizeImageSrc(src) {
    const value = String(src || "").trim();
    if (!value) return "";

    try {
      const url = new URL(value, window.location.href);
      if (url.hostname.includes("drive.google.com")) {
        const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
        const id = fileMatch?.[1] || url.searchParams.get("id");
        if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
      }
      return isAllowedCommunityImageUrl(url.href) ? url.href : "";
    } catch {
      return isAllowedCommunityImageUrl(value) ? value : "";
    }
  }

  function isValidImageSrc(src) {
    const value = String(src || "").trim();
    if (!value || INVALID_IMAGE_VALUES.has(value.toLowerCase())) return false;
    return isAllowedCommunityImageUrl(value) && !isDefaultImageSrc(value);
  }

  function isDefaultImageSrc(src) {
    const value = String(src || "").trim();
    if (!value) return false;
    try {
      const url = new URL(value, window.location.href);
      return url.pathname === DEFAULT_IMAGE;
    } catch {
      return value === DEFAULT_IMAGE || value === `https://j-connect-global.com${DEFAULT_IMAGE}`;
    }
  }

  function postId(post, index) {
    return pick(post, ["post_id", "postId", "id", "_id", "slug"]) || `community-post-${index + 1}`;
  }

  function normalizeStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    if (text === "active") return "active";
    if (text === "closed") return "closed";
    if (text === "hidden") return "hidden";
    if (text === "pending") return "pending";
    if (text === "deleted") return "deleted";
    if (text === "inactive") return "inactive";
    if (text === "expired") return "expired";
    return text;
  }

  function isExpired(post) {
    const raw = pick(post, ["expires_at", "expiresAt"]);
    if (!raw) return false;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) && time < Date.now();
  }

  function isPubliclyVisible(post, includeClosed) {
    const status = normalizeStatus(post && post.status);
    const trueFlag = (value) => value === true || ["true", "yes", "1"].includes(String(value || "").trim().toLowerCase());
    if (["deleted", "is_deleted", "archive", "archived", "is_archived", "hidden", "is_hidden"].some((field) => trueFlag(post && post[field]))) return false;
    if (pick(post, ["deleted_at", "hidden_at"])) return false;
    if (status === "active") return !isExpired(post);
    if (status === "closed") return includeClosed !== false;
    return false;
  }

  function getCommunityPostImages(post) {
    const values = [
      post?.images,
      post?._images,
      post?.image_url_1,
      post?.image_url_2,
      post?.image_url_3,
      pick(post, ["image"]),
      pick(post, ["image_url"]),
      pick(post, ["imageUrl"]),
      post?.image_urls,
      post?.photos,
      pick(post, ["thumbnail", "thumbnail_url", "photo", "photoUrl", "photo_url", "first_image"]),
      post?.image1,
      post?.image2,
      post?.image3
    ];
    return [...new Set(values.flatMap(splitMediaValue).map(normalizeImageSrc).filter(isValidImageSrc))];
  }

  function getCommunityThumbnail(post) {
    return getCommunityPostImages(post)[0] || DEFAULT_IMAGE;
  }

  function normalizePost(post, index) {
    const id = postId(post, index);
    const city = pick(post, ["city", "location", "area"]);
    const region = pick(post, ["region", "prefecture"]);
    const status = normalizeStatus(post.status);
    const postImages = getCommunityPostImages(post);
    return {
      ...post,
      _id: id,
      _title: pick(post, ["title", "name", "subject"]) || "投稿タイトル未設定",
      _body: pick(post, ["body", "description", "message", "content"]),
      _postType: pick(post, ["category1", "post_type", "postType", "type", "category"]) || "質問",
      _subcategory: pick(post, ["category2", "subcategory", "sub_category", "detail_category"]) || "その他",
      _location: [city, region].filter(Boolean).join(" / ") || "地域未設定",
      _date: pick(post, ["last_modified_at", "updated_at", "created_at", "createdAt", "date", "timestamp"]),
      _createdAt: pick(post, ["created_at", "createdAt", "date", "timestamp"]),
      _lastModifiedAt: pick(post, ["last_modified_at", "lastModifiedAt"]),
      _lastModifiedAction: pick(post, ["last_modified_action", "lastModifiedAction"]),
      _status: status,
      _isActive: status === "active",
      _isClosed: status === "closed",
      _isExpired: isExpired(post),
      _price: pick(post, ["price", "fee", "salary", "budget"]),
      _images: postImages,
      _contentImage: postImages[0] || DEFAULT_IMAGE
    };
  }

  function dateValue(post) {
    const raw = post && (post._date || post.created_at || post.date || post.timestamp);
    const time = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  function sortPosts(posts) {
    return [...(posts || [])].sort((a, b) => dateValue(b) - dateValue(a));
  }

  function formatDate(raw) {
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) return "新着";
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function communityStandaloneDetailHref(post, basePath) {
    const id = post && (post._id || postId(post, 0));
    const base = basePath || "/germany/ja/community/post/";
    return `${base}?id=${encodeURIComponent(id)}`;
  }

  function communityBoardModalHref(post, basePath) {
    const id = post && (post._id || postId(post, 0));
    const base = basePath || "/germany/ja/community/";
    return `${base}?post=${encodeURIComponent(id)}#post-${encodeURIComponent(id)}`;
  }

  window.JCONNECT_COMMUNITY_SHARED = Object.freeze({
    fallbackPosts,
    normalizePost,
    sortPosts,
    formatDate,
    normalizeStatus,
    communityLocationConfig: COMMUNITY_LOCATION_CONFIG,
    normalizeCommunityCountry,
    communityRegionsForCountry,
    isCustomCommunityRegion,
    isExpired,
    isPubliclyVisible,
    isAllowedCommunityImageUrl,
    normalizeImageSrc,
    communityDetailHref: communityStandaloneDetailHref,
    communityStandaloneDetailHref,
    communityBoardModalHref,
    images: getCommunityPostImages,
    getCommunityPostImages,
    getCommunityThumbnail,
    firstImage(post) {
      return getCommunityThumbnail(post);
    }
  });
})(window);
