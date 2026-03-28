# Project Plan

## 1. Overview

### Product Summary

Build a lightweight static browser app for freelance consultants to pilot their worked days over a selected year.

Current scope:

- selectable years: `2025`, `2026`, `2027`
- configurable yearly target, such as `216` days
- French public holidays generated locally
- normal legal weekdays prefilled as `worked`
- a calendar used to subtract or adjust days with explicit overrides
- direct execution from `index.html` without a build step
- local backup and restore through JSON export and import

### Primary Outcome

The app should let the user see, at a glance, whether the current yearly plan hits the target and quickly adjust one day or a range of days from the calendar.

## 2. Product Principles

### What Matters Most

- fast daily usage
- very clear yearly view
- simple rules
- reliable calculations
- no backend
- all data stored locally
- direct browser usage from disk
- mobile-friendly behavior

## 3. Current Product Rules

### Baseline Planning Model

The app currently starts from a filled planning baseline rather than an empty one:

- a normal legal weekday defaults to `worked`
- French holidays are generated automatically for the selected year
- weekends remain non-working and are locked in the UI
- when a date is both a holiday and a weekend, the holiday label takes visual precedence
- the calendar is mainly used to turn default worked days into vacations, closures, holidays, or half-days

### Editable Day Statuses

The user-facing editor supports the following statuses:

| Status Key | Label | Counted Value | Notes |
| --- | --- | --- | --- |
| `worked` | `Travaillé` | `1` | Default for normal legal weekdays and also a valid override |
| `half_day` | `Travaillé 0,5` | `0.5` | Partial workday |
| `vacation` | `Congé` | `0` | Non-worked but still recoverable in future-capacity calculations |
| `closed` | `Fermé` | `0` | Blocked day |
| `holiday` | `Jour férié` | `0` | Blocked day, either generated or manually overridden |
| `weekend` | `Week-end` | `0` | Derived only, not stored as an override |

There is no user-facing `available` state in the current UI.

### What Counts Toward the Yearly Target

- `worked = 1`
- `half_day = 0.5`

### What Does Not Count

- `vacation = 0`
- `closed = 0`
- `holiday = 0`
- `weekend = 0`

### Reset to Default

`Reset to default` removes the stored override and falls back to the generated default for that date:

1. explicit override removed
2. generated French holiday if one exists
3. weekend rule
4. otherwise `worked`

### Effective Status Resolution

Every date currently resolves in this order:

1. explicit user override
2. generated French holiday
3. weekend
4. default worked day

That resolver drives rendering, calculations, and the day editor state.

## 4. Calculations And Status

### Core Metrics

The calculation layer currently derives:

- `targetDays`
- `workedEquivalentDays`
- `notWorkedDays`
- `remainingTarget`
- `overTarget`
- `recoverableDays`
- `reducibleDays`
- `requiredUtilizationRate`

The summary UI exposes only the headline metrics:

- target
- worked total
- non-worked total
- remaining target or days to remove
- status label
- helper copy based on feasibility math

### Status Thresholds

The current status labels are driven by fixed thresholds:

- `Dépassé` when the worked total already exceeds the target
- `Objectif atteint` when the remaining target is `0`
- `Impossible` when no adjustable capacity remains or the required rate exceeds `100 %`
- `Limite` above `90 %`
- `À ajuster` above `75 %`
- `Faisable` above `55 %`
- `Confortable` otherwise

When the user is over target, the helper logic switches from “recover remaining work” to “remove worked days from the future plan”.

## 5. User Experience

### Summary Panel

Show:

- yearly target
- worked total
- non-worked total
- remaining target or days to remove
- status badge
- helper sentence explaining the current feasibility

### Calendar View

Show the whole year month by month.

Current calendar behavior:

- Monday-first month grids
- monthly legal-workday and worked-total summaries
- distinct visual states for worked, half-day, vacation, closed, holiday, and weekend
- selected-day highlighting
- future default-worked days visually marked as planned
- weekend tiles visible but not editable

### Day Interaction

The current interaction model is:

- click an editable day to select it
- shift-click to select an editable range, weekends excluded
- use the action panel to apply a status immediately
- use keyboard shortcuts for quick entry

Current actions:

- `Travaillé`
- `Travaillé 0,5`
- `Congé`
- `Fermé`
- `Jour férié`
- `Réinitialiser`

Current shortcuts:

- `T` for worked
- `D` for half-day
- `C` for vacation
- `F` for closed
- `J` for holiday
- `R` for reset
- `Escape` to clear the current selection

### Session Tools

The app also includes a local session panel with:

- last-save timestamp
- number of overridden days
- estimated stored state size
- JSON export
- JSON import
- reset of the current year
- full local-session clear

## 6. Storage Model

### Persisted State

The stored state contains:

- selected year
- yearly target
- settings
- session metadata
- `dayOverrides`

Only explicit overrides are persisted for individual days.

### Example Structure

```json
{
  "year": 2026,
  "targetDays": 216,
  "meta": {
    "sessionId": "session-abc123",
    "schemaVersion": 1,
    "createdAt": "2026-03-28T09:00:00.000Z",
    "updatedAt": "2026-03-28T09:15:00.000Z"
  },
  "settings": {
    "countryHolidayPreset": "FR",
    "weekendsAreBlocked": true,
    "estimationMode": "workable_days_only"
  },
  "dayOverrides": {
    "2026-01-06": "half_day",
    "2026-01-07": "vacation",
    "2026-05-01": "worked",
    "2026-08-14": "closed"
  }
}
```

Legacy override values are migrated on load to the current simplified statuses.

## 7. Open Items

The main follow-up items still to decide or implement are:

1. Revisit the status heuristic if labels should depend on recent actual pace instead of fixed thresholds only.
2. Decide whether year support should remain fixed to `2025`-`2027` or become dynamic.
3. Reassess later whether the simplified status model is enough, or whether more detailed non-working categories need to return.
