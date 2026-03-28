# Implementation Tracker

This file tracks the current implementation status against the product plan in `PLAN.md`.

## Snapshot

- The static app shell, yearly summary, full-year calendar, and local session panel are implemented.
- Normal legal weekdays default to `worked_full`, weekends are locked, and generated French holidays take visual precedence when they overlap weekends.
- Per-year data is isolated in storage, so changing or resetting one year no longer mutates another year's overrides.
- Single-day editing, desktop shift-click range selection, mobile touch-range selection, and keyboard shortcuts are implemented.
- JSON export/import, current-year reset, and full local-session clearing are implemented.
- The main functional gap is heuristic depth: status labels still rely on fixed thresholds rather than recent-pace comparison.

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
| Weekend and holiday derived defaults | Implemented | Weekends are derived, and generated holidays override the default worked baseline. |
| Persist only explicit overrides | Implemented | `dayOverrides` stores only non-default day edits inside each yearly bucket. |
| Legacy status migration on load | Implemented | Older values are normalized to canonical status keys, legacy flat state is migrated into per-year storage, and `mandated_day_off` is folded into `company_closed`. |
| Year-isolated local state | Implemented | Targets and overrides are stored under `years[year]`, and resetting a year only resets that bucket. |
| Summary headline metrics | Implemented | The UI shows target, worked total, non-worked total, remaining target, and status. |
| Feasibility helper copy | Implemented | Helper text uses recoverable and reducible capacity calculations. |
| Fixed status-threshold heuristic | Implemented | Status labels map from fixed utilization thresholds. |
| Recent-pace-aware status heuristic | Not implemented | The current status logic does not compare with recent actual performance. |
| Full-year calendar rendering | Implemented | All 12 months render with Monday-first grids and monthly summaries. |
| Visual distinction between statuses | Implemented | Worked, half-day, non-worked, company-closed, mandated-day-off, holiday, and weekend have separate styles. |
| Single-day editing | Implemented | Clicking an editable day opens immediate status actions for that selection. |
| Range editing | Implemented | Shift-click selects an editable date range, skipping weekends. |
| Mobile drag range editing | Implemented | On narrow screens, tapping a day and dragging over others extends the current editable range. |
| Outside-click selection reset | Implemented | Clicking outside the calendar panel clears the current selection. |
| Keyboard shortcuts | Implemented | `T`, `D`, `C`, `F`, `J`, `R`, and `Escape` are wired globally. |
| Reset to default | Implemented | Reset removes the override and falls back to the derived default for the date. |
| Mobile inline action popover | Implemented | On narrow screens, selected days can be edited from a popover anchored in the calendar instead of scrolling back to the top panel. |
| Local JSON backup and restore | Implemented | The session panel exports and imports JSON state files. |
| Current-year reset | Implemented | The session panel can rebuild the selected year from defaults. |
| Full local-session clear | Implemented | Stored local state can be removed and recreated from scratch. |
| Mobile-friendly layout | Implemented | The CSS adapts the layout for narrower screens. |
| Dynamic year support beyond `2028` | Not implemented | Supported years are still hard-coded. |

## Still To Do

1. Improve status guidance if the product should compare feasibility against recent real pace instead of fixed percentage bands.
2. Decide whether the fixed year range is still acceptable or whether the app should support arbitrary nearby years.
3. Decide whether bulk editing needs to go beyond the current click, shift-click, touch-drag, and shortcut workflow.
