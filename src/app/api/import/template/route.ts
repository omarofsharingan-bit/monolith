import { auth } from "@/auth";
import { CSV_TEMPLATE } from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves the starter CSV so people have a correctly shaped file to edit. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });

  // The BOM makes Excel open a UTF-8 CSV with Arabic text correctly instead of
  // rendering mojibake, which is the single most common way this goes wrong.
  return new Response(`﻿${CSV_TEMPLATE}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="monolith-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
