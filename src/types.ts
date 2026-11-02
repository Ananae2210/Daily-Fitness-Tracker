export type Sex = 'male' | 'female';
export type Direction = 'lose' | 'gain';
export type DayType = 'rest' | 'workout';
export type Theme = 'auto' | 'light' | 'dark';

export interface Profile {
  name: string;
  heightCm: number;
  age: number;
  sex: Sex;
  /** activity multiplier for everyday life, excluding workouts */
  activity: number;
}

export interface Goal {
  direction: Direction;
  startWeight: number;
  /** kg to lose or gain */
  amount: number;
  /** ISO date, optional */
  targetDate: string;
}

export interface Targets {
  /** null = auto (1.8 g per kg) */
  proteinG: number | null;
  waterMl: number;
  sleepH: number;
  caffeineMg: number;
  /** HH:MM */
  bedtime: string;
}

export interface Meal { id: string; t: string; name: string; kcal: number; protein: number }
export interface WaterEntry { id: string; t: string; ml: number }
export interface CaffeineEntry { id: string; t: string; mg: number }

export interface Day {
  date: string;
  type: DayType;
  meals: Meal[];
  water: WaterEntry[];
  caffeine: CaffeineEntry[];
  sleepH: number | null;
  weightKg: number | null;
}

export interface Lift { id: string; date: string; exercise: string; weight: number; reps: number }

export interface Compete {
  memberId: string;
  token: string;
  /** board codes this tracker belongs to */
  boards: string[];
  /** cached board names for the tab strip */
  names?: Record<string, string>;
  lastSync: string | null;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  goal: Goal;
  targets: Targets;
  days: Record<string, Day>;
  lifts: Lift[];
  theme: Theme;
  /** set once the person joins leaderboards */
  compete: Compete | null;
}
