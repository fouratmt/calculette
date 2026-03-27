import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  getMondayFirstOffset,
  getMonthDays,
  isSameCalendarDay,
  toIsoDate,
} from "../lib/date-utils.js";
import { STATUS_META } from "../core/calculations.js";

export function renderCalendar(rootElement, state, snapshot, today = new Date()) {
  const calendarGrid = document.createElement("div");
  calendarGrid.className = "calendar-grid";

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthCard = document.createElement("section");
    monthCard.className = "month-card";

    const monthHeader = document.createElement("div");
    monthHeader.className = "month-header";

    const monthTitle = document.createElement("h3");
    monthTitle.textContent = MONTH_NAMES[monthIndex];

    const monthSummary = document.createElement("span");
    monthSummary.className = "month-summary";
    monthSummary.textContent = `${getMonthDays(state.year, monthIndex).length} days`;

    monthHeader.append(monthTitle, monthSummary);

    const monthGrid = document.createElement("div");
    monthGrid.className = "month-grid";

    for (const weekdayLabel of WEEKDAY_LABELS) {
      const label = document.createElement("div");
      label.className = "weekday-label";
      label.textContent = weekdayLabel;
      monthGrid.append(label);
    }

    const monthDays = getMonthDays(state.year, monthIndex);
    const leadingSpacers = getMondayFirstOffset(monthDays[0]);

    for (let spacerIndex = 0; spacerIndex < leadingSpacers; spacerIndex += 1) {
      const spacer = document.createElement("div");
      spacer.className = "day-spacer";
      spacer.setAttribute("aria-hidden", "true");
      monthGrid.append(spacer);
    }

    for (const date of monthDays) {
      const isoDate = toIsoDate(date);
      const record = snapshot.recordsByIso.get(isoDate);
      const meta = STATUS_META[record.status] ?? STATUS_META.available;

      const dayTile = document.createElement("div");
      dayTile.className = "day-tile";
      dayTile.dataset.status = record.status;
      dayTile.dataset.source = record.source;
      dayTile.title = record.holidayName ?? meta.label;

      if (isSameCalendarDay(date, today)) {
        dayTile.classList.add("is-today");
      }

      const dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = String(date.getDate());

      const dayMeta = document.createElement("span");
      dayMeta.className = "day-meta";
      dayMeta.textContent = record.holidayShortLabel || meta.shortLabel || "";

      dayTile.append(dayNumber, dayMeta);
      monthGrid.append(dayTile);
    }

    monthCard.append(monthHeader, monthGrid);
    calendarGrid.append(monthCard);
  }

  rootElement.replaceChildren(calendarGrid);
}
