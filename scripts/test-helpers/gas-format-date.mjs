// Independent Intl-backed stand-in for Apps Script's Java date formatter.
export function formatDate(date, timeZone, pattern) {
  if (pattern !== "yyyy-MM-dd'T'HH:mm:ss.SSSZ") throw new Error('Unexpected date pattern');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    fractionalSecondDigits: 3, hourCycle: 'h23', timeZoneName: 'longOffset'
  }).formatToParts(date).map(part => [part.type, part.value]));
  const offset = parts.timeZoneName.replace('GMT', '').replace(':', '') || '+0000';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}${offset}`;
}
