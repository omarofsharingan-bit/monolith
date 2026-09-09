import { dict } from "@/lib/i18n";

/**
 * All numeric formatting funnels through here.
 * "en-US" is deliberate: it emits western digits (U+0030–0039) even though the
 * UI language is Arabic, per the product's numeral requirement.
 */
const NUM_LOCALE = "en-US";

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(NUM_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** "12,500 ريال" — amount in western digits, unit word in Arabic. */
export function formatCurrency(value: number, fractionDigits = 0): string {
  return `${formatNumber(value, fractionDigits)} ${dict.common.currency}`;
}

/** Compact form for tight cells: "12.5K". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(NUM_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const trimmed = Number.isInteger(value) ? 0 : fractionDigits;
  return `${formatNumber(value, trimmed)}%`;
}

export function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value))}`;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** Gregorian, Arabic month name, western digits: "9 سبتمبر 2026". */
export function formatDate(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return dict.common.none;
  // The year is never grouped — "2,026" would be nonsense.
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-09-09 14:32" — machine-flavoured, for audit/system rows. */
export function formatStamp(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return dict.common.none;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Short clock for the live transaction feed: "14:32:07". */
export function formatClock(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return dict.common.none;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** "يناير 2026" for chart axes. */
export function formatMonthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `${AR_MONTHS[m - 1]} ${y}`;
}

/** Short axis tick: "يناير". */
export function formatMonthShort(iso: string): string {
  const [, m] = iso.split("-").map(Number);
  return m ? AR_MONTHS[m - 1] : iso;
}

/** Mask an account number to its last four: "SA•• •••• 4417". */
export function maskAccount(account: string): string {
  const tail = account.slice(-4);
  return `SA•• •••• ${tail}`;
}
