(function (window) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function getValue(row, ...keys) {
    for (const key of keys) {
      const value = row && row[key];
      if (value !== undefined && value !== null && clean(value) !== "") return clean(value);
    }
    return "";
  }

  function toNumber(value) {
    const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function toBoolean(value) {
    if (value === true || value === false) return value;
    return ["true", "1", "yes", "y"].includes(normalize(value));
  }

  function isValidFutureExpiry(value) {
    const time = Date.parse(clean(value));
    return Number.isFinite(time) && time >= Date.now();
  }

  function isValidIsoDate(value) {
    return Number.isFinite(Date.parse(clean(value)));
  }

  function splitList(value) {
    return String(value || "")
      .split(/\n|,|、|;|；|\||\/|#/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function stableSlug(...parts) {
    const slug = parts
      .map((part) => clean(part).normalize("NFKC").toLowerCase())
      .filter(Boolean)
      .join("-")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "job";
  }

  function normalizeJob(row, index) {
    const positionTitle = getValue(row, "position_title", "job_title", "title", "role", "position");
    const companyName = getValue(row, "company_name", "company", "company_ja", "company_name_ja");
    const region = getValue(row, "region", "location", "area", "city", "work_location");
    const summary = getValue(row, "short_description", "summary", "description_short");
    const details = getValue(row, "full_description", "description", "job_details");
    const tags = getValue(row, "tags", "skills", "skill_tags", "requirements_tags");
    const id = getValue(row, "job_id", "id") || stableSlug(positionTitle, companyName, region) || `job-${index + 1}`;
    const listingType = normalize(getValue(row, "listing_type")) === "sample" ? "sample" : "real";
    const isSample = listingType === "sample";

    return {
      ...row,
      id,
      slug: getValue(row, "slug", "job_slug"),
      detail_url: getValue(row, "detail_url", "detailUrl", "detail_page_url"),
      status: getValue(row, "status") || "active",
      listing_type: listingType,
      is_verified: toBoolean(row?.is_verified),
      sample_label: getValue(row, "sample_label", "test_label") || "掲載見本",
      employer_authorized_at: getValue(row, "employer_authorized_at"),
      verified_at: getValue(row, "verified_at"),
      public_apply_enabled: toBoolean(row?.public_apply_enabled),
      priority: toNumber(getValue(row, "priority")) || 999,
      company_name: companyName,
      position_title: positionTitle,
      employment_type: getValue(row, "employment_type", "employment", "type"),
      city: getValue(row, "city") || region,
      region,
      location: getValue(row, "location", "work_location", "office_location", "city") || region,
      work_style: getValue(row, "work_style", "workstyle", "remote_type", "remote", "working_style"),
      language: getValue(row, "language", "languages", "required_language", "language_requirement"),
      category: getValue(row, "category", "job_category", "occupation_category"),
      detail_category: getValue(row, "detail_category", "subcategory", "sub_category", "occupation_detail"),
      tags,
      skills: getValue(row, "skills", "skill_tags") || tags,
      salary_min_eur: toNumber(getValue(row, "salary_min_eur")),
      salary_max_eur: toNumber(getValue(row, "salary_max_eur")),
      salary_label: getValue(row, "salary_label", "salary", "salary_range"),
      summary,
      short_description: summary,
      job_details: details,
      description: details,
      requirements: getValue(row, "requirements"),
      contact_email: isSample ? "" : getValue(row, "contact_email", "application_email", "apply_email"),
      application_email: isSample ? "" : getValue(row, "application_email", "contact_email", "apply_email"),
      apply_email: isSample ? "" : getValue(row, "apply_email", "application_email", "contact_email"),
      apply_url: isSample ? "" : getValue(row, "apply_url", "application_url", "source_url", "official_url", "url"),
      application_url: isSample ? "" : getValue(row, "application_url", "apply_url", "apply_link"),
      apply_link: isSample ? "" : getValue(row, "apply_link", "apply_url", "application_url"),
      apply_method: isSample ? "" : getValue(row, "apply_method", "application_method", "how_to_apply"),
      company_url: isSample ? "" : getValue(row, "company_url", "company_website", "company_site", "company_link"),
      source_url: isSample ? "" : getValue(row, "source_url", "official_url", "url", "website"),
      source_name: isSample ? "" : getValue(row, "source_name", "source", "publisher"),
      image: isSample ? "" : getValue(row, "image", "image_url", "imageUrl", "thumbnail", "thumbnail_url", "company_logo_url"),
      image_url: isSample ? "" : getValue(row, "image_url", "imageUrl", "thumbnail", "thumbnail_url", "company_logo_url"),
      company_logo_url: isSample ? "" : getValue(row, "company_logo_url", "logo_url", "logo"),
      free_comment: getValue(row, "free_comment"),
      free_comment_en: getValue(row, "free_comment_en"),
      visa_support: getValue(row, "visa_support"),
      last_modified_at: getValue(row, "last_modified_at", "lastModifiedAt", "last_modified"),
      updated_at: getValue(row, "updated_at", "updated", "last_updated"),
      published_at: getValue(row, "published_at", "posted_at", "posted_date", "published"),
      posted_at: getValue(row, "posted_at", "posted_date"),
      created_at: getValue(row, "created_at", "created"),
      expires_at: getValue(row, "expires_at", "deadline", "application_deadline")
    };
  }

  function getSortTimestamp(item) {
    for (const value of [item.last_modified_at, item.updated_at, item.published_at, item.posted_at, item.created_at]) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) return time;
    }
    return 0;
  }

  function sortNewestFirst(a, b) {
    const dateDiff = getSortTimestamp(b) - getSortTimestamp(a);
    if (dateDiff) return dateDiff;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return String(a.company_name || "").localeCompare(String(b.company_name || ""), "ja");
  }

  function getJobDetailPath(job) {
    if (job.detail_url) return job.detail_url;
    if (job.slug) return `/germany/ja/jobs/${encodeURIComponent(job.slug)}/`;
    return `/germany/ja/jobs/detail/?id=${encodeURIComponent(job.id)}`;
  }

  function getSalaryLabel(job) {
    if (job.salary_label) return job.salary_label;
    if (job.salary_min_eur && job.salary_max_eur) {
      return `年収 ${job.salary_min_eur.toLocaleString()} EUR-${job.salary_max_eur.toLocaleString()} EUR`;
    }
    if (job.salary_min_eur) return `年収 ${job.salary_min_eur.toLocaleString()} EUR-`;
    if (job.salary_max_eur) return `-${job.salary_max_eur.toLocaleString()} EUR`;
    return "";
  }

  function activeJobs(rows) {
    return (rows || [])
      .map(normalizeJob)
      .filter(isPublicRealJob)
      .filter((job) => normalize([
        job.company_name,
        job.position_title,
        job.region,
        job.city,
        job.employment_type,
        job.work_style,
        job.language,
        job.category,
        job.detail_category,
        job.summary,
        job.job_details
      ].join(" ")).length > 0)
      .sort(sortNewestFirst);
  }

  function isSampleJob(job) {
    return normalize(job?.listing_type) === "sample";
  }

  function isPublicRealJob(job) {
    return normalize(job?.status) === "active" &&
      !isSampleJob(job) &&
      job?.is_verified === true &&
      isValidIsoDate(job?.employer_authorized_at) &&
      isValidIsoDate(job?.verified_at) &&
      isValidFutureExpiry(job?.expires_at);
  }

  function isActiveSampleJob(job) {
    return normalize(job?.status) === "active" && isSampleJob(job);
  }

  function activeSampleJobs(rows) {
    return (rows || [])
      .map(normalizeJob)
      .filter(isActiveSampleJob)
      .sort(sortNewestFirst)
      .slice(0, 3);
  }

  function isPublicApplyEnabled(job) {
    return isPublicRealJob(job) && job?.public_apply_enabled === true;
  }

  window.JCONNECT_JOBS_SHARED = Object.freeze({
    normalizeJob,
    activeJobs,
    activeSampleJobs,
    isSampleJob,
    isPublicRealJob,
    isActiveSampleJob,
    isPublicApplyEnabled,
    splitList,
    sortNewestFirst,
    getJobDetailPath,
    getSalaryLabel
  });
})(window);
