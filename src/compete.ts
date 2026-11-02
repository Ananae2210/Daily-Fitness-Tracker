import type { AppState } from './types';
import { consistency, dayScore, est1RM, goalProgress, streak } from './calc';
import { lastNDates, today } from './date';

export const PUBLIC_BOARD = 'PUBLIC';

export interface PublicMember {
  id: string; name: string; direction: 'lose' | 'gain'; lockIn: number; streak: number; goalPct: number;
  daysOnTarget: number; prs: [string, number][]; updatedAt: string;
}
export interface Board { code: string; name: string; createdAt: string; ownerId: string | null }

export class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function call<T>(init: RequestInit & { query?: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/leaderboard${init.query ?? ''}`, { ...init, headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new ApiError(0, 'You seem to be offline.');
  }
  const data = await res.json().catch(() => ({ error: 'Leaderboards are not available here.' }));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong.');
  return data as T;
}

/** The only data that ever leaves the device. */
export const publicStats = (s: AppState) => {
  const end = today();
  const best = new Map<string, number>();
  s.lifts.forEach((l) => best.set(l.exercise, Math.max(best.get(l.exercise) ?? 0, est1RM(l.weight, l.reps))));
  return {
    name: s.profile.name || 'Anonymous',
    direction: s.goal.direction,
    lockIn: Math.round(consistency(s, end) * 1000) / 1000,
    streak: streak(s, end),
    goalPct: Math.round(goalProgress(s) * 1000) / 1000,
    daysOnTarget: lastNDates(end, 7).filter((d) => dayScore(s, d).points === 3).length,
    prs: [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v * 10) / 10]),
  };
};

const auth = (s: AppState) => ({ id: s.compete!.memberId, token: s.compete!.token });

export const api = {
  sync: (s: AppState) => call<{ ok: true; boards: string[] }>({
    method: 'POST', body: JSON.stringify({ action: 'sync', ...auth(s), stats: publicStats(s) }),
  }),
  create: (s: AppState, name: string) => call<{ board: Board }>({ method: 'POST', body: JSON.stringify({ action: 'create', ...auth(s), name }) }),
  join: (s: AppState, code: string) => call<{ board: Board }>({ method: 'POST', body: JSON.stringify({ action: 'join', ...auth(s), code }) }),
  leave: (s: AppState, code: string) => call<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'leave', ...auth(s), code }) }),
  remove: (s: AppState) => call<{ ok: true }>({ method: 'POST', body: JSON.stringify({ action: 'delete', ...auth(s) }) }),
  board: (code: string) => call<{ board: Board; members: PublicMember[] }>({ method: 'GET', query: `?code=${encodeURIComponent(code)}` }),
};
