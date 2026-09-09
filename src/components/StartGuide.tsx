"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";

const STORAGE_KEY = "monolith:guide-hidden";

const STEPS = [
  {
    sys: "EQUITY",
    title: dict.guide.step1Title,
    body: dict.guide.step1Body,
    cta: dict.guide.step1Cta,
    href: "/ledger",
  },
  {
    sys: "IMPORT",
    title: dict.guide.step2Title,
    body: dict.guide.step2Body,
    cta: dict.guide.step2Cta,
    href: "/import",
  },
  {
    sys: "BURN",
    title: dict.guide.step3Title,
    body: dict.guide.step3Body,
    cta: dict.guide.step3Cta,
    href: "/burn",
  },
  {
    sys: "DISBURSE",
    title: dict.guide.step4Title,
    body: dict.guide.step4Body,
    cta: dict.guide.step4Cta,
    href: "/ledger",
  },
] as const;

/**
 * First-run orientation. Dismissed state lives in localStorage — a per-viewer
 * convenience, not something worth a database column.
 *
 * Renders open on the server and only collapses after mount, so the guide is
 * present for anyone with storage disabled rather than silently missing.
 */
export function StartGuide() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setHidden(true);
    } catch {
      // Private mode or blocked storage: keep the guide visible.
    }
  }, []);

  function setHiddenPersisted(next: boolean) {
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Nothing to do — the toggle still works for this page view.
    }
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHiddenPersisted(false)}
        className="mb-6 flex w-full items-center justify-between gap-4 border border-hair bg-slab px-5 py-3 text-start transition-colors duration-100 ease-mech hover:border-weld"
      >
        <span className="font-plex text-[0.8125rem] text-ash">{dict.guide.show}</span>
        <span className="sys text-micro text-dust">GUIDE</span>
      </button>
    );
  }

  return (
    <section className="mb-6 border border-hair bg-slab">
      <header className="flex items-start justify-between gap-4 border-b border-hair px-5 py-3.5">
        <div>
          <div className="sys text-micro text-dust">GETTING STARTED</div>
          <h2 className="mt-1 font-kufi text-[0.9375rem] font-semibold text-bone">
            {dict.guide.title}
          </h2>
          <p className="mt-1.5 font-plex text-xs text-ash">{dict.guide.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setHiddenPersisted(true)}
          className="sys shrink-0 border border-hair px-2.5 py-1 text-micro text-dust transition-colors duration-100 ease-mech hover:border-bone hover:text-bone"
        >
          {dict.guide.hide}
        </button>
      </header>

      <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step.sys}
            className={cx(
              "border-hair px-5 py-4",
              // Hairlines between cells only, never around the outside.
              i < STEPS.length - 1 && "border-b md:border-b xl:border-b-0 xl:border-e",
              i === 1 && "md:border-e-0 xl:border-e",
              i % 2 === 0 && "md:border-e",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="num font-kufi text-lg font-bold leading-none text-amber">
                {i + 1}
              </span>
              <span className="sys text-micro text-dust">{step.sys}</span>
            </div>
            <h3 className="mt-2 font-kufi text-[0.8125rem] font-semibold leading-snug text-bone">
              {step.title}
            </h3>
            <p className="mt-1.5 font-plex text-[0.75rem] leading-relaxed text-ash">
              {step.body}
            </p>
            <Link
              href={step.href}
              className="mt-3 inline-block border-b border-weld pb-0.5 font-plex text-[0.75rem] text-bone transition-colors duration-100 ease-mech hover:border-amber hover:text-amber"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
