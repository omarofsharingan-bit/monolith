"use client";

import { useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { importTransactionsAction, type ImportState } from "@/app/actions/import";
import { parseTransactions } from "@/lib/import";
import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { AlertBar } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/DataRow";

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="solid" disabled={disabled || pending}>
      {pending ? dict.import.confirming : dict.import.confirm}
    </Button>
  );
}

export function ImportPanel() {
  const [state, formAction] = useFormState<ImportState | undefined, FormData>(
    importTransactionsAction,
    undefined,
  );
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Preview is derived, not stored — it can never drift from the text that
  // actually gets submitted.
  const parsed = useMemo(
    () => (content.trim() ? parseTransactions(content) : null),
    [content],
  );

  const netOfImport = useMemo(() => {
    if (!parsed) return 0;
    return parsed.valid.reduce(
      (sum, r) => sum + (r.type === "inflow" ? r.amount : -r.amount),
      0,
    );
  }, [parsed]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setContent(await file.text());
  }

  function clearAll() {
    setContent("");
    setFileName(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="content" value={content} />

      <Panel sys="UPLOAD" title={dict.import.uploadTitle} caption={dict.import.uploadBody}>
        <div className="flex flex-wrap items-center gap-4">
          {/* The native file input renders "Choose File" in the browser's own
              language and cannot be relabelled, so it is hidden behind a real
              label — the control stays keyboard-accessible either way. */}
          <input
            ref={fileInput}
            id="import-file"
            type="file"
            accept=".csv,.json,text/csv,application/json,text/plain"
            onChange={onFile}
            className="sr-only"
          />
          <label
            htmlFor="import-file"
            className="inline-flex cursor-pointer items-center border border-bone bg-bone px-4 py-2.5 font-plex text-xs font-semibold text-void transition-colors duration-100 ease-mech hover:border-amber hover:bg-amber"
          >
            {dict.import.chooseFile}
          </label>
          <span className="num font-mono text-[0.6875rem] text-dust">
            {fileName ?? "CSV / JSON"}
          </span>
        </div>

        <div className="mt-5 border-t border-hair pt-5">
          <label className="mb-2 block font-plex text-[0.75rem] text-ash">
            {dict.import.orPaste}
          </label>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setFileName(null);
            }}
            rows={6}
            dir="ltr"
            spellCheck={false}
            placeholder={dict.import.pastePlaceholder}
            className="w-full resize-y border border-hair bg-pit px-3 py-2.5 font-mono text-[0.75rem] text-bone placeholder:text-dust focus:border-amber focus:outline-none"
          />
        </div>
      </Panel>

      <div className="mt-6">
        {!parsed ? (
          <Panel sys="PREVIEW" title={dict.import.previewTitle}>
            <EmptyState sys="NO FILE">{dict.import.empty}</EmptyState>
          </Panel>
        ) : parsed.fatal ? (
          <Panel sys="PREVIEW" title={dict.import.previewTitle}>
            <AlertBar sys="REJECTED">{parsed.fatal}</AlertBar>
          </Panel>
        ) : (
          <Panel
            sys="PREVIEW"
            title={dict.import.previewTitle}
            flush
            action={
              <div className="flex items-center gap-2.5">
                <span className="sys border border-bone bg-bone px-2.5 py-1 text-micro text-void">
                  {formatNumber(parsed.valid.length)} {dict.import.validRows}
                </span>
                {parsed.invalidCount > 0 && (
                  <span className="sys border border-amber px-2.5 py-1 text-micro text-amber">
                    {formatNumber(parsed.invalidCount)} {dict.import.invalidRows}
                  </span>
                )}
              </div>
            }
          >
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full min-w-[40rem] border-collapse">
                <thead className="sticky top-0 bg-pit">
                  <tr className="border-b border-weld">
                    <th className="px-4 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.import.line}
                    </th>
                    <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.bank.description}
                    </th>
                    <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.bank.timestamp}
                    </th>
                    <th className="px-4 py-2.5 text-end font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.bank.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr
                      key={r.line}
                      className={cx(
                        "border-b border-hair",
                        !r.row && "border-s-2 border-s-amber bg-amber-wash",
                      )}
                    >
                      <td className="num px-4 py-2.5 font-mono text-[0.6875rem] text-dust">
                        {r.line}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.row ? (
                          <span className="font-plex text-[0.8125rem] text-bone">
                            {r.row.description}
                          </span>
                        ) : (
                          <span className="font-plex text-[0.75rem] text-amber">
                            {r.errors.join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 font-mono text-[0.625rem] text-dust">
                        {r.row ? r.row.timestamp.slice(0, 10) : dict.common.none}
                      </td>
                      <td
                        className={cx(
                          "num px-4 py-2.5 text-end font-mono text-[0.8125rem] font-bold",
                          r.row?.type === "inflow" ? "text-bone" : "text-ash",
                        )}
                      >
                        {r.row
                          ? `${r.row.type === "inflow" ? "+" : "−"}${formatNumber(r.row.amount)}`
                          : dict.common.none}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PanelFooter>
              {parsed.valid.length === 0 ? (
                <AlertBar sys="REJECTED">{dict.import.nothingValid}</AlertBar>
              ) : (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="replace"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#FFB000]"
                    />
                    <span>
                      <span className="block font-plex text-[0.8125rem] text-bone">
                        {dict.import.replaceExisting}
                      </span>
                      <span className="mt-1 block font-plex text-[0.6875rem] text-dust">
                        {dict.import.replaceHint}
                      </span>
                    </span>
                  </label>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-plex text-[0.75rem] text-ash">
                        {dict.bank.net}
                      </span>
                      <span
                        className={cx(
                          "num font-kufi text-xl font-bold leading-none",
                          netOfImport >= 0 ? "text-bone" : "text-amber",
                        )}
                      >
                        {netOfImport >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(netOfImport))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                        {dict.import.clear}
                      </Button>
                      <ConfirmButton disabled={parsed.valid.length === 0} />
                    </div>
                  </div>
                </>
              )}

              {state?.error && (
                <div className="mt-4">
                  <AlertBar sys="REJECTED">{state.error}</AlertBar>
                </div>
              )}
            </PanelFooter>
          </Panel>
        )}
      </div>
    </form>
  );
}
