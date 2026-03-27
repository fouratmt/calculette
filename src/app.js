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
    removeStoredState,
    resetState,
    sanitizeState,
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
  const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let state = loadState();
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
    notWorkedDaysValue: document.querySelector("#not-worked-days-value"),
    targetGapLabel: document.querySelector("#target-gap-label"),
    adjustableDaysCard: document.querySelector("#adjustable-days-card"),
    remainingTargetValue: document.querySelector("#remaining-target-value"),
    remainingCapacityLabel: document.querySelector("#remaining-capacity-label"),
    remainingWorkableValue: document.querySelector("#remaining-workable-value"),
    requiredShareCard: document.querySelector("#required-share-card"),
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
    sessionIdValue: document.querySelector("#session-id-value"),
    sessionCreatedValue: document.querySelector("#session-created-value"),
    sessionUpdatedValue: document.querySelector("#session-updated-value"),
    sessionOverridesValue: document.querySelector("#session-overrides-value"),
    sessionSizeValue: document.querySelector("#session-size-value"),
    exportSessionButton: document.querySelector("#export-session-button"),
    importSessionButton: document.querySelector("#import-session-button"),
    resetYearButton: document.querySelector("#reset-year-button"),
    clearSessionButton: document.querySelector("#clear-session-button"),
    sessionImportInput: document.querySelector("#session-import-input"),
    sessionFeedback: document.querySelector("#session-feedback"),
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

  function formatDateTime(value) {
    const parsedDate = new Date(value);
    if (!Number.isFinite(parsedDate.getTime())) {
      return "—";
    }

    return dateTimeFormatter.format(parsedDate);
  }

  function formatBytes(byteCount) {
    if (byteCount < 1024) {
      return `${byteCount} o`;
    }

    if (byteCount < 1024 * 1024) {
      return `${formatNumber(byteCount / 1024)} Ko`;
    }

    return `${formatNumber(byteCount / (1024 * 1024))} Mo`;
  }

  function getSerializedStateSize(value) {
    const serializedState = JSON.stringify(value);
    if (typeof TextEncoder === "function") {
      return new TextEncoder().encode(serializedState).length;
    }

    return serializedState.length;
  }

  function parseIsoDate(isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function getShortcutHint() {
    return "Raccourcis : T travaillé, D demi-journée, C congé, F fermé, J jour férié, R réinitialiser. Maj + clic sélectionne une plage. Échap annule la sélection.";
  }

  function clearSelection() {
    uiState.anchorDayIso = null;
    uiState.selectedDayIsos = [];
  }

  function persistState() {
    state = saveState(state);
    return state;
  }

  function setSessionFeedback(message, tone) {
    elements.sessionFeedback.textContent = message;
    elements.sessionFeedback.dataset.tone = tone || "neutral";
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

    persistState();
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
    if (event.key === "Escape" && uiState.selectedDayIsos.length) {
      event.preventDefault();
      clearSelection();
      render();
      return;
    }

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
      if (snapshot.reducibleDays <= 0) {
        return `Vous dépassez l'objectif de ${formatNumber(
          snapshot.overTarget,
        )} jours et il n'y a plus de jours futurs à retirer dans le planning.`;
      }

      if (snapshot.reducibleDays < snapshot.overTarget) {
        return `Vous dépassez l'objectif de ${formatNumber(
          snapshot.overTarget,
        )} jours, mais il ne reste que ${formatNumber(
          snapshot.reducibleDays,
        )} jours travaillés futurs modifiables dans le planning.`;
      }

      return `Vous dépassez l'objectif de ${formatNumber(
        snapshot.overTarget,
      )} jours. Il faut transformer ${formatNumber(
        snapshot.overTarget,
      )} jours travaillés futurs en congés, fermetures ou demi-journées.`;
    }

    if (snapshot.remainingTarget <= 0) {
      return "L'objectif annuel est atteint. N'ajoutez pas plus de jours travaillés.";
    }

    if (snapshot.recoverableDays <= 0) {
      return "Il n'y a plus de jours récupérables dans le planning actuel pour atteindre l'objectif.";
    }

    if (snapshot.recoverableDays < snapshot.remainingTarget) {
      return `Il manque encore ${formatNumber(
        snapshot.remainingTarget,
      )} jours à récupérer, mais le planning ne contient que ${formatNumber(
        snapshot.recoverableDays,
      )} jours récupérables.`;
    }

    return `Il faut reconvertir ${formatNumber(
      snapshot.remainingTarget,
    )} jours de votre planning en jours travaillés. Cela représente ${formatNumber(
      snapshot.requiredUtilizationRate * 100,
    )} % des jours récupérables.`;
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
    elements.notWorkedDaysValue.textContent = formatNumber(
      snapshot.notWorkedDays,
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
    if (snapshot.adjustmentMode === "recover") {
      elements.adjustableDaysCard.hidden = false;
      elements.requiredShareCard.hidden = false;
      elements.remainingCapacityLabel.textContent = "Jours récupérables";
      elements.remainingWorkableValue.textContent = formatNumber(
        snapshot.recoverableDays,
      );
      elements.requiredMetricLabel.textContent = "Part à récupérer";
      elements.requiredPaceValue.textContent =
        snapshot.recoverableDays > 0
          ? `${formatNumber(snapshot.requiredUtilizationRate * 100)} %`
          : "n/a";
    } else {
      elements.adjustableDaysCard.hidden = true;
      elements.requiredShareCard.hidden = true;
    }
    elements.statusValue.textContent = snapshot.statusLabel;
    elements.statusCard.dataset.tone = snapshot.statusTone;
    elements.paceCopy.textContent = buildPaceCopy(snapshot);
    elements.calendarCaption.textContent = `${snapshot.totalLegalWorkdays} jours ouvrables théoriques, ${snapshot.holidaysByIso.size} jours fériés générés, ${snapshot.vacationDays} congés saisis.`;
  }

  function renderSessionInfo() {
    const overrideCount = Object.keys(state.dayOverrides).length;
    const sessionId = state.meta?.sessionId || "";
    elements.sessionIdValue.textContent = sessionId
      ? sessionId.slice(0, 8).toUpperCase()
      : "—";
    elements.sessionIdValue.title = sessionId;
    elements.sessionCreatedValue.textContent = formatDateTime(
      state.meta?.createdAt,
    );
    elements.sessionUpdatedValue.textContent = formatDateTime(
      state.meta?.updatedAt,
    );
    elements.sessionOverridesValue.textContent = formatNumber(overrideCount);
    elements.sessionSizeValue.textContent = formatBytes(
      getSerializedStateSize(state),
    );

    if (!elements.sessionFeedback.textContent.trim()) {
      setSessionFeedback(
        "Les données restent dans ce navigateur tant que vous ne videz pas la session.",
        "neutral",
      );
    }
  }

  function downloadSessionExport() {
    const exportPayload = JSON.stringify(
      {
        application: "calculette-jours-homme",
        exportedAt: new Date().toISOString(),
        state,
      },
      null,
      2,
    );
    const filename = `calculette-jours-homme-${state.year}-${toIsoDate(
      new Date(),
    )}.json`;
    const downloadUrl = URL.createObjectURL(
      new Blob([exportPayload], { type: "application/json" }),
    );
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.click();
    setTimeout(function revokeDownloadUrl() {
      URL.revokeObjectURL(downloadUrl);
    }, 0);
    setSessionFeedback(`Export créé : ${filename}.`, "success");
  }

  function readTextFile(file) {
    return new Promise(function readFile(resolve, reject) {
      const fileReader = new FileReader();
      fileReader.onload = function handleLoad() {
        resolve(String(fileReader.result || ""));
      };
      fileReader.onerror = function handleError() {
        reject(new Error("read_error"));
      };
      fileReader.readAsText(file);
    });
  }

  async function handleSessionImport(event) {
    const selectedFile = event.target.files && event.target.files[0];
    if (!selectedFile) {
      return;
    }

    try {
      const rawContent = await readTextFile(selectedFile);
      const parsedContent = JSON.parse(rawContent);
      const importedState =
        parsedContent &&
        typeof parsedContent === "object" &&
        parsedContent.state
          ? parsedContent.state
          : parsedContent;

      state = saveState(sanitizeState(importedState));
      clearSelection();
      render();
      setSessionFeedback(`Import réussi depuis ${selectedFile.name}.`, "success");
    } catch {
      setSessionFeedback("Import impossible : fichier JSON invalide.", "error");
    } finally {
      elements.sessionImportInput.value = "";
    }
  }

  function handleYearReset() {
    state = resetState(state.year);
    clearSelection();
    render();
    setSessionFeedback(
      `Les données de ${state.year} ont été réinitialisées.`,
      "neutral",
    );
  }

  function handleSessionClear() {
    state = saveState(removeStoredState());
    clearSelection();
    render();
    setSessionFeedback("La session locale a été vidée et recréée.", "neutral");
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
    renderSessionInfo();
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
      clearSelection();
    }
    persistState();
    render();
  }

  elements.settingsForm.addEventListener("input", updateStateFromInputs);
  elements.settingsForm.addEventListener("change", updateStateFromInputs);
  elements.exportSessionButton.addEventListener("click", downloadSessionExport);
  elements.importSessionButton.addEventListener("click", function openImportDialog() {
    elements.sessionImportInput.click();
  });
  elements.sessionImportInput.addEventListener("change", handleSessionImport);
  elements.resetYearButton.addEventListener("click", handleYearReset);
  elements.clearSessionButton.addEventListener("click", handleSessionClear);
  document.addEventListener("keydown", handleKeyboardShortcuts);

  render();
})(window);
