(function bootApp(global) {
  const { renderCalendar } = global.Calculette.calendar;
  const {
    STATUS_META,
    buildYearSnapshot,
    getDefaultDayRecord,
  } = global.Calculette.calculations;
  const { addDays, clamp, toIsoDate } = global.Calculette.dateUtils;
  const {
    ALLOWED_YEARS,
    DEFAULT_TARGET_DAYS,
    createDefaultState,
    loadState,
    saveState,
  } = global.Calculette.storage;

  const numberFormatter = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const rangeDateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const state = loadState();
  const uiState = {
    anchorDayIso: null,
    selectedDayIsos: [],
  };

  const elements = {
    settingsForm: document.querySelector("#settings-form"),
    yearInput: document.querySelector("#year-input"),
    targetDaysInput: document.querySelector("#target-days-input"),
    targetDaysValue: document.querySelector("#target-days-value"),
    workedTotalValue: document.querySelector("#worked-total-value"),
    targetGapLabel: document.querySelector("#target-gap-label"),
    remainingTargetValue: document.querySelector("#remaining-target-value"),
    remainingCapacityLabel: document.querySelector("#remaining-capacity-label"),
    remainingWorkableValue: document.querySelector("#remaining-workable-value"),
    requiredMetricLabel: document.querySelector("#required-metric-label"),
    requiredPaceValue: document.querySelector("#required-pace-value"),
    statusValue: document.querySelector("#status-value"),
    paceCopy: document.querySelector("#pace-copy"),
    calendarCaption: document.querySelector("#calendar-caption"),
    calendarRoot: document.querySelector("#calendar-root"),
    statusCard: document.querySelector(".status-card"),
    dayEditor: document.querySelector("#day-editor"),
    selectedDayTitle: document.querySelector("#selected-day-title"),
    selectedDayHint: document.querySelector("#selected-day-hint"),
    dayActionList: document.querySelector("#day-action-list"),
  };

  const dayActions = [
    { type: "status", status: "worked", label: "Travaillé 1", shortcut: "t" },
    { type: "status", status: "half_day", label: "Travaillé 0,5", shortcut: "d" },
    { type: "status", status: "vacation", label: "Congé", shortcut: "c" },
    { type: "status", status: "closed", label: "Fermé", shortcut: "f" },
    { type: "status", status: "holiday", label: "Jour férié", shortcut: "j" },
    { type: "reset", label: "Réinitialiser", shortcut: "r" },
  ];

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function parseIsoDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function getShortcutHint() {
    return "Raccourcis : T travaillé, D demi-journée, C congé, F fermé, J jour férié, R réinitialiser. Maj + clic sélectionne une plage.";
  }

  function isDayEditable(isoDate, holidaysByIso) {
    const defaultRecord = getDefaultDayRecord(parseIsoDate(isoDate), state, holidaysByIso);
    return defaultRecord.status !== "weekend";
  }

  function getEditableDayIsoSet(snapshot) {
    const editableDayIsoSet = new Set();

    for (const isoDate of snapshot.recordsByIso.keys()) {
      if (isDayEditable(isoDate, snapshot.holidaysByIso)) {
        editableDayIsoSet.add(isoDate);
      }
    }

    return editableDayIsoSet;
  }

  function sanitizeSelection(editableDayIsoSet) {
    uiState.selectedDayIsos = uiState.selectedDayIsos.filter(function filterSelectedDay(isoDate) {
      return editableDayIsoSet.has(isoDate);
    });

    if (!uiState.selectedDayIsos.length) {
      uiState.anchorDayIso = null;
      return;
    }

    if (!uiState.anchorDayIso || !editableDayIsoSet.has(uiState.anchorDayIso)) {
      uiState.anchorDayIso = uiState.selectedDayIsos[0];
    }
  }

  function buildEditableRange(startIsoDate, endIsoDate, holidaysByIso) {
    const rangeStartIso = startIsoDate <= endIsoDate ? startIsoDate : endIsoDate;
    const rangeEndIso = startIsoDate <= endIsoDate ? endIsoDate : startIsoDate;
    const selectedDayIsos = [];

    for (
      let cursorDate = parseIsoDate(rangeStartIso);
      toIsoDate(cursorDate) <= rangeEndIso;
      cursorDate = addDays(cursorDate, 1)
    ) {
      const cursorIsoDate = toIsoDate(cursorDate);
      if (isDayEditable(cursorIsoDate, holidaysByIso)) {
        selectedDayIsos.push(cursorIsoDate);
      }
    }

    return selectedDayIsos;
  }

  function selectDayRange(isoDate, snapshot) {
    if (!isDayEditable(isoDate, snapshot.holidaysByIso)) {
      return;
    }

    if (!uiState.anchorDayIso) {
      uiState.anchorDayIso = isoDate;
    }

    uiState.selectedDayIsos = buildEditableRange(
      uiState.anchorDayIso,
      isoDate,
      snapshot.holidaysByIso,
    );
  }

  function selectSingleDay(isoDate, snapshot) {
    if (!isDayEditable(isoDate, snapshot.holidaysByIso)) {
      return;
    }

    uiState.anchorDayIso = isoDate;
    uiState.selectedDayIsos = [isoDate];
  }

  function getUniformSelectionStatus(snapshot) {
    if (!uiState.selectedDayIsos.length) {
      return null;
    }

    const statusSet = new Set(
      uiState.selectedDayIsos.map(function mapSelectedStatus(isoDate) {
        return snapshot.recordsByIso.get(isoDate).status;
      }),
    );

    return statusSet.size === 1 ? Array.from(statusSet)[0] : null;
  }

  function applyActionToSelection(action, snapshot) {
    if (!uiState.selectedDayIsos.length) {
      return;
    }

    for (const isoDate of uiState.selectedDayIsos) {
      const selectedDate = parseIsoDate(isoDate);
      const defaultRecord = getDefaultDayRecord(
        selectedDate,
        state,
        snapshot.holidaysByIso,
      );

      if (action.type === "reset") {
        delete state.dayOverrides[isoDate];
        continue;
      }

      if (action.status === defaultRecord.status) {
        delete state.dayOverrides[isoDate];
      } else {
        state.dayOverrides[isoDate] = action.status;
      }
    }

    saveState(state);
    render();
  }

  function handleDaySelection(selectionEvent, snapshot) {
    if (!selectionEvent || !selectionEvent.isoDate) {
      return;
    }

    if (selectionEvent.shiftKey && uiState.anchorDayIso) {
      selectDayRange(selectionEvent.isoDate, snapshot);
    } else {
      selectSingleDay(selectionEvent.isoDate, snapshot);
    }

    render();
  }

  function handleKeyboardShortcuts(event) {
    if (!uiState.selectedDayIsos.length) {
      return;
    }

    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const targetTagName = event.target && event.target.tagName;
    if (
      targetTagName === "INPUT" ||
      targetTagName === "SELECT" ||
      targetTagName === "TEXTAREA" ||
      (event.target && event.target.isContentEditable)
    ) {
      return;
    }

    const loweredKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const matchedAction = dayActions.find(function findAction(action) {
      return action.shortcut === loweredKey;
    });

    if (!matchedAction) {
      return;
    }

    event.preventDefault();
    applyActionToSelection(matchedAction, buildYearSnapshot(state));
  }

  function buildPaceCopy(snapshot) {
    if (snapshot.overTarget > 0) {
      return `Vous dépassez l'objectif de ${formatNumber(
        snapshot.overTarget,
      )} jours. Marquez des congés, fermetures ou demi-journées pour revenir à la cible.`;
    }

    if (snapshot.remainingTarget <= 0) {
      return "L'objectif annuel est atteint. N'ajoutez pas plus de jours travaillés.";
    }

    if (snapshot.remainingWorkableDays <= 0) {
      return "Il ne reste plus de marge récupérable dans le planning actuel pour atteindre l'objectif.";
    }

    return `Il faut reconvertir ${formatNumber(
      snapshot.remainingTarget,
    )} jours de votre planning en jours travaillés. Cela représente ${formatNumber(
      snapshot.requiredUtilizationRate * 100,
    )} % de la marge restante.`;
  }

  function readTargetDaysInput() {
    const rawValue = Number(elements.targetDaysInput.value);
    if (!Number.isFinite(rawValue)) {
      return DEFAULT_TARGET_DAYS;
    }

    return clamp(rawValue, 0, 366);
  }

  function syncInputs() {
    elements.yearInput.value = String(state.year);
    elements.targetDaysInput.value = String(state.targetDays);
  }

  function renderSummary(snapshot) {
    elements.targetDaysValue.textContent = formatNumber(state.targetDays);
    elements.workedTotalValue.textContent = formatNumber(
      snapshot.workedEquivalentDays,
    );
    if (snapshot.overTarget > 0) {
      elements.targetGapLabel.textContent = "Jours à retirer";
      elements.remainingTargetValue.textContent = formatNumber(
        snapshot.overTarget,
      );
    } else if (snapshot.remainingTarget <= 0) {
      elements.targetGapLabel.textContent = "Objectif atteint";
      elements.remainingTargetValue.textContent = "0";
    } else {
      elements.targetGapLabel.textContent = "Reste à faire";
      elements.remainingTargetValue.textContent = formatNumber(
        snapshot.remainingTarget,
      );
    }
    elements.remainingCapacityLabel.textContent = "Marge restante";
    elements.remainingWorkableValue.textContent = formatNumber(
      snapshot.remainingWorkableDays,
    );
    elements.requiredMetricLabel.textContent = "Part à récupérer";
    elements.requiredPaceValue.textContent =
      snapshot.remainingWorkableDays > 0
        ? `${formatNumber(snapshot.requiredUtilizationRate * 100)} %`
        : "n/a";
    elements.statusValue.textContent = snapshot.statusLabel;
    elements.statusCard.dataset.tone = snapshot.statusTone;
    elements.paceCopy.textContent = buildPaceCopy(snapshot);
    elements.calendarCaption.textContent = `${snapshot.totalLegalWorkdays} jours ouvrables théoriques, ${snapshot.holidaysByIso.size} jours fériés générés, ${snapshot.vacationDays} congés saisis.`;
  }

  function renderDayEditor(snapshot) {
    elements.dayActionList.replaceChildren();

    if (!uiState.selectedDayIsos.length) {
      elements.dayEditor.dataset.empty = "true";
      elements.selectedDayTitle.textContent = "Cliquez sur un jour";
      elements.selectedDayHint.textContent =
        `Choisissez ensuite s'il est travaillé, en congé, fermé, férié ou saisi à 0,5. ${getShortcutHint()}`;
      return;
    }

    const uniformSelectionStatus = getUniformSelectionStatus(snapshot);
    const currentMeta = uniformSelectionStatus
      ? STATUS_META[uniformSelectionStatus] || STATUS_META.available
      : null;

    elements.dayEditor.dataset.empty = "false";
    if (uiState.selectedDayIsos.length === 1) {
      const selectedDate = parseIsoDate(uiState.selectedDayIsos[0]);
      elements.selectedDayTitle.textContent = dateFormatter.format(selectedDate);
      elements.selectedDayHint.textContent = `Statut actuel : ${currentMeta.label}. ${getShortcutHint()}`;
    } else {
      const rangeStartIso = uiState.selectedDayIsos[0];
      const rangeEndIso = uiState.selectedDayIsos[uiState.selectedDayIsos.length - 1];
      const selectionStatusLabel = currentMeta ? currentMeta.label : "mixte";

      elements.selectedDayTitle.textContent = `${uiState.selectedDayIsos.length} jours sélectionnés`;
      elements.selectedDayHint.textContent = `Du ${rangeDateFormatter.format(
        parseIsoDate(rangeStartIso),
      )} au ${rangeDateFormatter.format(
        parseIsoDate(rangeEndIso),
      )}, week-ends exclus. Statut actuel : ${selectionStatusLabel}. ${getShortcutHint()}`;
    }

    for (const action of dayActions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-action-button";
      button.textContent = `${action.label} (${action.shortcut.toUpperCase()})`;

      if (action.type === "status") {
        button.dataset.status = action.status;
        if (uniformSelectionStatus === action.status) {
          button.classList.add("is-active");
        }

        button.addEventListener("click", function applyStatus() {
          applyActionToSelection(action, snapshot);
        });
      } else {
        button.classList.add("is-secondary");
        button.addEventListener("click", function resetStatus() {
          applyActionToSelection(action, snapshot);
        });
      }

      elements.dayActionList.append(button);
    }
  }

  function render() {
    const snapshot = buildYearSnapshot(state);
    const editableDayIsoSet = getEditableDayIsoSet(snapshot);

    sanitizeSelection(editableDayIsoSet);
    syncInputs();
    renderSummary(snapshot);
    renderDayEditor(snapshot);
    renderCalendar(elements.calendarRoot, state, snapshot, {
      editableDayIsoSet,
      selectedDayIsos: uiState.selectedDayIsos,
      onDaySelect: function onDaySelect(selectionEvent) {
        handleDaySelection(selectionEvent, snapshot);
      },
    });
  }

  function updateStateFromInputs() {
    const requestedYear = Number(elements.yearInput.value);
    state.year = ALLOWED_YEARS.includes(requestedYear)
      ? requestedYear
      : createDefaultState().year;
    state.targetDays = readTargetDaysInput();
    if (
      uiState.anchorDayIso &&
      !uiState.anchorDayIso.startsWith(`${state.year}-`)
    ) {
      uiState.anchorDayIso = null;
      uiState.selectedDayIsos = [];
    }
    saveState(state);
    render();
  }

  elements.settingsForm.addEventListener("input", updateStateFromInputs);
  elements.settingsForm.addEventListener("change", updateStateFromInputs);
  document.addEventListener("keydown", handleKeyboardShortcuts);

  render();
})(window);
