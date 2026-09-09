"use client";

import * as React from "react";
import { cx } from "@/lib/cx";

/** Recessed input well. Square, hairline-bounded, amber on focus. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; numeric?: boolean }
>(function Input({ className, invalid, numeric, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        "w-full border bg-pit px-3 py-2.5 font-plex text-sm text-bone",
        "placeholder:text-dust",
        "transition-colors duration-100 ease-mech",
        "focus:border-amber focus:outline-none",
        numeric && "num tabular-nums",
        invalid ? "border-amber" : "border-hair hover:border-weld",
        className,
      )}
      {...rest}
    />
  );
});

export function Field({
  label,
  sys,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  sys?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-plex text-[0.75rem] font-medium text-ash">{label}</span>
        {sys && <span className="sys text-micro text-dust">{sys}</span>}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 font-plex text-[0.6875rem] text-amber">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 font-plex text-[0.6875rem] text-dust">{hint}</p>
      ) : null}
    </label>
  );
}

/** Full-width inverted banner used for hard validation failures. */
export function AlertBar({
  children,
  sys = "ERROR",
  tone = "amber",
}: {
  children: React.ReactNode;
  sys?: string;
  tone?: "amber" | "quiet";
}) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 border px-4 py-2.5 animate-stamp",
        tone === "amber" ? "border-amber bg-amber-wash" : "border-hair bg-pit",
      )}
    >
      <span className={cx("sys shrink-0 pt-px text-micro", tone === "amber" ? "text-amber" : "text-dust")}>
        {sys}
      </span>
      <p className={cx("font-plex text-[0.75rem] leading-relaxed", tone === "amber" ? "text-bone" : "text-ash")}>
        {children}
      </p>
    </div>
  );
}
