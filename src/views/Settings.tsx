import { useRef, useState } from 'react';
import { defaultState, useStore } from '../store';
import { calorieTarget, dayCaffeine, dayKcal, dayProtein, dayWater } from '../calc';
import { today } from '../date';
import { makeSnapshot, snapshotUrl } from '../share';
import { Card, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import type { AppState } from '../types';

const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function Settings() {
  const { state, set, replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const exportCsv = () => {
    const rows = [['date', 'type', 'kcal', 'kcal_target', 'protein_g', 'water_ml', 'caffeine_mg', 'sleep_h', 'weight_kg']];
    Object.keys(state.days).sort().forEach((d) => {
      const day = state.days[d];
      rows.push([d, day.type, String(dayKcal(day)), String(calorieTarget(state, d).target), String(dayProtein(day)),
        String(dayWater(day)), String(dayCaffeine(day)), String(day.sleepH ?? ''), String(day.weightKg ?? '')]);
    });
    download(`steady-${today()}.csv`, rows.map((r) => r.join(',')).join('\n'), 'text/csv');
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (data?.version !== 1 || typeof data.days !== 'object') throw new Error('bad');
      replace({ ...defaultState(), ...data, onboarded: true });
      setImportMsg(`Restored ${Object.keys(data.days).length} days and ${data.lifts?.length ?? 0} sets.`);
    } catch {
      setImportMsg('That file is not a Steady backup.');
    }
  };

  const share = async () => {
    const url = snapshotUrl(makeSnapshot(state));
    setLink(url);
    setCopied(false);
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* user can copy manually */ }
  };

  return (
    <div className="view">
      <div className="view-head"><h1>Settings</h1></div>
      <div className="grid-2 align-start">
        <Card title="Appearance" icon="today">
          <Segmented label="Theme" value={state.theme} onChange={(theme) => set((s) => ({ ...s, theme }))}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </Card>

        <Card title="Share progress" icon="share">
          <p className="muted">Creates a read-only link with your consistency, streak, goal %, last 14 days of calories vs target and best lifts.
            Weight, meals and sleep stay private. The link is a snapshot of right now.</p>
          <button className="btn primary mt" onClick={share}><Icon name="share" size={18} />Create share link</button>
          {link && (
            <div className="copy-row">
              <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Share link" />
              <button className="btn" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </Card>

        <Card title="Your data" icon="download">
          <p className="muted">Everything is stored only in this browser. Export a backup to move devices or keep a copy.</p>
          <div className="btn-row">
            <button className="btn" onClick={() => download(`steady-backup-${today()}.json`, JSON.stringify(state, null, 2), 'application/json')}>
              <Icon name="download" size={16} />Backup (.json)</button>
            <button className="btn" onClick={exportCsv}><Icon name="download" size={16} />Spreadsheet (.csv)</button>
            <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />Restore backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
          {importMsg && <p className="muted mt">{importMsg}</p>}
        </Card>

        <Card title="Start over" icon="trash" className="danger-zone">
          <p className="muted">Erases every log, lift and setting from this browser. Download a backup first if you might want it back.</p>
          {!confirmDelete ? (
            <button className="btn danger mt" onClick={() => setConfirmDelete(true)}>Delete all data</button>
          ) : (
            <div className="btn-row mt">
              <button className="btn danger" onClick={() => { replace(defaultState()); setConfirmDelete(false); }}>Yes, delete everything</button>
              <button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
