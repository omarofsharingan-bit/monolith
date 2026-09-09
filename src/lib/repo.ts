import "server-only";

import { getDb } from "@/lib/db";
import type {
  AuditAction,
  AuditLogEntry,
  Disbursement,
  Stakeholder,
  SyncStatus,
  Transaction,
  TxType,
  Vault,
} from "@/lib/domain";
import { allocate, netOf } from "@/lib/domain";

/**
 * Every read and write goes through this module. Components and server actions
 * never touch better-sqlite3 directly, so the storage engine stays swappable
 * and the audit-log writes cannot be bypassed by accident.
 */

/** Single-club MVP: one vault, always id 1. */
export const VAULT_ID = 1;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getVault(): Vault {
  return getDb()
    .prepare("SELECT id, name, org, total_funds FROM vaults WHERE id = ?")
    .get(VAULT_ID) as Vault;
}

export function listStakeholders(): Stakeholder[] {
  return getDb()
    .prepare(
      `SELECT id, vault_id, name, role, split_percentage, created_at
         FROM stakeholders
        WHERE vault_id = ?
        ORDER BY split_percentage DESC, id ASC`,
    )
    .all(VAULT_ID) as Stakeholder[];
}

export function getStakeholder(id: number): Stakeholder | undefined {
  return getDb()
    .prepare(
      `SELECT id, vault_id, name, role, split_percentage, created_at
         FROM stakeholders WHERE id = ? AND vault_id = ?`,
    )
    .get(id, VAULT_ID) as Stakeholder | undefined;
}

export function listTransactions(limit?: number): Transaction[] {
  const sql = `SELECT id, vault_id, reference, type, amount, description, account, timestamp, sync_status
                 FROM transactions
                WHERE vault_id = ?
                ORDER BY timestamp DESC, id DESC
                ${limit ? "LIMIT ?" : ""}`;
  const stmt = getDb().prepare(sql);
  return (limit ? stmt.all(VAULT_ID, limit) : stmt.all(VAULT_ID)) as Transaction[];
}

export function listAuditLog(limit?: number): AuditLogEntry[] {
  const sql = `SELECT id, vault_id, actor, action, change_description, field, old_value, new_value, timestamp
                 FROM audit_log
                WHERE vault_id = ?
                ORDER BY timestamp DESC, id DESC
                ${limit ? "LIMIT ?" : ""}`;
  const stmt = getDb().prepare(sql);
  return (limit ? stmt.all(VAULT_ID, limit) : stmt.all(VAULT_ID)) as AuditLogEntry[];
}

export function listDisbursements(limit?: number): Disbursement[] {
  const sql = `SELECT id, vault_id, amount, note, actor, timestamp
                 FROM disbursements
                WHERE vault_id = ?
                ORDER BY timestamp DESC, id DESC
                ${limit ? "LIMIT ?" : ""}`;
  const stmt = getDb().prepare(sql);
  return (limit ? stmt.all(VAULT_ID, limit) : stmt.all(VAULT_ID)) as Disbursement[];
}

export function listAccounts(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT account FROM transactions WHERE vault_id = ? ORDER BY account")
    .all(VAULT_ID) as Array<{ account: string }>;
  return rows.map((r) => r.account);
}

export function countAuditEntries(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM audit_log WHERE vault_id = ?")
    .get(VAULT_ID) as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------------
// Audit — the only way anything gets written to the log
// ---------------------------------------------------------------------------

type AuditInput = {
  actor: string;
  action: AuditAction;
  change_description: string;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
};

function writeAudit(entry: AuditInput): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (vault_id, actor, action, change_description, field, old_value, new_value, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      VAULT_ID,
      entry.actor,
      entry.action,
      entry.change_description,
      entry.field ?? null,
      entry.old_value ?? null,
      entry.new_value ?? null,
      new Date().toISOString(),
    );
}

// ---------------------------------------------------------------------------
// Stakeholder writes — each one paired with its audit entry, in one transaction
// ---------------------------------------------------------------------------

