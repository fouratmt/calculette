# AGENTS.md

## Purpose

This repo is a small static browser app for planning worked days and half-days over a selected year. Keep the implementation lightweight, readable, and directly runnable from `index.html`.

## Source Of Truth

- `docs/PLAN.md`: expected product behavior
- `docs/IMPLEMENTATION_TRACKER.md`: what is implemented right now
- `README.md`: quick setup and project structure

## Repo Map

- `index.html`: static app shell, loaded directly in the browser
- `src/app.js`: bootstraps state, summary rendering, and calendar rendering
- `src/core/calculations.js`: domain rules, status resolution, and yearly metrics
- `src/data/`: `localStorage` persistence and French holiday data
- `src/lib/`: generic date helpers
- `src/ui/`: DOM rendering and user interactions
- `src/styles/main.css`: visual system and layout

## Working Rules

- Prefer plain HTML, CSS, and JavaScript. Do not add a framework or build step unless there is a clear reason.
- Keep all data local. Persist only explicit user overrides in `years[year].dayOverrides`.
- Preserve the status resolution order: override -> French holiday -> weekend -> `worked_full`.
- Keep the app usable when `index.html` is opened directly from disk.
- When behavior changes, update the relevant docs in the same pass.

## Current Priority

Keep the current day-interaction flow stable: users can set full day, half day, not worked, company closed, holiday, or reset to default, and each change should save immediately and refresh the summary plus calendar.
