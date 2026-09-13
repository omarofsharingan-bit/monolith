import "server-only";

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import seed from "../../data/seed.json";

/**
 * SQLite connection, schema, and boot-time seeding.
 *
 * Persistence is deliberately ephemeral (see render.yaml): the database is
 * created on first access and reseeded whenever it comes up empty, so a cold
 * container always boots into a complete, demoable vault.
 */

const DB_PATH = resolve(process.env.DATABASE_PATH ?? ".data/monolith.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('treasurer','founder','member'))
);

CREATE TABLE IF NOT EXISTS vaults (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  org         TEXT NOT NULL DEFAULT '',
  total_funds REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stakeholders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id         INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT '',
  split_percentage REAL NOT NULL CHECK (split_percentage >= 0 AND split_percentage <= 100),
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id    INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('inflow','outflow')),
  amount      REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  account     TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('SYNCED','PENDING','VERIFIED','FLAGGED'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id           INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  actor              TEXT NOT NULL,
  action             TEXT NOT NULL CHECK (action IN ('created','updated','deleted','distributed')),
  change_description TEXT NOT NULL,
  field              TEXT,
  old_value          TEXT,
  new_value          TEXT,
  timestamp          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disbursements (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id  INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  amount    REAL NOT NULL CHECK (amount > 0),
  note      TEXT NOT NULL,
  actor     TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- Receipt files kept as evidence for a transaction.
--
-- The bytes live in the database rather than on disk so a receipt shares the
-- vault's lifecycle exactly: one file to back up, one file to reset, and no
-- second story about ephemeral storage on the host. Receipts are a few hundred
-- kilobytes, which SQLite handles without complaint.
--
-- transaction_id NULL means uploaded but not yet confirmed; those are pruned.
CREATE TABLE IF NOT EXISTS attachments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id       INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  mime           TEXT NOT NULL,
  byte_size      INTEGER NOT NULL,
  sha256         TEXT NOT NULL,
  content        BLOB NOT NULL,
  extracted_text TEXT,
  uploaded_by    TEXT NOT NULL,
  uploaded_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attach_tx      ON attachments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_vault_time    ON transactions (vault_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_vault_time ON audit_log (vault_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stake_vault      ON stakeholders (vault_id);
`;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function seedDatabase(db: Database.Database): void {
  const already = db.prepare("SELECT COUNT(*) AS n FROM vaults").get() as { n: number };
  if (already.n > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
  );
  const insertVault = db.prepare(
    "INSERT INTO vaults (name, org, total_funds) VALUES (?, ?, ?)",
  );
  const insertStake = db.prepare(
    "INSERT INTO stakeholders (vault_id, name, role, split_percentage, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertTx = db.prepare(
    `INSERT INTO transactions (vault_id, reference, type, amount, description, account, timestamp, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertAudit = db.prepare(
    `INSERT INTO audit_log (vault_id, actor, action, change_description, field, old_value, new_value, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertDisb = db.prepare(
    "INSERT INTO disbursements (vault_id, amount, note, actor, timestamp) VALUES (?, ?, ?, ?, ?)",
  );

  // Hash outside the transaction: bcrypt is slow and better-sqlite3 is sync,
  // so hashing inside would hold the write lock for no reason.
  const users = seed.users.map((u) => ({
    ...u,
    hash: bcrypt.hashSync(u.password, 10),
  }));

  db.transaction(() => {
    for (const u of users) {
      insertUser.run(u.email, u.hash, u.display_name, u.role);
    }

    const vaultId = Number(
      insertVault.run(seed.vault.name, seed.vault.org, seed.vault.total_funds).lastInsertRowid,
    );

    seed.stakeholders.forEach((s, i) => {
      insertStake.run(vaultId, s.name, s.role, s.split_percentage, daysAgoISO(214 - i * 30));
    });

    for (const tx of seed.transactions) {
      insertTx.run(
        vaultId,
        tx.reference,
        tx.type,
        tx.amount,
        tx.description,
        tx.account,
        tx.timestamp,
        tx.sync_status,
      );
    }

    for (const a of seed.audit) {
      insertAudit.run(
        vaultId,
        a.actor,
        a.action,
        a.change_description,
        "field" in a ? a.field : null,
        "old_value" in a ? a.old_value : null,
        "new_value" in a ? a.new_value : null,
        daysAgoISO(a.offset_days),
      );
    }

    for (const d of seed.disbursements) {
      insertDisb.run(vaultId, d.amount, d.note, d.actor, daysAgoISO(d.offset_days));
    }
  })();
}

function createConnection(): Database.Database {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.exec(SCHEMA);
  seedDatabase(db);
  return db;
}

// Cached on globalThis so Next.js dev HMR does not open a new handle per reload.
const globalForDb = globalThis as unknown as { __monolithDb?: Database.Database };

export function getDb(): Database.Database {
  globalForDb.__monolithDb ??= createConnection();
  return globalForDb.__monolithDb;
}
