(function attachStorage(global) {
  const STORAGE_KEY = "calculette-jours-homme/state";
  const DEFAULT_TARGET_DAYS = 216;
  const ALLOWED_YEARS = [2025, 2026, 2027];
  const SESSION_SCHEMA_VERSION = 1;
  const VALID_OVERRIDE_STATUSES = new Set([
    "worked",
    "half_day",
    "vacation",
    "closed",
    "holiday",
  ]);
  const LEGACY_STATUS_MAP = {
    worked_full: "worked",
    worked_half: "half_day",
    not_worked: "vacation",
    company_closed: "closed",
    mandated_day_off: "closed",
    administrative_holiday: "holiday",
    available: null,
    weekend: null,
  };

  function generateSessionId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    return `session-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function isValidTimestamp(value) {
    if (typeof value !== "string") {
      return false;
    }

    return Number.isFinite(new Date(value).getTime());
  }

  function createSessionMeta(candidateMeta) {
    const nowIso = new Date().toISOString();
    const createdAt = isValidTimestamp(candidateMeta?.createdAt)
      ? candidateMeta.createdAt
      : nowIso;
    const updatedAt = isValidTimestamp(candidateMeta?.updatedAt)
      ? candidateMeta.updatedAt
      : createdAt;

    return {
      sessionId:
        typeof candidateMeta?.sessionId === "string" &&
        candidateMeta.sessionId.trim()
          ? candidateMeta.sessionId
          : generateSessionId(),
      schemaVersion: SESSION_SCHEMA_VERSION,
      createdAt,
      updatedAt,
    };
  }

  function getDefaultYear() {
    const currentYear = new Date().getFullYear();
    if (ALLOWED_YEARS.includes(currentYear)) {
      return currentYear;
    }

    if (currentYear < ALLOWED_YEARS[0]) {
      return ALLOWED_YEARS[0];
    }

    return ALLOWED_YEARS[ALLOWED_YEARS.length - 1];
  }

  function sanitizeYear(value, fallback) {
    const parsedYear = Number(value);
    if (ALLOWED_YEARS.includes(parsedYear)) {
      return parsedYear;
    }

    return fallback;
  }

  function normalizeOverrideStatus(status) {
    if (VALID_OVERRIDE_STATUSES.has(status)) {
      return status;
    }

    if (Object.prototype.hasOwnProperty.call(LEGACY_STATUS_MAP, status)) {
      return LEGACY_STATUS_MAP[status];
    }

    return null;
  }

  function createDefaultState(year) {
    const safeYear =
      typeof year === "undefined" ? getDefaultYear() : sanitizeYear(year, getDefaultYear());

    return {
      year: safeYear,
      targetDays: DEFAULT_TARGET_DAYS,
      meta: createSessionMeta(),
      settings: {
        countryHolidayPreset: "FR",
        weekendsAreBlocked: true,
        estimationMode: "workable_days_only",
      },
      dayOverrides: {},
    };
  }

  function safeParseJson(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function sanitizeNumber(value, fallback, min, max) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    return Math.min(Math.max(parsedValue, min), max);
  }

  function sanitizeDayOverrides(candidateOverrides) {
    if (
      !candidateOverrides ||
      typeof candidateOverrides !== "object" ||
      Array.isArray(candidateOverrides)
    ) {
      return {};
    }

    const sanitizedOverrides = {};

    for (const [isoDate, rawStatus] of Object.entries(candidateOverrides)) {
      const normalizedStatus = normalizeOverrideStatus(rawStatus);
      if (normalizedStatus) {
        sanitizedOverrides[isoDate] = normalizedStatus;
      }
    }

    return sanitizedOverrides;
  }

  function sanitizeState(candidateState) {
    const fallbackState = createDefaultState();
    if (!candidateState || typeof candidateState !== "object") {
      return fallbackState;
    }

    return {
      year: sanitizeYear(candidateState.year, fallbackState.year),
      targetDays: sanitizeNumber(
        candidateState.targetDays,
        fallbackState.targetDays,
        0,
        366,
      ),
      meta: createSessionMeta(candidateState.meta),
      settings: {
        countryHolidayPreset: "FR",
        weekendsAreBlocked:
          candidateState.settings?.weekendsAreBlocked !== false,
        estimationMode: "workable_days_only",
      },
      dayOverrides: sanitizeDayOverrides(candidateState.dayOverrides),
    };
  }

  function loadState() {
    try {
      const rawState = localStorage.getItem(STORAGE_KEY);
      if (!rawState) {
        return createDefaultState();
      }

      return sanitizeState(safeParseJson(rawState));
    } catch {
      return createDefaultState();
    }
  }

  function saveState(state) {
    const sanitizedState = sanitizeState(state);
    sanitizedState.meta.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
    } catch {
      // Ignore storage failures so the UI stays functional in private browsing.
    }

    return sanitizedState;
  }

  function resetState(year) {
    return saveState(createDefaultState(year));
  }

  function removeStoredState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures to keep the UI usable.
    }

    return createDefaultState();
  }

  global.Calculette.storage = {
    ALLOWED_YEARS,
    DEFAULT_TARGET_DAYS,
    STORAGE_KEY,
    VALID_OVERRIDE_STATUSES,
    createDefaultState,
    getDefaultYear,
    loadState,
    removeStoredState,
    resetState,
    sanitizeState,
    saveState,
  };
})(window);
