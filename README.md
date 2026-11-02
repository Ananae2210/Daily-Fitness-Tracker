# Steady · Daily Tracker

A calm, fast daily tracker for food, water, caffeine, sleep, weight and strength training. Built with React, TypeScript and Vite. No account and no server: everything is stored in your browser.

## Features

- **Today**: calorie ring with what's left, progress bars for protein, water and caffeine, rest/workout day toggle, and a day log with one-tap delete and undo. Move between days to fill in or fix past entries.
- **Fast logging**: tabbed logger for meals, water, caffeine and a morning check-in (sleep + weight). Recent meals can be re-logged with one tap.
- **Smart targets**: maintenance from Mifflin-St Jeor × activity, a daily cap (losing) or target (gaining) that adapts to your latest weigh-in and optional target date, with safety floors and workout-day extras.
- **Caffeine at bedtime**: estimates what's still active when you go to sleep (5.5 h half-life).
- **Progress**: 7-day consistency score, logging streak, goal %, calories vs target chart, weight trend vs goal, forecast to your goal date, sleep average/debt, BMI, body-fat estimate and protein per kg.
- **Training**: log sets, see estimated 1RM (Epley) and personal records per exercise.
- **History**: every logged day at a glance with its daily score; tap to open it.
- **Share**: create a read-only snapshot link (consistency, streak, goal %, calories vs target and best lifts; no weight, meals or sleep).
- **Your data**: JSON backup/restore, CSV export, delete everything. Light, dark and auto themes.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Deploy on Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Vercel detects Vite automatically (build `npm run build`, output `dist`), so no settings need changing.
