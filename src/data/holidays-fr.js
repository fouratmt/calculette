(function attachFrenchHolidays(global) {
  const { addDays, createDateAtNoon, toIsoDate } = global.Calculette.dateUtils;

  function getEasterSunday(year) {
    const century = Math.floor(year / 100);
    const yearInCentury = year % 100;
    const leapCorrection = Math.floor(century / 4);
    const remainderCentury = century % 4;
    const moonCorrection = Math.floor((century + 8) / 25);
    const correction = Math.floor((century - moonCorrection + 1) / 3);
    const goldenNumber = year % 19;
    const epact =
      (19 * goldenNumber + century - leapCorrection - correction + 15) % 30;
    const yearLeap = Math.floor(yearInCentury / 4);
    const yearRemainder = yearInCentury % 4;
    const weekDayCorrection =
      (32 + 2 * remainderCentury + 2 * yearLeap - epact - yearRemainder) % 7;
    const monthOffset = Math.floor(
      (goldenNumber + 11 * epact + 22 * weekDayCorrection) / 451,
    );
    const month = Math.floor(
      (epact + weekDayCorrection - 7 * monthOffset + 114) / 31,
    );
    const day =
      ((epact + weekDayCorrection - 7 * monthOffset + 114) % 31) + 1;

    return createDateAtNoon(year, month - 1, day);
  }

  function getFrenchHolidays(year) {
    const easterSunday = getEasterSunday(year);

    const holidays = [
      { date: createDateAtNoon(year, 0, 1), name: "Jour de l'an", shortLabel: "JF" },
      { date: addDays(easterSunday, 1), name: "Lundi de Pâques", shortLabel: "JF" },
      { date: createDateAtNoon(year, 4, 1), name: "Fête du travail", shortLabel: "JF" },
      { date: createDateAtNoon(year, 4, 8), name: "Victoire 1945", shortLabel: "JF" },
      { date: addDays(easterSunday, 39), name: "Ascension", shortLabel: "JF" },
      { date: addDays(easterSunday, 50), name: "Lundi de Pentecôte", shortLabel: "JF" },
      { date: createDateAtNoon(year, 6, 14), name: "Fête nationale", shortLabel: "JF" },
      { date: createDateAtNoon(year, 7, 15), name: "Assomption", shortLabel: "JF" },
      { date: createDateAtNoon(year, 10, 1), name: "Toussaint", shortLabel: "JF" },
      { date: createDateAtNoon(year, 10, 11), name: "Armistice 1918", shortLabel: "JF" },
      { date: createDateAtNoon(year, 11, 25), name: "Noël", shortLabel: "JF" },
    ];

    return new Map(
      holidays.map(function mapHoliday(holiday) {
        return [
          toIsoDate(holiday.date),
          Object.assign({}, holiday, {
            status: "administrative_holiday",
          }),
        ];
      }),
    );
  }

  global.Calculette.holidays = {
    getFrenchHolidays,
  };
})(window);
