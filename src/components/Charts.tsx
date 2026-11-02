import { useLayoutEffect, useRef, useState } from 'react';

/** Track a container's pixel width so charts draw at true size (crisp text, no stretching). */
function useWidth(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
import { fmtDay } from '../date';


export interface CalPoint { date: string; kcal: number; target: number; logged: boolean }

export function CalorieChart({ data, direction }: { data: CalPoint[]; direction: 'lose' | 'gain' }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const H = 220, padL = 36, padB = 22, padT = 10;
  const max = Math.ceil((Math.max(1000, ...data.map((d) => Math.max(d.kcal, d.target))) * 1.05) / 500) * 500;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const slot = (W - padL) / data.length;
  const bw = Math.min(32, slot * 0.62);
  const ticks = [0, max / 2, max];
  const good = (d: CalPoint) => (direction === 'lose' ? d.kcal <= d.target : d.kcal >= d.target && d.kcal <= d.target + 750);
  const h = hover != null ? data[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Calories eaten each day compared with that day's target"
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 4} className="axis" textAnchor="end">{t >= 1000 ? `${+(t / 1000).toFixed(2)}k` : t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
              {d.logged && (
                <rect x={cx - bw / 2} y={y(d.kcal)} width={bw} height={Math.max(0, y(0) - y(d.kcal))} rx={4}
                  className={good(d) ? 'bar-good' : 'bar-over'} opacity={hover == null || hover === i ? 1 : 0.55} />
              )}
              <line x1={cx - bw / 2 - 3} x2={cx + bw / 2 + 3} y1={y(d.target)} y2={y(d.target)} className="target-tick" />
              {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={cx} y={H - 6} className="axis" textAnchor="middle">
                  {fmtDay(d.date, data.length <= 7 ? { weekday: 'narrow' } : { day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-foot">
        {h ? (
          <span><strong>{fmtDay(h.date)}</strong> · {h.logged ? `${Math.round(h.kcal)} kcal` : 'not logged'} of {Math.round(h.target)} target</span>
        ) : (
          <span className="legend">
            <i className="sw good" />On target <i className="sw over" />Off target <i className="sw tick" />Target that day
          </span>
        )}
      </div>
    </div>
  );
}

export function WeightChart({ points, goal }: { points: { date: string; w: number }[]; goal: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const H = 200, padL = 40, padB = 22, padT = 12, padR = 10;
  if (points.length === 0) return null;
  const vals = [...points.map((p) => p.w), goal];
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : ((W - padL - padR) * i) / (points.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.w)}`).join(' ');
  const area = `${path} L${x(points.length - 1)},${H - padB} L${x(0)},${H - padB} Z`;
  const h = hover != null ? points[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight over time with goal line" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".25" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[lo, (lo + hi) / 2, hi].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 4} className="axis" textAnchor="end">{t.toFixed(0)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} className="goal-line" />
        <text x={W - padR} y={y(goal) - 6} className="axis goal-label" textAnchor="end">goal {goal.toFixed(1)}</text>
        <path d={area} fill="url(#wfill)" />
        <path d={path} className="line" />
        {points.map((p, i) => (
          <g key={p.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            <circle cx={x(i)} cy={y(p.w)} r={14} fill="transparent" />
            <circle cx={x(i)} cy={y(p.w)} r={hover === i ? 5 : 3.5} className="dot" />
          </g>
        ))}
        <text x={x(0)} y={H - 6} className="axis" textAnchor="start">{fmtDay(points[0].date, { day: 'numeric', month: 'short' })}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={H - 6} className="axis" textAnchor="end">
          {fmtDay(points[points.length - 1].date, { day: 'numeric', month: 'short' })}</text>}
      </svg>
      <div className="chart-foot">
        {h ? <span><strong>{fmtDay(h.date)}</strong> · {h.w.toFixed(1)} kg</span>
          : <span className="legend"><i className="sw line" />Weigh-ins <i className="sw goal" />Goal weight</span>}
      </div>
    </div>
  );
}

/** Small 7-cell strip showing daily score 0..3 */
export function ScoreStrip({ days }: { days: { date: string; points: number }[] }) {
  return (
    <div className="strip">
      {days.map((d) => (
        <div key={d.date} className="strip-cell" title={`${fmtDay(d.date)}: ${d.points}/3`}>
          <div className={`strip-dot p${d.points}`} />
          <span>{fmtDay(d.date, { weekday: 'narrow' })}</span>
        </div>
      ))}
    </div>
  );
}
