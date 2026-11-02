import { useMemo, useState, type FormEvent } from 'react';
import { useStore, uid } from '../store';
import {
  caffeineAtBedtime, calorieTarget, dayCaffeine, dayKcal, dayProtein, dayScore, dayWater, getDay, proteinTarget,
} from '../calc';
import { addDays, fmtTime, relativeDayLabel, stampFor, today } from '../date';
import { Bar, Card, Field, Ring, Segmented, num } from '../components/ui';
import { Icon } from '../components/Icon';

type Panel = 'meal' | 'water' | 'caffeine' | 'checkin';

export function Today({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { state, updateDay } = useStore();
  const day = getDay(state, date);
  const cal = calorieTarget(state, date);
  const kcal = dayKcal(day);
  const protein = dayProtein(day);
  const water = dayWater(day);
  const caf = dayCaffeine(day);
  const pTarget = proteinTarget(state, date);
  const left = cal.target - kcal;
  const bedCaf = caffeineAtBedtime(state, date);
  const score = dayScore(state, date);
  const isToday = date === today();
  const [panel, setPanel] = useState<Panel>('meal');

  const over = state.goal.direction === 'lose' ? left < 0 : kcal > cal.target + 750;

  return (
    <div className="view">
      <div className="date-nav" data-tour="datenav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
        <div className="date-title">
          <h1>{relativeDayLabel(date)}</h1>
          {!isToday && <button className="link" onClick={() => setDate(today())}>Jump to today</button>}
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day" disabled={isToday}><Icon name="right" /></button>
      </div>

      <div className="grid-2">
        <Card className="hero" tour="hero">
          <div className="hero-top">
            <div data-tour="daytype" className="daytype"><Segmented label="Day type" value={day.type} onChange={(t) => updateDay(date, (d) => ({ ...d, type: t }))}
              options={[{ value: 'rest', label: 'Rest day' }, { value: 'workout', label: 'Workout day' }]} /></div>
            <span className="score-pill" title="Calories, protein and water targets hit today">
              {[score.cal, score.protein, score.water].map((ok, i) => <i key={i} className={ok ? 'on' : ''} />)}
              {score.points}/3
            </span>
          </div>
          <div className="hero-body">
            <Ring value={kcal} max={cal.target} over={over}>
              <span className="ring-big">{Math.abs(Math.round(left)).toLocaleString()}</span>
              <span className="ring-small">{left >= 0 ? (state.goal.direction === 'lose' ? 'kcal left' : 'kcal to go') : 'kcal over'}</span>
            </Ring>
            <div className="hero-bars">
              <Bar label="Calories" tone={over ? 'warn' : 'accent'} value={kcal} max={cal.target}
                detail={<><b>{Math.round(kcal)}</b> / {cal.target}{cal.workoutExtra ? <em> incl. +{cal.workoutExtra}</em> : null}</>} />
              <Bar label="Protein" tone="protein" value={protein} max={pTarget} detail={<><b>{Math.round(protein)}</b> / {pTarget} g</>} />
              <Bar label="Water" tone="water" value={water} max={state.targets.waterMl}
                detail={<><b>{(water / 1000).toFixed(2)}</b> / {(state.targets.waterMl / 1000).toFixed(1)} L</>} />
              <Bar label="Caffeine" tone={caf > state.targets.caffeineMg ? 'warn' : 'caffeine'} value={caf} max={state.targets.caffeineMg}
                detail={<><b>{caf}</b> / {state.targets.caffeineMg} mg</>} />
            </div>
          </div>
          {(caf > 0 || day.sleepH != null) && (
            <div className="insights">
              {caf > 0 && (
                <p className={bedCaf > 50 ? 't-warn' : 't-good'}>
                  <Icon name="coffee" size={16} />
                  About <b>{Math.round(bedCaf)} mg</b> caffeine left at bedtime ({state.targets.bedtime}).
                  {bedCaf > 50 ? ' That can cut into deep sleep.' : ' Sleep should be fine.'}
                </p>
              )}
              {day.sleepH != null && (
                <p className={day.sleepH >= state.targets.sleepH ? 't-good' : 't-warn'}>
                  <Icon name="moon" size={16} />Slept <b>{day.sleepH} h</b> last night (target {state.targets.sleepH} h).
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="logger" tour="logger">
          <div className="tabs" role="tablist">
            {([['meal', 'meal', 'Meal'], ['water', 'drop', 'Water'], ['caffeine', 'coffee', 'Caffeine'], ['checkin', 'moon', 'Check-in']] as const)
              .map(([k, icon, label]) => (
                <button key={k} role="tab" aria-selected={panel === k} className={panel === k ? 'on' : ''} onClick={() => setPanel(k)}>
                  <Icon name={icon} size={18} /><span>{label}</span>
                </button>
              ))}
          </div>
          <div className="tab-body">
            {panel === 'meal' && <MealForm date={date} />}
            {panel === 'water' && <WaterForm date={date} />}
            {panel === 'caffeine' && <CaffeineForm date={date} />}
            {panel === 'checkin' && <CheckIn date={date} />}
          </div>
        </Card>
      </div>

      <DayLog date={date} />
    </div>
  );
}

function MealForm({ date }: { date: string }) {
  const { state, updateDay } = useStore();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');

  const recents = useMemo(() => {
    const seen = new Map<string, { name: string; kcal: number; protein: number }>();
    Object.keys(state.days).sort().reverse().forEach((d) =>
      [...state.days[d].meals].reverse().forEach((m) => {
        const key = m.name.trim().toLowerCase();
        if (key && !seen.has(key)) seen.set(key, { name: m.name, kcal: m.kcal, protein: m.protein });
      }));
    return [...seen.values()].slice(0, 6);
  }, [state.days]);

  const add = (m: { name: string; kcal: number; protein: number }) =>
    updateDay(date, (d) => ({ ...d, meals: [...d.meals, { id: uid(), t: stampFor(date), ...m }] }),
      `Added ${m.name || 'meal'} · ${m.kcal} kcal`, true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const k = num(kcal);
    if (k == null || k < 0) return;
    add({ name: name.trim() || 'Meal', kcal: Math.round(k), protein: Math.round(num(protein) ?? 0) });
    setName(''); setKcal(''); setProtein('');
  };

  return (
    <form onSubmit={submit} className="stack">
      <Field label="What did you eat?" placeholder="e.g. Chicken rice bowl" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="row-2">
        <Field label="Calories" type="number" inputMode="numeric" min={0} required suffix="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
        <Field label="Protein" type="number" inputMode="numeric" min={0} suffix="g" value={protein} onChange={(e) => setProtein(e.target.value)} />
      </div>
      <button className="btn primary" type="submit"><Icon name="plus" size={18} />Add meal</button>
      {recents.length > 0 && (
        <div>
          <p className="mini-label">Log again</p>
          <div className="chips">
            {recents.map((r) => (
              <button type="button" key={r.name} className="chip" onClick={() => add(r)}>
                {r.name}<small>{r.kcal}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function WaterForm({ date }: { date: string }) {
  const { updateDay } = useStore();
  const add = (ml: number) => updateDay(date, (d) => ({ ...d, water: [...d.water, { id: uid(), t: stampFor(date), ml }] }),
    `+${ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`} water`, true);
  return (
    <div className="stack">
      <p className="muted">Tap what you just drank.</p>
      <div className="quick-grid">
        {[250, 500, 750, 1000].map((ml) => (
          <button key={ml} className="quick" onClick={() => add(ml)}>
            <Icon name="drop" size={22} /><b>{ml >= 1000 ? '1 L' : `${ml} ml`}</b>
            <small>{ml === 250 ? 'Glass' : ml === 500 ? 'Bottle' : ml === 750 ? 'Large bottle' : 'Jug'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function CaffeineForm({ date }: { date: string }) {
  const { updateDay } = useStore();
  const [other, setOther] = useState('');
  const add = (mg: number) => updateDay(date, (d) => ({ ...d, caffeine: [...d.caffeine, { id: uid(), t: stampFor(date), mg }] }),
    `+${mg} mg caffeine`, true);
  return (
    <div className="stack">
      <div className="quick-grid">
        {[[80, 'Espresso / tea'], [100, 'Coffee'], [200, 'Large coffee'], [300, 'Pre-workout']].map(([mg, l]) => (
          <button key={mg} className="quick" onClick={() => add(mg as number)}>
            <Icon name="coffee" size={22} /><b>{mg} mg</b><small>{l}</small>
          </button>
        ))}
      </div>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); const v = num(other); if (v && v > 0) { add(Math.round(v)); setOther(''); } }}>
        <Field label="Other amount" type="number" inputMode="numeric" min={1} suffix="mg" value={other} onChange={(e) => setOther(e.target.value)} />
        <button className="btn" type="submit">Add</button>
      </form>
    </div>
  );
}

function CheckIn({ date }: { date: string }) {
  const { state, updateDay } = useStore();
  const day = getDay(state, date);
  const [sleep, setSleep] = useState(day.sleepH?.toString() ?? '');
  const [weight, setWeight] = useState(day.weightKg?.toString() ?? '');
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      updateDay(date, (d) => ({ ...d, sleepH: num(sleep), weightKg: num(weight) == null ? null : Math.round(num(weight)! * 10) / 10 }), 'Check-in saved', true);
    }}>
      <p className="muted">Best done right after waking. Last night's sleep counts toward this day.</p>
      <div className="row-2">
        <Field label="Sleep" type="number" inputMode="decimal" step="0.25" min={0} max={24} suffix="h" value={sleep} onChange={(e) => setSleep(e.target.value)} />
        <Field label="Weight" type="number" inputMode="decimal" step="0.1" min={20} max={400} suffix="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <button className="btn primary" type="submit"><Icon name="check" size={18} />Save check-in</button>
    </form>
  );
}

function DayLog({ date }: { date: string }) {
  const { state, updateDay } = useStore();
  const day = getDay(state, date);
  type Row = { id: string; t: string; kind: 'meals' | 'water' | 'caffeine'; icon: string; title: string; detail: string };
  const rows: Row[] = [
    ...day.meals.map((m) => ({ id: m.id, t: m.t, kind: 'meals' as const, icon: 'meal', title: m.name, detail: `${m.kcal} kcal · ${m.protein} g protein` })),
    ...day.water.map((w) => ({ id: w.id, t: w.t, kind: 'water' as const, icon: 'drop', title: 'Water', detail: `${w.ml} ml` })),
    ...day.caffeine.map((c) => ({ id: c.id, t: c.t, kind: 'caffeine' as const, icon: 'coffee', title: 'Caffeine', detail: `${c.mg} mg` })),
  ].sort((a, b) => a.t.localeCompare(b.t));

  const remove = (r: Row) => updateDay(date, (d) => ({
    ...d, [r.kind]: (d[r.kind] as { id: string }[]).filter((x) => x.id !== r.id),
  }), `Removed ${r.title.toLowerCase()}`, true);

  return (
    <Card tour="daylog" title="Day log" icon="history" action={<span className="muted">{rows.length} entries</span>}>
      {rows.length === 0 ? (
        <p className="muted pad">Nothing logged yet. Start with a meal or a glass of water above.</p>
      ) : (
        <ul className="log">
          {rows.map((r) => (
            <li key={r.id}>
              <span className={`log-icon k-${r.kind}`}><Icon name={r.icon} size={16} /></span>
              <div className="log-main"><b>{r.title}</b><span>{r.detail}</span></div>
              <time>{fmtTime(r.t)}</time>
              <button className="icon-btn sm" aria-label={`Delete ${r.title}`} onClick={() => remove(r)}><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
