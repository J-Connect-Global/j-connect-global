export function getHomeEventDateInfo(item, referenceDate = '') {
  const source = String(item?.event_date || '');
  const dates = [...new Set(source.match(/\b20\d{2}-\d{2}-\d{2}\b/g) || [])].sort();
  if (!dates.length) return { date: '', ongoing: false, past: false };

  const reference = /^20\d{2}-\d{2}-\d{2}$/.test(String(referenceDate)) ? String(referenceDate) : '';
  const ranges = [...source.matchAll(/(20\d{2}-\d{2}-\d{2})\s*[〜～~–—-]\s*(20\d{2}-\d{2}-\d{2})/g)]
    .map(match => ({ start: match[1], end: match[2] }))
    .filter(range => range.start <= range.end);
  const rangeDates = new Set(ranges.flatMap(range => [range.start, range.end]));
  const candidates = [];

  for (const range of ranges) {
    if (!reference || range.start >= reference) {
      candidates.push({ date: range.start, ongoing: false });
    } else if (range.end >= reference) {
      candidates.push({ date: reference, ongoing: true });
    }
  }

  for (const date of dates) {
    if (rangeDates.has(date)) continue;
    if (!reference || date >= reference) candidates.push({ date, ongoing: false });
  }

  candidates.sort((left, right) => left.date.localeCompare(right.date) || Number(right.ongoing) - Number(left.ongoing));
  if (candidates.length) return { ...candidates[0], past: false };
  return { date: dates[dates.length - 1], ongoing: false, past: true };
}

export function getHomeEventBadge(item, referenceDate = '') {
  const info = getHomeEventDateInfo(item, referenceDate);
  const match = info.date.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (match) {
    const customLabel = item?.home_badge_date === info.date ? String(item?.home_badge_label || '').trim() : '';
    return {
      top: info.ongoing ? '開催中' : customLabel || '開催日',
      main: `${Number(match[2])}/${Number(match[3])}`,
      sub: match[1]
    };
  }

  const date = String(item?.event_date || '');
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const category = String(item?.category || '');
  if (date.includes('週末')) return { top: '週末', main: 'イベント', sub: '随時' };
  if (tags.includes('冬') || category.includes('季節')) return { top: '冬の', main: 'イベント', sub: '' };
  if (date.includes('年') || date.includes('異なる') || date.includes('変動')) return { top: '開催時期', main: '変動制', sub: '' };
  return { top: '公式情報', main: '確認中', sub: '' };
}
