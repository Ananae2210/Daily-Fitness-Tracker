import { Wordmark } from '../components/Logo';
import { useState } from 'react';
import { useStore } from '../store';
import { Field, Segmented, num } from '../components/ui';
import { Icon } from '../components/Icon';
import type { Direction, Sex } from '../types';
import { today } from '../date';

export function Onboarding() {
  const { set } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('female');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [direction, setDirection] = useState<Direction>('lose');
  const [amount, setAmount] = useState('5');

  const step1ok = [age, height, weight].every((v) => (num(v) ?? 0) > 0);

  const finish = () => {
    const w = num(weight)!;
    set((s) => ({
      ...s, onboarded: true,
      profile: { ...s.profile, name: name.trim(), sex, age: num(age)!, heightCm: num(height)! },
      goal: { direction, startWeight: w, amount: num(amount) ?? 5, targetDate: '' },
      days: { ...s.days, [today()]: { ...(s.days[today()] ?? { date: today(), type: 'rest', meals: [], water: [], caffeine: [], sleepH: null }), weightKg: w } },
    }), 'You are all set. Log your first meal!');
  };

  return (
    <div className="onboard">
      <div className="onboard-card">
        <Wordmark size={36} />
        <p className="lead">Track food, water, sleep and training in under a minute a day. Everything stays on your device.</p>
        <div className="steps"><i className={step >= 0 ? 'on' : ''} /><i className={step >= 1 ? 'on' : ''} /></div>

        {step === 0 ? (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (step1ok) setStep(1); }}>
            <Field label="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} />
            <div className="row-3">
              <Field label="Age" type="number" inputMode="numeric" min={13} max={100} required value={age} onChange={(e) => setAge(e.target.value)} />
              <Field label="Height" type="number" inputMode="numeric" min={100} max={250} suffix="cm" required value={height} onChange={(e) => setHeight(e.target.value)} />
              <Field label="Weight" type="number" inputMode="decimal" step="0.1" min={20} max={400} suffix="kg" required value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <p className="hint">Used only to estimate your calorie and protein needs.</p>
            <button className="btn primary" type="submit" disabled={!step1ok}>Continue<Icon name="right" size={18} /></button>
          </form>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); finish(); }}>
            <p className="mini-label">What's your goal?</p>
            <Segmented label="Goal" value={direction} onChange={setDirection}
              options={[{ value: 'lose', label: 'Lose weight' }, { value: 'gain', label: 'Gain weight' }]} />
            <Field label={direction === 'lose' ? 'How much to lose?' : 'How much to gain?'} type="number" inputMode="decimal" step="0.5" min={0.5}
              suffix="kg" value={amount} onChange={(e) => setAmount(e.target.value)} hint="You can add a target date and fine-tune targets later in Plan." />
            <div className="btn-row">
              <button className="btn" type="button" onClick={() => setStep(0)}><Icon name="left" size={18} />Back</button>
              <button className="btn primary grow" type="submit">Start tracking</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
