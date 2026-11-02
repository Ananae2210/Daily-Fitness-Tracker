import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Day } from './types';
import { emptyDay } from './calc';

const KEY = 'steady-tracker:v1';

export const defaultState = (): AppState => ({
  version: 1,
  onboarded: false,
  profile: { name: '', heightCm: 170, age: 28, sex: 'female', activity: 1.375 },
  goal: { direction: 'lose', startWeight: 70, amount: 5, targetDate: '' },
  targets: { proteinG: null, waterMl: 2500, sleepH: 8, caffeineMg: 400, bedtime: '23:00' },
  days: {},
  lifts: [],
  theme: 'auto',
  compete: null,
});

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base, ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      goal: { ...base.goal, ...parsed.goal },
      targets: { ...base.targets, ...parsed.targets },
    };
  } catch {
    return defaultState();
  }
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const randomId = (bytes = 12) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, bytes * 2);

interface Toast { id: number; message: string; undo?: AppState }

interface Store {
  state: AppState;
  set: (fn: (s: AppState) => AppState, toast?: string, undoable?: boolean) => void;
  updateDay: (date: string, fn: (d: Day) => Day, toast?: string, undoable?: boolean) => void;
  replace: (s: AppState) => void;
  toast: Toast | null;
  undo: () => void;
  dismissToast: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const showToast = useCallback((message: string, undo?: AppState) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, undo });
    timer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const set = useCallback<Store['set']>((fn, msg, undoable) => {
    setState((prev) => {
      const next = fn(prev);
      if (msg) queueMicrotask(() => showToast(msg, undoable ? prev : undefined));
      return next;
    });
  }, [showToast]);

  const updateDay = useCallback<Store['updateDay']>((date, fn, msg, undoable) => {
    set((s) => ({ ...s, days: { ...s.days, [date]: fn(s.days[date] ?? emptyDay(date)) } }), msg, undoable);
  }, [set]);

  const value = useMemo<Store>(() => ({
    state, set, updateDay, toast,
    replace: (s) => setState(s),
    undo: () => { if (toast?.undo) setState(toast.undo); setToast(null); },
    dismissToast: () => setToast(null),
  }), [state, set, updateDay, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};
