import type { TxType } from "@/lib/domain";

/**
 * Heuristic extraction of a single transfer from receipt text.
 *
 * Pure: takes already-extracted text, returns a draft. No PDF library, no SQL.
 *
 * These are heuristics, not parsing — bank receipts have no common format, and
 * Arabic text often comes out of a PDF reordered or with letters disconnected.
 * So every field is returned with a confidence flag and the UI presents the
 * result as an editable draft beside the raw text, never as a fact.
 */

export type ReceiptDraft = {
  amount: number | null;
  /** ISO date (YYYY-MM-DD) when one could be read. */
  date: string | null;
  description: string | null;
  reference: string | null;
  type: TxType;
  /** Fields the heuristics actually found, for honest UI labelling. */
  found: Array<"amount" | "date" | "description" | "reference">;
};

/** Words that sit next to the transfer amount on Saudi bank receipts. */
const AMOUNT_HINTS = [
  "amount",
  "total",
  "transfer",
  "paid",
  "sar",
  "المبلغ",
  "مبلغ",
  "الإجمالي",
  "اجمالي",
  "المحول",
  "قيمة",
];

const OUTFLOW_HINTS = [
  "transfer to",
  "sent",
  "payment",
  "debit",
  "withdraw",
  "purchase",
  "تحويل إلى",
  "تحويل الى",
  "مدفوع",
  "خصم",
  "سحب",
  "شراء",
  "صادر",
];

// Deliberately excludes a bare "from": nearly every *outgoing* receipt carries
// a "From Account" line, which made outgoing transfers read as incoming.
const INFLOW_HINTS = [
  "received",
  "deposit",
  "credit advice",
  "credited",
  "refund",
  "incoming",
  "وارد",
  "مستلم",
  "إيداع",
  "ايداع",
  "استرداد",
  "دائن",
];

const BENEFICIARY_HINTS = [
  "beneficiary",
  "recipient",
  "merchant",
  "payee",
  // Colon-anchored so these match "From: Acme" (the sender on an incoming
  // transfer) without also matching "From Account: SA44…", which would hand
  // back an IBAN as the description.
  "from:",
  "to:",
  "من:",
  "إلى:",
  "المستفيد",
  "المحول له",
  "الجهة",
  "التاجر",
];

const REFERENCE_HINTS = [
  "reference",
  "ref no",
  "ref.",
  "transaction id",
  "transaction no",
  "رقم العملية",
  "الرقم المرجعي",
  "رقم المرجع",
  "رقم الحوالة",
];

function hasHint(line: string, hints: string[]): boolean {
  const l = line.toLowerCase();
  return hints.some((h) => l.includes(h));
}

/**
 * Normalise Arabic-Indic digits so a receipt printed with ٠١٢ parses the same
 * as one printed with 012.
 */
export function normaliseDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٬/g, ",") // Arabic thousands separator
    .replace(/٫/g, "."); // Arabic decimal separator
}

/** Money-shaped tokens: 1,234.56 / 1234.56 / 1,234 — at least one digit. */
const MONEY = /(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d.,])/g;

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractAmount(lines: string[]): number | null {
  const candidates: Array<{ value: number; score: number }> = [];

  lines.forEach((line) => {
    const currency = /SAR|SR\b|ر\.?\s?س|ريال/i.test(line);
    const hinted = hasHint(line, AMOUNT_HINTS);
    // A line that mentions neither the currency nor an amount word is usually
    // an account number, a date fragment, or a phone number.
    if (!currency && !hinted) return;

    for (const m of line.matchAll(MONEY)) {
      const value = parseMoney(m[1]);
      if (value === null) return;
      // Long digit runs with no separators are identifiers, not amounts.
      if (!m[1].includes(",") && !m[1].includes(".") && m[1].length > 7) continue;

      let score = 0;
      if (currency) score += 3;
      if (hinted) score += 2;
      if (m[1].includes(".")) score += 1; // receipts usually print halalas
      if (m[1].includes(",")) score += 1;
      candidates.push({ value, score });
    }
  });

  if (candidates.length === 0) return null;
  // Highest score wins; ties break toward the larger figure, which on a receipt
  // is the total rather than a fee line.
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return candidates[0].value;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isSaneDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  return true;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, ابريل: 4, مايو: 5, يونيو: 6,
  يوليو: 7, أغسطس: 8, اغسطس: 8, سبتمبر: 9, أكتوبر: 10, اكتوبر: 10,
  نوفمبر: 11, ديسمبر: 12,
};

function extractDate(text: string): string | null {
  // ISO first — unambiguous.
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso.map(Number) as unknown as number[];
    if (isSaneDate(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  // "13 Sep 2026" / "13 سبتمبر 2026"
  const named = text.match(
    /(\d{1,2})\s+([A-Za-z؀-ۿ]{3,10})\.?,?\s+(\d{4})/,
  );
  if (named) {
    const month = MONTH_NAMES[named[2].toLowerCase().slice(0, 10)] ?? MONTH_NAMES[named[2].toLowerCase().slice(0, 3)];
    const d = Number(named[1]);
    const y = Number(named[3]);
    if (month && isSaneDate(y, month, d)) return `${y}-${pad(month)}-${pad(d)}`;
  }

  // dd/mm/yyyy — day-first, which is the Saudi convention. Where the first
  // group is clearly > 12 this is certain; otherwise it is the safer guess.
  const slash = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (slash) {
    let d = Number(slash[1]);
    let m = Number(slash[2]);
    const y = Number(slash[3]);
    if (m > 12 && d <= 12) [d, m] = [m, d];
    if (isSaneDate(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  return null;
}

function extractReference(lines: string[]): string | null {
  for (const line of lines) {
    if (!hasHint(line, REFERENCE_HINTS)) continue;
    const tokens = line.match(/[A-Za-z0-9][A-Za-z0-9-]{5,}/g);
    // A reference always carries digits. Without this the label itself wins:
    // on "Reference: DEP-99112" the word "Reference" is the same length as the
    // value and was being returned as the reference number.
    const withDigits = tokens?.filter((t) => /\d/.test(t)) ?? [];
    if (withDigits.length > 0) {
      return withDigits.sort((a, b) => b.length - a.length)[0].slice(0, 40);
    }
  }
  return null;
}

function extractDescription(lines: string[]): string | null {
  for (const line of lines) {
    if (!hasHint(line, BENEFICIARY_HINTS)) continue;
    // Drop the label itself and keep what follows the separator.
    const after = line.split(/[:：]\s*/).slice(1).join(": ").trim();
    const value = (after || line).replace(/\s+/g, " ").trim();
    if (value.length >= 3) return value.slice(0, 120);
  }
  return null;
}

function extractType(text: string): TxType {
  const l = text.toLowerCase();
  const out = OUTFLOW_HINTS.filter((h) => l.includes(h)).length;
  const inn = INFLOW_HINTS.filter((h) => l.includes(h)).length;
  // A transfer receipt is money leaving unless it clearly says otherwise.
  return inn > out ? "inflow" : "outflow";
}

export function parseReceiptText(rawText: string): ReceiptDraft {
  const text = normaliseDigits(rawText);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const amount = extractAmount(lines);
  const date = extractDate(text);
  const reference = extractReference(lines);
  const description = extractDescription(lines);

  const found: ReceiptDraft["found"] = [];
  if (amount !== null) found.push("amount");
  if (date !== null) found.push("date");
  if (description !== null) found.push("description");
  if (reference !== null) found.push("reference");

  return {
    amount,
    date,
    description,
    reference,
    type: extractType(text),
    found,
  };
}
