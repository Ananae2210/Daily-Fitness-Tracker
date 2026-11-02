import { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { today } from './date';
import { Icon } from './components/Icon';
import { Today } from './views/Today';
import { Progress } from './views/Progress';
import { Training } from './views/Training';
import { History } from './views/History';
import { Plan } from './views/Plan';
import { Settings } from './views/Settings';
import { Onboarding } from './views/Onboarding';
import { SharedView } from './views/SharedView';
import { Compete } from './views/Compete';
import { api } from './compete';
import { readSnapshotFromHash, type Snapshot } from './share';

type Tab = 'today' | 'progress' | 'training' | 'compete' | 'history' | 'plan' | 'settings';
const TAB_IDS: Tab[] = ['today', 'progress', 'training', 'compete', 'history', 'plan', 'settings'];
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'training', label: 'Training', icon: 'dumbbell' },
  { id: 'compete', label: 'Compete', icon: 'trophy' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'plan', label: 'Plan', icon: 'target' },
];

function useTheme() {
  const { state } = useStore();
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.theme);
  }, [state.theme]);
}

/** Push public scores to the leaderboard a few seconds after anything changes. */
function useLeaderboardSync() {
  const { state, set } = useStore();
  const latest = useRef(state);
  latest.current = state;
  const joined = !!state.compete;
  useEffect(() => {
    if (!joined) return;
    const t = window.setTimeout(() => {
      api.sync(latest.current)
        .then(() => set((s) => (s.compete ? { ...s, compete: { ...s.compete, lastSync: new Date().toISOString() } } : s)))
        .catch(() => { /* offline or not configured: try again on the next change */ });
    }, 3000);
    return () => window.clearTimeout(t);
  }, [joined, state.days, state.lifts, state.profile.name, state.goal, set]);
}

function Toast() {
  const { toast, undo, dismissToast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.undo && <button onClick={undo}>Undo</button>}
      <button className="icon-btn sm" onClick={dismissToast} aria-label="Dismiss"><Icon name="x" size={16} /></button>
    </div>
  );
}

function Shell() {
  const { state } = useStore();
  const [invite, setInvite] = useState<string | null>(() => location.hash.match(/join=([A-Za-z0-9]+)/)?.[1]?.toUpperCase() ?? null);
  const [tab, setTab] = useState<Tab>(() => {
    if (invite) return 'compete';
    const h = location.hash.slice(1) as Tab;
    return TAB_IDS.includes(h) ? h : 'today';
  });
  const [date, setDate] = useState(today());
  const [snap, setSnap] = useState<Snapshot | null>(readSnapshotFromHash);
  useTheme();
  useLeaderboardSync();

  useEffect(() => {
    if (!snap) history.replaceState(null, '', `#${tab}`);
    window.scrollTo({ top: 0 });
  }, [tab, snap]);

  if (snap) return <SharedView snap={snap} onExit={() => { history.replaceState(null, '', '#today'); setSnap(null); }} />;
  if (!state.onboarded) return <><Onboarding /><Toast /></>;

  const nav = (extra = false) => (
    <>
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <Icon name={t.icon} /><span>{t.label}</span>
        </button>
      ))}
      {extra && (
        <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>
          <Icon name="settings" /><span>Settings</span>
        </button>
      )}
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="logo" />Steady</div>
        <nav>{nav(true)}</nav>
        <p className="sidebar-foot">{state.profile.name ? `Hi, ${state.profile.name}` : 'Stored on this device'}</p>
      </aside>
      <header className="topbar">
        <div className="brand"><span className="logo" />Steady</div>
        <button className="icon-btn" aria-label="Settings" onClick={() => setTab('settings')}><Icon name="settings" /></button>
      </header>
      <main>
        {tab === 'today' && <Today date={date} setDate={setDate} />}
        {tab === 'progress' && <Progress />}
        {tab === 'training' && <Training />}
        {tab === 'compete' && <Compete inviteCode={invite} clearInvite={() => setInvite(null)} />}
        {tab === 'history' && <History openDay={(d) => { setDate(d); setTab('today'); }} />}
        {tab === 'plan' && <Plan />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="bottombar">{nav()}</nav>
      <Toast />
    </div>
  );
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>;
}
