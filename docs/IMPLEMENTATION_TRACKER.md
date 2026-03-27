# Implementation Tracker

This file tracks the current implementation status against the product plan in `PLAN.md`.

## Snapshot

- The app shell, yearly summary, holiday generation, and calendar rendering are implemented.
- The domain model already includes the planned day statuses and resolution order.
- The main missing piece is day interaction: the UI still cannot create or edit day overrides.

## Plan Coverage

| Plan area | Status | Notes |
| --- | --- | --- |
| Lightweight personal web app for yearly workday tracking | Partial | The app renders the year view and summary, but users cannot yet record day-level activity from the UI. |
| Configurable yearly target | Implemented | The selected year and target days are editable from the settings form. |
| Weekends blocked by default | Implemented | Weekend blocking is part of the effective status resolver. |
| French administrative holidays preloaded | Implemented | French holidays are generated locally for the selected year. |
| Company closure days | Partial | The status exists in the model, but there is no interaction flow to apply it yet. |
| Mandated non-working days | Partial | The status exists in the model, but there is no interaction flow to apply it yet. |
| Future workable days assumed available | Implemented | Remaining workable days are calculated from non-blocked future dates unless explicitly marked `not_worked`. |
| Half-day support | Partial | Half-days are supported by the status model and visuals, but not yet editable from the UI. |
| Clear yearly view | Implemented | The app renders all 12 months with per-day status styling. |
| Reliable calculations with no backend | Implemented | Summary metrics are computed client-side only. |
| Local storage only | Implemented | State is loaded from and saved to `localStorage`. |
| Mobile-friendly behavior | Implemented | The layout collapses to a single-column calendar on narrow screens. |
| Core counted values (`worked_full`, `worked_half`, blocked statuses) | Implemented | Counted values and blocked behavior are defined in `STATUS_META`. |
| Workable day definition | Implemented | Weekends, holidays, closures, and mandated days are treated as blocked. |
| Core summary metrics | Implemented | Target, worked total, remaining target, remaining workable days, and required pace are calculated and displayed. |
| Status thresholds | Partial | Status categories exist, but the logic uses fixed thresholds instead of comparing with recent actual pace. |
| Summary bar | Implemented | All MVP summary values and a helper pace sentence are rendered. |
| Calendar visuals | Partial | Status styling is in place, but interactive status changes are not. |
| Day interaction menu | Not implemented | No click or tap workflow exists to set a day status. |
| Reset to default action | Not implemented | There is no UI action to remove an override and fall back to rule-based resolution. |
| Persist only overrides | Partial | The state shape supports `dayOverrides`, but the UI never creates, edits, or removes them. |
| Effective status resolution order | Implemented | Resolution follows override, weekend, holiday, then available default. |

## Next Priority

1. Add day-tile interaction so a user can set full day, half day, not worked, company closed, holiday, mandated day off, or reset.
2. Persist those day overrides into `state.dayOverrides` only.
3. Recompute the summary immediately after each day-level update.
