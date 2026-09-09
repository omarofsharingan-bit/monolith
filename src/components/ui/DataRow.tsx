import * as React from "react";
import { cx } from "@/lib/cx";

/**
 * A single ledger line: Arabic label at the reading edge, value at the far
 * edge. The hairline underneath is the only separator — no zebra striping.
 */
export function DataRow({
  label,
  value,
  sub,
  sys,
  emphasis = false,
  last = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Secondary line under the label. */
  sub?: React.ReactNode;
  /** Latin system tag rendered beside the value. */
  sys?: React.ReactNode;
  emphasis?: boolean;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-baseline justify-between gap-4 py-2.5",
        !last && "border-b border-hair",
        className,
      )}
    >
      <div className="min-w-0">
        <div
          className={cx(
            "font-plex text-[0.8125rem] leading-snug",
            emphasis ? "text-bone" : "text-ash",
          )}
        >
          {label}
        </div>
        {sub && <div className="mt-0.5 font-plex text-[0.6875rem] text-dust">{sub}</div>}
      </div>
      <div className="flex shrink-0 items-baseline gap-2.5">
        {sys}
        <div
          className={cx(
            "num font-plex tabular-nums",
            emphasis ? "text-[0.9375rem] font-semibold text-bone" : "text-[0.8125rem] text-bone",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/** Large headline figure with an Arabic caption above it. */
export function Stat({
  label,
  value,
  unit,
  sys,
  tone = "bone",
  /**
   * Numeric values get LTR isolation and tabular figures. Turn this off for
   * values that contain Arabic words — a date like "21 يناير 2027" would
   * otherwise be forced LTR and read back to front.
   */
  numeric = true,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  sys?: React.ReactNode;
  tone?: "bone" | "amber" | "ash";
  numeric?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "amber" ? "text-amber" : tone === "ash" ? "text-ash" : "text-bone";

  return (
    <div className={cx("min-w-0", className)}>
      <div className="font-plex text-[0.6875rem] tracking-wide text-dust">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cx(
            "font-kufi font-bold leading-none",
            numeric ? "num text-[1.75rem]" : "text-[1.25rem]",
            toneClass,
          )}
        >
          {value}
        </span>
        {unit && <span className="font-plex text-xs text-ash">{unit}</span>}
      </div>
      {sys && <div className="sys mt-2 text-micro text-dust">{sys}</div>}
    </div>
  );
}

/** Empty-state block. Sparse by design: one line, one hairline box. */
export function EmptyState({
  children,
  sys = "NO RECORDS",
  className,
}: {
  children: React.ReactNode;
  sys?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "border border-dashed border-hair px-5 py-8 text-center",
        className,
      )}
    >
      <div className="sys text-micro text-dust">{sys}</div>
      <p className="mx-auto mt-2.5 max-w-sm font-plex text-[0.8125rem] leading-relaxed text-ash">
        {children}
      </p>
    </div>
  );
}
