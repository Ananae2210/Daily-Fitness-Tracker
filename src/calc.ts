import type { AppState, Day } from './types';
import { addDays, daysBetween, lastNDates, parseISODate } from './date';

export const KCAL_PER_KG = 7700;
export const CAFFEINE_HALF_LIFE_H = 5.5;
const round50 = (n: number) => Math.round(n / 50) * 50;

export const emptyDay = (date: string): Day => ({
  date, type: 'rest', meals: [], water: [], caffeine: [], sleepH: null, weightKg: null,
});

export const getDay = (s: AppState, date: string) => s.days[date] ?? emptyDay(date);

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const dayKcal = (d: Day) => sum(d.meals.map((m) => m.kcal));
export const dayProtein = (d: Day) => sum(d.meals.map((m) => m.protein));
export const dayWater = (d: Day) => sum(d.water.map((w) => w.ml));
export const dayCaffeine = (d: Day) => sum(d.caffeine.map((c) => c.mg));
export const hasAnyLog = (d?: Day) =>
  !!d && (d.meals.length > 0 || d.water.length > 0 || d.caffeine.length > 0 || d.sleepH != null || d.weightKg != null);

/** Most recent weigh-in on or before `date`, falling back to the goal's start weight. */
export const weightOn = (s: AppState, date: string) => {
  const dates = Object.keys(s.days).filter((d) => d <= date && s.days[d].weightKg != null).sort();
  const last = dates[dates.length - 1];
  return last ? (s.days[last].weightKg as number) : s.goal.startWeight;
};

export const latestWeight = (s: AppState) => {
  const dates = Object.keys(s.days).filter((d) => s.days[d].weightKg != null).sort();
  const last = dates[dates.length - 1];
  return last ? (s.days[last].weightKg as number) : s.goal.startWeight;
};

export const bmr = (s: AppState, weight: number) => {
  const { heightCm, age, sex } = s.profile;
  return 10 * weight + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
};

export const maintenance = (s: AppState, weight: number) => bmr(s, weight) * s.profile.activity;

export interface CalorieTarget {
  maintenance: number;
  base: number;
  workoutExtra: number;
  target: number;
  /** daily deficit (lose) or surplus (gain) baked into base */
  delta: number;
  /** true when the target date demanded more than is sensible and was clamped */
  clamped: boolean;
  floor: number;
}

export const calorieTarget = (s: AppState, date: string): CalorieTarget => {
  const w = weightOn(s, date);
  const maint = maintenance(s, w);
  const floor = s.profile.sex === 'female' ? 1200 : 1500;
  const day = getDay(s, date);
  const remainingKg = remainingToGoal(s, w);
  let delta: number;
  let clamped = false;

  if (s.goal.direction === 'lose') {
    delta = 500;
    if (s.goal.targetDate) {
      const days = Math.max(1, daysBetween(date, s.goal.targetDate));
      const needed = (remainingKg * KCAL_PER_KG) / days;
      delta = Math.max(250, needed);
      if (delta > 1000) { delta = 1000; clamped = true; }
    }
    let base = round50(maint - delta);
    if (base < floor) { base = floor; clamped = true; }
    const workoutExtra = day.type === 'workout' ? 200 : 0;
    return { maintenance: maint, base, workoutExtra, target: base + workoutExtra, delta: maint - base, clamped, floor };
  }

  delta = maint * 0.1;
  if (s.goal.targetDate) {
    const days = Math.max(1, daysBetween(date, s.goal.targetDate));
    const needed = (remainingKg * KCAL_PER_KG) / days;
    delta = Math.min(Math.max(maint * 0.05, needed), maint * 0.15);
    if (needed > maint * 0.15) clamped = true;
  }
  const base = round50(maint + delta);
  const workoutExtra = day.type === 'workout' ? 350 : 0;
  return { maintenance: maint, base, workoutExtra, target: base + workoutExtra, delta: base - maint, clamped, floor };
};

export const goalWeight = (s: AppState) =>
  s.goal.direction === 'lose' ? s.goal.startWeight - s.goal.amount : s.goal.startWeight + s.goal.amount;

export const remainingToGoal = (s: AppState, w: number) =>
  Math.max(0, s.goal.direction === 'lose' ? w - goalWeight(s) : goalWeight(s) - w);

