import { useId, type ReactNode, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

export function Card({ title, icon, action, children, className = '' }: {
  title?: ReactNode; icon?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{icon && <Icon name={icon} size={18} />}{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, suffix, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  label: string; hint?: ReactNode; suffix?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input id={id} {...props} />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/** Number input bound to a number state; empty string means null. */
export const num = (v: string) => (v.trim() === '' ? null : Number(v));

export function Bar({ value, max, tone = 'accent', label, detail }: {
  value: number; max: number; tone?: 'accent' | 'water' | 'protein' | 'caffeine' | 'sleep' | 'warn';
  label: ReactNode; detail: ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar">
      <div className="bar-row"><span className="bar-label">{label}</span><span className="bar-detail">{detail}</span></div>
      <div className="bar-track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)}>
        <div className={`bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Ring({ value, max, size = 168, children, over }: {
  value: number; max: number; size?: number; children: ReactNode; over?: boolean;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={over ? 'var(--danger)' : 'var(--accent)'} strokeWidth={stroke}
          fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ? `t-${tone}` : ''}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={28} /><p>{children}</p></div>;
}

export function Details({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="details">
      <summary><Icon name="info" size={16} />{summary}</summary>
      <div className="details-body">{children}</div>
    </details>
  );
}
