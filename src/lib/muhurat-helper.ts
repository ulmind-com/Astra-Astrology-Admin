/**
 * Vedic Panchang, Choghadiya & Muhurat Calculation Engine (Admin helper).
 *
 * Evaluates any consultation time slot against traditional Vedic Muhurat principles:
 * - Abhijit Muhurat (universal midday victory window, 11:45 AM - 12:35 PM IST)
 * - 7 Classical Choghadiyas: Amrit (অমৃত), Shubh (শুভ), Labh (লাভ), Char (চর), Udveg (উদ্বেগ), Kaal (কাল), Rog (রোগ)
 * - Rahu Kaal advisory detection for remedial focus
 */

export type MuhuratQuality =
  | "super_auspicious"
  | "auspicious"
  | "neutral"
  | "remedial"
  | "normal";

export interface SlotMuhuratInfo {
  choghadiya: string;
  quality: MuhuratQuality;
  is_abhijit: boolean;
  is_rahu_kaal: boolean;
  badge: string;
  badgeBn: string;
  badgeHi: string;
  badgeEn: string;
  descriptionBn: string;
  descriptionHi: string;
  descriptionEn: string;
}

const DAY_CHOGHADIYA: string[][] = [
  ["amrit", "kaal", "shubh", "rog", "udveg", "char", "labh", "amrit"],
  ["rog", "udveg", "char", "labh", "amrit", "kaal", "shubh", "rog"],
  ["labh", "amrit", "kaal", "shubh", "rog", "udveg", "char", "labh"],
  ["shubh", "rog", "udveg", "char", "labh", "amrit", "kaal", "shubh"],
  ["char", "labh", "amrit", "kaal", "shubh", "rog", "udveg", "char"],
  ["kaal", "shubh", "rog", "udveg", "char", "labh", "amrit", "kaal"],
  ["udveg", "char", "labh", "amrit", "kaal", "shubh", "rog", "udveg"],
];

const NIGHT_CHOGHADIYA: string[][] = [
  ["char", "rog", "kaal", "labh", "udveg", "shubh", "amrit", "char"],
  ["kaal", "labh", "udveg", "shubh", "amrit", "char", "rog", "kaal"],
  ["udveg", "shubh", "amrit", "char", "rog", "kaal", "labh", "udveg"],
  ["amrit", "char", "rog", "kaal", "labh", "udveg", "shubh", "amrit"],
  ["rog", "kaal", "labh", "udveg", "shubh", "amrit", "char", "rog"],
  ["labh", "udveg", "shubh", "amrit", "char", "rog", "kaal", "labh"],
  ["shubh", "amrit", "char", "rog", "kaal", "labh", "udveg", "shubh"],
];

