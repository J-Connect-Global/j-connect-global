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

    return {
      ...row,
      id,
      slug: getValue(row, "slug", "job_slug"),
      detail_url: getValue(row, "detail_url", "detailUrl", "detail_page_url"),
      status: getValue(row, "status"),
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
      salary_label: getValue(row, "salary_label", "salary"),
      summary,
      short_description: summary,
      job_details: details,
      description: details,
      requirements: getValue(row, "requirements"),
      contact_email: getValue(row, "contact_email", "application_email", "apply_email"),
      application_email: getValue(row, "application_email", "contact_email", "apply_email"),
      apply_email: getValue(row, "apply_email", "application_email", "contact_email"),
      apply_url: getValue(row, "apply_url", "application_url", "source_url", "official_url", "url"),
      application_url: getValue(row, "application_url", "apply_url", "apply_link"),
      apply_link: getValue(row, "apply_link", "apply_url", "application_url"),
      apply_method: getValue(row, "apply_method", "application_method", "how_to_apply"),
      company_url: getValue(row, "company_url", "company_website", "company_site", "company_link"),
      source_url: getValue(row, "source_url", "official_url", "url", "website"),
      source_name: getValue(row, "source_name", "source", "publisher"),
      visa_support: getValue(row, "visa_support"),
      last_modified_at: getValue(row, "last_modified_at", "lastModifiedAt", "last_modified"),
      updated_at: getValue(row, "updated_at", "updated", "last_updated"),
      published_at: getValue(row, "published_at", "posted_at", "posted_date", "published"),
      posted_at: getValue(row, "posted_at", "posted_date"),
      created_at: getValue(row, "created_at", "created"),
      expires_at: getValue(row, "expires_at", "deadline", "application_deadline")
    };
  }

  function isActiveJob(job) {
    if (normalize(job?.status) !== "active") return false;
    const expiresAt = clean(job?.expires_at);
    if (!expiresAt) return true;
    const expires = Date.parse(expiresAt);
    return Number.isFinite(expires) && expires >= Date.now();
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
    return String(a.id || a.company_name || "").localeCompare(String(b.id || b.company_name || ""), "ja");
  }

  function getJobDetailPath(job) {
    if (job.detail_url) return job.detail_url;
    const identifier = job.id || job.slug;
    return `/germany/ja/jobs/detail/?id=${encodeURIComponent(identifier)}`;
  }

  function getSalaryLabel(job) {
    if (job.salary_label) return job.salary_label;
    if (job.salary_min_eur && job.salary_max_eur) return `年収 ${job.salary_min_eur.toLocaleString()} EUR-${job.salary_max_eur.toLocaleString()} EUR`;
    if (job.salary_min_eur) return `年収 ${job.salary_min_eur.toLocaleString()} EUR-`;
    if (job.salary_max_eur) return `-${job.salary_max_eur.toLocaleString()} EUR`;
    return "";
  }

  function activeJobs(rows) {
    return (rows || []).map(normalizeJob).filter(isActiveJob).sort(sortNewestFirst);
  }

  window.JCONNECT_JOBS_SHARED = Object.freeze({
    normalizeJob,
    isActiveJob,
    activeJobs,
    splitList,
    sortNewestFirst,
    getJobDetailPath,
    getSalaryLabel
  });
})(window);
