import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { parseReceiptText, type ReceiptDraft } from "@/lib/receipt";
import { storePendingAttachment } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Receipts are a page or two; anything larger is not a transfer receipt. */
const MAX_BYTES = 8 * 1024 * 1024;

const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/**
 * Accepts one receipt file, stores it unlinked, and returns a best-effort draft.
 *
 * The draft is explicitly a proposal: the response carries which fields were
 * actually found and the extracted text, so the UI can show the operator what
 * the parser saw rather than presenting guesses as facts.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: dict.receipt.errRead }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: dict.receipt.errNoFile }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: dict.receipt.errTooLarge }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const kind = ACCEPTED[mime];
  if (!kind) {
    return NextResponse.json({ error: dict.receipt.errType }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Guard against a mislabelled upload: a real PDF always starts with %PDF-.
  if (kind === "pdf" && bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: dict.receipt.errNotPdf }, { status: 400 });
  }

  let text: string | null = null;
  let draft: ReceiptDraft | null = null;
  let textError: string | null = null;

  if (kind === "pdf") {
    try {
      // Imported lazily so the PDF engine is not pulled into every route's
      // bundle, and a failure here degrades to manual entry rather than a 500.
      const { extractText, getDocumentProxy } = await import("unpdf");
      const doc = await getDocumentProxy(new Uint8Array(bytes));
      const extracted = await extractText(doc, { mergePages: true });
      text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
      if (text && text.trim().length > 0) {
        draft = parseReceiptText(text);
      } else {
        // A scanned receipt is an image in a PDF wrapper — there is no text to
        // read and this build does not OCR. Say so instead of guessing.
        textError = dict.receipt.errNoText;
      }
    } catch {
      textError = dict.receipt.errParse;
    }
  } else {
    // Images are stored as evidence but not read; no OCR in this build.
    textError = dict.receipt.errImageNoText;
  }

  const attachmentId = storePendingAttachment({
    filename: file.name.slice(0, 200),
    mime,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    extractedText: text,
    uploadedBy: session.user.name ?? dict.common.you,
  });

  return NextResponse.json({
    attachmentId,
    filename: file.name,
    byteSize: bytes.byteLength,
    kind,
    draft,
    textError,
    // Capped: enough for the operator to verify against, not the whole document.
    excerpt: text ? text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200) : null,
  });
}
