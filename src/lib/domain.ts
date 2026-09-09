/**
 * Domain types and pure calculations.
 * Nothing here touches the database or React — the same functions run on the
 * seed file, on SQLite rows, and in tests.
 */

export type TxType = "inflow" | "outflow";
export type SyncStatus = "SYNCED" | "PENDING" | "VERIFIED" | "FLAGGED";
export type AuditAction = "created" | "updated" | "deleted" | "distributed";
export type UserRole = "treasurer" | "founder" | "member";

export type Vault = {
  id: number;
  name: string;
  org: string;
  total_funds: number;
};

export type Stakeholder = {
  id: number;
  vault_id: number;
  name: string;
  role: string;
  split_percentage: number;
  created_at: string;
};

export type Transaction = {
  id: number;
  vault_id: number;
  reference: string;
  type: TxType;
  amount: number;
  description: string;
  account: string;
  timestamp: string;
  sync_status: SyncStatus;
};

export type AuditLogEntry = {
  id: number;
  vault_id: number;
  actor: string;
  action: AuditAction;
  change_description: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
};

export type Disbursement = {
  id: number;
  vault_id: number;
  amount: number;
  note: string;
  actor: string;
  timestamp: string;
};

export type MonthPoint = {
  /** ISO month key, "2026-09". */
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  /** Running balance at the end of this month. */
  balance: number;
  /** False for the month currently in progress — excluded from the trend fit. */
  complete: boolean;
};

/** Floating-point tolerance for percentage sums. */
export const EPSILON = 0.001;

// ---------------------------------------------------------------------------
// Split integrity
// ---------------------------------------------------------------------------

export function splitTotal(stakeholders: Pick<Stakeholder, "split_percentage">[]): number {
  const sum = stakeholders.reduce((acc, s) => acc + s.split_percentage, 0);
  // Kill accumulated float dust so 33.3 + 33.3 + 33.4 reads as exactly 100.
  return Math.round(sum * 1000) / 1000;
}

export function isBalanced(stakeholders: Pick<Stakeholder, "split_percentage">[]): boolean {
  return Math.abs(splitTotal(stakeholders) - 100) < EPSILON;
}

/** How much of the 100% is still unassigned. Negative means over-allocated. */
export function splitRemaining(stakeholders: Pick<Stakeholder, "split_percentage">[]): number {
  return Math.round((100 - splitTotal(stakeholders)) * 1000) / 1000;
}

/**
 * Split an amount across stakeholders by percentage.
 * The largest share absorbs the rounding remainder so the parts always add
 * back to the exact total — a ledger that does not balance is worthless.
 */
