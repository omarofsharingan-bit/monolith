import * as React from "react";
import { cx } from "@/lib/cx";

type PanelProps = {
  /** Anchor target, for deep links like /ledger#audit. */
  id?: string;
  /** Arabic section heading. Rendered in Kufi. */
  title?: React.ReactNode;
  /** Latin monospace system label sitting opposite the title. */
  sys?: string;
  /** Arabic sub-caption under the title. */
  caption?: React.ReactNode;
  /** Slot pinned to the far edge of the header row (buttons, pills). */
  action?: React.ReactNode;
  /** Removes the inner padding so tables can bleed to the hairline. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
};

/**
 * The structural unit of the whole app: a slab of near-black bounded by a
 * hairline. No radius, no shadow — separation comes from the border alone.
 */
export function Panel({
  id,
  title,
  sys,
  caption,
  action,
  flush = false,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  const hasHeader = Boolean(title || sys || action || caption);

  return (
    <section id={id} className={cx("border border-hair bg-slab", className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-hair px-5 py-3.5">
          <div className="min-w-0">
            {sys && <div className="sys text-micro text-dust">{sys}</div>}
            {title && (
              <h2 className="mt-1 font-kufi text-[0.9375rem] font-semibold leading-tight text-bone">
                {title}
              </h2>
            )}
            {caption && (
              <p className="mt-1.5 font-plex text-xs leading-relaxed text-ash">{caption}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cx(flush ? "" : "px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A recessed well used for totals bars and footers inside a Panel. */
export function PanelFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("border-t border-hair bg-pit px-5 py-3", className)}>{children}</div>
  );
}
