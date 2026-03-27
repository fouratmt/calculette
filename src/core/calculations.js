(function attachCalculations(global) {
  const { getFrenchHolidays } = global.Calculette.holidays;
  const {
    getMonthDays,
    isWeekend,
    startOfToday,
    toIsoDate,
  } = global.Calculette.dateUtils;

  const STATUS_META = {
    available: {
      label: "Disponible",
      shortLabel: "",
      blocked: false,
      countedValue: 0,
      remainingCapacity: 1,
    },
    worked: {
      label: "Travaillé",
      shortLabel: "1",
      blocked: false,
      countedValue: 1,
      remainingCapacity: 0,
    },
    half_day: {
      label: "Travaillé 0,5",
      shortLabel: "0,5",
      blocked: false,
      countedValue: 0.5,
      remainingCapacity: 0.5,
    },
    vacation: {
      label: "Congé",
      shortLabel: "CP",
      blocked: false,
      countedValue: 0,
      remainingCapacity: 1,
    },
    closed: {
      label: "Fermé",
      shortLabel: "FER",
      blocked: true,
      countedValue: 0,
      remainingCapacity: 0,
    },
    holiday: {
      label: "Jour férié",
      shortLabel: "JF",
      blocked: true,
      countedValue: 0,
      remainingCapacity: 0,
    },
    weekend: {
      label: "Week-end",
      shortLabel: "WE",
      blocked: true,
      countedValue: 0,
      remainingCapacity: 0,
    },
  };

  function getDefaultDayRecord(date, state, holidaysByIso) {
    const isoDate = toIsoDate(date);
    const holiday = holidaysByIso.get(isoDate) || null;

    // Prefer the holiday label over weekend when both fall on the same date.
    if (holiday) {
      return {
        status: holiday.status,
        source: "holiday",
        holidayName: holiday.name,
        holidayShortLabel: holiday.shortLabel,
      };
    }

    if (state.settings.weekendsAreBlocked && isWeekend(date)) {
      return {
        status: "weekend",
        source: "rule",
        holidayName: null,
        holidayShortLabel: "",
      };
    }

    return {
      status: "worked",
      source: "default",
      holidayName: null,
      holidayShortLabel: "",
    };
  }

  function isLegalNonWorkingDay(date, holidaysByIso) {
    if (isWeekend(date)) {
      return true;
    }

    return holidaysByIso.has(toIsoDate(date));
  }

  function isForcedOffStatus(status) {
    return status === "closed" || status === "holiday" || status === "weekend";
  }

  function getRecoverableCapacity(status) {
    if (status === "vacation") {
      return 1;
    }

    if (status === "half_day") {
      return 0.5;
    }

    if (status === "available") {
      return 1;
    }

    return 0;
  }

  function getReducibleCapacity(status) {
    if (status === "worked") {
      return 1;
    }

    if (status === "half_day") {
      return 0.5;
    }

    return 0;
  }

  function getNotWorkedEquivalent(status) {
    if (status === "vacation" || status === "closed" || status === "available") {
      return 1;
    }

    if (status === "half_day") {
      return 0.5;
    }

    return 0;
  }

  function getStatusTone(
    overTarget,
    requiredUtilizationRate,
    remainingTarget,
    remainingCapacity,
  ) {
    if (overTarget > 0) {
      return "over_target";
    }

    if (remainingTarget <= 0) {
      return "target_reached";
    }

    if (remainingCapacity <= 0) {
      return "impossible";
    }

    if (requiredUtilizationRate > 1) {
      return "impossible";
    }

    if (requiredUtilizationRate > 0.9) {
      return "behind";
    }

    if (requiredUtilizationRate > 0.75) {
      return "at_risk";
    }

    if (requiredUtilizationRate > 0.55) {
      return "on_track";
    }

    return "ahead";
  }

  function getStatusLabel(tone) {
    switch (tone) {
      case "over_target":
        return "Dépassé";
      case "target_reached":
        return "Objectif atteint";
      case "ahead":
        return "Confortable";
      case "on_track":
        return "Faisable";
      case "at_risk":
        return "À ajuster";
      case "behind":
        return "Limite";
      default:
        return "Impossible";
    }
  }

  function buildYearSnapshot(state, referenceDate) {
    const effectiveReferenceDate = referenceDate || startOfToday();
    const holidaysByIso = getFrenchHolidays(state.year);
    const recordsByIso = new Map();
    const monthlyStats = Array.from({ length: 12 }, function buildMonthStat() {
      return {
        legalWorkdays: 0,
        workedEquivalentDays: 0,
      };
    });

    let workedEquivalentDays = 0;
    let totalLegalWorkdays = 0;
    let recoverableDays = 0;
    let reducibleDays = 0;
    let forcedOffDays = 0;
    let closedDays = 0;
    let vacationDays = 0;
    let notWorkedDays = 0;

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthDays = getMonthDays(state.year, monthIndex);

      for (const date of monthDays) {
        const record = getEffectiveDayRecord(date, state, holidaysByIso);
        const isoDate = toIsoDate(date);
        recordsByIso.set(isoDate, record);

        const meta = STATUS_META[record.status] || STATUS_META.available;
        if (meta.countedValue > 0) {
          workedEquivalentDays += meta.countedValue;
          monthlyStats[monthIndex].workedEquivalentDays += meta.countedValue;
        }

        if (!isLegalNonWorkingDay(date, holidaysByIso)) {
          totalLegalWorkdays += 1;
          monthlyStats[monthIndex].legalWorkdays += 1;
        }

        if (isForcedOffStatus(record.status)) {
          forcedOffDays += 1;
        }

        if (record.status === "closed") {
          closedDays += 1;
        }

        if (record.status === "vacation") {
          vacationDays += 1;
        }

        notWorkedDays += getNotWorkedEquivalent(record.status);

        const isRemainingWindow =
          state.year > effectiveReferenceDate.getFullYear() ||
          (state.year === effectiveReferenceDate.getFullYear() &&
            date >= effectiveReferenceDate);

        if (isRemainingWindow) {
          recoverableDays += getRecoverableCapacity(record.status);
          reducibleDays += getReducibleCapacity(record.status);
        }
      }
    }

    const overTarget = Math.max(0, workedEquivalentDays - state.targetDays);
    const remainingTarget = Math.max(0, state.targetDays - workedEquivalentDays);
    const adjustmentMode =
      overTarget > 0 ? "reduce" : remainingTarget > 0 ? "recover" : "none";
    const remainingWorkableDays =
      adjustmentMode === "reduce" ? reducibleDays : adjustmentMode === "recover" ? recoverableDays : 0;
    const requiredUtilizationRate =
      remainingWorkableDays > 0 ? remainingTarget / remainingWorkableDays : 0;
    const statusTone = getStatusTone(
      overTarget,
      adjustmentMode === "reduce" && reducibleDays > 0
        ? overTarget / reducibleDays
        : requiredUtilizationRate,
      remainingTarget,
      remainingWorkableDays,
    );

    return {
      recordsByIso,
      holidaysByIso,
      monthlyStats,
      workedEquivalentDays,
      totalLegalWorkdays,
      forcedOffDays,
      closedDays,
      vacationDays,
      notWorkedDays,
      overTarget,
      remainingTarget,
      recoverableDays,
      reducibleDays,
      adjustmentMode,
      remainingWorkableDays,
      requiredUtilizationRate:
        adjustmentMode === "reduce" && reducibleDays > 0
          ? overTarget / reducibleDays
          : requiredUtilizationRate,
      statusTone,
      statusLabel: getStatusLabel(statusTone),
    };
  }

  function getEffectiveDayRecord(date, state, holidaysByIso) {
    const isoDate = toIsoDate(date);
    const overrideStatus = state.dayOverrides[isoDate];
    const holiday = holidaysByIso.get(isoDate) || null;

    if (overrideStatus) {
      return {
        status: overrideStatus,
        source: "override",
        holidayName: holiday ? holiday.name : null,
        holidayShortLabel: holiday ? holiday.shortLabel : "",
      };
    }

    return getDefaultDayRecord(date, state, holidaysByIso);
  }

  global.Calculette.calculations = {
    STATUS_META,
    buildYearSnapshot,
    getDefaultDayRecord,
    getEffectiveDayRecord,
  };
})(window);
