import type { Metadata } from "next";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { Shell, PageHead } from "@/components/Shell";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/DataRow";
import { AuditList } from "@/components/AuditList";
import { LedgerBoard } from "@/components/LedgerBoard";
import { ROLE_LABEL } from "@/lib/roles";
import { formatCurrency, formatNumber, formatStamp } from "@/lib/format";
import {
  countAuditEntries,
  getVault,
  listAuditLog,
  listDisbursements,
  listStakeholders,
} from "@/lib/repo";

export const metadata: Metadata = {
  title: `${dict.ledger.title} — ${dict.app.name}`,
};

// Mutations land through server actions; never serve this page from cache.
export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const session = await auth();

  const vault = getVault();
  const stakeholders = listStakeholders();
  const audit = listAuditLog();
  const disbursements = listDisbursements();
  const auditCount = countAuditEntries();

  return (
    <Shell
      vaultName={vault.name}
      userName={session?.user?.name ?? dict.common.you}
      userRole={ROLE_LABEL[session?.user?.role ?? "member"]}
    >
      <PageHead sys="EQUITY / LEDGER" title={dict.ledger.title} caption={dict.ledger.subtitle} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LedgerBoard stakeholders={stakeholders} totalFunds={vault.total_funds} />
        </div>

        <div className="space-y-6">
          <Panel
            id="audit"
            sys="AUDIT CHAIN"
            title={dict.audit.title}
            caption={dict.audit.subtitle}
            flush
            action={
              <span className="sys border border-weld px-2.5 py-1 text-micro text-ash">
                {formatNumber(auditCount)} {dict.audit.entryCount}
              </span>
            }
          >
            <div className="max-h-[38rem] overflow-y-auto px-5">
              <AuditList entries={audit} />
            </div>
          </Panel>

          <Panel sys="DISBURSEMENT LOG" title={dict.ledger.disbursements} flush>
            {disbursements.length === 0 ? (
              <div className="px-5 py-4">
                <EmptyState sys="NO DISBURSEMENTS">
                  {dict.ledger.disbursementsEmpty}
                </EmptyState>
              </div>
            ) : (
              <ul>
                {disbursements.map((d) => (
                  <li
                    key={d.id}
                    className="border-b border-hair px-5 py-3.5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-plex text-[0.8125rem] leading-relaxed text-bone">
                        {d.note}
                      </p>
                      <span className="num shrink-0 font-mono text-[0.8125rem] font-bold text-bone">
                        {formatCurrency(d.amount)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="font-plex text-[0.6875rem] text-ash">{d.actor}</span>
                      <span className="num font-mono text-[0.625rem] text-dust">
                        {formatStamp(d.timestamp)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
