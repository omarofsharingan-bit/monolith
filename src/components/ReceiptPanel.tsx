"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { commitReceiptAction, type ReceiptState } from "@/app/actions/import";
import type { ReceiptDraft } from "@/lib/receipt";
import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import { formatNumber } from "@/lib/format";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input, AlertBar } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/DataRow";

type Upload = {
  attachmentId: number;
  filename: string;
  byteSize: number;
  kind: string;
  draft: ReceiptDraft | null;
  textError: string | null;
  excerpt: string | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="solid" disabled={pending}>
      {pending ? dict.receipt.confirming : dict.receipt.confirm}
    </Button>
  );
}

/** Marks whether a field came from the file or needs entering by hand. */
function Provenance({ found }: { found: boolean }) {
  return (
    <span className={cx("sys text-micro", found ? "text-amber" : "text-dust")}>
      {found ? dict.receipt.found : dict.receipt.notFound}
    </span>
  );
}

export function ReceiptPanel() {
  const [state, formAction] = useFormState<ReceiptState | undefined, FormData>(
    commitReceiptAction,
    undefined,
  );
  const [upload, setUpload] = useState<Upload | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setUploadError(null);
    setUpload(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import/receipt", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data?.error ?? dict.receipt.errRead);
      } else {
        setUpload(data as Upload);
      }
    } catch {
      setUploadError(dict.receipt.errRead);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setUpload(null);
    setUploadError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const draft = upload?.draft ?? null;
  const has = (f: ReceiptDraft["found"][number]) => Boolean(draft?.found.includes(f));

  return (
    <div className="space-y-6">
      <Panel sys="RECEIPT UPLOAD" title={dict.receipt.title} caption={dict.receipt.subtitle}>
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={fileInput}
            id="receipt-file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
            onChange={onFile}
            className="sr-only"
          />
          <label
            htmlFor="receipt-file"
            className={cx(
              "inline-flex cursor-pointer items-center border px-4 py-2.5 font-plex text-xs font-semibold",
              "transition-colors duration-100 ease-mech",
              busy
                ? "pointer-events-none border-hair bg-transparent text-dust"
                : "border-bone bg-bone text-void hover:border-amber hover:bg-amber",
            )}
          >
            {busy ? dict.receipt.reading : dict.receipt.choose}
          </label>
          <span className="num font-mono text-[0.6875rem] text-dust">
            {upload ? upload.filename : dict.receipt.accepts}
          </span>
          {busy && (
            <div className="relative h-px w-24 overflow-hidden bg-hair">
              <div className="absolute inset-y-0 w-1/2 animate-scan bg-amber" />
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-5">
            <AlertBar sys="REJECTED">{uploadError}</AlertBar>
          </div>
        )}
      </Panel>

      {!upload ? (
        <Panel sys="DRAFT" title={dict.receipt.draftTitle}>
          <EmptyState sys="NO RECEIPT">{dict.receipt.empty}</EmptyState>
        </Panel>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="attachmentId" value={upload.attachmentId} />

          <Panel
            sys="DRAFT  ·  REVIEW BEFORE COMMIT"
            title={dict.receipt.draftTitle}
            caption={dict.receipt.draftHint}
            action={
              <a
                href={`/api/receipts/${upload.attachmentId}`}
                target="_blank"
                rel="noreferrer"
                className="sys border border-weld px-3 py-1.5 text-micro text-ash transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
              >
                OPEN FILE
              </a>
            }
          >
            {upload.textError && (
              <div className="mb-5">
                <AlertBar sys="MANUAL ENTRY" tone="quiet">
                  {upload.textError}
                </AlertBar>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={dict.receipt.amount}
                sys="SAR"
                hint={<Provenance found={has("amount")} />}
              >
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  numeric
                  defaultValue={draft?.amount ?? ""}
                  required
                />
              </Field>

              <Field
                label={dict.receipt.date}
                sys="DATE"
                hint={<Provenance found={has("date")} />}
              >
                <Input
                  name="date"
                  type="date"
                  numeric
                  defaultValue={draft?.date ?? todayISO()}
                  required
                />
              </Field>

              <Field
                label={dict.receipt.description}
                sys="MEMO"
                hint={<Provenance found={has("description")} />}
                className="sm:col-span-2"
              >
                <Input
                  name="description"
                  defaultValue={draft?.description ?? ""}
                  maxLength={200}
                  required
                />
              </Field>

              <Field
                label={dict.receipt.reference}
                sys="REF"
                hint={<Provenance found={has("reference")} />}
              >
                <Input name="reference" defaultValue={draft?.reference ?? ""} maxLength={40} />
              </Field>

              <Field label={dict.receipt.account} sys="IBAN">
                <Input name="account" placeholder="SA…" maxLength={40} />
              </Field>
            </div>

            <fieldset className="mt-5 border-t border-hair pt-4">
              <legend className="sr-only">{dict.receipt.type}</legend>
              <div className="mb-2.5 font-plex text-[0.75rem] font-medium text-ash">
                {dict.receipt.type}
              </div>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["outflow", dict.receipt.typeOutflow],
                    ["inflow", dict.receipt.typeInflow],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 border border-hair bg-pit px-3.5 py-2.5 transition-colors duration-100 ease-mech hover:border-weld has-[:checked]:border-amber"
                  >
                    <input
                      type="radio"
                      name="type"
                      value={value}
                      defaultChecked={(draft?.type ?? "outflow") === value}
                      className="h-3.5 w-3.5 shrink-0 accent-[#FFB000]"
                    />
                    <span className="font-plex text-[0.8125rem] text-bone">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {state?.error && (
              <div className="mt-5">
                <AlertBar sys="REJECTED">{state.error}</AlertBar>
              </div>
            )}

            <PanelFooter className="-mx-5 -mb-4 mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="sys text-micro text-dust">{dict.receipt.attached}</div>
                  <div className="num mt-1 font-mono text-[0.6875rem] text-ash">
                    {upload.filename}
                    <span className="text-dust">
                      {" · "}
                      {formatNumber(Math.max(1, Math.round(upload.byteSize / 1024)))} KB
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" size="sm" onClick={reset}>
                    {dict.receipt.discard}
                  </Button>
                  <ConfirmButton />
                </div>
              </div>
            </PanelFooter>
          </Panel>

          {upload.excerpt && (
            <div className="mt-6">
              <Panel
                sys="EXTRACTED TEXT"
                title={dict.receipt.excerpt}
                caption={dict.receipt.excerptHint}
              >
                <pre
                  dir="ltr"
                  className="max-h-64 overflow-auto whitespace-pre-wrap border border-hair bg-pit p-3 font-mono text-[0.625rem] leading-relaxed text-ash"
                >
                  {upload.excerpt}
                </pre>
              </Panel>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
