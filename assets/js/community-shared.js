(function (window) {
  const imageFallback = window.JCONNECT_IMAGE_FALLBACK;
  const DEFAULT_IMAGE = imageFallback?.DEFAULT_IMAGE || "/assets/img/placeholders/jconnect-default-card.webp";
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

  function splitMediaValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(splitMediaValue);
    if (typeof value === "object") return Object.values(value).flatMap(splitMediaValue);
    return String(value).split(/[\n,;]/).map((item) => item.trim()).filter(Boolean);
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
    return isAllowedCommunityImageUrl(src);
  }

  function postId(post, index) {
    return pick(post, ["post_id", "postId", "id", "_id", "slug"]) || `community-post-${index + 1}`;
  }

  function normalizeStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "active";
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
    if (status === "active") return !isExpired(post);
    if (status === "closed") return includeClosed !== false;
    return false;
  }

  function isLikelyTestPost(post) {
    const title = pick(post, ["title", "name", "subject"]);
    const body = pick(post, ["body", "description", "message", "content"]);
    const city = pick(post, ["city", "location", "area"]);
    const region = pick(post, ["region", "prefecture"]);
    const compactTitle = title.replace(/\s+/g, "").toLowerCase();
    const compactBody = body.replace(/\s+/g, "").toLowerCase();
    const compactLocation = [city, region].join("").replace(/\s+/g, "").toLowerCase();
    const joined = [title, body, city, region, pick(post, ["tags"])].join(" ").toLowerCase();

    if (/^(test|test\d+|teste|image test)$/i.test(title.trim())) return true;
    if (/^(テスト|テスト投稿\d*|再テスト投稿.*)$/i.test(title.trim())) return true;
    if (title.includes("テスト") || body.includes("テスト投稿")) return true;
    if (/^(.)\1{5,}$/.test(compactTitle) && compactTitle === compactBody) return true;
    if (/^[a-z]{1,4}$/i.test(title.trim()) && /^[a-z]{1,4}$/i.test(body.trim())) return true;
    if (joined.includes("image test")) return true;
    if (joined.includes("システムの動作を確認")) return true;
    if (joined.includes("テスト投稿です")) return true;
    if (compactBody === "test" || compactBody === "teste" || compactBody === "etse" || compactBody === "テスト") return true;
    if (compactLocation.includes("test") && (compactTitle.includes("test") || compactBody.includes("test"))) return true;
    return false;
  }

  function images(post) {
    const values = [
      pick(post, ["image", "imageUrl", "image_url", "thumbnail", "thumbnail_url", "photo", "photoUrl", "photo_url", "first_image"]),
      post?.photos,
      post?.images,
      post?.image_urls,
      post?.image_url_1,
      post?.image_url_2,
      post?.image_url_3,
      post?.image1,
      post?.image2,
      post?.image3
    ];
    return [...new Set(values.flatMap(splitMediaValue).map(normalizeImageSrc).filter(isValidImageSrc))];
  }

  function normalizePost(post, index) {
    const id = postId(post, index);
    const city = pick(post, ["city", "location", "area"]);
    const region = pick(post, ["region", "prefecture"]);
    const status = normalizeStatus(post.status);
    const postImages = images(post);
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
    isExpired,
    isPubliclyVisible,
    isAllowedCommunityImageUrl,
    normalizeImageSrc,
    communityDetailHref: communityStandaloneDetailHref,
    communityStandaloneDetailHref,
    communityBoardModalHref,
    isLikelyTestPost,
    images,
    firstImage(post) {
      return images(post)[0] || DEFAULT_IMAGE;
    }
  });
})(window);
