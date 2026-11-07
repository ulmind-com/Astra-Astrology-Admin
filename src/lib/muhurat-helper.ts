/**
 * Vedic Panchang, Choghadiya & Muhurat Calculation Engine (Admin helper).
 *
 * Evaluates any consultation time slot against traditional Vedic Muhurat principles:
 * - Abhijit Muhurat (universal midday victory window, 11:45 AM - 12:35 PM IST)
 * - 7 Classical Choghadiyas: Amrit (অমৃত), Shubh (শুভ), Labh (লাভ), Char (চর), Udveg (উদ্বেগ), Kaal (কাল), Rog (রোগ)
 * - Rahu Kaal (রাহুকাল), Yamaghanta Kaal (যমঘণ্ট কাল), Gulika Kaal (গুলিকা কাল) Shield & Alert System
 * - Auspicious Timings: Abhijit, Amrit Kaal, Ravi Yoga, Shubh Choghadiya
 */

export type MuhuratQuality =
  | "super_auspicious"
  | "auspicious"
  | "neutral"
  | "inauspicious"
  | "remedial"
  | "normal";

export interface SlotMuhuratInfo {
  choghadiya: string;
  quality: MuhuratQuality;
  is_abhijit: boolean;
  is_rahu_kaal: boolean;
  is_yamaghanta?: boolean;
  is_gulika?: boolean;
  is_amrit?: boolean;
  is_ravi_yoga?: boolean;
  tagColor?: "gold" | "green" | "red" | "amber" | "slate";
  badge: string;
  badgeBn: string;
  badgeHi: string;
  badgeEn: string;
  shortTagBn?: string;
  shortTagEn?: string;
  descriptionBn: string;
  descriptionHi: string;
  descriptionEn: string;
}

export const DAY_CHOGHADIYA: string[][] = [
  ["amrit", "kaal", "shubh", "rog", "udveg", "char", "labh", "amrit"],
  ["rog", "udveg", "char", "labh", "amrit", "kaal", "shubh", "rog"],
  ["labh", "amrit", "kaal", "shubh", "rog", "udveg", "char", "labh"],
  ["shubh", "rog", "udveg", "char", "labh", "amrit", "kaal", "shubh"],
  ["char", "labh", "amrit", "kaal", "shubh", "rog", "udveg", "char"],
  ["kaal", "shubh", "rog", "udveg", "char", "labh", "amrit", "kaal"],
  ["udveg", "char", "labh", "amrit", "kaal", "shubh", "rog", "udveg"],
];

export const NIGHT_CHOGHADIYA: string[][] = [
  ["char", "rog", "kaal", "labh", "udveg", "shubh", "amrit", "char"],
  ["kaal", "labh", "udveg", "shubh", "amrit", "char", "rog", "kaal"],
  ["udveg", "shubh", "amrit", "char", "rog", "kaal", "labh", "udveg"],
  ["amrit", "char", "rog", "kaal", "labh", "udveg", "shubh", "amrit"],
  ["rog", "kaal", "labh", "udveg", "shubh", "amrit", "char", "rog"],
  ["labh", "udveg", "shubh", "amrit", "char", "rog", "kaal", "labh"],
  ["shubh", "amrit", "char", "rog", "kaal", "labh", "udveg", "shubh"],
];

export const RAHU_KAAL_WINDOWS: Record<number, [number, number]> = {
  0: [7.5, 9.0],    // Mon 07:30 - 09:00 IST
  1: [15.0, 16.5],  // Tue 15:00 - 16:30 IST
  2: [12.0, 13.5],  // Wed 12:00 - 13:30 IST
  3: [13.5, 15.0],  // Thu 13:30 - 15:00 IST
  4: [10.5, 12.0],  // Fri 10:30 - 12:00 IST
  5: [9.0, 10.5],   // Sat 09:00 - 10:30 IST
  6: [16.5, 18.0],  // Sun 16:30 - 18:00 IST
};

