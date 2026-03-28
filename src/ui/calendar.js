(function attachCalendar(global) {
  const {
    MONTH_NAMES,
    WEEKDAY_LABELS,
    getMondayFirstOffset,
    getMonthDays,
    isSameCalendarDay,
    startOfToday,
    toIsoDate,
  } = global.Calculette.dateUtils;
  const { STATUS_META } = global.Calculette.calculations;
  const numberFormatter = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function renderCalendar(rootElement, state, snapshot, options) {
    const settings = options || {};
    const effectiveToday = settings.today || new Date();
    const planningToday = settings.todayReference || startOfToday();
    const selectedDayIsoSet = new Set(settings.selectedDayIsos || []);
    const editableDayIsoSet = settings.editableDayIsoSet || null;
    const onDaySelect = settings.onDaySelect || function noop() {};
    const calendarGrid = document.createElement("div");
    calendarGrid.className = "calendar-grid";

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthCard = document.createElement("section");
      monthCard.className = "month-card";

      const monthHeader = document.createElement("div");
      monthHeader.className = "month-header";

      const monthTitle = document.createElement("h3");
      monthTitle.textContent = MONTH_NAMES[monthIndex];

      const monthStats = document.createElement("div");
      monthStats.className = "month-stats";

      const workableSummary = document.createElement("span");
      workableSummary.className = "month-summary";
      workableSummary.textContent = `${snapshot.monthlyStats[monthIndex].legalWorkdays} j ouvrables`;

      const workedSummary = document.createElement("span");
      workedSummary.className = "month-summary month-summary-worked";
      workedSummary.textContent = `${formatNumber(
        snapshot.monthlyStats[monthIndex].workedEquivalentDays,
      )} j travaillés`;

      monthStats.append(workableSummary, workedSummary);
      monthHeader.append(monthTitle, monthStats);

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
        const meta = STATUS_META[record.status] || STATUS_META.available;

        const dayTile = document.createElement("button");
        dayTile.type = "button";
        dayTile.className = "day-tile";
        dayTile.dataset.status = record.status;
        dayTile.dataset.source = record.source;
        dayTile.dataset.isoDate = isoDate;
        dayTile.title = record.holidayName || meta.label;

        if (isSameCalendarDay(date, effectiveToday)) {
          dayTile.classList.add("is-today");
        }

        if (selectedDayIsoSet.has(isoDate)) {
          dayTile.classList.add("is-selected");
        }

        if (record.status === "worked_full" && date > planningToday) {
          dayTile.classList.add("is-planned");
          dayTile.title = `${record.holidayName || meta.label} prévu`;
        }

        const isEditable = !editableDayIsoSet || editableDayIsoSet.has(isoDate);
        if (!isEditable) {
          dayTile.classList.add("is-locked");
          dayTile.disabled = true;
          dayTile.title = `${record.holidayName || meta.label} - non modifiable`;
        }

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = String(date.getDate());

        const dayMeta = document.createElement("span");
        dayMeta.className = "day-meta";
        dayMeta.textContent = record.holidayShortLabel || meta.shortLabel || "";

        dayTile.append(dayNumber, dayMeta);
        if (isEditable) {
          dayTile.addEventListener("click", function handleClick(event) {
            onDaySelect({
              isoDate,
              extendSelection: event.shiftKey,
              inputType: "click",
            });
          });
        }
        monthGrid.append(dayTile);
      }

      monthCard.append(monthHeader, monthGrid);
      calendarGrid.append(monthCard);
    }

    rootElement.replaceChildren(calendarGrid);
  }

  global.Calculette.calendar = {
    renderCalendar,
  };
})(window);
