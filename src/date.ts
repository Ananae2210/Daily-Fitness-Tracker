const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISODate(new Date());
export const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
export const lastNDates = (end: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));

export const fmtDay = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  parseISODate(s).toLocaleDateString(undefined, opts);

export const relativeDayLabel = (s: string) => {
  const diff = daysBetween(today(), s);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return fmtDay(s, { weekday: 'long', day: 'numeric', month: 'short' });
};

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Timestamp for an entry logged on `date`: now if it is today, otherwise noon that day. */
export const stampFor = (date: string) => {
  if (date === today()) return new Date().toISOString();
  const d = parseISODate(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};
