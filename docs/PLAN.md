# Project Plan

## 1. Overview

### Product Summary

Build a lightweight personal web app for freelance consultants to track paid worked days and half-days over a selected year.

The app must account for:

- a configurable yearly target, such as 216 days
- weekends as non-workable by default
- French administrative holidays preloaded by default
- company closure days
- mandated non-working days
- future workable days being assumed available unless explicitly blocked

### Primary Outcome

The app should show whether the user is on track based on workable days only, with the option to support additional estimation modes later.

## 2. MVP Principles

### What Matters Most

- fast daily usage
- very clear yearly view
- simple rules
- reliable calculations
- no backend
- all data stored locally
- mobile-friendly behavior

## 3. Product Rules

### Core Planning Rule

A future weekday should be considered potentially workable unless it is explicitly marked as one of the following:

- company closed
- administrative holiday
- mandated day off
- not worked

This makes the app a planning and tracking tool rather than only a historical log.

### Day Status Model

The MVP must support half-days.

| Status Key | Meaning | Counted Value | Blocked |
| --- | --- | --- | --- |
| `worked_full` | Full day worked | `1` | No |
| `worked_half` | Half day worked | `0.5` | No |
| `not_worked` | Explicitly not worked | `0` | No |
| `company_closed` | Company closure day | `0` | Yes |
| `administrative_holiday` | Holiday day | `0` | Yes |
| `mandated_day_off` | Mandated non-working day | `0` | Yes |
| `weekend` | Weekend | `0` | Yes |

No explicit unset state is required. A future workable day is implicitly available unless an override says otherwise.

### What Counts Toward the Yearly Target

- `worked_full = 1`
- `worked_half = 0.5`

### What Does Not Count

- `not_worked = 0`
- `company_closed = 0`
- `administrative_holiday = 0`
- `mandated_day_off = 0`
- `weekend = 0`

### Workable Day Definition

A day is workable if all of the following are true:

- it is not a weekend
- it is not a French holiday, unless overridden
- it is not a company closure day
- it is not a mandated day off

Additional rules:

- future workable days are assumed still available unless explicitly marked `not_worked`
- past days marked `not_worked` remain part of the historical record

## 4. Estimation Logic

### MVP Default

Estimate progress using:

- days already worked so far
- number of remaining workable days
- how many equivalent workdays still need to be completed

### Core Metrics

- `targetDays`
- `workedEquivalentDays`
- `remainingTarget = targetDays - workedEquivalentDays`
- `remainingWorkableDays`
- `requiredUtilizationRate = remainingTarget / remainingWorkableDays`

### Example

If:

- `targetDays = 216`
- `workedEquivalentDays = 102.5`
- `remainingTarget = 113.5`
- `remainingWorkableDays = 140`

Then:

- `requiredUtilizationRate = 113.5 / 140 = 0.81`

Interpretation:

- the user needs to average about `0.81` worked day per remaining workable day
- that is broadly on track

### Status Thresholds

The MVP should use simple, understandable categories:

- `Ahead`: required rate is comfortably below recent actual pace
- `On track`: target is reachable at a normal pace
- `At risk`: target is reachable but requires a high pace
- `Behind`: target is difficult
- `Impossible`: remaining target exceeds remaining workable capacity

Capacity rule:

- max capacity remains `1` equivalent workday per workable day
- `Impossible` means `remainingTarget > remainingWorkableDays`

## 5. User Experience Plan

### Summary Bar

Show:

- selected year
- target days
- worked total
- not worked days
- remaining target
- status badge

Optional helper sentence:

`The current plan can still hit the target, but 12 remaining days need to be turned into worked days.`

### Calendar View

Show the whole year month by month.

Each day tile should support:

- full worked
- half worked
- not worked
- blocked type

Suggested visual treatment:

- full worked: strong filled state
- half worked: split fill or diagonal hatch
- not worked: muted outline or fill
- company closed: dark neutral
- holiday: blue
- mandated day off: orange
- weekend: light gray and disabled-looking

Half-days must be visually obvious at a glance.

### Day Interaction

Best MVP interaction:

- tap or click a day
- open a compact status menu

Menu options:

- Full day worked
- Half day worked
- Not worked
- Company closed
- Holiday
- Mandated day off
- Reset to default

### Reset to Default

`Reset to default` should resolve to:

- weekend if the date is a weekend
- French holiday if preloaded and not overridden
- otherwise normal workable day that is implicitly available

