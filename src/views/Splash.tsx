import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';

const FEATURES = [
  { icon: 'flame', title: 'Know what’s left', body: 'A daily calorie ring and targets that adapt to your goal.' },
  { icon: 'drop', title: 'Log in seconds', body: 'Meals, water, caffeine, sleep and weight, with one-tap repeats.' },
  { icon: 'chart', title: 'See it working', body: 'Trends, forecasts and a weekly consistency score.' },
  { icon: 'trophy', title: 'Compete with friends', body: 'Private leaderboards for streaks, consistency and lifts.' },
];

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const go = () => { setLeaving(true); window.setTimeout(onDone, 380); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter') go(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`splash ${leaving ? 'leaving' : ''}`} role="dialog" aria-labelledby="splash-title">
      <div className="splash-glow" aria-hidden="true" />
      <div className="splash-inner">
        <div className="splash-mark" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="112" height="112">
            <circle cx="60" cy="60" r="50" className="sm-track" />
            <circle cx="60" cy="60" r="50" className="sm-ring" />
            <path d="M40 62l13 13 28-30" className="sm-check" />
          </svg>
        </div>
        <h1 id="splash-title" className="splash-title">Steady</h1>
        <p className="splash-tag">Small daily habits, visible progress.</p>

        <ul className="splash-features">
          {FEATURES.map((f, i) => (
            <li key={f.title} style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
              <span className="sf-icon"><Icon name={f.icon} size={20} /></span>
              <div><b>{f.title}</b><span>{f.body}</span></div>
            </li>
          ))}
        </ul>

        <button className="btn primary splash-cta" onClick={go} autoFocus>
          Get started<Icon name="right" size={18} />
        </button>
        <p className="splash-foot">Free, no account needed. Your logs stay on this device.</p>
      </div>
    </div>
  );
}