export function createStakeholder(
  input: { name: string; role: string; split_percentage: number },
  actor: string,
): Stakeholder {
  const db = getDb();

  return db.transaction(() => {
    const id = Number(
      db
        .prepare(
          `INSERT INTO stakeholders (vault_id, name, role, split_percentage, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(VAULT_ID, input.name, input.role, input.split_percentage, new Date().toISOString())
        .lastInsertRowid,
    );

    writeAudit({
      actor,
      action: "created",
      change_description: `إضافة «${input.name}» بنسبة ${input.split_percentage}%`,
      field: "split_percentage",
      new_value: String(input.split_percentage),
    });

    return getStakeholder(id)!;
  })();
}

export function updateStakeholder(
  id: number,
  input: { name: string; role: string; split_percentage: number },
  actor: string,
): Stakeholder | undefined {
  const db = getDb();
  const before = getStakeholder(id);
  if (!before) return undefined;

  return db.transaction(() => {
    db.prepare(
      `UPDATE stakeholders SET name = ?, role = ?, split_percentage = ?
        WHERE id = ? AND vault_id = ?`,
    ).run(input.name, input.role, input.split_percentage, id, VAULT_ID);

    const renamed = before.name !== input.name;
    const reshared = before.split_percentage !== input.split_percentage;

    // Log the percentage move as the headline change — that is what people
    // audit. A rename with no percentage change still gets its own entry.
    if (reshared) {
      writeAudit({
        actor,
        action: "updated",
        change_description: `تعديل نسبة «${input.name}»`,
        field: "split_percentage",
        old_value: String(before.split_percentage),
        new_value: String(input.split_percentage),
      });
    }
    if (renamed) {
      writeAudit({
        actor,
        action: "updated",
        change_description: "تعديل اسم صاحب حصة",
        field: "name",
        old_value: before.name,
        new_value: input.name,
      });
    }
    if (!reshared && !renamed && before.role !== input.role) {
      writeAudit({
        actor,
        action: "updated",
        change_description: `تعديل صفة «${input.name}»`,
        field: "role",
        old_value: before.role,
        new_value: input.role,
      });
    }

    return getStakeholder(id);
  })();
}

export function deleteStakeholder(id: number, actor: string): boolean {
  const db = getDb();
  const before = getStakeholder(id);
  if (!before) return false;

  return db.transaction(() => {
    db.prepare("DELETE FROM stakeholders WHERE id = ? AND vault_id = ?").run(id, VAULT_ID);
    writeAudit({
      actor,
      action: "deleted",
      change_description: `إزالة «${before.name}» من بيان الحصص`,
      field: "split_percentage",
      old_value: String(before.split_percentage),
      new_value: "0",
    });
    return true;
  })();
}

// ---------------------------------------------------------------------------
// Disbursement
// ---------------------------------------------------------------------------

export function distributeFunds(
  amount: number,
  note: string,
  actor: string,
): { id: number; rows: ReturnType<typeof allocate> } {
  const db = getDb();
  const stakeholders = listStakeholders();
  const rows = allocate(amount, stakeholders);

  return db.transaction(() => {
    const id = Number(
      db
        .prepare(
          "INSERT INTO disbursements (vault_id, amount, note, actor, timestamp) VALUES (?, ?, ?, ?, ?)",
        )
        .run(VAULT_ID, amount, note, actor, new Date().toISOString()).lastInsertRowid,
    );

    writeAudit({
      actor,
      action: "distributed",
      change_description: note,
      field: "amount",
      new_value: String(amount),
    });

    return { id, rows };
  })();
}

// ---------------------------------------------------------------------------
// Transactions (bank sync simulator)
// ---------------------------------------------------------------------------

export function insertTransaction(tx: {
  reference: string;
  type: TxType;
  amount: number;
  description: string;
  account: string;
  timestamp: string;
  sync_status: SyncStatus;
}): void {
  getDb()
    .prepare(
      `INSERT INTO transactions (vault_id, reference, type, amount, description, account, timestamp, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      VAULT_ID,
      tx.reference,
      tx.type,
      tx.amount,
      tx.description,
      tx.account,
      tx.timestamp,
      tx.sync_status,
    );
}

/**
 * Advance the mock reconciliation pipeline one step: PENDING → SYNCED → VERIFIED.
 *
 * The SYNCED → VERIFIED hop runs *first*. Run the other way round and a row
 * promoted out of PENDING this tick would be eligible for VERIFIED in the same
 * call, skipping the middle state entirely and collapsing the pipeline the
 * panel is meant to show.
 */
export function promoteSyncStatuses(pendingLimit = 2, syncedLimit = 2): number {
  const db = getDb();

  const bump = (from: SyncStatus, to: SyncStatus, limit: number) =>
    db
      .prepare(
        `UPDATE transactions SET sync_status = ?
          WHERE id IN (
            SELECT id FROM transactions
             WHERE vault_id = ? AND sync_status = ?
             ORDER BY timestamp ASC
             LIMIT ?
          )`,
      )
      .run(to, VAULT_ID, from, limit).changes;

  const verified = bump("SYNCED", "VERIFIED", syncedLimit);
  const synced = bump("PENDING", "SYNCED", pendingLimit);
  return verified + synced;
}

export function countByStatus(): Record<SyncStatus, number> {
  const rows = getDb()
    .prepare(
      "SELECT sync_status AS status, COUNT(*) AS n FROM transactions WHERE vault_id = ? GROUP BY sync_status",
    )
    .all(VAULT_ID) as Array<{ status: SyncStatus; n: number }>;

  const out: Record<SyncStatus, number> = { SYNCED: 0, PENDING: 0, VERIFIED: 0, FLAGGED: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** Recompute the headline balance from the ledger. Cheap, and always correct. */
export function recomputeTotalFunds(): number {
  const db = getDb();
  const total = netOf(listTransactions());
  db.prepare("UPDATE vaults SET total_funds = ? WHERE id = ?").run(total, VAULT_ID);
  return total;
}

export function nextReference(): string {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM transactions WHERE vault_id = ?")
    .get(VAULT_ID) as { n: number };
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `TX-${stamp}-${String(row.n + 1).padStart(4, "0")}`;
}
