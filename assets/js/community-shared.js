(function (window) {
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

  function postId(post, index) {
    return pick(post, ["post_id", "postId", "id", "_id", "slug"]) || `community-post-${index + 1}`;
  }

  function images(post) {
    const values = [
      pick(post, ["image_url_1", "image1", "image"]),
      pick(post, ["image_url_2", "image2"]),
      pick(post, ["image_url_3", "image3"])
    ];
    return values.filter(Boolean);
  }

  function normalizePost(post, index) {
    const id = postId(post, index);
    const city = pick(post, ["city", "location", "area"]);
    const region = pick(post, ["region", "prefecture"]);
    return {
      ...post,
      _id: id,
      _title: pick(post, ["title", "name", "subject"]) || "投稿タイトル未設定",
      _body: pick(post, ["body", "description", "message", "content"]),
      _postType: pick(post, ["category1", "post_type", "postType", "type", "category"]) || "質問",
      _subcategory: pick(post, ["category2", "subcategory", "sub_category", "detail_category"]) || "その他",
      _location: [city, region].filter(Boolean).join(" / ") || "地域未設定",
      _date: pick(post, ["created_at", "createdAt", "date", "timestamp", "updated_at"]),
      _price: pick(post, ["price", "fee", "salary", "budget"]),
      _images: images(post)
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

  function communityDetailHref(post, basePath) {
    const id = post && (post._id || postId(post, 0));
    const base = basePath || "/germany/ja/community/";
    return `${base}?post=${encodeURIComponent(id)}#post-${encodeURIComponent(id)}`;
  }

  window.JCONNECT_COMMUNITY_SHARED = Object.freeze({
    fallbackPosts,
    normalizePost,
    sortPosts,
    formatDate,
    communityDetailHref
  });
})(window);
