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
    ensureYearState,
    getYearState,
    loadState,
    removeStoredState,
    resetYearState,
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
  const mobileViewportQuery =
    typeof global.matchMedia === "function"
      ? global.matchMedia("(max-width: 760px)")
      : null;

  let state = loadState();
  const uiState = {
    anchorDayIso: null,
    selectedDayIsos: [],
    mobilePopoverAnchorIso: null,
    mobileGesture: {
      active: false,
      pointerId: null,
      touchId: null,
      lastTouchedIso: null,
      startIso: null,
      startClientX: null,
      startClientY: null,
      startedOnSelectedDay: false,
      startedWithSingleSelection: false,
      didExtendSelection: false,
      suppressClickUntil: 0,
    },
  };
  let lastKnownMobileMode = isMobileMode();

  const elements = {
    settingsForm: document.querySelector("#settings-form"),
    yearInput: document.querySelector("#year-input"),
    targetDaysInput: document.querySelector("#target-days-input"),
    targetDaysValue: document.querySelector("#target-days-value"),
    workedTotalValue: document.querySelector("#worked-total-value"),
    notWorkedDaysValue: document.querySelector("#not-worked-days-value"),
    targetGapLabel: document.querySelector("#target-gap-label"),
    remainingTargetValue: document.querySelector("#remaining-target-value"),
    statusValue: document.querySelector("#status-value"),
    paceCopy: document.querySelector("#pace-copy"),
    calendarPanel: document.querySelector(".calendar-panel"),
    calendarCaption: document.querySelector("#calendar-caption"),
    calendarRoot: document.querySelector("#calendar-root"),
    statusCard: document.querySelector(".status-card"),
    dayEditor: document.querySelector("#day-editor"),
    selectedDayTitle: document.querySelector("#selected-day-title"),
    selectedDayHint: document.querySelector("#selected-day-hint"),
    dayActionList: document.querySelector("#day-action-list"),
    sessionUpdatedValue: document.querySelector("#session-updated-value"),
    sessionOverridesValue: document.querySelector("#session-overrides-value"),
    sessionSizeValue: document.querySelector("#session-size-value"),
    exportSessionButton: document.querySelector("#export-session-button"),
    importSessionButton: document.querySelector("#import-session-button"),
    resetYearButton: document.querySelector("#reset-year-button"),
    clearSessionButton: document.querySelector("#clear-session-button"),
    sessionImportInput: document.querySelector("#session-import-input"),
    sessionFeedback: document.querySelector("#session-feedback"),
    scrollToTopButton: document.createElement("button"),
  };

  elements.scrollToTopButton.type = "button";
  elements.scrollToTopButton.className = "scroll-to-top-button";
  elements.scrollToTopButton.textContent = "Haut";
  elements.scrollToTopButton.setAttribute("aria-label", "Revenir en haut");
  elements.scrollToTopButton.dataset.visible = "false";
  document.body.append(elements.scrollToTopButton);

  const dayActions = [
    {
      type: "status",
      status: "worked_full",
      label: "Travaillé 1",
      compactLabel: "1 j",
      shortcut: "t",
    },
    {
      type: "status",
      status: "worked_half",
      label: "Travaillé 0,5",
      compactLabel: "0,5 j",
      shortcut: "d",
    },
    {
      type: "status",
      status: "not_worked",
      label: "Congé",
      compactLabel: "Congé",
      shortcut: "c",
    },
    {
      type: "status",
      status: "company_closed",
      label: "Fermeture",
      compactLabel: "Fermé",
      shortcut: "f",
    },
    {
      type: "status",
      status: "administrative_holiday",
      label: "Jour férié",
      compactLabel: "Férié",
      shortcut: "j",
    },
    { type: "reset", label: "Réinitialiser", compactLabel: "Défaut", shortcut: "r" },
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
    return "Raccourcis : T travaillé, D demi-journée, C congé, F fermeture, J jour férié, R réinitialiser. Maj + clic sélectionne une plage. Échap annule la sélection.";
  }

  function isMobileMode() {
    if (mobileViewportQuery) {
      return mobileViewportQuery.matches;
    }

    return typeof global.innerWidth === "number" && global.innerWidth <= 760;
  }

  function resetMobileGestureState() {
    uiState.mobileGesture.active = false;
    uiState.mobileGesture.pointerId = null;
    uiState.mobileGesture.touchId = null;
    uiState.mobileGesture.lastTouchedIso = null;
    uiState.mobileGesture.startIso = null;
    uiState.mobileGesture.startClientX = null;
    uiState.mobileGesture.startClientY = null;
    uiState.mobileGesture.startedOnSelectedDay = false;
    uiState.mobileGesture.startedWithSingleSelection = false;
    uiState.mobileGesture.didExtendSelection = false;
    elements.calendarRoot.classList.remove("is-touch-selecting");
  }

  function clearSelection() {
    uiState.anchorDayIso = null;
    uiState.selectedDayIsos = [];
    uiState.mobilePopoverAnchorIso = null;
    resetMobileGestureState();
  }

  function persistState() {
    state = saveState(state);
    return state;
  }

  function getSelectedYearState() {
    return ensureYearState(state, state.year);
  }

  function buildPlanningState() {
    const selectedYearState = getYearState(state, state.year);

    return {
      year: state.year,
      targetDays: selectedYearState.targetDays,
      settings: state.settings,
      dayOverrides: selectedYearState.dayOverrides,
    };
  }

  function getTotalOverrideCount() {
    return Object.values(state.years || {}).reduce(function sumOverrides(total, yearState) {
      return total + Object.keys(yearState?.dayOverrides || {}).length;
    }, 0);
  }

  function setSessionFeedback(message, tone) {
    elements.sessionFeedback.textContent = message;
    elements.sessionFeedback.dataset.tone = tone || "neutral";
  }

  function isDayEditable(isoDate, holidaysByIso) {
    const defaultRecord = getDefaultDayRecord(
      parseIsoDate(isoDate),
      buildPlanningState(),
      holidaysByIso,
    );
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
      uiState.mobilePopoverAnchorIso = null;
      return;
    }

    if (!uiState.anchorDayIso || !editableDayIsoSet.has(uiState.anchorDayIso)) {
      uiState.anchorDayIso = uiState.selectedDayIsos[0];
    }

    if (
      !uiState.mobilePopoverAnchorIso ||
      !editableDayIsoSet.has(uiState.mobilePopoverAnchorIso)
    ) {
      uiState.mobilePopoverAnchorIso =
        uiState.selectedDayIsos[uiState.selectedDayIsos.length - 1];
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
    uiState.mobilePopoverAnchorIso = isoDate;
  }

  function selectSingleDay(isoDate, snapshot) {
    if (!isDayEditable(isoDate, snapshot.holidaysByIso)) {
      return;
    }

    uiState.anchorDayIso = isoDate;
    uiState.selectedDayIsos = [isoDate];
    uiState.mobilePopoverAnchorIso = isoDate;
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

    const planningState = buildPlanningState();
    const selectedYearState = getSelectedYearState();

    for (const isoDate of uiState.selectedDayIsos) {
      const selectedDate = parseIsoDate(isoDate);
      const defaultRecord = getDefaultDayRecord(
        selectedDate,
        planningState,
        snapshot.holidaysByIso,
      );

      if (action.type === "reset") {
        delete selectedYearState.dayOverrides[isoDate];
        continue;
      }

      if (action.status === defaultRecord.status) {
        delete selectedYearState.dayOverrides[isoDate];
      } else {
        selectedYearState.dayOverrides[isoDate] = action.status;
      }
    }

    persistState();
    render();
  }

  function getSelectionDetails(snapshot) {
    if (!uiState.selectedDayIsos.length) {
      return {
        title: "Cliquez sur un jour",
        hint:
          `Choisissez ensuite s'il est travaillé, en congé, fermé, férié ou saisi à 0,5. ${getShortcutHint()}`,
        statusLabel: null,
        uniformSelectionStatus: null,
      };
    }

    const uniformSelectionStatus = getUniformSelectionStatus(snapshot);
    const currentMeta = uniformSelectionStatus
      ? STATUS_META[uniformSelectionStatus] || STATUS_META.available
      : null;
    const statusLabel = currentMeta ? currentMeta.label : "mixte";

    if (uiState.selectedDayIsos.length === 1) {
      const selectedDate = parseIsoDate(uiState.selectedDayIsos[0]);
      return {
        title: dateFormatter.format(selectedDate),
        hint: `Statut actuel : ${statusLabel}. ${getShortcutHint()}`,
        statusLabel,
        uniformSelectionStatus,
      };
    }

    const rangeStartIso = uiState.selectedDayIsos[0];
    const rangeEndIso = uiState.selectedDayIsos[uiState.selectedDayIsos.length - 1];

    return {
      title: `${uiState.selectedDayIsos.length} jours sélectionnés`,
      hint: `Du ${rangeDateFormatter.format(
        parseIsoDate(rangeStartIso),
      )} au ${rangeDateFormatter.format(
        parseIsoDate(rangeEndIso),
      )}, week-ends exclus. Statut actuel : ${statusLabel}. ${getShortcutHint()}`,
      statusLabel,
      uniformSelectionStatus,
    };
  }

  function createDayActionButton(action, snapshot, uniformSelectionStatus, options) {
    const settings = options || {};
    const buttonLabel = settings.label || action.label;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-action-button";
    button.textContent =
      settings.includeShortcut === false
        ? buttonLabel
        : `${buttonLabel} (${action.shortcut.toUpperCase()})`;
    if (buttonLabel !== action.label) {
      button.setAttribute("aria-label", action.label);
      button.title = action.label;
    }

    for (const className of settings.classNames || []) {
      button.classList.add(className);
    }

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

    return button;
  }

  function handleDaySelection(selectionEvent, snapshot) {
    if (!selectionEvent || !selectionEvent.isoDate) {
      return;
    }

    if (
      selectionEvent.inputType === "click" &&
      isMobileMode() &&
      Date.now() < uiState.mobileGesture.suppressClickUntil
    ) {
      return;
    }

    if (
      selectionEvent.inputType === "click" &&
      !selectionEvent.extendSelection &&
      uiState.selectedDayIsos.length === 1 &&
      uiState.selectedDayIsos[0] === selectionEvent.isoDate
    ) {
      clearSelection();
      render();
      return;
    }

    if (selectionEvent.extendSelection && uiState.anchorDayIso) {
      selectDayRange(selectionEvent.isoDate, snapshot);
    } else {
      selectSingleDay(selectionEvent.isoDate, snapshot);
    }

    render();
  }

  function getInteractiveDayTile(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const dayTile = target.closest(".day-tile[data-iso-date]");
    if (
      !dayTile ||
      dayTile.disabled ||
      dayTile.classList.contains("is-locked") ||
      typeof dayTile.dataset.isoDate !== "string"
    ) {
      return null;
    }

    return dayTile;
  }

  function getInteractiveDayTileFromPoint(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    return getInteractiveDayTile(document.elementFromPoint(clientX, clientY));
  }

  function syncCalendarSelectionPreview() {
    const selectedDayIsoSet = new Set(uiState.selectedDayIsos);
    const dayTiles = elements.calendarRoot.querySelectorAll(".day-tile[data-iso-date]");

    for (const dayTile of dayTiles) {
      dayTile.classList.toggle("is-selected", selectedDayIsoSet.has(dayTile.dataset.isoDate));
    }
  }

  function getTrackedTouch(touchList) {
    if (
      !touchList ||
      typeof touchList.length !== "number" ||
      uiState.mobileGesture.touchId === null
    ) {
      return null;
    }

    for (let touchIndex = 0; touchIndex < touchList.length; touchIndex += 1) {
      if (touchList[touchIndex].identifier === uiState.mobileGesture.touchId) {
        return touchList[touchIndex];
      }
    }

    return null;
  }

  function handleCalendarPointerDown(event) {
    if (
      !isMobileMode() ||
      !event.isPrimary ||
      event.pointerType === "mouse" ||
      event.pointerType === "touch"
    ) {
      return;
    }

    const dayTile =
      getInteractiveDayTile(event.target) ||
      getInteractiveDayTileFromPoint(event.clientX, event.clientY);
    if (!dayTile) {
      return;
    }

    event.preventDefault();
    uiState.mobileGesture.active = true;
    uiState.mobileGesture.pointerId = event.pointerId;
    uiState.mobileGesture.lastTouchedIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.startIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.startedWithSingleSelection =
      uiState.selectedDayIsos.length === 1 &&
      uiState.selectedDayIsos[0] === dayTile.dataset.isoDate;
    uiState.mobileGesture.didExtendSelection = false;
    if (typeof elements.calendarRoot.setPointerCapture === "function") {
      try {
        elements.calendarRoot.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures on browsers with partial support.
      }
    }
    handleDaySelection(
      {
        isoDate: dayTile.dataset.isoDate,
        extendSelection: false,
        inputType: "pointer",
      },
      buildYearSnapshot(buildPlanningState()),
    );
  }

  function handleCalendarPointerMove(event) {
    if (
      !isMobileMode() ||
      !uiState.mobileGesture.active ||
      event.pointerType === "touch" ||
      event.pointerId !== uiState.mobileGesture.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const dayTile = getInteractiveDayTileFromPoint(event.clientX, event.clientY);
    if (
      !dayTile ||
      dayTile.dataset.isoDate === uiState.mobileGesture.lastTouchedIso
    ) {
      return;
    }

    uiState.mobileGesture.lastTouchedIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.didExtendSelection = true;
    handleDaySelection(
      {
        isoDate: dayTile.dataset.isoDate,
        extendSelection: true,
        inputType: "pointer",
      },
      buildYearSnapshot(buildPlanningState()),
    );
  }

  function finishCalendarPointerGesture(event) {
    if (
      !uiState.mobileGesture.active ||
      (event && event.pointerType === "touch") ||
      (event && event.pointerId !== uiState.mobileGesture.pointerId)
    ) {
      return;
    }

    const endedDayTile =
      event && (
        getInteractiveDayTile(event.target) ||
        getInteractiveDayTileFromPoint(event.clientX, event.clientY)
      );
    const shouldToggleSelectedDayOff =
      uiState.mobileGesture.startedWithSingleSelection &&
      !uiState.mobileGesture.didExtendSelection &&
      uiState.mobileGesture.startIso &&
      endedDayTile &&
      endedDayTile.dataset.isoDate === uiState.mobileGesture.startIso;
    const finishedPointerId = uiState.mobileGesture.pointerId;
    uiState.mobileGesture.active = false;
    uiState.mobileGesture.pointerId = null;
    uiState.mobileGesture.lastTouchedIso = null;
    uiState.mobileGesture.startIso = null;
    uiState.mobileGesture.startedWithSingleSelection = false;
    uiState.mobileGesture.didExtendSelection = false;
    uiState.mobileGesture.suppressClickUntil = Date.now() + 400;
    if (
      typeof elements.calendarRoot.releasePointerCapture === "function" &&
      finishedPointerId !== null
    ) {
      try {
        if (
          typeof elements.calendarRoot.hasPointerCapture !== "function" ||
          elements.calendarRoot.hasPointerCapture(finishedPointerId)
        ) {
          elements.calendarRoot.releasePointerCapture(finishedPointerId);
        }
      } catch {
        // Ignore capture release failures on browsers with partial support.
      }
    }

    if (shouldToggleSelectedDayOff) {
      clearSelection();
    }

    render();
  }

  function handleCalendarTouchStart(event) {
    if (!isMobileMode() || event.touches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const dayTile =
      getInteractiveDayTile(event.target) ||
      getInteractiveDayTileFromPoint(touch.clientX, touch.clientY);
    if (!dayTile) {
      return;
    }

    uiState.mobileGesture.active = true;
    uiState.mobileGesture.touchId = touch.identifier;
    uiState.mobileGesture.lastTouchedIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.startIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.startClientX = touch.clientX;
    uiState.mobileGesture.startClientY = touch.clientY;
    uiState.mobileGesture.startedOnSelectedDay = uiState.selectedDayIsos.includes(
      dayTile.dataset.isoDate,
    );
    uiState.mobileGesture.startedWithSingleSelection =
      uiState.selectedDayIsos.length === 1 &&
      uiState.selectedDayIsos[0] === dayTile.dataset.isoDate;
    uiState.mobileGesture.didExtendSelection = false;
    elements.calendarRoot.classList.add("is-touch-selecting");
  }

  function handleCalendarTouchMove(event) {
    if (!isMobileMode() || !uiState.mobileGesture.active) {
      return;
    }

    const touch = getTrackedTouch(event.touches) || getTrackedTouch(event.changedTouches);
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - uiState.mobileGesture.startClientX;
    const deltaY = touch.clientY - uiState.mobileGesture.startClientY;
    const distance = Math.hypot(deltaX, deltaY);
    const dayTile = getInteractiveDayTileFromPoint(touch.clientX, touch.clientY);
    const movedMostlyVertical =
      Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15;

    if (!uiState.mobileGesture.didExtendSelection) {
      if (
        movedMostlyVertical &&
        (!dayTile || dayTile.dataset.isoDate === uiState.mobileGesture.startIso)
      ) {
        resetMobileGestureState();
        return;
      }

      if (
        distance < 10 ||
        !dayTile ||
        dayTile.dataset.isoDate === uiState.mobileGesture.startIso
      ) {
        return;
      }
    }

    event.preventDefault();
    if (dayTile.dataset.isoDate === uiState.mobileGesture.lastTouchedIso) {
      return;
    }

    uiState.mobileGesture.lastTouchedIso = dayTile.dataset.isoDate;
    uiState.mobileGesture.didExtendSelection = true;
    const snapshot = buildYearSnapshot(buildPlanningState());

    selectSingleDay(uiState.mobileGesture.startIso, snapshot);
    selectDayRange(dayTile.dataset.isoDate, snapshot);
    syncCalendarSelectionPreview();
  }

  function finishCalendarTouchGesture(event) {
    if (!isMobileMode() || !uiState.mobileGesture.active) {
      return;
    }

    const touch = getTrackedTouch(event.changedTouches);
    if (!touch && event.type !== "touchcancel") {
      return;
    }

    const startIso = uiState.mobileGesture.startIso;
    const shouldToggleSelectedDayOff =
      uiState.mobileGesture.startedOnSelectedDay &&
      !uiState.mobileGesture.didExtendSelection &&
      Boolean(startIso);

    resetMobileGestureState();
    uiState.mobileGesture.suppressClickUntil = Date.now() + 400;

    if (!startIso) {
      return;
    }

    if (event.type === "touchcancel") {
      render();
      return;
    }

    if (shouldToggleSelectedDayOff) {
      clearSelection();
      render();
      return;
    }

    if (!uiState.selectedDayIsos.length || !uiState.selectedDayIsos.includes(startIso)) {
      selectSingleDay(startIso, buildYearSnapshot(buildPlanningState()));
    }

    render();
  }

  function isSelectionInteractionTarget(target) {
    const targetElement =
      target instanceof Element
        ? target
        : target instanceof Node
          ? target.parentElement
          : null;
    if (!targetElement) {
      return false;
    }

    return Boolean(
      targetElement.closest(
        ".day-tile[data-iso-date], .mobile-day-popover-actions, .day-action-button, #day-editor",
      ),
    );
  }

  function handleTouchStartOutsideSelection(event) {
    if (!isMobileMode() || !uiState.selectedDayIsos.length) {
      return;
    }

    if (isSelectionInteractionTarget(event.target)) {
      return;
    }

    clearSelection();
    render();
  }

  function getSelectedDayBounds() {
    if (!uiState.selectedDayIsos.length) {
      return null;
    }

    const selectedTiles = uiState.selectedDayIsos
      .map(function mapSelectedDay(isoDate) {
        return elements.calendarRoot.querySelector(`.day-tile[data-iso-date="${isoDate}"]`);
      })
      .filter(Boolean);
    if (!selectedTiles.length) {
      return null;
    }

    const initialRect = selectedTiles[0].getBoundingClientRect();

    return selectedTiles.reduce(
      function reduceBounds(bounds, dayTile) {
        const tileRect = dayTile.getBoundingClientRect();

        return {
          left: Math.min(bounds.left, tileRect.left),
          right: Math.max(bounds.right, tileRect.right),
          top: Math.min(bounds.top, tileRect.top),
          bottom: Math.max(bounds.bottom, tileRect.bottom),
        };
      },
      {
        left: initialRect.left,
        right: initialRect.right,
        top: initialRect.top,
        bottom: initialRect.bottom,
      },
    );
  }

  function updateScrollToTopButtonVisibility() {
    const shouldShow =
      isMobileMode() &&
      (global.scrollY || global.pageYOffset || 0) > 360;

    elements.scrollToTopButton.dataset.visible = shouldShow ? "true" : "false";
  }

  function scrollToTop() {
    global.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
    applyActionToSelection(matchedAction, buildYearSnapshot(buildPlanningState()));
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
      return "Le planning actuel ne contient plus de journées modifiables pour atteindre l'objectif.";
    }

    if (snapshot.recoverableDays < snapshot.remainingTarget) {
      return `Il manque encore ${formatNumber(
        snapshot.remainingTarget,
      )} jours pour atteindre l'objectif, mais le planning ne contient que ${formatNumber(
        snapshot.recoverableDays,
      )} journées encore modifiables.`;
    }

    return `Il faut reconvertir ${formatNumber(
      snapshot.remainingTarget,
    )} jours de votre planning en jours travaillés. Cela représente ${formatNumber(
      snapshot.requiredUtilizationRate * 100,
    )} % des journées encore modifiables.`;
  }

  function readTargetDaysInput() {
    const rawValue = Number(elements.targetDaysInput.value);
    if (!Number.isFinite(rawValue)) {
      return DEFAULT_TARGET_DAYS;
    }

    return clamp(rawValue, 0, 366);
  }

  function syncInputs() {
    const selectedYearState = getSelectedYearState();

    elements.yearInput.value = String(state.year);
    elements.targetDaysInput.value = String(selectedYearState.targetDays);
  }

  function renderSummary(snapshot) {
    const selectedYearState = getSelectedYearState();

    elements.targetDaysValue.textContent = formatNumber(selectedYearState.targetDays);
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
    elements.statusValue.textContent = snapshot.statusLabel;
    elements.statusCard.dataset.tone = snapshot.statusTone;
    elements.paceCopy.textContent = buildPaceCopy(snapshot);
    elements.calendarCaption.textContent = `${snapshot.totalLegalWorkdays} jours ouvrables théoriques, ${snapshot.holidaysByIso.size} jours fériés générés, ${snapshot.explicitlyNotWorkedDays} congés saisis et ${snapshot.companyClosedDays} fermetures.`;
  }

  function renderSessionInfo() {
    const overrideCount = getTotalOverrideCount();
    elements.sessionUpdatedValue.textContent = formatDateTime(
      state.meta?.updatedAt,
    );
    elements.sessionOverridesValue.textContent = formatNumber(overrideCount);
    elements.sessionSizeValue.textContent = formatBytes(
      getSerializedStateSize(state),
    );

    if (!elements.sessionFeedback.textContent.trim()) {
      setSessionFeedback(
        "Les données restent dans ce navigateur et sur cette adresse. Si vous changez de domaine, de navigateur ou d'appareil, exportez puis réimportez votre JSON.",
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
    state = resetYearState(state, state.year);
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

    const selectionDetails = getSelectionDetails(snapshot);

    if (!uiState.selectedDayIsos.length) {
      elements.dayEditor.dataset.empty = "true";
      elements.selectedDayTitle.textContent = selectionDetails.title;
      elements.selectedDayHint.textContent = selectionDetails.hint;
      return;
    }

    elements.dayEditor.dataset.empty = "false";
    elements.selectedDayTitle.textContent = selectionDetails.title;
    elements.selectedDayHint.textContent = selectionDetails.hint;

    for (const action of dayActions) {
      elements.dayActionList.append(
        createDayActionButton(
          action,
          snapshot,
          selectionDetails.uniformSelectionStatus,
        ),
      );
    }
  }

  function renderMobileDayPopover(snapshot) {
    if (
      !isMobileMode() ||
      !uiState.selectedDayIsos.length ||
      uiState.mobileGesture.active
    ) {
      return;
    }

    const anchorIso =
      uiState.mobilePopoverAnchorIso &&
      uiState.selectedDayIsos.includes(uiState.mobilePopoverAnchorIso)
        ? uiState.mobilePopoverAnchorIso
        : uiState.selectedDayIsos[uiState.selectedDayIsos.length - 1];
    const anchorTile = elements.calendarRoot.querySelector(
      `.day-tile[data-iso-date="${anchorIso}"]`,
    );
    if (!anchorTile) {
      return;
    }

    const selectionDetails = getSelectionDetails(snapshot);
    const popover = document.createElement("div");
    popover.className = "mobile-day-popover";
    popover.dataset.placement = "above";

    const heading = document.createElement("div");
    heading.className = "mobile-day-popover-heading";

    const title = document.createElement("strong");
    title.className = "mobile-day-popover-title";
    title.textContent = selectionDetails.title;

    const summary = document.createElement("span");
    summary.className = "mobile-day-popover-summary";
    summary.textContent = selectionDetails.statusLabel
      ? `Statut actuel : ${selectionDetails.statusLabel}`
      : "Choisissez un statut";

    heading.append(title, summary);

    const actionGrid = document.createElement("div");
    actionGrid.className = "mobile-day-popover-actions";

    for (const action of dayActions) {
      actionGrid.append(
        createDayActionButton(action, snapshot, selectionDetails.uniformSelectionStatus, {
          classNames: ["is-compact"],
          includeShortcut: false,
          label: action.compactLabel || action.label,
        }),
      );
    }

    popover.append(heading, actionGrid);
    elements.calendarRoot.append(popover);

    const rootRect = elements.calendarRoot.getBoundingClientRect();
    const anchorRect = anchorTile.getBoundingClientRect();
    const selectionBounds = getSelectedDayBounds() || {
      left: anchorRect.left,
      right: anchorRect.right,
      top: anchorRect.top,
      bottom: anchorRect.bottom,
    };
    const popoverRect = popover.getBoundingClientRect();
    const horizontalPadding = 8;
    const verticalOffset = 12;
    const preferredTop =
      selectionBounds.top - rootRect.top - popoverRect.height - verticalOffset;
    const fallbackTop = selectionBounds.bottom - rootRect.top + verticalOffset;
    const maxTop = Math.max(
      verticalOffset,
      elements.calendarRoot.scrollHeight - popoverRect.height - verticalOffset,
    );
    const anchorCenterX = (selectionBounds.left + selectionBounds.right) / 2;
    const left = clamp(
      anchorCenterX - rootRect.left - popoverRect.width / 2,
      horizontalPadding,
      Math.max(
        horizontalPadding,
        rootRect.width - popoverRect.width - horizontalPadding,
      ),
    );
    const placeAbove = preferredTop >= verticalOffset;

    popover.style.left = `${left}px`;
    popover.style.top = `${clamp(
      placeAbove ? preferredTop : fallbackTop,
      verticalOffset,
      maxTop,
    )}px`;
    popover.style.setProperty(
      "--mobile-popover-tip-left",
      `${clamp(anchorCenterX - rootRect.left - left, 20, popoverRect.width - 20)}px`,
    );
    popover.dataset.placement = placeAbove ? "above" : "below";
  }

  function render() {
    const planningState = buildPlanningState();
    const snapshot = buildYearSnapshot(planningState);
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
    renderMobileDayPopover(snapshot);
    updateScrollToTopButtonVisibility();
  }

  function updateStateFromInputs(event) {
    const requestedYear = Number(elements.yearInput.value);
    const nextYear = ALLOWED_YEARS.includes(requestedYear)
      ? requestedYear
      : createDefaultState().year;
    const yearChanged = state.year !== nextYear;

    state.year = nextYear;
    const selectedYearState = getSelectedYearState();

    if (event?.target === elements.targetDaysInput) {
      selectedYearState.targetDays = readTargetDaysInput();
    }

    if (
      yearChanged &&
      uiState.anchorDayIso &&
      !uiState.anchorDayIso.startsWith(`${state.year}-`)
    ) {
      clearSelection();
    }
    persistState();
    render();
  }

  function handleClickOutsideCalendar(event) {
    if (!uiState.selectedDayIsos.length) {
      return;
    }

    if (isSelectionInteractionTarget(event.target)) {
      return;
    }

    clearSelection();
    render();
  }

  function handleViewportChange() {
    const nextMobileMode = isMobileMode();
    const modeChanged = nextMobileMode !== lastKnownMobileMode;
    lastKnownMobileMode = nextMobileMode;

    if (modeChanged || (nextMobileMode && uiState.selectedDayIsos.length)) {
      render();
    }
  }

  elements.settingsForm.addEventListener("change", updateStateFromInputs);
  elements.exportSessionButton.addEventListener("click", downloadSessionExport);
  elements.importSessionButton.addEventListener("click", function openImportDialog() {
    elements.sessionImportInput.click();
  });
  elements.sessionImportInput.addEventListener("change", handleSessionImport);
  elements.resetYearButton.addEventListener("click", handleYearReset);
  elements.clearSessionButton.addEventListener("click", handleSessionClear);
  elements.scrollToTopButton.addEventListener("click", scrollToTop);
  elements.calendarRoot.addEventListener("pointerdown", handleCalendarPointerDown);
  elements.calendarRoot.addEventListener("pointermove", handleCalendarPointerMove);
  elements.calendarRoot.addEventListener("pointerup", finishCalendarPointerGesture);
  elements.calendarRoot.addEventListener(
    "pointercancel",
    finishCalendarPointerGesture,
  );
  elements.calendarRoot.addEventListener("touchstart", handleCalendarTouchStart, {
    passive: true,
  });
  document.addEventListener("touchstart", handleTouchStartOutsideSelection, {
    passive: true,
  });
  document.addEventListener("touchmove", handleCalendarTouchMove, {
    passive: false,
  });
  document.addEventListener("touchend", finishCalendarTouchGesture, {
    passive: true,
  });
  document.addEventListener("touchcancel", finishCalendarTouchGesture, {
    passive: true,
  });
  document.addEventListener("click", handleClickOutsideCalendar);
  document.addEventListener("keydown", handleKeyboardShortcuts);
  global.addEventListener("resize", handleViewportChange);
  global.addEventListener("scroll", updateScrollToTopButtonVisibility, {
    passive: true,
  });

  if (mobileViewportQuery && typeof mobileViewportQuery.addEventListener === "function") {
    mobileViewportQuery.addEventListener("change", handleViewportChange);
  } else if (mobileViewportQuery && typeof mobileViewportQuery.addListener === "function") {
    mobileViewportQuery.addListener(handleViewportChange);
  }

  render();
})(window);