export const goalProgress = (s: AppState) => {
  if (s.goal.amount <= 0) return 0;
  const w = latestWeight(s);
  const done = s.goal.direction === 'lose' ? s.goal.startWeight - w : w - s.goal.startWeight;
  return Math.max(0, Math.min(1, done / s.goal.amount));
};

export const proteinTarget = (s: AppState, date: string) =>
  s.targets.proteinG ?? Math.round(weightOn(s, date) * 1.8);

/** Did the day's calories meet the goal-specific rule? */
export const caloriesOnTarget = (s: AppState, d: Day) => {
  const kcal = dayKcal(d);
  if (d.meals.length === 0) return false;
  const { target } = calorieTarget(s, d.date);
  return s.goal.direction === 'lose' ? kcal <= target : kcal >= target && kcal <= target + 750;
};

/** 0..3 points: calories, protein, water */
export const dayScore = (s: AppState, date: string) => {
  const d = s.days[date];
  if (!d) return { points: 0, cal: false, protein: false, water: false };
  const cal = caloriesOnTarget(s, d);
  const protein = dayProtein(d) >= proteinTarget(s, date);
  const water = dayWater(d) >= s.targets.waterMl;
  return { points: +cal + +protein + +water, cal, protein, water };
};

export const consistency = (s: AppState, end: string, n = 7) =>
  sum(lastNDates(end, n).map((d) => dayScore(s, d).points)) / (n * 3);

export const streak = (s: AppState, end: string) => {
  let n = 0;
  let d = end;
  // today not logged yet does not break the streak
  if (!hasAnyLog(s.days[d])) d = addDays(d, -1);
  while (hasAnyLog(s.days[d])) { n++; d = addDays(d, -1); }
  return n;
};

/** Estimated caffeine (mg) still in the body at bedtime on `date`. */
export const caffeineAtBedtime = (s: AppState, date: string) => {
  const d = getDay(s, date);
  const [h, m] = s.targets.bedtime.split(':').map(Number);
  const bed = parseISODate(date);
  bed.setHours(h, m, 0, 0);
  if (h < 12) bed.setDate(bed.getDate() + 1); // bedtime after midnight
  return sum(d.caffeine.map((c) => {
    const hrs = (bed.getTime() - new Date(c.t).getTime()) / 3600000;
    return hrs < 0 ? c.mg : c.mg * Math.pow(0.5, hrs / CAFFEINE_HALF_LIFE_H);
  }));
};

export const bmi = (s: AppState) => {
  const h = s.profile.heightCm / 100;
  return latestWeight(s) / (h * h);
};

/** Deurenberg (1991) estimate from BMI, age and sex. */
export const bodyFat = (s: AppState) =>
  1.2 * bmi(s) + 0.23 * s.profile.age - 10.8 * (s.profile.sex === 'male' ? 1 : 0) - 5.4;

export const sleepStats = (s: AppState, end: string) => {
  const nights = lastNDates(end, 7).map((d) => s.days[d]?.sleepH).filter((x): x is number => x != null);
  if (!nights.length) return null;
  const avg = sum(nights) / nights.length;
  const debt = sum(nights.map((h) => Math.max(0, s.targets.sleepH - h)));
  const short = nights.filter((h) => h < s.targets.sleepH - 1).length;
  return { avg, debt, short, count: nights.length };
};

/** Forecast from the last 14 days that have meals logged. */
export const forecast = (s: AppState, end: string) => {
  const logged = lastNDates(end, 14).filter((d) => (s.days[d]?.meals.length ?? 0) > 0);
  if (logged.length < 3) return null;
  const avgDelta = sum(logged.map((d) => dayKcal(s.days[d]) - maintenance(s, weightOn(s, d)))) / logged.length;
  const kgPerWeek = (avgDelta * 7) / KCAL_PER_KG;
  const towardGoal = s.goal.direction === 'lose' ? -kgPerWeek : kgPerWeek;
  const remaining = remainingToGoal(s, latestWeight(s));
  const weeks = towardGoal > 0.01 ? remaining / towardGoal : null;
  return {
    avgDelta, kgPerWeek, days: logged.length,
    eta: weeks != null && remaining > 0 ? addDays(end, Math.round(weeks * 7)) : null,
    onTrack: towardGoal > 0,
  };
};

export const est1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
