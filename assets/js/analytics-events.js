// ===============================
// J-Connect GA4 イベント（キーイベント候補）
// cookie-consent.js が、Cookie同意後にだけこのファイルを読み込みます。
//
// community_post_cta_click : 掲示板の「投稿する」導線のクリック
// community_post_submit    : 投稿フォームの送信ボタン（入力チェック通過後）
// community_post_complete  : 投稿完了（完了ページ到達時に1回だけ）
// job_detail_view          : 求人詳細ページの閲覧
// ===============================

(function () {
  if (window.JCONNECT_GA_EVENTS_READY) return;
  window.JCONNECT_GA_EVENTS_READY = true;

  const COMMUNITY_LAST_SUBMISSION_KEY = "jconnectCommunityLastSubmission";
  const COMMUNITY_TRACKED_SUBMISSION_KEY = "jconnectCommunityTrackedSubmission";
  const COMMUNITY_POST_PATH = "/germany/ja/community/post";
  const JOBS_PREFIX = "/germany/ja/jobs/";
  const NON_JOB_DETAIL_SLUGS = ["detail", "guide", "posting"];

  function track(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, params || {});
  }

  window.jcTrack = track;

  function trimSlash(pathname) {
    return pathname.replace(/\/+$/, "");
  }

  function getJobDetailId() {
    if (location.pathname.indexOf(JOBS_PREFIX) !== 0) return "";
    const slug = location.pathname.slice(JOBS_PREFIX.length).split("/")[0];
    if (!slug) return "";
    if (slug === "detail") {
      try {
        return new URLSearchParams(location.search).get("id") || "";
      } catch (error) {
        return "";
      }
    }
    return NON_JOB_DETAIL_SLUGS.indexOf(slug) === -1 ? slug : "";
  }

  function trackCommunityPostComplete() {
    if (location.pathname.indexOf("/germany/ja/community/complete") !== 0) return;
    try {
      const raw = sessionStorage.getItem(COMMUNITY_LAST_SUBMISSION_KEY)
        || localStorage.getItem(COMMUNITY_LAST_SUBMISSION_KEY);
      if (!raw) return;
      const snapshot = JSON.parse(raw) || {};
      const submissionKey = String(snapshot.responsePostId || snapshot.submittedAt || "");
      if (!submissionKey || sessionStorage.getItem(COMMUNITY_TRACKED_SUBMISSION_KEY) === submissionKey) return;
      sessionStorage.setItem(COMMUNITY_TRACKED_SUBMISSION_KEY, submissionKey);
      track("community_post_complete", {
        post_category: String(snapshot.category1 || ""),
        post_city: String(snapshot.city || "")
      });
    } catch (error) {}
  }

  function isCommunityPostCta(link) {
    try {
      const url = new URL(link.href, location.href);
      return url.origin === location.origin
        && trimSlash(url.pathname) === COMMUNITY_POST_PATH
        && !url.searchParams.get("id");
    } catch (error) {
      return false;
    }
  }

  const jobId = getJobDetailId();
  if (jobId) track("job_detail_view", { job_id: jobId });
  trackCommunityPostComplete();

  document.addEventListener("click", function (event) {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || !isCommunityPostCta(link)) return;
    if (trimSlash(location.pathname) === COMMUNITY_POST_PATH) return;
    track("community_post_cta_click", { link_page: location.pathname });
  }, true);
})();
