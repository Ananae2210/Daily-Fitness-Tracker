import { useStore } from '../store';
import { calorieTarget, dayKcal, dayProtein, dayScore, dayWater, hasAnyLog } from '../calc';
import { fmtDay } from '../date';
import { Card, Empty } from '../components/ui';
import { Icon } from '../components/Icon';

export function History({ openDay }: { openDay: (d: string) => void }) {
  const { state } = useStore();
  const dates = Object.keys(state.days).filter((d) => hasAnyLog(state.days[d])).sort().reverse();

  return (
    <div className="view">
      <div className="view-head"><h1>History</h1><span className="muted">{dates.length} days logged</span></div>
      <Card>
        {dates.length === 0 ? <Empty icon="history">Days you log show up here. Tap a day to view or edit it.</Empty> : (
          <ul className="history">
            {dates.map((d) => {
              const day = state.days[d];
              const t = calorieTarget(state, d).target;
              const k = dayKcal(day);
              const sc = dayScore(state, d);
              return (
                <li key={d}>
                  <button onClick={() => openDay(d)}>
                    <div className="h-date">
                      <b>{fmtDay(d, { weekday: 'short' })}</b>
                      <span>{fmtDay(d, { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="h-metrics">
                      <span title="Calories"><Icon name="flame" size={14} />{day.meals.length ? `${Math.round(k)} / ${t}` : '–'}</span>
                      <span title="Protein"><Icon name="meal" size={14} />{Math.round(dayProtein(day))} g</span>
                      <span title="Water"><Icon name="drop" size={14} />{(dayWater(day) / 1000).toFixed(1)} L</span>
                      {day.sleepH != null && <span title="Sleep"><Icon name="moon" size={14} />{day.sleepH} h</span>}
                      {day.weightKg != null && <span title="Weight"><Icon name="scale" size={14} />{day.weightKg.toFixed(1)} kg</span>}
                      {day.type === 'workout' && <span className="tag">Workout</span>}
                    </div>
                    <span className={`h-score p${sc.points}`}>{sc.points}/3</span>
                    <Icon name="right" size={16} className="chev" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
