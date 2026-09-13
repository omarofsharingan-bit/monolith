"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { parseTransactions } from "@/lib/import";
import { commitReceiptTransaction, importTransactions } from "@/lib/repo";

export type ImportState = {
  ok?: boolean;
  error?: string;
  inserted?: number;
  removed?: number;
};

export type ReceiptState = { error?: string };

/** Commits a reviewed receipt draft and links its stored file to the row. */
export async function commitReceiptAction(
  _prev: ReceiptState | undefined,
  formData: FormData,
): Promise<ReceiptState> {
  const session = await auth();
  if (!session?.user) return { error: dict.common.error };

  const attachmentId = Number(formData.get("attachmentId"));
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return { error: dict.receipt.errGone };
  }

  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(amount) || amount <= 0) return { error: dict.receipt.errAmount };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: dict.receipt.errDescription };

  const rawDate = String(formData.get("date") ?? "").trim();
  const parsedDate = rawDate ? new Date(`${rawDate}T12:00:00Z`) : new Date();
  if (Number.isNaN(parsedDate.getTime())) return { error: dict.receipt.errDate };

  const type = String(formData.get("type") ?? "outflow") === "inflow" ? "inflow" : "outflow";
  const account = String(formData.get("account") ?? "").trim() || "SA0000000000000000000000";
  const reference = String(formData.get("reference") ?? "").trim() || null;

  const result = commitReceiptTransaction(
    {
      type,
      amount: Math.round(amount * 100) / 100,
      description: description.slice(0, 200),
      account: account.slice(0, 40),
      timestamp: parsedDate.toISOString(),
      reference,
    },
    attachmentId,
    session.user.name ?? dict.common.you,
  );

  // Null means the pending upload is gone — pruned, or already committed.
  if (!result) return { error: dict.receipt.errGone };

  revalidatePath("/");
  revalidatePath("/bank");
  revalidatePath("/burn");
  revalidatePath("/ledger");

  redirect(`/import?receipt=${result.transactionId}`);
}

export async function importTransactionsAction(
  _prev: ImportState | undefined,
  formData: FormData,
): Promise<ImportState> {
  const session = await auth();
  if (!session?.user) return { error: dict.common.error };

  const text = String(formData.get("content") ?? "");
  const replace = formData.get("replace") === "on";

  // Re-parse server-side from the raw text rather than trusting the rows the
  // browser previewed. Same function, so the result the user approved is the
  // result that gets written.
  const parsed = parseTransactions(text);
  if (parsed.fatal) return { error: parsed.fatal };
  if (parsed.valid.length === 0) return { error: dict.import.nothingValid };

  const { inserted, removed } = importTransactions(parsed.valid, {
    replace,
    actor: session.user.name ?? dict.common.you,
    note: `${dict.import.auditNote} (${parsed.valid.length})`,
  });

  revalidatePath("/");
  revalidatePath("/bank");
  revalidatePath("/burn");
  revalidatePath("/ledger");

  // The confirmation is carried in the URL rather than returned as form state.
  // revalidatePath remounts this route's client tree, which wipes anything held
  // in useFormState — a server-rendered success screen survives that, and can
  // still be read after a refresh.
  redirect(`/import?imported=${inserted}&replaced=${removed}`);
}
