import { useId } from 'react';

/** The Steady mark: an "S" drawn as one continuous path (the days you string together)
 *  with a leading dot (today, pushing ahead). */
export const MARK_PATH = 'M17 46H38a7 7 0 0 0 0-14H26a7 7 0 0 1 0-14H39';
export const SQUIRCLE = 'M32 0c22.6 0 32 9.4 32 32s-9.4 32-32 32S0 54.6 0 32 9.4 0 32 0z';

export function LogoMark({ size = 28, animated = false, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`logo-mark ${animated ? 'animated' : ''} ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1fbf8f" />
          <stop offset="1" stopColor="#0b7a62" />
        </linearGradient>
      </defs>
      <path className="lm-bg" d={SQUIRCLE} fill={`url(#lg${id})`} />
      <path className="lm-s" d={MARK_PATH} pathLength={100} fill="none" stroke="#fff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="lm-dot" cx="48.5" cy="18" r="4.2" fill="#c8ffe6" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="brand" style={{ fontSize: size * 0.72 }}>
      <LogoMark size={size} />
      <span className="brand-name">steady</span>
    </span>
  );
}
