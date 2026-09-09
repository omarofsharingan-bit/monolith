"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { isBalanced, splitTotal } from "@/lib/domain";
import {
  createStakeholder,
  deleteStakeholder,
  distributeFunds,
  listStakeholders,
  updateStakeholder,
} from "@/lib/repo";

export type FormState = { ok?: boolean; error?: string };


async function actorName(): Promise<string> {
  const session = await auth();
  return session?.user?.name ?? dict.common.you;
}

function refresh(): void {
  revalidatePath("/ledger");
  revalidatePath("/");
}

function readShare(formData: FormData): number | null {
  const raw = String(formData.get("split_percentage") ?? "").trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  // Two decimals is as fine as an equity split needs to be.
  return Math.round(value * 100) / 100;
}

export async function createStakeholderAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const share = readShare(formData);

  if (!name) return { error: dict.ledger.validationName };
  if (share === null) return { error: dict.ledger.validationShare };

  const existing = listStakeholders();
  if (existing.some((s) => s.name === name)) {
    return { error: dict.ledger.validationDuplicate };
  }

  createStakeholder({ name, role, split_percentage: share }, await actorName());
  refresh();
  return { ok: true };
}

export async function updateStakeholderAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const share = readShare(formData);

  if (!Number.isInteger(id)) return { error: dict.common.error };
  if (!name) return { error: dict.ledger.validationName };
  if (share === null) return { error: dict.ledger.validationShare };

  const existing = listStakeholders();
  if (existing.some((s) => s.name === name && s.id !== id)) {
    return { error: dict.ledger.validationDuplicate };
  }

  const updated = updateStakeholder(id, { name, role, split_percentage: share }, await actorName());
  if (!updated) return { error: dict.common.error };

  refresh();
  return { ok: true };
}

export async function deleteStakeholderAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: dict.common.error };

  const removed = deleteStakeholder(id, await actorName());
  if (!removed) return { error: dict.common.error };

  refresh();
  return { ok: true };
}

export async function distributeAction(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const note = String(formData.get("note") ?? "").trim() || dict.ledger.distributeTitle;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: dict.ledger.validationAmount };
  }

  // The integrity check is enforced here, not just in the UI — a disbursement
  // against an unbalanced manifest is exactly what this product exists to stop.
  const stakeholders = listStakeholders();
  if (stakeholders.length === 0 || !isBalanced(stakeholders)) {
    return {
      error: `${dict.ledger.distributeBlocked} (${splitTotal(stakeholders)}%)`,
    };
  }

  distributeFunds(amount, note, await actorName());
  refresh();
  return { ok: true };
}

