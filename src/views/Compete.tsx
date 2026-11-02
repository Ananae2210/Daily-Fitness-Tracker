import { useCallback, useEffect, useMemo, useState } from 'react';
import { randomId, useStore } from '../store';
import { api, ApiError, PUBLIC_BOARD, publicStats, type Board, type PublicMember } from '../compete';
import { Card, Empty, Field, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';

type Metric = 'lockIn' | 'streak' | 'goalPct' | 'lifts';

const inviteLink = (code: string) => `${location.origin}${location.pathname}#join=${code}`;
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export function Compete({ inviteCode, clearInvite }: { inviteCode: string | null; clearInvite: () => void }) {
  const { state } = useStore();
  const c = state.compete;
  return c
    ? <Boards inviteCode={inviteCode} clearInvite={clearInvite} />
    : <JoinIntro inviteCode={inviteCode} />;
}

function JoinIntro({ inviteCode }: { inviteCode: string | null }) {
  const { state, set } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [publicBoard, setPublicBoard] = useState(!inviteCode);
  const [code, setCode] = useState(inviteCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stats = publicStats({ ...state, profile: { ...state.profile, name } });

  const join = async () => {
    setBusy(true); setError('');
    const compete = { memberId: randomId(12), token: randomId(24), boards: [], lastSync: null };
    const next = { ...state, profile: { ...state.profile, name: name.trim() }, compete };
    try {
      await api.sync(next);
      const boards: string[] = [];
      const names: Record<string, string> = {};
      if (code.trim()) { const r = await api.join(next, code.trim()); boards.push(r.board.code); names[r.board.code] = r.board.name; }
      if (publicBoard) { await api.join(next, PUBLIC_BOARD); boards.push(PUBLIC_BOARD); }
      set((s) => ({ ...s, profile: next.profile, compete: { ...compete, boards, names, lastSync: new Date().toISOString() } }), 'You are on the leaderboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return (
    <div className="view">
      <div className="view-head"><h1>Compete</h1></div>
      <div className="grid-2 align-start">
        <Card title="Join the leaderboards" icon="trophy" tour="compete">
          <form className="stack" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <p className="muted">Rank against friends on consistency, streaks, goal progress and lifts. Make a private board for your group, or join the public one.</p>
            <Field label="Display name" required maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="How others see you" />
            <Field label="Board code (optional)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7P2QX"
              hint={inviteCode ? 'Filled in from your invite link.' : 'Got a code from a friend? Paste it here.'} />
            <label className="check">
              <input type="checkbox" checked={publicBoard} onChange={(e) => setPublicBoard(e.target.checked)} />
              <span>Also show me on the public board</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy || !name.trim()}>
              <Icon name="trophy" size={18} />{busy ? 'Joining…' : 'Join leaderboards'}
            </button>
          </form>
        </Card>
        <Card title="What others will see" icon="info">
          <ul className="privacy">
            <li className="yes"><Icon name="check" size={16} /><span>Name: <b>{stats.name}</b>, goal to {stats.direction} weight</span></li>
            <li className="yes"><Icon name="check" size={16} /><span>Lock-in <b>{Math.round(stats.lockIn * 100)}%</b>, streak <b>{stats.streak}</b>, goal <b>{Math.round(stats.goalPct * 100)}%</b></span></li>
            <li className="yes"><Icon name="check" size={16} /><span>Days on target this week and your best lifts</span></li>
            <li className="no"><Icon name="x" size={16} /><span>Never shared: meals, calories, weight, sleep, caffeine</span></li>
          </ul>
          <p className="hint mt">You can leave any board or remove yourself completely at any time.</p>
        </Card>
      </div>
    </div>
  );
}

function Boards({ inviteCode, clearInvite }: { inviteCode: string | null; clearInvite: () => void }) {
  const { state, set } = useStore();
  const c = state.compete!;
  const [active, setActive] = useState<string>(inviteCode && c.boards.includes(inviteCode) ? inviteCode : c.boards[0] ?? '');
  const [data, setData] = useState<{ board: Board; members: PublicMember[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState<Metric>('lockIn');
  const [exercise, setExercise] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'join'>(inviteCode && !c.boards.includes(inviteCode) ? 'join' : 'none');
  const [formVal, setFormVal] = useState(inviteCode && !c.boards.includes(inviteCode) ? inviteCode : '');
  const [formErr, setFormErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async (code: string) => {
    if (!code) { setData(null); return; }
    setLoading(true); setError('');
    try {
      await api.sync(state).catch(() => {});
      const d = await api.board(code);
      setData(d);
      set((s) => (s.compete && s.compete.names?.[code] !== d.board.name
        ? { ...s, compete: { ...s.compete, names: { ...s.compete.names, [code]: d.board.name } } } : s));
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not load the board.'); setData(null); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(active); }, [active, load]);

  const setBoards = (boards: string[]) => set((s) => ({ ...s, compete: { ...s.compete!, boards } }));

  const submitForm = async () => {
    setFormErr('');
    try {
      const { board } = mode === 'create' ? await api.create(state, formVal) : await api.join(state, formVal);
      set((s) => ({ ...s, compete: { ...s.compete!, boards: s.compete!.boards.includes(board.code) ? s.compete!.boards : [...s.compete!.boards, board.code],
        names: { ...s.compete!.names, [board.code]: board.name } } }));
      setActive(board.code); setMode('none'); setFormVal(''); clearInvite();
    } catch (e) { setFormErr(e instanceof ApiError ? e.message : 'Something went wrong.'); }
  };

  const leave = async () => {
    try {
      await api.leave(state, active);
      const rest = c.boards.filter((b) => b !== active);
      setBoards(rest); setActive(rest[0] ?? '');
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not leave.'); }
  };

  const removeMe = async () => {
    try { await api.remove(state); } catch (e) { if (!(e instanceof ApiError && e.status === 404)) { setError('Could not remove you. Try again.'); return; } }
    set((s) => ({ ...s, compete: null }), 'Removed you from all leaderboards');
  };

  const exercises = useMemo(() => {
    const counts = new Map<string, number>();
    data?.members.forEach((m) => m.prs.forEach(([n]) => counts.set(n, (counts.get(n) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [data]);
  const ex = exercise && exercises.includes(exercise) ? exercise : exercises[0] ?? '';

  const ranked = useMemo(() => {
    if (!data) return [];
    const val = (m: PublicMember) => metric === 'lifts' ? (m.prs.find(([n]) => n === ex)?.[1] ?? -1) : m[metric];
    return data.members.filter((m) => val(m) >= 0)
      .map((m) => ({ m, v: val(m) }))
      .sort((a, b) => b.v - a.v || b.m.daysOnTarget - a.m.daysOnTarget);
  }, [data, metric, ex]);
  const top = Math.max(1, ...ranked.map((r) => r.v));
  const fmt = (v: number) => metric === 'streak' ? `${v} d` : metric === 'lifts' ? `${v} kg` : `${Math.round(v * 100)}%`;
  const label = (code: string) => (code === PUBLIC_BOARD ? 'Everyone' : c.names?.[code] ?? code);

  return (
    <div className="view">
      <div className="view-head">
        <h1>Compete</h1>
        <div className="btn-row">
          <button className="btn" onClick={() => { setMode(mode === 'join' ? 'none' : 'join'); setFormErr(''); }}>Join with code</button>
          <button className="btn primary" onClick={() => { setMode(mode === 'create' ? 'none' : 'create'); setFormErr(''); }}><Icon name="plus" size={18} />New board</button>
        </div>
      </div>

      {mode !== 'none' && (
        <Card>
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
            {mode === 'create'
              ? <Field label="Board name" autoFocus maxLength={32} placeholder="e.g. Gym crew" value={formVal} onChange={(e) => setFormVal(e.target.value)} />
              : <Field label="Board code" autoFocus placeholder="e.g. K7P2QX" value={formVal} onChange={(e) => setFormVal(e.target.value.toUpperCase())} />}
            <button className="btn primary" type="submit" disabled={mode === 'join' && !formVal.trim()}>{mode === 'create' ? 'Create' : 'Join'}</button>
            <button className="btn" type="button" onClick={() => { setMode('none'); clearInvite(); }}>Cancel</button>
          </form>
          {formErr && <p className="form-error mt">{formErr}</p>}
        </Card>
      )}

      {c.boards.length === 0 ? (
        <Card><Empty icon="trophy">You're not on any board. Create one for your friends, join with a code, or join the public board.
          <br /><button className="btn mt" onClick={async () => { try { await api.join(state, PUBLIC_BOARD); setBoards([PUBLIC_BOARD]); setActive(PUBLIC_BOARD); } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not join.'); } }}>Join the public board</button>
        </Empty>{error && <p className="form-error">{error}</p>}</Card>
      ) : (
        <>
          <div className="board-tabs" role="tablist" data-tour="compete">
            {c.boards.map((b) => (
              <button key={b} role="tab" aria-selected={b === active} className={b === active ? 'on' : ''} onClick={() => setActive(b)}>
                {b === PUBLIC_BOARD ? <><Icon name="today" size={14} />Everyone</> : label(b)}
              </button>
            ))}
          </div>

          <Card>
            <div className="board-head">
              <div>
                <h2>{data ? data.board.name : label(active)}</h2>
                <p className="muted small">{data ? `${data.members.length} ${data.members.length === 1 ? 'member' : 'members'}` : ' '}
                  {active !== PUBLIC_BOARD && <> · code <b className="code">{active}</b></>}</p>
              </div>
              {active !== PUBLIC_BOARD && (
                <button className="btn" onClick={async () => { await navigator.clipboard.writeText(inviteLink(active)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  <Icon name={copied ? 'check' : 'share'} size={16} />{copied ? 'Link copied' : 'Invite friends'}
                </button>
              )}
            </div>

            <div className="metric-row">
              <Segmented label="Rank by" value={metric} onChange={setMetric} options={[
                { value: 'lockIn', label: 'Lock-in' }, { value: 'streak', label: 'Streak' },
                { value: 'goalPct', label: 'Goal %' }, { value: 'lifts', label: 'Lifts' }]} />
              {metric === 'lifts' && exercises.length > 0 && (
                <select className="ex-select" value={ex} onChange={(e) => setExercise(e.target.value)} aria-label="Exercise">
                  {exercises.map((n) => <option key={n}>{n}</option>)}
                </select>
              )}
            </div>

            {error ? <p className="form-error">{error} <button className="link" onClick={() => load(active)}>Retry</button></p>
              : loading && !data ? <p className="muted pad">Loading…</p>
              : ranked.length === 0 ? <Empty icon="trophy">{metric === 'lifts' ? 'No lifts logged on this board yet.' : 'Nobody here yet. Send your invite link!'}</Empty>
              : (
                <ol className="ranking">
                  {ranked.map(({ m, v }, i) => (
                    <li key={m.id} className={m.id === c.memberId ? 'me' : ''}>
                      <span className={`rank r${i + 1}`}>{i + 1}</span>
                      <div className="rank-main">
                        <div className="rank-name"><b>{m.name}</b>{m.id === c.memberId && <span className="tag">You</span>}
                          <span className="dir">{m.direction === 'lose' ? '↓ losing' : '↑ gaining'}</span></div>
                        <div className="bar-track"><div className="bar-fill tone-accent" style={{ width: `${Math.max(2, (v / top) * 100)}%` }} /></div>
                        <span className="rank-sub">{m.daysOnTarget}/7 days on target · active {ago(m.updatedAt)}</span>
                      </div>
                      <span className="rank-val">{fmt(v)}</span>
                    </li>
                  ))}
                </ol>
              )}
            <div className="board-foot">
              <span className="muted small">Your scores sync automatically{c.lastSync ? `, last ${ago(c.lastSync)}` : ''}.</span>
              <button className="link danger-link" onClick={leave}>Leave this board</button>
            </div>
          </Card>
        </>
      )}

      <Card title="How scoring works" icon="info">
        <ul className="plain">
          <li><b>Lock-in</b>: last 7 days including today. One point a day each for calories, protein and water, out of 21. Losing counts at or under your cap; gaining counts at or above target (up to 750 over).</li>
          <li><b>Streak</b>: consecutive days with anything logged.</li>
          <li><b>Goal %</b>: how far your weigh-ins have moved toward your goal weight.</li>
          <li><b>Lifts</b>: best estimated 1-rep max, weight × (1 + reps ÷ 30).</li>
        </ul>
        <div className="board-foot">
          <span className="muted small">Meals, calories, weight and sleep are never shared.</span>
          {!confirmRemove ? <button className="link danger-link" onClick={() => setConfirmRemove(true)}>Remove me from all leaderboards</button>
            : <span className="btn-row"><button className="btn danger" onClick={removeMe}>Yes, remove me</button><button className="btn" onClick={() => setConfirmRemove(false)}>Cancel</button></span>}
        </div>
      </Card>
    </div>
  );
}
