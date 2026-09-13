"use client";

import { useState } from "react";

import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import { ImportPanel } from "@/components/ImportPanel";
import { ReceiptPanel } from "@/components/ReceiptPanel";

type Mode = "csv" | "receipt";

const TABS: Array<{ id: Mode; label: string; sys: string }> = [
  { id: "csv", label: dict.receipt.tabCsv, sys: "STATEMENT" },
  { id: "receipt", label: dict.receipt.tabReceipt, sys: "RECEIPT" },
];

/**
 * Two ways in: a whole statement, or a single transfer receipt.
 * They are different enough — one is many rows, the other is one row plus a
 * document to keep — that sharing a form would confuse both.
 */
export function ImportTabs({ initial = "csv" }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);

  return (
    <div>
      <div className="mb-6 flex flex-wrap border border-hair bg-slab" role="tablist">
        {TABS.map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(tab.id)}
              className={cx(
                "flex flex-1 items-center justify-between gap-3 px-5 py-3.5 text-start",
                "border-b-2 transition-colors duration-100 ease-mech",
                active
                  ? "border-amber bg-pit text-bone"
                  : "border-transparent text-ash hover:bg-pit hover:text-bone",
              )}
            >
              <span className="font-kufi text-[0.8125rem] font-medium">{tab.label}</span>
              <span className={cx("sys text-micro", active ? "text-amber" : "text-dust")}>
                {tab.sys}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "csv" ? <ImportPanel /> : <ReceiptPanel />}
    </div>
  );
}
