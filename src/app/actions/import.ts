"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { parseTransactions } from "@/lib/import";
import { importTransactions } from "@/lib/repo";

export type ImportState = {
  ok?: boolean;
  error?: string;
  inserted?: number;
  removed?: number;
};

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