const RAHU_KAAL_WINDOWS: Record<number, [number, number]> = {
  0: [7.5, 9.0],    // Mon 07:30 - 09:00 IST
  1: [15.0, 16.5],  // Tue 15:00 - 16:30 IST
  2: [12.0, 13.5],  // Wed 12:00 - 13:30 IST
  3: [13.5, 15.0],  // Thu 13:30 - 15:00 IST
  4: [10.5, 12.0],  // Fri 10:30 - 12:00 IST
  5: [9.0, 10.5],   // Sat 09:00 - 10:30 IST
  6: [16.5, 18.0],  // Sun 16:30 - 18:00 IST
};

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

  const is_abhijit = hourDecimal >= 11.75 && hourDecimal < 12.55;

  let choghadiya = "shubh";
  if (hourDecimal >= 6.0 && hourDecimal < 18.0) {
    const partIdx = Math.max(0, Math.min(7, Math.floor((hourDecimal - 6.0) / 1.5)));
    choghadiya = DAY_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  } else {
    const nightHours = hourDecimal >= 18.0 ? hourDecimal - 18.0 : hourDecimal + 6.0;
    const partIdx = Math.max(0, Math.min(7, Math.floor(nightHours / 1.5)));
    choghadiya = NIGHT_CHOGHADIYA[weekday]?.[partIdx] || "shubh";
  }

  let quality: MuhuratQuality = "normal";
  let badgeBn = "সাধারণ সময়";
  let badgeHi = "सामान्य समय";
  let badgeEn = "Standard Slot";
  let descBn = "নিয়মিত জ্যোতিষ পরামর্শের জন্য উন্মুক্ত সময়।";
  let descHi = "नियमित ज्योतिष परामर्श हेतु उपयुक्त समय।";
  let descEn = "Standard window suitable for astrological consultation.";

  if (is_abhijit) {
    quality = "super_auspicious";
    badgeBn = "অভিজিৎ মুহূর্ত";
    badgeHi = "अभिजित मुहूर्त";
    badgeEn = "Abhijit Muhurat";
    descBn = "সর্বকার্য সিদ্ধিদায়ক সর্বশ্রেষ্ঠ বৈদিক বিজয় মুহূর্ত।";
    descHi = "सर्वकार्य सिद्धिकारक श्रेष्ठ वैदिक विजय मुहूर्त।";
    descEn = "Supreme Vedic victory window granting auspicious outcomes.";
  } else if (choghadiya === "amrit") {
    quality = "super_auspicious";
    badgeBn = "অমৃত মুহূর্ত";
    badgeHi = "अमृत मुहूर्त";
    badgeEn = "Amrit Muhurat";
    descBn = "অমৃতসম শুভ ফল প্রদানকারী অতি পবিত্র যোগ।";
    descHi = "अमृतमय शुभ फल प्रदायक अति पवित्र योग।";
    descEn = "Divine nectar window bestowing peak spiritual clarity.";
  } else if (choghadiya === "shubh" || choghadiya === "labh") {
    quality = "auspicious";
    const name = choghadiya === "shubh" ? "শুভ" : "লাভ";
    badgeBn = `${name} চোঘড়িয়া`;
    badgeHi = `${choghadiya === "shubh" ? "शुभ" : "लाभ"} मुहूर्त`;
    badgeEn = `${choghadiya === "shubh" ? "Shubh" : "Labh"} Muhurat`;
    descBn = "কর্ম ও আর্থিক প্রসারের জন্য অত্যন্ত কল্যাণকর সময়।";
    descHi = "कर्म एवं आर्थिक समृद्धि हेतु अत्यंत कल्याणकारी समय।";
    descEn = "Highly favorable for career, wealth and auspicious remedies.";
  } else if (choghadiya === "char") {
    quality = "neutral";
    badgeBn = "চর মুহূর্ত";
    badgeHi = "चर मुहूर्त";
    badgeEn = "Char Muhurat";
    descBn = "যাত্রা, পরিবর্তন ও গতিশীল সিদ্ধান্ত আলোচনার অনুকূল সময়।";
    descHi = "यात्रा, स्थानांतरण एवं गतिशील निर्णयों हेतु उपयुक्त समय।";
    descEn = "Active window recommended for relocation or fast decisions.";
  } else if (is_rahu_kaal) {
    quality = "remedial";
    badgeBn = "রাহু কাল (প্রতিকার আলোচনা)";
    badgeHi = "राहु काल (उपाय चर्चा)";
    badgeEn = "Rahu Kaal (Remedial Focus)";
    descBn = "গ্রহদোষ শান্তি ও তান্ত্রিক/আধ্যাত্মিক প্রতিকারের উপযুক্ত সময়।";
    descHi = "ग्रहदोष शांति एवं आध्यात्मिक उपायों हेतु उत्तम समय।";
    descEn = "Ideal for dosha pacification and powerful remedial remedies.";
  }

  const badge = lang === "bn" ? badgeBn : lang === "hi" ? badgeHi : badgeEn;

  return {
    choghadiya,
    quality,
    is_abhijit,
    is_rahu_kaal,
    badge,
    badgeBn,
    badgeHi,
    badgeEn,
    descriptionBn: descBn,
    descriptionHi: descHi,
    descriptionEn: descEn,
  };
}
