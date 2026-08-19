import type { LanguagePreference } from "./database.types";

// Hijri is display-only, converted from the Gregorian value at the last
// moment — never stored, never parsed back, never used in arithmetic or
// comparisons. islamic-umalqura specifically (not plain 'islamic' or
// 'islamic-civil'), because those drift a day or more from the Umm al-Qura
// civil calendar Saudi Arabia actually uses. This is the ONLY place that
// calls Intl for a Hijri date — everywhere else imports from here.
function hijriLocale(locale: LanguagePreference) {
  return locale === "ar" ? "ar-SA" : "en-US";
}

export function hijri(date: Date, locale: LanguagePreference): string {
  return new Intl.DateTimeFormat(hijriLocale(locale), {
    calendar: "islamic-umalqura",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function hijriMonthYear(date: Date, locale: LanguagePreference): string {
  return new Intl.DateTimeFormat(hijriLocale(locale), {
    calendar: "islamic-umalqura",
    month: "long",
    year: "numeric",
  }).format(date);
}
