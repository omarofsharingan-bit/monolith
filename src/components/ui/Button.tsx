"use client";

import * as React from "react";
import { cx } from "@/lib/cx";

type Variant = "solid" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  // Inverted slab. The single strongest affordance on any screen.
  solid: "border-bone bg-bone text-void hover:border-amber hover:bg-amber",
  outline: "border-weld bg-transparent text-bone hover:border-bone hover:bg-bone hover:text-void",
  ghost: "border-transparent bg-transparent text-ash hover:border-hair hover:text-bone",
  // Destructive reads as inverted amber, not a second hue.
  danger: "border-amber bg-transparent text-amber hover:bg-amber hover:text-void",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[0.6875rem]",
  md: "px-4 py-2.5 text-xs",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Renders the label in the Latin system register instead of Arabic. */
  sys?: boolean;
  full?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", sys = false, full = false, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center gap-2 border font-semibold",
        // Mechanical: instant, linear, no bounce.
        "transition-colors duration-100 ease-mech",
        "disabled:cursor-not-allowed disabled:border-hair disabled:bg-transparent disabled:text-dust",
        sys ? "sys" : "font-plex tracking-normal",
        VARIANT[variant],
        SIZE[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
