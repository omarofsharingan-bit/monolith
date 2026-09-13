import type { Metadata } from "next";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { Shell, PageHead } from "@/components/Shell";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { EmptyState, Stat } from "@/components/ui/DataRow";
import { StatusPill } from "@/components/ui/StatusPill";
import { LiveSync } from "@/components/LiveSync";
import { ROLE_LABEL } from "@/lib/roles";
import { cx } from "@/lib/cx";
import {
  formatClock,
  formatCurrency,
  formatNumber,
  formatStamp,
  maskAccount,
} from "@/lib/format";
import {
  countByStatus,
  getVault,
  listAccounts,
  listTransactions,
  transactionIdsWithReceipts,
} from "@/lib/repo";
import { sumBy } from "@/lib/domain";

export const metadata: Metadata = {
  title: `${dict.bank.title} — ${dict.app.name}`,
};

export const dynamic = "force-dynamic";

/** Rows younger than this are marked as freshly arrived. */
const FRESH_MS = 45_000;

export default async function BankPage() {
  const session = await auth();

  const vault = getVault();
  const transactions = listTransactions(40);
  const accounts = listAccounts();
  const statusCounts = countByStatus();
  const withReceipts = transactionIdsWithReceipts();

  const totalIn = sumBy(transactions, "inflow");
  const totalOut = sumBy(transactions, "outflow");
  const lastSync = transactions[0]?.timestamp ?? new Date().toISOString();
  const now = Date.now();

  return (
    <Shell
      vaultName={vault.name}
      userName={session?.user?.name ?? dict.common.you}
      userRole={ROLE_LABEL[session?.user?.role ?? "member"]}
    >
      <PageHead
        sys="OPEN BANKING / MOCK"
        title={dict.bank.title}
        caption={dict.bank.subtitle}
        action={<LiveSync initialSyncedAt={lastSync} />}
      />

      {/* The disclaimer is not fine print — it sits above the data it describes. */}
      <div className="mb-6 flex items-start gap-4 border-2 border-amber bg-amber-wash px-5 py-4">
        <span className="sys shrink-0 pt-0.5 text-micro text-amber">SIMULATED</span>
        <div className="min-w-0">
          <p className="font-kufi text-[0.8125rem] font-semibold leading-relaxed text-bone">
            {dict.bank.simulated}
          </p>
          <p className="mt-1.5 font-plex text-[0.75rem] leading-relaxed text-ash">
            {dict.bank.simulatedLong}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {accounts.map((account, i) => (
          <Panel key={account} sys={`ACCOUNT ${String(i + 1).padStart(2, "0")}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-plex text-[0.6875rem] text-dust">{dict.bank.account}</div>
                <div className="num mt-1.5 font-mono text-[0.9375rem] font-bold text-bone">
                  {maskAccount(account)}
                </div>
                <div className="sys mt-2.5 text-micro text-dust">
                  {dict.bank.lastSync} {formatClock(lastSync)}
                </div>
              </div>
              <StatusPill status="SYNCED" />
            </div>
          </Panel>
        ))}

        <Panel sys="RECONCILIATION">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {(["VERIFIED", "SYNCED", "PENDING"] as const).map((status) => (
              <div key={status} className="flex items-center gap-2.5">
                <StatusPill status={status} />
                <span className="num font-mono text-[0.8125rem] font-bold text-bone">
                  {formatNumber(statusCounts[status])}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        sys="TRANSACTION FEED"
        title={dict.bank.transactions}
        caption={`${formatNumber(transactions.length)} ${dict.bank.newRecords}`}
        flush
      >
        {transactions.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyState sys="NO TRANSACTIONS">{dict.bank.empty}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse">
              <thead>
                <tr className="border-b border-weld bg-pit">
                  <th className="px-5 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                    {dict.bank.description}
                  </th>
                  <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                    {dict.bank.account}
                  </th>
                  <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                    {dict.bank.timestamp}
                  </th>
                  <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                    {dict.bank.status}
                  </th>
                  <th className="px-5 py-2.5 text-end font-plex text-[0.6875rem] font-medium text-dust">
                    {dict.bank.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const fresh = (() => {
                    const age = now - new Date(tx.timestamp).getTime();
                    // Seeded rows can carry a later hour on today's date; only
                    // genuinely recent arrivals get the flag.
                    return age >= 0 && age < FRESH_MS;
                  })();
                  return (
                    <tr
                      key={tx.id}
                      className={cx(
                        "border-b border-hair transition-colors duration-100 ease-mech hover:bg-pit",
                        // A freshly landed row is flagged on the reading edge.
                        fresh && "animate-wipe-in border-s-2 border-s-amber bg-amber-wash",
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="font-plex text-[0.8125rem] text-bone">
                          {tx.description}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                          <span className="num font-mono text-[0.625rem] text-dust">
                            {tx.reference}
                          </span>
                          {withReceipts.has(tx.id) && (
                            <span className="sys border border-weld px-1.5 py-0.5 text-micro text-ash">
                              RECEIPT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num px-3 py-3 font-mono text-[0.6875rem] text-ash">
                        {maskAccount(tx.account)}
                      </td>
                      <td className="num px-3 py-3 font-mono text-[0.6875rem] text-dust">
                        {formatStamp(tx.timestamp)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={tx.sync_status} />
                      </td>
                      <td
                        className={cx(
                          "num px-5 py-3 text-end font-mono text-[0.8125rem] font-bold",
                          tx.type === "inflow" ? "text-bone" : "text-ash",
                        )}
                      >
                        {tx.type === "inflow" ? "+" : "−"}
                        {formatNumber(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PanelFooter>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Stat label={dict.bank.totalIn} value={formatNumber(totalIn)} unit={dict.common.currency} sys="INFLOW" />
            <Stat label={dict.bank.totalOut} value={formatNumber(totalOut)} unit={dict.common.currency} sys="OUTFLOW" />
            <Stat
              label={dict.bank.net}
              value={`${totalIn - totalOut >= 0 ? "+" : "−"}${formatNumber(Math.abs(totalIn - totalOut))}`}
              unit={dict.common.currency}
              sys="NET"
              tone={totalIn - totalOut >= 0 ? "bone" : "amber"}
            />
          </div>
          <p className="mt-4 font-plex text-[0.6875rem] leading-relaxed text-dust">
            {`${dict.home.totalFunds}: ${formatCurrency(vault.total_funds)}`}
          </p>
        </PanelFooter>
      </Panel>
    </Shell>
  );
}
