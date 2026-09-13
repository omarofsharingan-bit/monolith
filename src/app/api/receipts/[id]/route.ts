import { auth } from "@/auth";
import { readAttachment } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves a stored receipt back to a signed-in member of the vault. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response("not found", { status: 404 });

  const file = readAttachment(id);
  if (!file) return new Response("not found", { status: 404 });

  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mime,
      // inline: receipts are meant to be glanced at, not downloaded every time.
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Content-Length": String(file.content.byteLength),
      // Private: this is financial evidence, not something to sit in a shared cache.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
