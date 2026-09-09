import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  countByStatus,
  insertSimulatedTransaction,
  listAccounts,
  promoteSyncStatuses,
  recomputeTotalFunds,
} from "@/lib/repo";
import type { TxType } from "@/lib/domain";

/**
 * Simulated open-banking poll.
 *
 * There is no external connection here and never will be: each tick advances a
 * local reconciliation pipeline (PENDING → SYNCED → VERIFIED) and occasionally
 * appends a plausible new movement. The shape of the payload mirrors what an
 * open-banking aggregator would return, which is the point of the exercise.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Candidate = {
  type: TxType;
  min: number;
  max: number;
  description: string;
  /** Rounding granularity. Dues use 25 so the amount is always whole members. */
  step?: number;
};

// Petty-cash sized movements only. The vault holds a few thousand riyals, so a
// simulated line item worth hundreds would visibly distort the burn trend
// within a couple of minutes of the panel being open.
const POOL: Candidate[] = [
  { type: "outflow", min: 25, max: 120, description: "ضيافة اجتماع أسبوعي" },
  { type: "outflow", min: 40, max: 180, description: "قرطاسية ومستلزمات مكتبية" },
  { type: "outflow", min: 60, max: 240, description: "طباعة مواد تعريفية" },
  { type: "outflow", min: 45, max: 200, description: "اشتراك أداة تصميم شهري" },
  { type: "outflow", min: 30, max: 150, description: "نقل معدات لفعالية الحرم" },
  // 25–100 SAR at 25 SAR a head: one to four new members, never a fraction.
  { type: "inflow", min: 25, max: 100, description: "اشتراكات أعضاء جدد", step: 25 },
  { type: "inflow", min: 100, max: 400, description: "رعاية صغيرة — متجر جامعي" },
  { type: "inflow", min: 50, max: 180, description: "استرداد مبلغ فعالية ملغاة" },
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const promoted = promoteSyncStatuses(1, 2);

  // Not every poll produces a movement — a feed that always ticks looks fake.
  let inserted = 0;
  if (Math.random() < 0.45) {
    const candidate = pick(POOL);
    const accounts = listAccounts();
    const amount = roundTo(
      candidate.min + Math.random() * (candidate.max - candidate.min),
      candidate.step ?? 5,
    );

    insertSimulatedTransaction({
      type: candidate.type,
      amount,
      description: candidate.description,
      account: accounts.length ? pick(accounts) : "SA4420000001234567894417",
    });
    inserted = 1;
  }

  const total = recomputeTotalFunds();

  return NextResponse.json({
    simulated: true,
    promoted,
    inserted,
    total_funds: total,
    status: countByStatus(),
    synced_at: new Date().toISOString(),
  });
}
