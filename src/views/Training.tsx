import { useMemo, useState } from 'react';
import { useStore, uid } from '../store';
import { est1RM } from '../calc';
import { fmtDay, today } from '../date';
import { Card, Empty, Field, num } from '../components/ui';
import { Icon } from '../components/Icon';

const COMMON = ['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Barbell row', 'Pull-up', 'Hip thrust', 'Leg press'];

export function Training() {
  const { state, set } = useStore();
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [date, setDate] = useState(today());

  const byExercise = useMemo(() => {
    const map = new Map<string, typeof state.lifts>();
    state.lifts.forEach((l) => {
      const k = l.exercise.trim();
      map.set(k, [...(map.get(k) ?? []), l]);
    });
    return [...map.entries()].map(([name, lifts]) => {
      const sorted = [...lifts].sort((a, b) => b.date.localeCompare(a.date));
      const best = lifts.reduce((a, b) => (est1RM(b.weight, b.reps) > est1RM(a.weight, a.reps) ? b : a));
      return { name, lifts: sorted, best, last: sorted[0].date };
    }).sort((a, b) => b.last.localeCompare(a.last));
  }, [state.lifts]);

  const known = [...new Set([...byExercise.map((e) => e.name), ...COMMON])];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = num(weight), r = num(reps);
    if (!exercise.trim() || w == null || r == null || r < 1) return;
    const prev = byExercise.find((x) => x.name.toLowerCase() === exercise.trim().toLowerCase());
    const isPR = !prev || est1RM(w, r) > est1RM(prev.best.weight, prev.best.reps);
    const name = prev?.name ?? exercise.trim();
    set((s) => ({ ...s, lifts: [...s.lifts, { id: uid(), date, exercise: name, weight: w, reps: Math.round(r) }] }),
      isPR ? `New PR on ${name}! Est. 1RM ${est1RM(w, r).toFixed(1)} kg` : `Logged ${name} ${w} kg × ${r}`, true);
    setWeight(''); setReps('');
  };

  return (
    <div className="view">
      <div className="view-head"><h1>Training</h1></div>
      <div className="grid-2 align-start">
        <Card title="Log a set" icon="dumbbell" tour="training">
          <form className="stack" onSubmit={submit}>
            <Field label="Exercise" list="exercises" placeholder="e.g. Squat" value={exercise} onChange={(e) => setExercise(e.target.value)} required />
            <datalist id="exercises">{known.map((k) => <option key={k} value={k} />)}</datalist>
            <div className="row-2">
              <Field label="Weight" type="number" inputMode="decimal" step="0.5" min={0} suffix="kg" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              <Field label="Reps" type="number" inputMode="numeric" min={1} max={100} value={reps} onChange={(e) => setReps(e.target.value)} required />
            </div>
            <Field label="Date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
            {num(weight) != null && num(reps) != null && (
              <p className="muted">Estimated 1-rep max: <b>{est1RM(num(weight)!, num(reps)!).toFixed(1)} kg</b></p>
            )}
            <button className="btn primary" type="submit"><Icon name="plus" size={18} />Add set</button>
          </form>
        </Card>

        <Card title="Personal records" icon="trophy">
          {byExercise.length === 0 ? <Empty icon="trophy">Your best set for each exercise shows up here.</Empty> : (
            <ul className="pr-list">
              {byExercise.map((e) => (
                <li key={e.name}>
                  <div><b>{e.name}</b><span className="muted">{e.best.weight} kg × {e.best.reps} · {fmtDay(e.best.date, { day: 'numeric', month: 'short' })}</span></div>
                  <span className="pr-badge">{est1RM(e.best.weight, e.best.reps).toFixed(1)}<small> kg 1RM</small></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {byExercise.length > 0 && (
        <Card title="All sets" icon="history">
          <ul className="log">
            {[...state.lifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map((l) => {
              const ex = byExercise.find((x) => x.name === l.exercise);
              return (
                <li key={l.id}>
                  <span className="log-icon k-lift"><Icon name="dumbbell" size={16} /></span>
                  <div className="log-main"><b>{l.exercise} {ex?.best.id === l.id && <span className="tag">PR</span>}</b>
                    <span>{l.weight} kg × {l.reps} · est. {est1RM(l.weight, l.reps).toFixed(1)} kg</span></div>
                  <time>{fmtDay(l.date, { day: 'numeric', month: 'short' })}</time>
                  <button className="icon-btn sm" aria-label="Delete set" onClick={() =>
                    set((s) => ({ ...s, lifts: s.lifts.filter((x) => x.id !== l.id) }), 'Set removed', true)}>
                    <Icon name="trash" size={16} /></button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
