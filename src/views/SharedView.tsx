import type { Snapshot } from '../share';
import { CalorieChart } from '../components/Charts';
import { Card, Stat } from '../components/ui';
import { fmtDay } from '../date';

export function SharedView({ snap, onExit }: { snap: Snapshot; onExit: () => void }) {
  return (
    <div className="shared">
      <header className="shared-head">
        <div className="brand"><span className="logo" />Steady</div>
        <button className="btn" onClick={onExit}>Open my own tracker</button>
      </header>
      <div className="view">
        <div className="view-head">
          <h1>{snap.n}'s progress</h1>
          <span className="muted">Goal: {snap.d} weight · snapshot from {fmtDay(snap.at, { day: 'numeric', month: 'long' })}</span>
        </div>
        <div className="stats-row">
          <Card><Stat label="Consistency (7d)" value={`${Math.round(snap.c * 100)}%`} tone={snap.c >= 0.7 ? 'good' : 'warn'} /></Card>
          <Card><Stat label="Streak" value={<>{snap.s}<small> days</small></>} /></Card>
          <Card><Stat label="Goal progress" value={`${Math.round(snap.g * 100)}%`} />
            <div className="bar-track mt"><div className="bar-fill tone-accent" style={{ width: `${snap.g * 100}%` }} /></div></Card>
        </div>
        <Card title="Calories vs target, last 14 days" icon="flame">
          <CalorieChart direction={snap.d} data={snap.cal.map(([date, kcal, target]) => ({ date, kcal: Math.max(0, kcal), target, logged: kcal >= 0 }))} />
        </Card>
        {snap.pr.length > 0 && (
          <Card title="Best lifts" icon="trophy">
            <ul className="pr-list">
              {snap.pr.map(([name, orm]) => <li key={name}><b>{name}</b><span className="pr-badge">{orm}<small> kg 1RM</small></span></li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
