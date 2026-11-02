import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { calorieTarget, goalWeight, latestWeight, proteinTarget } from '../calc';
import { today } from '../date';
import { Card, Details, Field, Segmented } from '../components/ui';
import type { AppState } from '../types';

/** Number input that keeps its own text while typing and commits valid numbers. */
function NumField({ label, value, onCommit, suffix, step = 'any', min, max, placeholder, hint }: {
  label: string; value: number | null; onCommit: (v: number | null) => void; suffix?: string; step?: string;
  min?: number; max?: number; placeholder?: string; hint?: string;
}) {
  const [text, setText] = useState(value?.toString() ?? '');
  useEffect(() => { setText(value?.toString() ?? ''); }, [value]);
  return (
    <Field label={label} type="number" inputMode="decimal" step={step} min={min} max={max} suffix={suffix} placeholder={placeholder} hint={hint}
      value={text} onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === '') onCommit(null);
        else if (!Number.isNaN(Number(e.target.value))) onCommit(Number(e.target.value));
      }} />
  );
}

export function Plan() {
  const { state, set } = useStore();
  const patch = <K extends 'goal' | 'targets' | 'profile'>(k: K, v: Partial<AppState[K]>) =>
    set((s) => ({ ...s, [k]: { ...s[k], ...v } }));
  const t = today();
  const cal = calorieTarget(state, t);
  const lose = state.goal.direction === 'lose';
  const workoutExtra = lose ? 200 : 350;

  return (
    <div className="view">
      <div className="view-head"><h1>Plan</h1></div>

      <Card className="plan-summary" tour="plan-summary">
        <div className="summary-grid">
          <div><span>Maintenance</span><b>{Math.round(cal.maintenance).toLocaleString()}</b><small>kcal / day</small></div>
          <div className="hl"><span>{lose ? 'Daily cap' : 'Daily target'}</span><b>{cal.base.toLocaleString()}</b><small>rest days</small></div>
          <div className="pop"><span>Workout days</span><b>{(cal.base + workoutExtra).toLocaleString()}</b><small>+{workoutExtra} kcal</small></div>
          <div><span>Protein</span><b>{proteinTarget(state, t)} g</b><small>{state.targets.proteinG == null ? 'auto, 1.8 g/kg' : 'custom'}</small></div>
        </div>
        {cal.clamped && (
          <p className="callout warn">
            {lose ? `Your target date needs a bigger deficit than is safe, so your cap is held at ${cal.base} kcal. Expect to reach your goal a bit later.`
              : 'Your target date needs a bigger surplus than recommended, so it is capped at 15% over maintenance.'}
          </p>
        )}
      </Card>

      <div className="grid-2 align-start">
        <Card title="Goal" icon="target">
          <div className="stack">
            <Segmented label="Goal direction" value={state.goal.direction} onChange={(v) => patch('goal', { direction: v })}
              options={[{ value: 'lose', label: 'Lose weight' }, { value: 'gain', label: 'Gain weight' }]} />
            <div className="row-2">
              <NumField label="Start weight" suffix="kg" step="0.1" min={20} value={state.goal.startWeight} onCommit={(v) => v != null && patch('goal', { startWeight: v })} />
              <NumField label={lose ? 'Lose' : 'Gain'} suffix="kg" step="0.5" min={0} value={state.goal.amount} onCommit={(v) => v != null && patch('goal', { amount: v })} />
            </div>
            <Field label="Target date (optional)" type="date" min={t} value={state.goal.targetDate}
              onChange={(e) => patch('goal', { targetDate: e.target.value })}
              hint={state.goal.targetDate ? 'Your calorie target is set to reach this date.' : 'Leave blank to use a steady pace and see a forecast in Progress.'} />
            <p className="muted">Goal weight <b>{goalWeight(state).toFixed(1)} kg</b> · latest weigh-in <b>{latestWeight(state).toFixed(1)} kg</b></p>
          </div>
        </Card>

        <Card title="Daily targets" icon="check">
          <div className="stack">
            <div className="row-2">
              <NumField label="Protein" suffix="g" min={0} placeholder={`Auto (${Math.round(latestWeight(state) * 1.8)})`}
                value={state.targets.proteinG} onCommit={(v) => patch('targets', { proteinG: v })} />
              <NumField label="Water" suffix="ml" step="250" min={0} value={state.targets.waterMl} onCommit={(v) => v != null && patch('targets', { waterMl: v })} />
            </div>
            <div className="row-2">
              <NumField label="Sleep" suffix="h" step="0.5" min={0} max={14} value={state.targets.sleepH} onCommit={(v) => v != null && patch('targets', { sleepH: v })} />
              <NumField label="Caffeine limit" suffix="mg" step="50" min={0} value={state.targets.caffeineMg} onCommit={(v) => v != null && patch('targets', { caffeineMg: v })} />
            </div>
            <Field label="Bedtime" type="time" value={state.targets.bedtime} onChange={(e) => e.target.value && patch('targets', { bedtime: e.target.value })}
              hint="Used to estimate how much caffeine is still active when you sleep." />
          </div>
        </Card>

        <Card title="Profile" icon="settings">
          <div className="stack">
            <Field label="Name" value={state.profile.name} placeholder="Shown on shared progress" onChange={(e) => patch('profile', { name: e.target.value })} />
            <Segmented label="Sex" value={state.profile.sex} onChange={(v) => patch('profile', { sex: v })}
              options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
            <div className="row-2">
              <NumField label="Height" suffix="cm" min={100} max={250} value={state.profile.heightCm} onCommit={(v) => v != null && patch('profile', { heightCm: v })} />
              <NumField label="Age" min={13} max={100} value={state.profile.age} onCommit={(v) => v != null && patch('profile', { age: v })} />
            </div>
            <div className="field">
              <label>Everyday activity (outside workouts)</label>
              <select value={state.profile.activity} onChange={(e) => patch('profile', { activity: Number(e.target.value) })}>
                <option value={1.2}>Mostly sitting</option>
                <option value={1.375}>Lightly active (some walking)</option>
                <option value={1.55}>On my feet a lot</option>
                <option value={1.725}>Physical job</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="How the numbers work" icon="info">
          <Details summary="Maintenance calories">Mifflin-St Jeor resting rate × your everyday activity level. It updates from your latest weigh-in.</Details>
          <Details summary={lose ? 'Daily cap' : 'Daily target'}>
            {lose ? 'Maintenance minus about 500 kcal (or what your target date needs, up to 1,000), rounded to 50. Never below 1,500 kcal (1,200 for women).'
              : 'Maintenance plus a 10% surplus (5 to 15% if you set a target date), rounded to 50.'}
          </Details>
          <Details summary="Workout days">{lose ? 'Adds 200 kcal so training is fuelled without erasing the deficit.' : 'Adds 350 kcal, roughly what a session burns.'}</Details>
          <Details summary="Forecast">Your average daily surplus or deficit over the last 14 logged days, × 7 ÷ 7,700 kcal per kg.</Details>
          <Details summary="Caffeine at bedtime">Each dose halves every 5.5 hours. More than about 50 mg left at bedtime is linked to less deep sleep.</Details>
          <Details summary="Daily score">One point each for hitting calories, protein and water. Consistency is the last 7 days' points out of 21.</Details>
        </Card>
      </div>
    </div>
  );
}
