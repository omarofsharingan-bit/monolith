"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";

const TABS = [
  { href: "/", label: dict.nav.home, sys: "VAULT" },
  { href: "/ledger", label: dict.nav.ledger, sys: "EQUITY" },
  { href: "/bank", label: dict.nav.bank, sys: "SYNC" },
  { href: "/burn", label: dict.nav.burn, sys: "BURN" },
] as const;

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group relative flex items-baseline gap-2.5 border-b-2 px-4 py-3",
              "transition-colors duration-100 ease-mech",
              active
                ? "border-amber text-bone"
                : "border-transparent text-ash hover:border-weld hover:text-bone",
            )}
          >
            <span className="font-kufi text-[0.8125rem] font-medium">{tab.label}</span>
            <span
              className={cx(
                "sys text-micro",
                active ? "text-amber" : "text-dust group-hover:text-ash",
              )}
            >
              {tab.sys}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
