import { dict } from "@/lib/i18n";
import type { TxType } from "@/lib/domain";

/**
 * Transaction import parsing and validation.
 *
 * Pure — no React, no SQL. The browser runs this to build the preview and the
 * server runs the exact same code before writing, so what the user approves is
 * what lands. Client-side validation here is a convenience, never the gate.
 */

export type ImportRow = {
  type: TxType;
  amount: number;
  description: string;
  account: string;
  timestamp: string;
};

export type ParsedRow = {
  /** 1-based line in the source file, for pointing at bad input. */
  line: number;
  errors: string[];
  row: ImportRow | null;
};

export type ParseResult = {
  rows: ParsedRow[];
  valid: ImportRow[];
  invalidCount: number;
  /** Fatal problem with the file as a whole; individual rows were not examined. */
  fatal: string | null;
};

const REQUIRED = ["type", "amount", "description"] as const;
const DEFAULT_ACCOUNT = "SA0000000000000000000000";

/**
 * Minimal RFC-4180 CSV splitter: handles quoted fields, embedded commas and
 * doubled quotes. Arabic text needs no special treatment beyond not assuming
 * one byte per character, which JS strings give us for free.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }

  out.push(field);
  return out.map((f) => f.trim());
}

function normaliseTimestamp(raw: string): string | null {
  const value = raw.trim();
  if (!value) return new Date().toISOString();

  // Accept "YYYY-MM-DD" and full ISO timestamps. Anything Date can parse but
  // that is not one of those shapes is rejected rather than guessed at —
  // silently misreading a date corrupts the burn trend.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const isoish = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;
  if (!dateOnly.test(value) && !isoish.test(value)) return null;

  const parsed = new Date(dateOnly.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validate(raw: Record<string, string>, line: number): ParsedRow {
  const errors: string[] = [];

  const type = raw.type?.trim().toLowerCase();
  if (type !== "inflow" && type !== "outflow") errors.push(dict.import.errType);

  // Tolerate thousands separators and a currency word pasted from a statement.
  const amountRaw = (raw.amount ?? "").replace(/[,\s]/g, "").replace(/[^\d.-]/g, "");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) errors.push(dict.import.errAmount);

  const description = (raw.description ?? "").trim();
  if (!description) errors.push(dict.import.errDescription);

  const timestamp = normaliseTimestamp(raw.timestamp ?? "");
  if (timestamp === null) errors.push(dict.import.errTimestamp);

  if (errors.length > 0) return { line, errors, row: null };

  return {
    line,
    errors: [],
    row: {
      type: type as TxType,
      amount: Math.round(amount * 100) / 100,
      description: description.slice(0, 200),
      account: (raw.account ?? "").trim() || DEFAULT_ACCOUNT,
      timestamp: timestamp!,
    },
  };
}

function collect(rows: ParsedRow[]): ParseResult {
  const valid = rows.flatMap((r) => (r.row ? [r.row] : []));
  return {
    rows,
    valid,
    invalidCount: rows.length - valid.length,
    fatal: null,
  };
}

function fatal(message: string): ParseResult {
  return { rows: [], valid: [], invalidCount: 0, fatal: message };
}

function parseJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fatal(dict.import.errParse);
  }

  // Accept a bare array or an object with a `transactions` array, which is the
  // shape data/seed.json already uses.
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { transactions?: unknown }).transactions)
      ? (data as { transactions: unknown[] }).transactions
      : null;

  if (!list) return fatal(dict.import.errParse);
  if (list.length === 0) return fatal(dict.import.errEmpty);

  return collect(
    list.map((entry, i) => {
      const obj = (entry ?? {}) as Record<string, unknown>;
      const asStrings: Record<string, string> = {};
      for (const key of ["type", "amount", "description", "account", "timestamp"]) {
        const v = obj[key];
        asStrings[key] = v === undefined || v === null ? "" : String(v);
      }
      return validate(asStrings, i + 1);
    }),
  );
}

function parseCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return fatal(dict.import.errEmpty);

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/^﻿/, ""));
  if (!REQUIRED.every((col) => header.includes(col))) {
    return fatal(dict.import.errNoHeader);
  }
  if (lines.length === 1) return fatal(dict.import.errEmpty);

  const rows = lines.slice(1).map((line, i) => {
    const cells = splitCsvLine(line);
    if (cells.length !== header.length) {
      return { line: i + 2, errors: [dict.import.errColumns], row: null };
    }
    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = cells[idx];
    });
    // +2: one for the header row, one to make it 1-based.
    return validate(record, i + 2);
  });

  return collect(rows);
}

/** Detects CSV vs JSON from the content itself, so file extensions can lie. */
export function parseTransactions(text: string): ParseResult {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return fatal(dict.import.errEmpty);

  const looksJson = trimmed.startsWith("[") || trimmed.startsWith("{");
  return looksJson ? parseJson(trimmed) : parseCsv(trimmed);
}

/** The downloadable starter file, also shown inline as the format example. */
export const CSV_TEMPLATE = `type,amount,description,account,timestamp
inflow,2800,مخصص الفصل الأول — عمادة شؤون الطلاب,SA4420000001234567894417,2026-09-03
inflow,550,اشتراكات الأعضاء — الفصل الأول,SA0380000000608010167519,2026-09-05
outflow,210,تجهيز ركن النادي في أسبوع التهيئة,SA0380000000608010167519,2026-09-07
outflow,110,ضيافة اللقاء التعريفي للأعضاء الجدد,SA0380000000608010167519,2026-09-09
`;
