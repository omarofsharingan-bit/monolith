import * as React from "react";
import { cx } from "@/lib/cx";

/**
 * System status vocabulary. Deliberately Latin monospace against Arabic body
 * text — exposed terminal output, not UI chrome. Never translate these.
 */
export type SyncStatus = "SYNCED" | "PENDING" | "VERIFIED" | "FLAGGED";

const TONE: Record<SyncStatus, string> = {
  // Settled and reconciled: quiet, recedes.
  SYNCED: "border-weld text-ash",
  // In flight: the one accent, plus a blinking cursor.
  PENDING: "border-amber text-amber",
  // Cryptographically checked: inverted block, the strongest statement.
  VERIFIED: "border-bone bg-bone text-void",
  // Needs a human: inverted amber.
  FLAGGED: "border-amber bg-amber text-void",
};

export function StatusPill({
  status,
  className,
}: {
  status: SyncStatus;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "sys inline-flex items-center gap-1.5 border px-2 py-[3px] text-micro leading-none",
        TONE[status],
        className,
      )}
    >
      {status === "PENDING" && (
        <span aria-hidden className="inline-block h-1.5 w-1.5 animate-blink bg-amber" />
      )}
      {status}
    </span>
  );
}

/** Bare system label — same typographic register, no border. */
export function SysLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cx("sys text-micro text-dust", className)}>{children}</span>;
}
