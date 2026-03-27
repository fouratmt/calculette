(function attachDateUtils(global) {
  const MONTH_NAMES = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

  function createDateAtNoon(year, monthIndex, dayOfMonth) {
    return new Date(year, monthIndex, dayOfMonth, 12, 0, 0, 0);
  }

  function addDays(date, daysToAdd) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(12, 0, 0, 0);
    return nextDate;
  }

  function toIsoDate(date) {
    return [
      String(date.getFullYear()).padStart(4, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function getMonthDays(year, monthIndex) {
    return Array.from(
      { length: daysInMonth(year, monthIndex) },
      function createMonthDate(_, dayIndex) {
        return createDateAtNoon(year, monthIndex, dayIndex + 1);
      },
    );
  }

  function getMondayFirstOffset(date) {
    return (date.getDay() + 6) % 7;
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function isSameCalendarDay(leftDate, rightDate) {
    return (
      leftDate.getFullYear() === rightDate.getFullYear() &&
      leftDate.getMonth() === rightDate.getMonth() &&
      leftDate.getDate() === rightDate.getDate()
    );
  }

  function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
  }

  function startOfToday() {
    const today = new Date();
    return createDateAtNoon(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
  }

  global.Calculette = global.Calculette || {};
  global.Calculette.dateUtils = {
    MONTH_NAMES,
    WEEKDAY_LABELS,
    createDateAtNoon,
    addDays,
    toIsoDate,
    daysInMonth,
    getMonthDays,
    getMondayFirstOffset,
    isWeekend,
    isSameCalendarDay,
    clamp,
    startOfToday,
  };
})(window);
