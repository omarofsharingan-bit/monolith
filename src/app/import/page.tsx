import type { Metadata } from "next";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { Shell, PageHead } from "@/components/Shell";
import Link from "next/link";

import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { ImportPanel } from "@/components/ImportPanel";
import { ROLE_LABEL } from "@/lib/roles";
import { CSV_TEMPLATE } from "@/lib/import";
import { formatNumber } from "@/lib/format";
import { getVault } from "@/lib/repo";

export const metadata: Metadata = {
  title: `${dict.import.title} — ${dict.app.name}`,
};

export const dynamic = "force-dynamic";

const SOURCES = [
  { sys: "SEEDED", title: dict.import.source1Title, body: dict.import.source1Body },
  { sys: "SIMULATED", title: dict.import.source2Title, body: dict.import.source2Body },
  { sys: "MANUAL", title: dict.import.source3Title, body: dict.import.source3Body },
] as const;

const COLUMNS = [
  { key: "type", label: dict.import.colType, required: true },
  { key: "amount", label: dict.import.colAmount, required: true },
  { key: "description", label: dict.import.colDescription, required: true },
  { key: "account", label: dict.import.colAccount, required: false },
  { key: "timestamp", label: dict.import.colTimestamp, required: false },
] as const;

/**
 * Server-rendered confirmation.
 *
 * Driven by the URL rather than form state: the server action revalidates other
 * routes, which remounts this route's client tree, so anything held in React
 * state would be gone by the time it rendered.
 */
function ImportSuccess({ inserted, replaced }: { inserted: number; replaced: number }) {
  return (
    <Panel sys="IMPORT COMPLETE" title={dict.import.successTitle}>
      <div className="flex flex-wrap items-center gap-4">
        <StatusPill status="VERIFIED" />
        <p className="font-plex text-[0.8125rem] leading-relaxed text-ash">
          {dict.import.successBody}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4 border-t border-hair pt-4">
        <div>
          <div className="sys text-micro text-dust">INSERTED</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="num font-kufi text-2xl font-bold leading-none text-bone">
              {formatNumber(inserted)}
            </span>
            <span className="font-plex text-xs text-ash">{dict.import.inserted}</span>
          </div>
        </div>
        {replaced > 0 && (
          <div>
            <div className="sys text-micro text-dust">REPLACED</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="num font-kufi text-2xl font-bold leading-none text-amber">
                {formatNumber(replaced)}
              </span>
              <span className="font-plex text-xs text-ash">{dict.import.replaced}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/import"
          className="inline-flex items-center border border-weld px-4 py-2.5 font-plex text-xs font-semibold text-bone transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
        >
          {dict.import.importAnother}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center border border-transparent px-4 py-2.5 font-plex text-xs text-ash transition-colors duration-100 ease-mech hover:border-hair hover:text-bone"
        >
          {dict.nav.home}
        </Link>
      </div>
    </Panel>
  );
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: { imported?: string; replaced?: string };
}) {
  const session = await auth();
  const vault = getVault();

  const inserted = Number(searchParams.imported);
  const replaced = Number(searchParams.replaced);
  const justImported = Number.isInteger(inserted) && inserted > 0;

  return (
    <Shell
      vaultName={vault.name}
      userName={session?.user?.name ?? dict.common.you}
      userRole={ROLE_LABEL[session?.user?.role ?? "member"]}
    >
      <PageHead sys="DATA / IMPORT" title={dict.import.title} caption={dict.import.subtitle} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {justImported ? (
            <ImportSuccess
              inserted={inserted}
              replaced={Number.isInteger(replaced) ? replaced : 0}
            />
          ) : (
            <ImportPanel />
          )}
        </div>

        <div className="space-y-6">
          {/* Where the numbers on every other screen actually come from. */}
          <Panel sys="DATA SOURCES" title={dict.import.sourcesTitle} flush>
            <ol>
              {SOURCES.map((source, i) => (
                <li
                  key={source.sys}
                  className="border-b border-hair px-5 py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="num font-mono text-[0.625rem] text-dust">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="sys text-micro text-dust">{source.sys}</span>
                  </div>
                  <h3 className="mt-1.5 font-kufi text-[0.8125rem] font-semibold text-bone">
                    {source.title}
                  </h3>
                  <p className="mt-1.5 font-plex text-[0.75rem] leading-relaxed text-ash">
                    {source.body}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            sys="FILE FORMAT"
            title={dict.import.formatTitle}
            caption={dict.import.formatBody}
            action={
              <a
                href="/api/import/template"
                download="monolith-template.csv"
                className="group inline-flex items-center gap-2.5 border border-weld px-3 py-1.5 transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone"
              >
                <span className="font-plex text-[0.6875rem] text-ash group-hover:text-void">
                  {dict.import.downloadTemplate}
                </span>
                <span className="sys text-micro text-dust group-hover:text-void">CSV</span>
              </a>
            }
          >
            <ul className="space-y-2.5">
              {COLUMNS.map((col) => (
                <li key={col.key} className="flex items-baseline gap-3">
                  <code className="num shrink-0 border border-hair bg-pit px-2 py-0.5 font-mono text-[0.6875rem] text-bone">
                    {col.key}
                  </code>
                  <span className="font-plex text-[0.75rem] leading-relaxed text-ash">
                    {col.label}
                  </span>
                  {!col.required && (
                    <span className="sys shrink-0 text-micro text-dust">OPT</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-hair pt-4">
              <div className="sys mb-2 text-micro text-dust">{dict.import.example}</div>
              {/* dir=ltr: this is a file format, not prose. */}
              <pre
                dir="ltr"
                className="overflow-x-auto border border-hair bg-pit p-3 font-mono text-[0.625rem] leading-relaxed text-ash"
              >
                {CSV_TEMPLATE}
              </pre>
            </div>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