export const YAMAGHANTA_WINDOWS: Record<number, [number, number]> = {
  0: [10.5, 12.0],  // Mon 10:30 - 12:00 IST
  1: [9.0, 10.5],   // Tue 09:00 - 10:30 IST
  2: [7.5, 9.0],    // Wed 07:30 - 09:00 IST
  3: [6.0, 7.5],    // Thu 06:00 - 07:30 IST
  4: [15.0, 16.5],  // Fri 15:00 - 16:30 IST
  5: [13.5, 15.0],  // Sat 13:30 - 15:00 IST
  6: [12.0, 13.5],  // Sun 12:00 - 13:30 IST
};

export const GULIKA_WINDOWS: Record<number, [number, number]> = {
  0: [13.5, 15.0],  // Mon 13:30 - 15:00 IST
  1: [12.0, 13.5],  // Tue 12:00 - 13:30 IST
  2: [10.5, 12.0],  // Wed 10:30 - 12:00 IST
  3: [9.0, 10.5],   // Thu 09:00 - 10:30 IST
  4: [7.5, 9.0],    // Fri 07:30 - 09:00 IST
  5: [6.0, 7.5],    // Sat 06:00 - 07:30 IST
  6: [15.0, 16.5],  // Sun 15:00 - 16:30 IST
};

