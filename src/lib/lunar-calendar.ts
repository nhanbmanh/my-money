/**
 * Vietnamese Lunar Calendar Converter (Âm lịch Việt Nam GMT+7)
 * Based on Dr. Ho Ngoc Duc's astronomical algorithm for Vietnam timezone (+7).
 */

function jdFromDate(dd: number, mm: number, yyyy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yyyy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone: number = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  const Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * M * dr) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(2 * Mpr * dr) -
    0.0004 * Math.sin(3 * Mpr * dr) +
    0.0104 * Math.sin(2 * F * dr) -
    0.0051 * Math.sin((M + Mpr) * dr) -
    0.00074 * Math.sin((M - Mpr) * dr) +
    0.0004 * Math.sin((2 * F + M) * dr) -
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr) +
    0.01 * Math.sin((2 * F - Mpr) * dr) +
    0.0005 * Math.sin((M + 2 * Mpr) * dr);
  const JdNew = Jd1 + C;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone: number = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) +
    0.00029 * Math.sin(3 * M * dr);
  let L = L0 + DL;
  L = L - 360 * Math.floor(L / 360);
  return Math.floor(L / 30);
}

function getLunarMonth11(yyyy: number, timeZone: number = 7): number {
  const off = jdFromDate(31, 12, yyyy) - 2415021;
  const k = Math.floor(off / 29.5305888);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

export function getLunarDate(date: Date, timeZone: number = 7): LunarDate {
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yyyy = date.getFullYear();

  const dayNumber = jdFromDate(dd, mm, yyyy);
  const k = Math.floor((dayNumber - 2415021) / 29.5305888);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(yyyy, timeZone);
  let b11 = a11;

  let lunarYear = yyyy;
  if (a11 >= monthStart) {
    lunarYear = yyyy;
    a11 = getLunarMonth11(yyyy - 1, timeZone);
  } else {
    lunarYear = yyyy + 1;
    b11 = getLunarMonth11(yyyy + 1, timeZone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.round((monthStart - a11) / 29.53);
  let isLeap = 0;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapk = Math.floor((a11 - 2415021) / 29.5305888);
    let lastSunLong = getSunLongitude(a11, timeZone);
    let leapIndex = -1;

    for (let i = 1; i <= Math.floor((b11 - a11) / 29.5); i++) {
      const nm = getNewMoonDay(leapk + i, timeZone);
      const sunLong = getSunLongitude(nm, timeZone);
      if (sunLong === lastSunLong) {
        leapIndex = i;
        break;
      }
      lastSunLong = sunLong;
    }

    if (leapIndex > 0) {
      if (diff > leapIndex) {
        lunarMonth = diff + 10;
      } else if (diff === leapIndex) {
        lunarMonth = diff + 10;
        isLeap = 1;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }

  let lunarYearFinal = yyyy;
  if (lunarMonth >= 11 && mm <= 2) {
    lunarYearFinal = yyyy - 1;
  } else if (lunarMonth <= 2 && mm >= 11) {
    lunarYearFinal = yyyy + 1;
  }

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYearFinal,
    isLeap: isLeap === 1,
  };
}

/**
 * Format lunar date string: e.g. "01/07 ÂL" or "15/07 ÂL"
 */
export function formatLunarDate(date: Date): string {
  const lunar = getLunarDate(date);
  const dayStr = lunar.day < 10 ? `0${lunar.day}` : `${lunar.day}`;
  const monthStr = lunar.month < 10 ? `0${lunar.month}` : `${lunar.month}`;
  return `${dayStr}/${monthStr} ÂL`;
}
