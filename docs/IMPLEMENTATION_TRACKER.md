# Implementation Tracker

This file tracks the current implementation status against the product plan in `PLAN.md`.

## Snapshot

- The app shell, yearly summary, holiday generation, calendar rendering, and day interaction are implemented.
- The status model has been simplified to available, worked, half day, vacation, closed, holiday, and weekend.
- The interface is now presented in French.
- A normal legal workday is now prefilled as `worked`, and holidays take visual precedence over weekends when both overlap.

## Plan Coverage

| Plan area | Status | Notes |
| --- | --- | --- |
| Lightweight personal web app for yearly workday tracking | Implemented | The app renders the year view, summary, and editable day-by-day statuses from the calendar. |
| Configurable yearly target | Implemented | The selected year and target days are editable from the settings form. |
| Weekends blocked by default | Implemented | Weekend blocking is part of the effective status resolver. |
| French administrative holidays preloaded | Implemented | French holidays are generated locally for the selected year. |
| Company closure days | Implemented | Closure-style non-working days are represented by the simplified `closed` status. |
| Mandated non-working days | Implemented | Mandated off days are covered by the same simplified `closed` status. |
| Future workable days assumed available | Implemented | The app now assumes normal legal workdays are worked by default, and explicit overrides reduce that baseline. |
| Half-day support | Implemented | Half-days are editable directly from the calendar and count as `0.5`. |
| Clear yearly view | Implemented | The app renders all 12 months with per-day status styling and monthly legal workday counts. |
| Reliable calculations with no backend | Implemented | Summary metrics are computed client-side only. |
| Local storage only | Implemented | State is loaded from and saved to `localStorage`. |
| Mobile-friendly behavior | Implemented | The layout collapses to a single-column calendar on narrow screens. |
| Core counted values (`worked_full`, `worked_half`, blocked statuses) | Implemented | Counted values are handled through the simplified status metadata and remaining-capacity logic. |
| Workable day definition | Implemented | Weekends, holidays, closures, and mandated days are treated as blocked. |
| Core summary metrics | Implemented | Target, worked total, remaining target, remaining workable days, and required pace are calculated and displayed. |
| Status thresholds | Partial | Status categories exist, but the logic uses fixed thresholds instead of comparing with recent actual pace. |
| Summary bar | Implemented | The summary is translated to French and renders target, worked total, remaining target, remaining capacity, pace, and status. |
| Calendar visuals | Implemented | Status styling is in place with simplified French labels and interactive day selection. |
| Day interaction menu | Implemented | Clicking a day opens a compact action area to set work, half-day, vacation, closure, holiday, or reset. |
| Reset to default action | Implemented | A reset action removes the override and falls back to weekend, holiday, or available default rules. |
| Persist only overrides | Implemented | User edits are stored in `dayOverrides`, with legacy values migrated on load. |
| Effective status resolution order | Implemented | Resolution follows override, weekend, holiday, then available default. |

## Next Priority

1. Decide whether future planned workdays should reduce remaining capacity as hard commitments or stay as soft planning markers.
2. Add keyboard shortcuts or faster bulk-entry interactions for frequent calendar updates.
3. Introduce export or backup support for the locally stored yearly data.
