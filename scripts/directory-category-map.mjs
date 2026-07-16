const frozenPairs = (pairs) => Object.freeze([...pairs]);

// This is the single source of truth for the public directory category pairs.
// A source row that does not match is published under a safe parent only and
// is reported for correction in the operational spreadsheet.
export const DIRECTORY_CATEGORY_MAP = Object.freeze({
  eat: Object.freeze({
    "🌸和食": frozenPairs(["🍜ラーメン", "🍣寿司"]),
    "その他・未分類": frozenPairs([])
  }),
  shopping: Object.freeze({
    "日本・アジア系食品": frozenPairs(["日・中・韓", "その他アジア"]),
    "食品・スーパー": frozenPairs(["食品"]),
    "書籍・雑貨": frozenPairs(["書籍", "雑貨"]),
    "服": frozenPairs(["その他・未分類"]),
    "美容": frozenPairs(["その他・未分類"]),
    "薬局": frozenPairs(["その他・未分類"]),
    "その他・未分類": frozenPairs([])
  }),
  medical: Object.freeze({
    hospital: frozenPairs([]),
    clinic: frozenPairs([]),
    hausarzt: frozenPairs([]),
    pharmacy: frozenPairs([]),
    "病院": frozenPairs([]),
    "クリニック": frozenPairs([]),
    "家庭医": frozenPairs([]),
    "薬局": frozenPairs([]),
    "その他・未分類": frozenPairs([])
  })
});

const FALLBACK_PARENT = "その他・未分類";

function clean(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

export function normalizeDirectoryCategoryPair(dataset, category1, category2) {
  const map = DIRECTORY_CATEGORY_MAP[dataset];
  const parent = clean(category1);
  const child = clean(category2);

  if (!map) {
    throw new Error(`Unsupported directory dataset: ${dataset}`);
  }

  if (Object.hasOwn(map, parent)) {
    const allowedChildren = map[parent];
    if (allowedChildren.includes(child) || (!child && allowedChildren.length === 0)) {
      return { category1: parent, category2: child, requiresManualCorrection: false };
    }
    return { category1: parent, category2: "", requiresManualCorrection: true };
  }

  return { category1: FALLBACK_PARENT, category2: "", requiresManualCorrection: true };
}

export function normalizeDirectoryRating(value) {
  const rating = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(rating) && rating > 0 ? rating : null;
}
