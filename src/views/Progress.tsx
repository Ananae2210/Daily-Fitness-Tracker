import { useState } from 'react';
import { useStore } from '../store';
import {
  bmi, bodyFat, calorieTarget, consistency, dayKcal, dayScore, forecast, goalProgress, goalWeight, latestWeight,
  proteinTarget, sleepStats, streak,
} from '../calc';
import { fmtDay, lastNDates, today } from '../date';
import { Card, Details, Empty, Segmented, Stat } from '../components/ui';
import { CalorieChart, ScoreStrip, WeightChart } from '../components/Charts';

export function Progress() {
  const { state } = useStore();
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const end = today();
  const dates = lastNDates(end, Number(range));
  const calData = dates.map((d) => ({
    date: d, kcal: state.days[d] ? dayKcal(state.days[d]) : 0, target: calorieTarget(state, d).target,
    logged: (state.days[d]?.meals.length ?? 0) > 0,
  }));
  const weights = dates.filter((d) => state.days[d]?.weightKg != null).map((d) => ({ date: d, w: state.days[d].weightKg as number }));
  const fc = forecast(state, end);
  const sl = sleepStats(state, end);
  const b = bmi(state);
  const bf = bodyFat(state);
  const w = latestWeight(state);
  const proteinPerKg = (() => {
    const logged = lastNDates(end, 7).filter((d) => (state.days[d]?.meals.length ?? 0) > 0);
    if (!logged.length) return null;
    const avg = logged.reduce((a, d) => a + state.days[d].meals.reduce((x, m) => x + m.protein, 0), 0) / logged.length;
    return avg / w;
  })();
  const cons = consistency(state, end);
  const gp = goalProgress(state);

  return (
    <div className="view">
      <div className="view-head">
        <h1>Progress</h1>
        <Segmented label="Range" value={range} onChange={setRange}
          options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      </div>

      <div className="stats-row">
        <Card><Stat label="Consistency (7d)" value={`${Math.round(cons * 100)}%`} tone={cons >= 0.7 ? 'good' : cons >= 0.4 ? 'warn' : 'bad'}
          sub="Calories, protein, water" /><ScoreStrip days={lastNDates(end, 7).map((d) => ({ date: d, points: dayScore(state, d).points }))} /></Card>
        <Card><Stat label="Streak" value={<>{streak(state, end)}<small> days</small></>} sub="Days with anything logged" /></Card>
        <Card>
          <Stat label="Goal progress" value={`${Math.round(gp * 100)}%`}
            sub={`${w.toFixed(1)} kg now · goal ${goalWeight(state).toFixed(1)} kg`} />
          <div className="bar-track mt"><div className="bar-fill tone-accent" style={{ width: `${gp * 100}%` }} /></div>
        </Card>
      </div>

      <Card title="Calories vs target" icon="flame">
        <CalorieChart data={calData} direction={state.goal.direction} />
        {fc ? (
          <p className={`callout ${fc.onTrack ? 'good' : 'warn'}`}>
            Over your last {fc.days} logged days you averaged <b>{Math.abs(Math.round(fc.avgDelta))} kcal {fc.avgDelta < 0 ? 'under' : 'over'}</b> maintenance,
            about <b>{Math.abs(fc.kgPerWeek).toFixed(2)} kg/week</b> {fc.kgPerWeek < 0 ? 'down' : 'up'}.
            {fc.eta ? <> At this pace you reach your goal around <b>{fmtDay(fc.eta, { day: 'numeric', month: 'long', year: 'numeric' })}</b>.</>
              : fc.onTrack ? ' You are at your goal.' : ` That is moving away from your goal to ${state.goal.direction} weight.`}
          </p>
        ) : <p className="muted">Log meals on at least 3 days to see a forecast.</p>}
      </Card>

      <div className="grid-2">
        <Card title="Weight" icon="scale">
          {weights.length ? <WeightChart points={weights} goal={goalWeight(state)} />
            : <Empty icon="scale">No weigh-ins in this range. Add one in the morning check-in.</Empty>}
        </Card>
        <Card title="Sleep" icon="moon">
          {sl ? (
            <div className="stats-grid">
              <Stat label="7-night average" value={`${sl.avg.toFixed(1)} h`} tone={sl.avg >= state.targets.sleepH ? 'good' : 'warn'} />
              <Stat label="Sleep debt" value={`${sl.debt.toFixed(1)} h`} tone={sl.debt < 2 ? 'good' : sl.debt < 5 ? 'warn' : 'bad'} sub="vs your target" />
              <Stat label="Short nights" value={sl.short} sub={`> 1 h under ${state.targets.sleepH} h`} />
            </div>
          ) : <Empty icon="moon">Log sleep in the morning check-in to see averages and sleep debt.</Empty>}
        </Card>
      </div>

      <Card title="Body" icon="target">
        <div className="stats-grid">
          <Stat label="BMI" value={b.toFixed(1)} sub={+b.toFixed(1) < 18.5 ? 'Underweight' : +b.toFixed(1) < 25 ? 'Healthy range' : +b.toFixed(1) < 30 ? 'Overweight' : 'Obese range'} />
          <Stat label="Body fat (est.)" value={`${bf.toFixed(0)}%`} sub="From BMI, age and sex" />
          <Stat label="Protein / kg" value={proteinPerKg != null ? `${proteinPerKg.toFixed(1)} g` : '–'}
            tone={proteinPerKg == null ? undefined : proteinPerKg >= 1.6 ? 'good' : 'warn'} sub={`7-day avg · target ${(proteinTarget(state, end) / w).toFixed(1)} g`} />
        </div>
        <Details summary="About these estimates">
          Body fat uses the Deurenberg formula, which works from BMI. It can't tell muscle from fat, so it tends to read high for people who lift.
          Protein of 1.6 to 2.2 g per kg body weight supports muscle while losing or gaining.
        </Details>
      </Card>
    </div>
  );
}
