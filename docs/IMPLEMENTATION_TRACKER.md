# Implementation Tracker

This file tracks the current implementation status against the product plan in `PLAN.md`.

## Snapshot

- The static app shell, yearly summary, full-year calendar, and local session panel are implemented.
- Normal legal weekdays default to `worked_full`, pure weekends are locked, and generated French holidays take visual precedence when they overlap weekends, which keeps those dates editable as holidays.
- Per-year data is isolated in storage, so changing or resetting one year no longer mutates another year's overrides.
- Single-day editing, desktop shift-click range selection, mobile touch-range selection, and keyboard shortcuts are implemented.
- JSON export/import, current-year reset, and full local-session clearing are implemented.
- Public-launch assets are present: metadata, favicon, manifest, social card, `robots.txt`, and a privacy/publication page.
- Lightweight Node regression tests cover storage normalization and core calculation rules.

## Plan Coverage

| Plan area | Status | Notes |
| --- | --- | --- |
| Static browser app with no backend | Implemented | The app runs from plain HTML, CSS, and JavaScript. |
| Direct use from `index.html` | Implemented | The page uses deferred script tags and works without a build step. |
| Fixed year scope (`2025`-`2028`) | Implemented | The selector and state sanitization both enforce this range. |
| Configurable yearly target | Implemented | Year and target are editable from the settings form. |
| French public holidays generated locally | Implemented | Holiday dates are derived in `src/data/holidays-fr.js`. |
| Baseline legal weekdays prefilled as worked | Implemented | `getDefaultDayRecord()` returns `worked_full` for non-holiday, non-weekend weekdays. |
| Semantic day-status model | Implemented | The editable statuses are `worked_full`, `worked_half`, `not_worked`, `company_closed`, and `administrative_holiday`, with `not_worked` displayed as `Congé`. |
| Weekend and holiday derived defaults | Implemented | Weekends are derived, and generated holidays override both the default worked baseline and weekend rendering, so weekend holidays stay editable as holidays. |
| Persist only explicit overrides | Implemented | `years[year].dayOverrides` stores only non-default day edits inside each yearly bucket. |
| Legacy status migration on load | Implemented | Older values are normalized to canonical status keys, legacy flat state is migrated into per-year storage, and `mandated_day_off` is folded into `company_closed`. |
| Year-isolated local state | Implemented | Targets and overrides are stored under `years[year]`, and resetting a year only resets that bucket. |
| Summary headline metrics | Implemented | The UI shows target, worked total, non-worked total, remaining target, and status. |
| Feasibility helper copy | Implemented | Helper text uses recoverable and reducible capacity calculations. |
| Fixed status-threshold heuristic | Implemented | Status labels map from fixed utilization thresholds. |
| Full-year calendar rendering | Implemented | All 12 months render with Monday-first grids, monthly summaries, and a small patch-style marker for today's date. |
| Visual distinction between statuses | Implemented | Worked, half-day, non-worked, company-closed, holiday, and weekend have separate styles. |
| Single-day editing | Implemented | Clicking an editable day opens immediate status actions for that selection. |
| Range editing | Implemented | Shift-click selects an editable date range, skipping pure weekend tiles while still allowing holiday-weekend dates because they resolve to holidays. |
| Mobile drag range editing | Implemented | On narrow screens, tapping a day and dragging over others extends the current editable range. |
| Selection reset by repeat tap or away click | Implemented | Repeating a tap on the same editable day or on an already selected mobile range clears the selection, and clicks or taps away from day tiles and action controls also clear it. |
| Keyboard shortcuts | Implemented | `T`, `D`, `C`, `F`, `J`, `R`, and `Escape` are wired globally. |
| Reset to default | Implemented | Reset removes the override and falls back to the derived default for the date. |
| Mobile inline action popover | Implemented | On narrow screens, selected days can be edited from a popover whose pointer follows the selected day or selected range in the calendar. |
| Mobile scroll-to-top button | Implemented | After scrolling down on narrow screens, a floating button can jump back to the top quickly. |
| Local JSON backup and restore | Implemented | The session panel exports and imports JSON state files. |
| Current-year reset | Implemented | The session panel can rebuild the selected year from defaults. |
| Full local-session clear | Implemented | Stored local state can be removed and recreated from scratch. |
| Mobile-friendly layout | Implemented | The CSS adapts the layout for narrower screens. |
| Accessibility labels for day tiles | Implemented | Calendar buttons now expose full date, status, selection, today, and editability to assistive tech. |
| Lightweight calculation and storage tests | Implemented | `just check` now runs syntax validation plus Node unit tests. |
| Public launch metadata and static assets | Implemented | The app shell now includes manifest, favicon, social card, and robots configuration. |
| Privacy and publication page | Implemented | A dedicated static page explains local storage and highlights the remaining legal details to complete before launch. |