export function formatDecimalHoursIST(dec: number): string {
  let h = Math.floor(dec);
  let m = Math.round((dec - h) * 60);
  if (m >= 60) {
    h += 1;
    m = 0;
  }
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 || h === 12 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export interface PanchangKaalTimes {
  date: Date;
  dayName: string;
  rahuKaal: { start: number; end: number; formatted: string };
  yamaghanta: { start: number; end: number; formatted: string };
  gulika: { start: number; end: number; formatted: string };
  abhijit: { start: number; end: number; formatted: string };
}

export function getPanchangKaalTimes(date: Date): PanchangKaalTimes {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const istDate = new Date(utcMs + 5.5 * 3600_000);
  const dayOfWeek = istDate.getDay();
  const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const [rS, rE] = RAHU_KAAL_WINDOWS[weekday] || [16.5, 18.0];
  const [yS, yE] = YAMAGHANTA_WINDOWS[weekday] || [12.0, 13.5];
  const [gS, gE] = GULIKA_WINDOWS[weekday] || [15.0, 16.5];

  return {
    date: istDate,
    dayName: istDate.toLocaleDateString("en-US", { weekday: "long" }),
    rahuKaal: { start: rS, end: rE, formatted: `${formatDecimalHoursIST(rS)} – ${formatDecimalHoursIST(rE)}` },
    yamaghanta: { start: yS, end: yE, formatted: `${formatDecimalHoursIST(yS)} – ${formatDecimalHoursIST(yE)}` },
    gulika: { start: gS, end: gE, formatted: `${formatDecimalHoursIST(gS)} – ${formatDecimalHoursIST(gE)}` },
    abhijit: { start: 11.75, end: 12.58, formatted: "11:45 AM – 12:35 PM" },
  };
}

export interface RahuKaalCheckResult {
  hasRahuKaalCollision: boolean;
  hasYamaghantaCollision: boolean;
  hasGulikaCollision: boolean;
  hasAbhijitIntersection: boolean;
  rahuKaalLabel: string;
  yamaghantaLabel: string;
  gulikaLabel: string;
  abhijitLabel: string;
  warningMessageBn?: string;
  warningMessageEn?: string;
  blessingMessageBn?: string;
  blessingMessageEn?: string;
}

export function checkRahuKaalCollision(
  date: Date,
  startHour: number,
  startMinute: number = 0,
  endHour: number = 0,
  endMinute: number = 0,
): RahuKaalCheckResult {
  const times = getPanchangKaalTimes(date);
  const slotStart = startHour + startMinute / 60.0;
  const slotEnd = endHour + endMinute / 60.0;

  // Overlap condition: slotStart < kaalEnd && slotEnd > kaalStart
  const hasRahu = slotStart < times.rahuKaal.end && slotEnd > times.rahuKaal.start;
  const hasYama = slotStart < times.yamaghanta.end && slotEnd > times.yamaghanta.start;
  const hasGulika = slotStart < times.gulika.end && slotEnd > times.gulika.start;
  const hasAbhijit = slotStart < times.abhijit.end && slotEnd > times.abhijit.start;

  let warningBn: string | undefined;
  let warningEn: string | undefined;

  if (hasRahu) {
    warningBn = `Today ${times.rahuKaal.formatted} is Rahu Kaal. Do you still wish to open this slot?`;
    warningEn = `Today ${times.rahuKaal.formatted} is Rahu Kaal. Do you still wish to open this slot?`;
  } else if (hasYama) {
    warningBn = `Today ${times.yamaghanta.formatted} is Yamaghanta Kaal. Do you wish to proceed?`;
    warningEn = `Today ${times.yamaghanta.formatted} is Yamaghanta Kaal. Do you wish to proceed?`;
  } else if (hasGulika) {
    warningBn = `Today ${times.gulika.formatted} is Gulika Kaal. Caution advised.`;
    warningEn = `Today ${times.gulika.formatted} is Gulika Kaal. Caution advised.`;
  }

  let blessingBn: string | undefined;
  let blessingEn: string | undefined;
  if (hasAbhijit) {
    blessingBn = `এই সময়টি পরম শুভ অভিজিৎ মুহূর্ত (${times.abhijit.formatted}) স্পর্শ করেছে!`;
    blessingEn = `This window coincides with supreme Abhijit Muhurat (${times.abhijit.formatted})!`;
  }

  return {
    hasRahuKaalCollision: hasRahu,
    hasYamaghantaCollision: hasYama,
    hasGulikaCollision: hasGulika,
    hasAbhijitIntersection: hasAbhijit,
    rahuKaalLabel: times.rahuKaal.formatted,
    yamaghantaLabel: times.yamaghanta.formatted,
    gulikaLabel: times.gulika.formatted,
    abhijitLabel: times.abhijit.formatted,
    warningMessageBn: warningBn,
    warningMessageEn: warningEn,
    blessingMessageBn: blessingBn,
    blessingMessageEn: blessingEn,
  };
}

export interface HourPanchangBadge {
  type: "rahu_kaal" | "yamaghanta" | "gulika" | "abhijit" | "amrit" | "shubh" | "char" | "normal";
  quality: "super_auspicious" | "auspicious" | "neutral" | "inauspicious" | "normal";
  isAuspicious: boolean;
  isInauspicious: boolean;
  tagColor: "gold" | "green" | "red" | "amber" | "slate";
  badgeBn: string;
  badgeEn: string;
  shortTagBn: string;
  shortTagEn: string;
  timeRangeLabel: string;
}

export function getHourPanchangBadge(date: Date, hour: number): HourPanchangBadge {
  const check = checkRahuKaalCollision(date, hour, 0, hour + 1, 0);
  const times = getPanchangKaalTimes(date);

  // Mid-point decimal of the hour
  const midHour = hour + 0.5;
  const isAbhijit = midHour >= 11.75 && midHour < 12.58;

  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const istDate = new Date(utcMs + 5.5 * 3600_000);
  const dayOfWeek = istDate.getDay();
  const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  let choghadiya = "shubh";
  if (midHour >= 6.0 && midHour < 18.0) {
    const partIdx = Math.max(0, Math.min(7, Math.floor((midHour - 6.0) / 1.5)));
    choghadiya = DAY_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  } else {
    const nightHours = midHour >= 18.0 ? midHour - 18.0 : midHour + 6.0;
    const partIdx = Math.max(0, Math.min(7, Math.floor(nightHours / 1.5)));
    choghadiya = NIGHT_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  }

  // Precedence: Abhijit > Amrit > Rahu Kaal > Yamaghanta > Gulika > Shubh > Char > Normal
  if (isAbhijit) {
    return {
      type: "abhijit",
      quality: "super_auspicious",
      isAuspicious: true,
      isInauspicious: false,
      tagColor: "gold",
      badgeBn: "অভিজিৎ মুহূর্ত (সর্বাধিক শুভ)",
      badgeEn: "Abhijit Muhurat (Highest Auspicious)",
      shortTagBn: "অভিজিৎ",
      shortTagEn: "Abhijit",
      timeRangeLabel: times.abhijit.formatted,
    };
  }

  if (choghadiya === "amrit") {
    return {
      type: "amrit",
      quality: "super_auspicious",
      isAuspicious: true,
      isInauspicious: false,
      tagColor: "gold",
      badgeBn: "অমৃত কাল (পরম শুভ যোগ)",
      badgeEn: "Amrit Kaal (Divine Auspicious)",
      shortTagBn: "অমৃত কাল",
      shortTagEn: "Amrit Kaal",
      timeRangeLabel: "Amrit Muhurat",
    };
  }

  if (check.hasRahuKaalCollision) {
    return {
      type: "rahu_kaal",
      quality: "inauspicious",
      isAuspicious: false,
      isInauspicious: true,
      tagColor: "red",
      badgeBn: `রাহুকাল (${times.rahuKaal.formatted})`,
      badgeEn: `Rahu Kaal (${times.rahuKaal.formatted})`,
      shortTagBn: "রাহুকাল",
      shortTagEn: "Rahu Kaal",
      timeRangeLabel: times.rahuKaal.formatted,
    };
  }

  if (check.hasYamaghantaCollision) {
    return {
      type: "yamaghanta",
      quality: "inauspicious",
      isAuspicious: false,
      isInauspicious: true,
      tagColor: "amber",
      badgeBn: `যমঘণ্ট কাল (${times.yamaghanta.formatted})`,
      badgeEn: `Yamaghanta (${times.yamaghanta.formatted})`,
      shortTagBn: "যমঘণ্ট",
      shortTagEn: "Yamaghanta",
      timeRangeLabel: times.yamaghanta.formatted,
    };
  }

  if (check.hasGulikaCollision) {
    return {
      type: "gulika",
      quality: "inauspicious",
      isAuspicious: false,
      isInauspicious: true,
      tagColor: "amber",
      badgeBn: `গুলিকা কাল (${times.gulika.formatted})`,
      badgeEn: `Gulika Kaal (${times.gulika.formatted})`,
      shortTagBn: "গুলিকা",
      shortTagEn: "Gulika",
      timeRangeLabel: times.gulika.formatted,
    };
  }

  if (choghadiya === "shubh" || choghadiya === "labh") {
    const label = choghadiya === "shubh" ? "শুভ" : "লাভ";
    return {
      type: "shubh",
      quality: "auspicious",
      isAuspicious: true,
      isInauspicious: false,
      tagColor: "green",
      badgeBn: `${label} চোঘড়িয়া / রবি যোগ`,
      badgeEn: `${choghadiya === "shubh" ? "Shubh" : "Labh"} Muhurat / Ravi Yoga`,
      shortTagBn: `${label} যোগ`,
      shortTagEn: `${choghadiya === "shubh" ? "Shubh" : "Labh"} Yoga`,
      timeRangeLabel: `${label} যোগ`,
    };
  }

  if (choghadiya === "char") {
    return {
      type: "char",
      quality: "neutral",
      isAuspicious: false,
      isInauspicious: false,
      tagColor: "slate",
      badgeBn: "চর মুহূর্ত (গতিশীল)",
      badgeEn: "Char Muhurat (Active)",
      shortTagBn: "চর কাল",
      shortTagEn: "Char Kaal",
      timeRangeLabel: "চর মুহূর্ত",
    };
  }

  return {
    type: "normal",
    quality: "normal",
    isAuspicious: false,
    isInauspicious: false,
    tagColor: "slate",
    badgeBn: "সাধারণ সময়",
    badgeEn: "Standard Slot",
    shortTagBn: "সাধারণ",
    shortTagEn: "Standard",
    timeRangeLabel: "Standard",
  };
}

export function getSlotMuhurat(date: Date, lang: "bn" | "hi" | "en" = "en"): SlotMuhuratInfo {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const istDate = new Date(utcMs + 5.5 * 3600_000);

  const dayOfWeek = istDate.getDay();
  const weekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const hourDecimal = istDate.getHours() + istDate.getMinutes() / 60.0;

  let is_rahu_kaal = false;
  if (RAHU_KAAL_WINDOWS[weekday]) {
    const [rStart, rEnd] = RAHU_KAAL_WINDOWS[weekday];
    if (hourDecimal >= rStart && hourDecimal < rEnd) {
      is_rahu_kaal = true;
    }
  }

  let is_yamaghanta = false;
  if (YAMAGHANTA_WINDOWS[weekday]) {
    const [yStart, yEnd] = YAMAGHANTA_WINDOWS[weekday];
    if (hourDecimal >= yStart && hourDecimal < yEnd) {
      is_yamaghanta = true;
    }
  }

  let is_gulika = false;
  if (GULIKA_WINDOWS[weekday]) {
    const [gStart, gEnd] = GULIKA_WINDOWS[weekday];
    if (hourDecimal >= gStart && hourDecimal < gEnd) {
      is_gulika = true;
    }
  }

  const is_abhijit = hourDecimal >= 11.75 && hourDecimal < 12.58;

  let choghadiya = "shubh";
  if (hourDecimal >= 6.0 && hourDecimal < 18.0) {
    const partIdx = Math.max(0, Math.min(7, Math.floor((hourDecimal - 6.0) / 1.5)));
    choghadiya = DAY_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  } else {
    const nightHours = hourDecimal >= 18.0 ? hourDecimal - 18.0 : hourDecimal + 6.0;
    const partIdx = Math.max(0, Math.min(7, Math.floor(nightHours / 1.5)));
    choghadiya = NIGHT_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  }

  const is_amrit = choghadiya === "amrit";
  const is_ravi_yoga = (choghadiya === "shubh" || choghadiya === "labh") && !is_rahu_kaal && !is_yamaghanta;

  let quality: MuhuratQuality = "normal";
  let tagColor: "gold" | "green" | "red" | "amber" | "slate" = "slate";
  let badgeBn = "সাধারণ সময়";
  let badgeHi = "सामान्य समय";
  let badgeEn = "Standard Slot";
  let shortTagBn = "সাধারণ";
  let shortTagEn = "Standard";
  let descBn = "নিয়মিত জ্যোতিষ পরামর্শের জন্য উন্মুক্ত সময়।";
  let descHi = "नियमित ज्योतिष परामर्श हेतु उपयुक्त समय।";
  let descEn = "Standard window suitable for astrological consultation.";

  if (is_abhijit) {
    quality = "super_auspicious";
    tagColor = "gold";
    badgeBn = "অভিজিৎ মুহূর্ত (পরম শুভ)";
    badgeHi = "अभिजित मुहूर्त (परम शुभ)";
    badgeEn = "Abhijit Muhurat (Highest Auspicious)";
    shortTagBn = "অভিজিৎ";
    shortTagEn = "Abhijit";
    descBn = "সর্বকার্য সিদ্ধিদায়ক সর্বশ্রেষ্ঠ বৈদিক বিজয় মুহূর্ত।";
    descHi = "सर्वकार्य सिद्धिकारक श्रेष्ठ वैदिक विजय मुहूर्त।";
    descEn = "Supreme Vedic victory window granting auspicious outcomes.";
  } else if (is_amrit) {
    quality = "super_auspicious";
    tagColor = "gold";
    badgeBn = "অমৃত কাল (পরম শুভ)";
    badgeHi = "अमृत मुहूर्त (परम शुभ)";
    badgeEn = "Amrit Kaal (Divine Best)";
    shortTagBn = "অমৃত কাল";
    shortTagEn: "Amrit Kaal";
    descBn = "অমৃতসম শুভ ফল প্রদানকারী অতি পবিত্র যোগ।";
    descHi = "अमृतमय शुभ फल प्रदायक अति पवित्र योग।";
    descEn = "Divine nectar window bestowing peak spiritual clarity.";
  } else if (is_rahu_kaal) {
    quality = "inauspicious";
    tagColor = "red";
    badgeBn = "রাহু কাল (অশুভ / প্রতিকার আলোচনা)";
    badgeHi = "राहु काल (उपाय चर्चा)";
    badgeEn = "Rahu Kaal (Remedial Focus)";
    shortTagBn = "রাহুকাল";
    shortTagEn = "Rahu Kaal";
    descBn = "গ্রহদোষ শান্তি ও তান্ত্রিক/আধ্যাত্মিক প্রতিকারের উপযুক্ত সময়।";
    descHi = "ग्रहदोष शांति एवं आध्यात्मिक उपायों हेतु उत्तम समय।";
    descEn = "Ideal for dosha pacification and powerful remedial remedies.";
  } else if (is_yamaghanta) {
    quality = "inauspicious";
    tagColor = "amber";
    badgeBn = "যমঘণ্ট কাল (অশুভ সময়)";
    badgeHi = "यमघंट काल (अशुभ)";
    badgeEn = "Yamaghanta Kaal (Inauspicious)";
    shortTagBn = "যমঘণ্ট";
    shortTagEn = "Yamaghanta";
    descBn = "যমঘণ্ট কাল চলাকালীন সতর্কতা বাঞ্ছনীয়।";
    descHi = "यमघंट काल में सावधानी आवश्यक है।";
    descEn = "Yamaghanta window requires mindfulness.";
  } else if (is_gulika) {
    quality = "inauspicious";
    tagColor = "amber";
    badgeBn = "গুলিকা কাল (সতর্ক সময়)";
    badgeHi = "गुलिका काल (सावधानी)";
    badgeEn = "Gulika Kaal (Cautionary)";
    shortTagBn = "গুলিকা";
    shortTagEn = "Gulika";
    descBn = "গুলিকা কাল শান্ত মননে ব্যয় করার উপযুক্ত।";
    descHi = "गुलिका काल ध्यान हेतु उपयुक्त समय।";
    descEn = "Gulika period suited for quiet reflection.";
  } else if (choghadiya === "shubh" || choghadiya === "labh") {
    quality = "auspicious";
    tagColor = "green";
    const name = choghadiya === "shubh" ? "শুভ" : "লাভ";
    badgeBn = `${name} চোঘড়িয়া / রবি যোগ`;
    badgeHi = `${choghadiya === "shubh" ? "शुभ" : "लाभ"} मुहूर्त / रवि योग`;
    badgeEn = `${choghadiya === "shubh" ? "Shubh" : "Labh"} Muhurat / Ravi Yoga`;
    shortTagBn = `${name} যোগ`;
    shortTagEn = `${choghadiya === "shubh" ? "Shubh" : "Labh"} Yoga`;
    descBn = "কর্ম ও আর্থিক প্রসারের জন্য অত্যন্ত কল্যাণকর সময়।";
    descHi = "कर्म एवं आर्थिक समृद्धि हेतु अत्यंत कल्याणकारी समय।";
    descEn = "Highly favorable for career, wealth and auspicious remedies.";
  } else if (choghadiya === "char") {
    quality = "neutral";
    tagColor = "slate";
    badgeBn = "চর মুহূর্ত";
    badgeHi = "चर मुहूर्त";
    badgeEn = "Char Muhurat";
    shortTagBn = "চর কাল";
    shortTagEn = "Char Kaal";
    descBn = "যাত্রা, পরিবর্তন ও গতিশীল সিদ্ধান্ত আলোচনার অনুকূল সময়।";
    descHi = "यात्रा, स्थानांतरण एवं गतिशील निर्णयों हेतु उपयुक्त समय।";
    descEn = "Active window recommended for relocation or fast decisions.";
  }

  const badge = lang === "bn" ? badgeBn : lang === "hi" ? badgeHi : badgeEn;

  return {
    choghadiya,
    quality,
    is_abhijit,
    is_rahu_kaal,
    is_yamaghanta,
    is_gulika,
    is_amrit,
    is_ravi_yoga,
    tagColor,
    badge,
    badgeBn,
    badgeHi,
    badgeEn,
    shortTagBn,
    shortTagEn,
    descriptionBn: descBn,
    descriptionHi: descHi,
    descriptionEn: descEn,
  };
}
