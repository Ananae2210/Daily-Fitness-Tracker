import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export type TourTab = 'today' | 'progress' | 'training' | 'compete' | 'history' | 'plan' | 'settings';

interface Step {
  /** data-tour value to spotlight; none = centered card */
  target?: string;
  tab?: TourTab;
  icon: string;
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  { icon: 'today', title: 'Welcome to Steady', body: 'Here’s a quick tour of how everything fits together. It takes about a minute, and you can skip any time.' },
  { tab: 'today', target: 'hero', icon: 'flame', title: 'Your day at a glance',
    body: 'The ring shows calories left for today. The bars track protein, water and caffeine against your targets. The dots score your day out of 3.' },
  { tab: 'today', target: 'daytype', icon: 'dumbbell', title: 'Rest or workout day',
    body: 'Switch to Workout day when you train. Your calorie target goes up a little so the session is fuelled.' },
  { tab: 'today', target: 'logger', icon: 'meal', title: 'Log in seconds',
    body: 'Use these tabs to add meals, water, caffeine and your morning check-in (sleep and weight). Meals you’ve eaten before appear as one-tap shortcuts.' },
  { tab: 'today', target: 'daylog', icon: 'history', title: 'Everything you logged',
    body: 'Each entry lands here with its time. Tap the bin to remove one, or hit Undo on the message that pops up.' },
  { tab: 'today', target: 'datenav', icon: 'left', title: 'Fix another day',
    body: 'Forgot to log yesterday? Use the arrows to move between days and fill it in.' },
  { tab: 'progress', target: 'progress-stats', icon: 'chart', title: 'Progress',
    body: 'Consistency is how many calorie, protein and water targets you hit in the last 7 days. Your streak counts days with anything logged.' },
  { tab: 'progress', target: 'calchart', icon: 'flame', title: 'Calories vs target',
    body: 'Green bars are days on target, red are off. After 3 logged days you’ll see a forecast of when you reach your goal.' },
  { tab: 'training', target: 'training', icon: 'dumbbell', title: 'Training',
    body: 'Log sets with weight and reps. Steady estimates your 1-rep max and celebrates new personal records.' },
  { tab: 'compete', target: 'compete', icon: 'trophy', title: 'Compete',
    body: 'Join leaderboards with friends using an invite link, or the public board. Only your name, scores and best lifts are shared.' },
  { tab: 'history', target: 'history', icon: 'history', title: 'History',
    body: 'Every logged day with its score. Tap a day to open and edit it.' },
  { tab: 'plan', target: 'plan-summary', icon: 'target', title: 'Your plan',
    body: 'Your maintenance calories, daily target and protein come from your profile and goal. Change your goal, target date or targets on this page.' },
  { tab: 'settings', target: 'settings-data', icon: 'settings', title: 'Your data',
    body: 'Everything is saved in this browser. Back it up here to move devices. You can also switch themes, share progress and replay this tour in Settings.' },
  { tab: 'today', icon: 'check', title: 'You’re all set',
    body: 'Start by logging your first meal or a glass of water. Small, steady days add up.' },
];

const PAD = 8;
const visibleEl = (name: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((el) => el.getClientRects().length > 0) ?? null;

export function Tour({ setTab, onClose }: { setTab: (t: TourTab) => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; placement: 'above' | 'below' | 'center' }>({ top: 0, left: 0, placement: 'center' });
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const measure = useCallback(() => {
    const el = step.target ? visibleEl(step.target) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);

  // switch tab, then scroll the target into view and measure it
  useEffect(() => {
    if (step.tab) setTab(step.tab);
    setRect(null);
    let tries = 0;
    let timer = 0;
    const find = () => {
      const el = step.target ? visibleEl(step.target) : null;
      if (step.target && !el && tries++ < 20) { timer = window.setTimeout(find, 50); return; }
      if (el) {
        const r = el.getBoundingClientRect();
        const mobile = window.innerWidth <= 760;
        const fits = r.top >= 70 && r.bottom <= window.innerHeight - (mobile ? 330 : 220);
        // phones: pin the target near the top so the card can sit underneath it
        if (!fits) el.scrollIntoView({ block: mobile || r.height > window.innerHeight * 0.5 ? 'start' : 'center', behavior: 'instant' as ScrollBehavior });
        timer = window.setTimeout(measure, 60);
      } else measure();
    };
    timer = window.setTimeout(find, 30);
    return () => window.clearTimeout(timer);
  }, [i, step.tab, step.target, setTab, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [measure]);

  // place the card next to the spotlight, flipping above/below to fit
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth, ch = card.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    if (!rect) { setCardPos({ top: (vh - ch) / 2, left: (vw - cw) / 2, placement: 'center' }); return; }
    const gap = 14, margin = 12;
    const bottomBar = vw <= 760 ? 76 : 0;
    const spaceBelow = vh - bottomBar - rect.bottom - PAD;
    const spaceAbove = rect.top - PAD;
    let placement: 'above' | 'below' = spaceBelow >= ch + gap + margin || spaceBelow >= spaceAbove ? 'below' : 'above';
    let top = placement === 'below' ? rect.bottom + PAD + gap : rect.top - PAD - gap - ch;
    // tall targets: overlay the card inside the viewport instead
    if (top < margin || top + ch > vh - bottomBar - margin) { top = Math.max(margin, vh - bottomBar - ch - margin); placement = 'below'; }
    const left = Math.min(Math.max(margin, rect.left + rect.width / 2 - cw / 2), vw - cw - margin);
    setCardPos({ top, left, placement });
  }, [rect, i]);

  const next = useCallback(() => (last ? onClose() : setI((n) => n + 1)), [last, onClose]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [next, back, onClose]);

  useEffect(() => { cardRef.current?.querySelector<HTMLButtonElement>('.tour-next')?.focus(); }, [i]);

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div className="tour-spot" style={{
          top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2,
          // never let the highlight run underneath the card
          height: cardPos.placement === 'below' && cardPos.top < rect.bottom + PAD + 10
            ? Math.max(40, cardPos.top - 10 - (rect.top - PAD)) : rect.height + PAD * 2,
        }} />
      ) : <div className="tour-dim" />}
      <div className="tour-block" onClick={(e) => e.stopPropagation()} />
      <div ref={cardRef} className={`tour-card ${cardPos.placement}`} style={{ top: cardPos.top, left: cardPos.left }} key={i}>
        <div className="tour-card-head">
          <span className="tour-icon"><Icon name={step.icon} size={18} /></span>
          <span className="tour-count">{i === 0 ? 'Quick tour' : `${i} of ${STEPS.length - 1}`}</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Close tour"><Icon name="x" size={16} /></button>
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-progress" aria-hidden="true">
          <i style={{ width: `${(i / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <div className="tour-actions">
          {i === 0 ? <button className="btn ghost" onClick={onClose}>Skip tour</button>
            : <button className="btn ghost" onClick={back}><Icon name="left" size={16} />Back</button>}
          <button className="btn primary tour-next" onClick={next}>
            {i === 0 ? 'Show me around' : last ? 'Start tracking' : 'Next'}{!last && <Icon name="right" size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
