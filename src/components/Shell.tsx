import Link from "next/link";
import { dict } from "@/lib/i18n";
import { formatStamp } from "@/lib/format";
import { cx } from "@/lib/cx";
import { NavTabs } from "@/components/NavTabs";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * The masthead + nav frame every authenticated screen sits inside.
 * Reads top-down as a terminal header: identity strip, then the tab rail.
 */
export function Shell({
  vaultName,
  userName,
  userRole,
  children,
}: {
  vaultName: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-hair bg-slab">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="group flex items-center gap-4">
            {/* The mark: a solid slab, the only "logo" this product needs. */}
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center border-2 border-bone bg-bone transition-colors duration-100 ease-mech group-hover:border-amber group-hover:bg-amber"
            >
              <span className="block h-4 w-[3px] bg-void" />
            </span>
            <span className="min-w-0">
              <span className="sys block text-micro text-dust">{dict.app.nameSys}</span>
              <span className="mt-0.5 block truncate font-kufi text-sm font-bold text-bone">
                {vaultName}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-5">
            <div className="hidden text-end sm:block">
              <div className="sys text-micro text-dust">{dict.nav.signedInAs}</div>
              <div className="mt-0.5 font-plex text-xs text-bone">
                {userName}
                <span className="text-dust"> · </span>
                <span className="text-ash">{userRole}</span>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>

        <div className="border-t border-hair">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6">
            <NavTabs />
            <div className="hidden items-center gap-2 py-2 lg:flex">
              <span aria-hidden className="h-1.5 w-1.5 bg-amber" />
              <span className="sys text-micro text-dust">
                SESSION {formatStamp(new Date())}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-7">{children}</main>

      <footer className="mt-4 border-t border-hair">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="font-plex text-[0.6875rem] leading-relaxed text-dust">
            {dict.bank.simulated}
          </p>
          <span className="sys text-micro text-dust">
            {dict.app.nameSys} · {dict.app.versionSys}
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Page heading used at the top of each inner screen. */
export function PageHead({
  title,
  sys,
  caption,
  action,
  className,
}: {
  title: string;
  sys: string;
  caption?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="sys text-micro text-dust">{sys}</div>
        <h1 className="mt-1.5 font-kufi text-2xl font-bold leading-tight text-bone">{title}</h1>
        {caption && (
          <p className="mt-2 max-w-2xl font-plex text-[0.8125rem] leading-relaxed text-ash">
            {caption}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
