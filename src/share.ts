import type { AppState } from './types';
import { calorieTarget, consistency, dayKcal, est1RM, goalProgress, streak } from './calc';
import { lastNDates, today } from './date';

export interface Snapshot {
  v: 1;
  n: string;          // name
  d: 'lose' | 'gain'; // direction
  at: string;         // date generated
  c: number;          // consistency 0..1
  s: number;          // streak
  g: number;          // goal progress 0..1
  cal: [string, number, number][]; // last 14 days: date, kcal (−1 = not logged), target
  pr: [string, number][];          // exercise, est 1RM
}

export const makeSnapshot = (s: AppState): Snapshot => {
  const end = today();
  const best = new Map<string, number>();
  s.lifts.forEach((l) => best.set(l.exercise, Math.max(best.get(l.exercise) ?? 0, est1RM(l.weight, l.reps))));
  return {
    v: 1, n: s.profile.name || 'A friend', d: s.goal.direction, at: end,
    c: Math.round(consistency(s, end) * 100) / 100, s: streak(s, end), g: Math.round(goalProgress(s) * 100) / 100,
    cal: lastNDates(end, 14).map((d) => [d, s.days[d]?.meals.length ? Math.round(dayKcal(s.days[d])) : -1, calorieTarget(s, d).target]),
    pr: [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, Math.round(v * 10) / 10]),
  };
};

const b64url = (str: string) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (str: string) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));

export const snapshotUrl = (snap: Snapshot) => `${location.origin}${location.pathname}#share=${b64url(JSON.stringify(snap))}`;

export const readSnapshotFromHash = (): Snapshot | null => {
  const m = location.hash.match(/share=([\w-]+)/);
  if (!m) return null;
  try {
    const snap = JSON.parse(unb64url(m[1]));
    return snap?.v === 1 ? snap : null;
  } catch { return null; }
};
