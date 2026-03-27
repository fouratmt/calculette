export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function createDateAtNoon(year, monthIndex, dayOfMonth) {
  return new Date(year, monthIndex, dayOfMonth, 12, 0, 0, 0);
}

export function addDays(date, daysToAdd) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

export function toIsoDate(date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getMonthDays(year, monthIndex) {
  return Array.from(
    { length: daysInMonth(year, monthIndex) },
    (_, dayIndex) => createDateAtNoon(year, monthIndex, dayIndex + 1),
  );
}

export function getMondayFirstOffset(date) {
  return (date.getDay() + 6) % 7;
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isSameCalendarDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}

export function startOfToday() {
  const today = new Date();
  return createDateAtNoon(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
}
