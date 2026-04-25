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
  const a11yDateFormatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const a11yDateLabelByIso = new Map();

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function formatA11yDate(date) {
    const isoDate = toIsoDate(date);
    const cachedLabel = a11yDateLabelByIso.get(isoDate);
    if (cachedLabel) {
      return cachedLabel;
    }

    const dateLabel = a11yDateFormatter.format(date);
    a11yDateLabelByIso.set(isoDate, dateLabel);
    return dateLabel;
  }

  function buildDayAriaLabel(date, record, meta, options) {
    const parts = [
      formatA11yDate(date),
      `statut ${record.holidayName || meta.label}`,
    ];

    if (record.holidayName && record.holidayName !== meta.label) {
      parts.push(meta.label);
    }

    if (options.isPlanned) {
      parts.push("prévu");
    }

    parts.push(options.isSelected ? "sélectionné" : "non sélectionné");

    if (options.isToday) {
      parts.push("aujourd'hui");
    }

    if (!options.isEditable) {
      parts.push("non modifiable");
    }

    return parts.join(", ");
  }

  function renderCalendar(rootElement, state, snapshot, options) {
    const settings = options || {};
    const effectiveToday = settings.today || new Date();
    const planningToday = settings.todayReference || startOfToday();
    const selectedDayIsoSet = new Set(settings.selectedDayIsos || []);
    const editableDayIsoSet = settings.editableDayIsoSet || null;
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
      monthGrid.setAttribute("aria-label", `Mois de ${MONTH_NAMES[monthIndex]}`);

      for (const weekdayLabel of WEEKDAY_LABELS) {
        const label = document.createElement("div");
        label.className = "weekday-label";
        label.textContent = weekdayLabel;
        label.setAttribute("aria-hidden", "true");
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
        const isToday = isSameCalendarDay(date, effectiveToday);
        const isSelected = selectedDayIsoSet.has(isoDate);
        const isPlanned = record.status === "worked_full" && date > planningToday;
        const isEditable = !editableDayIsoSet || editableDayIsoSet.has(isoDate);

        if (isToday) {
          dayTile.classList.add("is-today");
          dayTile.setAttribute("aria-current", "date");
        }

        if (isSelected) {
          dayTile.classList.add("is-selected");
        }
        dayTile.setAttribute("aria-pressed", isSelected ? "true" : "false");

        if (isPlanned) {
          dayTile.classList.add("is-planned");
          dayTile.title = `${record.holidayName || meta.label} prévu`;
        }

        if (!isEditable) {
          dayTile.classList.add("is-locked");
          dayTile.disabled = true;
          dayTile.title = `${record.holidayName || meta.label} - non modifiable`;
          dayTile.setAttribute("aria-disabled", "true");
        }
        dayTile.setAttribute(
          "aria-label",
          buildDayAriaLabel(date, record, meta, {
            isEditable,
            isPlanned,
            isSelected,
            isToday,
          }),
        );

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = String(date.getDate());
        dayNumber.setAttribute("aria-hidden", "true");

        const dayMeta = document.createElement("span");
        dayMeta.className = "day-meta";
        dayMeta.textContent = record.holidayShortLabel || meta.shortLabel || "";
        dayMeta.setAttribute("aria-hidden", "true");

        if (isToday) {
          const todayBadge = document.createElement("span");
          todayBadge.className = "day-badge day-badge-today";
          todayBadge.textContent = "auj.";
          todayBadge.setAttribute("aria-hidden", "true");
          dayTile.append(todayBadge);
        }

        dayTile.append(dayNumber, dayMeta);
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