The app should avoid storing defaults and persist only overrides.

## 6. Data Model

### Effective Status Resolution

Every date should resolve in this order:

1. explicit user override
2. weekend
3. French holiday
4. normal workable day

This supports a clean resolver such as `getEffectiveDayStatus(date, config)`.

That resolver should drive:

- rendering
- calculations
- summary logic

### Storage Strategy

Because defaults are inferred, storage should contain only:

- global year settings
- user overrides for specific dates
- custom blocked ranges

### Example Structure

```json
{
  "year": 2026,
  "targetDays": 216,
  "settings": {
    "countryHolidayPreset": "FR",
    "weekendsAreBlocked": true,
    "estimationMode": "workable_days_only"
  },
  "dayOverrides": {
    "2026-01-05": "worked_full",
    "2026-01-06": "worked_half",
    "2026-01-07": "not_worked",
    "2026-05-01": "worked_full"
  }
}
```

This works well because:

- weekends are derived
- French holidays are derived
- only exceptions are stored
- a preloaded holiday can be overridden when the consultant actually worked

Example:

- if Bastille Day is preloaded as a holiday, storing `worked_full` should override the default

## 7. French Holidays

### MVP Behavior

When a year is selected, the app should auto-generate French public holidays for that year.

These holidays become default blocked days, but the user must be able to override them.

### Implementation Constraint

Do not fetch holidays from an API. Compute them locally in code.

This keeps the app:

- offline-friendly
- fast
- backend-free
- deterministic

The implementation needs:

- fixed-date holidays
- Easter-based movable holidays

## 8. MVP Scope

### In Scope

- choose year
- configure target days
- preload French holidays automatically
- show the full year month by month
- mark days as full worked, half worked, not worked, or blocked
- override preloaded holiday defaults
- show progress and estimation
- persist data in local storage
- provide a responsive layout

### Out of Scope

- login
- sync across devices
- team or company management
- invoice tracking
- multiple clients
- notes per day
- recurring custom rules UI
- PWA or offline install polish
- exports beyond JSON backup

### Deferred Configuration

The architecture should allow later support for other estimation modes, such as:

- workable days only
- weekdays only
- historical pace extrapolation
- manual target pace

The MVP should expose only:

- `workable_days_only`

## 9. Technical Plan

### Recommended Architecture

Keep the implementation small and static.

Suggested files:

- `/index.html`
- `/styles.css`
- `/app.js`
- `/calendar.js`
- `/storage.js`
- `/calculations.js`
- `/holidays-fr.js`
- `/date-utils.js`

### File Responsibilities

- `holidays-fr.js`: compute French holidays for a given year
- `calendar.js`: render months and day cells
- `calculations.js`: handle totals, projections, and pace logic
- `storage.js`: load and save local storage
- `app.js`: wire the application together

### Calculation Notes

Worked total:

- `worked_full = 1`
- `worked_half = 0.5`
- everything else = `0`

Remaining workable days should count future dates in the selected year that are:

- not weekends
- not French holidays, unless overridden
- not company closed
- not mandated day off
- not explicitly marked `not_worked`

### UX Recommendation

Because future workable days are implicitly available, the calendar should not render all future weekdays as heavily emphasized candidates.

Preferred presentation:

- normal workable day: neutral appearance
- explicitly marked `not_worked`: muted or striped
- explicitly worked: strong visual treatment
- blocked days: color-coded

## 10. Risks and Mitigations

### Risk 1: Half-Day Support Complicates the UI

Mitigation:

- keep only two positive work statuses: full and half
- do not add quarter-day support in the MVP

### Risk 2: Default Versus Override Becomes Confusing

Mitigation:

- clearly indicate whether a day is a default holiday, default weekend, or user override

### Risk 3: Forecast Feels Opaque

Mitigation:

- expose the formula in plain language, such as `You have 84.5 days left to work across 103 workable days.`

### Risk 4: Holiday Override Edge Cases

Mitigation:

- explicit user override must always win over generated holiday defaults

## 11. Recommended Implementation Choices

If implemented now, the MVP should use these choices:

- vanilla JavaScript only
- full-year calendar on one page
- French holidays generated locally
- weekends blocked by default
- day states stored only when overridden
- support for full day and half day only
- pace estimate based on remaining workable days
- `Reset to default` action for every day
- mobile-first month cards