export function allocate(
  amount: number,
  stakeholders: Pick<Stakeholder, "id" | "name" | "split_percentage">[],
): Array<{ id: number; name: string; percentage: number; share: number }> {
  if (stakeholders.length === 0) return [];

  const rows = stakeholders.map((s) => ({
    id: s.id,
    name: s.name,
    percentage: s.split_percentage,
    share: Math.round(amount * (s.split_percentage / 100) * 100) / 100,
  }));

  const assigned = rows.reduce((sum, r) => sum + r.share, 0);
  const drift = Math.round((amount - assigned) * 100) / 100;
  if (drift !== 0) {
    const biggest = rows.reduce((a, b) => (b.percentage > a.percentage ? b : a), rows[0]);
    biggest.share = Math.round((biggest.share + drift) * 100) / 100;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Monthly aggregation
// ---------------------------------------------------------------------------

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Fold transactions into a running monthly balance series.
 * `now` decides which month is still in progress.
 */
export function monthlySeries(transactions: Transaction[], now: Date = new Date()): MonthPoint[] {
  const buckets = new Map<string, { inflow: number; outflow: number }>();

  for (const tx of transactions) {
    const key = monthKey(tx.timestamp);
    const bucket = buckets.get(key) ?? { inflow: 0, outflow: 0 };
    if (tx.type === "inflow") bucket.inflow += tx.amount;
    else bucket.outflow += tx.amount;
    buckets.set(key, bucket);
  }

  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const keys = [...buckets.keys()].sort();

  let running = 0;
  return keys.map((month) => {
    const { inflow, outflow } = buckets.get(month)!;
    const net = inflow - outflow;
    running += net;
    return {
      month,
      inflow,
      outflow,
      net,
      balance: running,
      complete: month < currentKey,
    };
  });
}

// ---------------------------------------------------------------------------
// Burn-rate trend
// ---------------------------------------------------------------------------

export type BurnForecast = {
  /** Least-squares slope of balance over time, SAR per month. */
  slope: number;
  /** Positive number = money leaving per month. Zero when the trend is flat or up. */
  monthlyBurn: number;
  /** Months of runway at the fitted trend, or null when nothing is being burned. */
  runwayMonths: number | null;
  /** Projected depletion date, or null when there is no burn. */
  depletionDate: Date | null;
  /** Months used to fit the trend. */
  sampleSize: number;
  /** Forward points continuing the fitted line from the current balance. */
  projection: Array<{ month: string; projected: number }>;
};

function addMonths(iso: string, count: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Ordinary least-squares fit of balance against month index.
 *
 * Deliberately simple and deliberately labelled as a trend, not a prediction.
 * Only *completed* months feed the fit — a month that is three days old would
 * otherwise drag the slope toward zero. The projection is then anchored at the
 * latest real balance, so the chart's trend line meets the actual data.
 */
export function burnForecast(
  series: MonthPoint[],
  currentBalance: number,
  horizonMonths = 6,
): BurnForecast {
  const fit = series.filter((p) => p.complete);
  const empty: BurnForecast = {
    slope: 0,
    monthlyBurn: 0,
    runwayMonths: null,
    depletionDate: null,
    sampleSize: fit.length,
    projection: [],
  };

  if (fit.length < 2) return empty;

  const n = fit.length;
  const meanX = (n - 1) / 2;
  const meanY = fit.reduce((s, p) => s + p.balance, 0) / n;

  let sxy = 0;
  let sxx = 0;
  fit.forEach((p, i) => {
    sxy += (i - meanX) * (p.balance - meanY);
    sxx += (i - meanX) ** 2;
  });

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const monthlyBurn = slope < 0 ? -slope : 0;

  if (monthlyBurn <= 0 || currentBalance <= 0) {
    return { ...empty, slope, sampleSize: n };
  }

  const runwayMonths = currentBalance / monthlyBurn;

  const depletionDate = new Date();
  depletionDate.setDate(depletionDate.getDate() + Math.round(runwayMonths * 30.44));

  const lastMonth = series[series.length - 1]?.month ?? fit[fit.length - 1].month;
  const steps = Math.min(horizonMonths, Math.max(1, Math.ceil(runwayMonths) + 1));

  const projection: Array<{ month: string; projected: number }> = [];
  for (let i = 1; i <= steps; i += 1) {
    const raw = currentBalance + slope * i;
    projection.push({
      month: addMonths(lastMonth, i),
      projected: Math.max(0, Math.round(raw)),
    });
    // Stop at the zero crossing. Continuing would draw a flat line along the
    // axis, which reads as "balance holds at zero" rather than "funds gone".
    if (raw <= 0) break;
  }

  return {
    slope,
    monthlyBurn: Math.round(monthlyBurn),
    runwayMonths,
    depletionDate,
    sampleSize: n,
    projection,
  };
}

/** Threshold at which the runway stat flips to the alert treatment. */
export const RUNWAY_WARN_MONTHS = 3;

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function netOf(transactions: Transaction[]): number {
  return transactions.reduce((s, tx) => s + (tx.type === "inflow" ? tx.amount : -tx.amount), 0);
}

export function sumBy(transactions: Transaction[], type: TxType): number {
  return transactions.filter((tx) => tx.type === type).reduce((s, tx) => s + tx.amount, 0);
}
