import Link from "next/link";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { Shell } from "@/components/Shell";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { DataRow, Stat, EmptyState } from "@/components/ui/DataRow";
import { StatusPill } from "@/components/ui/StatusPill";
import { ShareBar, segmentColor } from "@/components/ui/ShareBar";
import { AuditList } from "@/components/AuditList";
import { StartGuide } from "@/components/StartGuide";
import { BurnChart, BurnLegend, type BurnPoint } from "@/components/BurnChart";
import {
  getVault,
  listAuditLog,
  listStakeholders,
  listTransactions,
} from "@/lib/repo";
import {
  RUNWAY_WARN_MONTHS,
  burnForecast,
  isBalanced,
  monthlySeries,
  splitRemaining,
  splitTotal,
} from "@/lib/domain";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatStamp,
  maskAccount,
} from "@/lib/format";
import { cx } from "@/lib/cx";
import { ROLE_LABEL } from "@/lib/roles";

export default async function DashboardPage() {
  const session = await auth();

  const vault = getVault();
  const stakeholders = listStakeholders();
  const transactions = listTransactions();
  const audit = listAuditLog(4);

  const series = monthlySeries(transactions);
  const forecast = burnForecast(series, vault.total_funds);
  const balanced = isBalanced(stakeholders);
  const remaining = splitRemaining(stakeholders);

  const thisMonth = series[series.length - 1];
  const recentTx = [...transactions]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 4);
  const lastSync = recentTx[0]?.timestamp ?? new Date().toISOString();

  // Stitch history and projection into one series; the hand-off month carries
  // both values so the two lines meet instead of leaving a gap.
  const chartData: BurnPoint[] = [
    ...series.map((p, i) => ({
      month: p.month,
      balance: p.balance,
      projected: i === series.length - 1 ? p.balance : null,
    })),
    ...forecast.projection.map((p) => ({
      month: p.month,
      balance: null,
      projected: p.projected,
    })),
  ];

  const runwayLow =
    forecast.runwayMonths !== null && forecast.runwayMonths < RUNWAY_WARN_MONTHS;

  return (
    <Shell
      vaultName={vault.name}
      userName={session?.user?.name ?? dict.common.you}
      userRole={ROLE_LABEL[session?.user?.role ?? "member"]}
    >
      <StartGuide />

      {/* ------------------------------------------------------------------ */}
      {/* The vault door: one heavy slab carrying the single most important   */}
      {/* number in the product, with the integrity checks bolted underneath. */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-6 animate-slab-in border-2 border-weld bg-slab">
        <div className="flex flex-wrap items-start justify-between gap-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="sys text-micro text-dust">
                VAULT&nbsp;/&nbsp;0x{String(vault.id).padStart(2, "0")}
              </span>
              <span aria-hidden className="h-px w-8 bg-weld" />
              <StatusPill status="VERIFIED" />
            </div>
            <h1 className="mt-3 font-kufi text-2xl font-bold leading-tight text-bone sm:text-[1.75rem]">
              {vault.name}
            </h1>
            <p className="mt-2 max-w-md font-plex text-[0.8125rem] leading-relaxed text-ash">
              {vault.org}
            </p>
          </div>

          <div className="text-start sm:text-end">
            <div className="sys text-micro text-dust">TOTAL BALANCE</div>
            <div className="mt-2 font-plex text-[0.75rem] text-ash">{dict.home.totalFunds}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
              <span className="num font-kufi text-[2.75rem] font-bold leading-none text-bone sm:text-[3.5rem]">
                {formatNumber(vault.total_funds)}
              </span>
              <span className="font-kufi text-lg text-ash">{dict.common.currency}</span>
            </div>
            <div className="sys mt-3 text-micro text-dust">
              {dict.home.asOf} {formatDate(new Date())}
            </div>
          </div>
        </div>

        {/* Integrity strip: three checks, hairline-separated. */}
        <div className="grid grid-cols-1 border-t border-hair bg-pit sm:grid-cols-3">
          <div className="border-b border-hair px-6 py-4 sm:border-b-0 sm:border-e sm:px-8">
            <div className="sys text-micro text-dust">SPLIT INTEGRITY</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span
                className={cx(
                  "num font-kufi text-xl font-bold leading-none",
                  balanced ? "text-bone" : "text-amber",
                )}
              >
                {formatPercent(splitTotal(stakeholders))}
              </span>
              <span
                className={cx(
                  "font-plex text-[0.75rem]",
                  balanced ? "text-ash" : "text-amber",
                )}
              >
                {balanced ? dict.ledger.balanced : dict.ledger.unbalanced}
              </span>
            </div>
          </div>

          <div className="border-b border-hair px-6 py-4 sm:border-b-0 sm:border-e sm:px-8">
            <div className="sys text-micro text-dust">NET THIS MONTH</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="num font-kufi text-xl font-bold leading-none text-bone">
                {thisMonth ? (thisMonth.net >= 0 ? "+" : "−") : ""}
                {formatNumber(Math.abs(thisMonth?.net ?? 0))}
              </span>
              <span className="font-plex text-[0.75rem] text-ash">{dict.common.currency}</span>
            </div>
          </div>

          <div className="px-6 py-4 sm:px-8">
            <div className="sys text-micro text-dust">RUNWAY</div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span
                className={cx(
                  "num font-kufi text-xl font-bold leading-none",
                  runwayLow ? "text-amber" : "text-bone",
                )}
              >
                {forecast.runwayMonths !== null
                  ? `~${formatNumber(forecast.runwayMonths, 1)}`
                  : "∞"}
              </span>
              <span className="font-plex text-[0.75rem] text-ash">
                {forecast.runwayMonths !== null
                  ? dict.burn.runwayValue
                  : dict.burn.runwayInfinite}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------------------- */}
        {/* Equity split summary                                             */}
        {/* ---------------------------------------------------------------- */}
        <Panel
          className="lg:col-span-2"
          sys="EQUITY MANIFEST"
          title={dict.home.splitSummary}
          caption={`${formatNumber(stakeholders.length)} ${dict.home.stakeholders}`}
          action={
            <Link
              href="/ledger"
              className="sys border border-weld px-3 py-1.5 text-micro text-ash transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
            >
              OPEN LEDGER
            </Link>
          }
        >
          {stakeholders.length === 0 ? (
            <EmptyState sys="NO STAKEHOLDERS">{dict.ledger.empty}</EmptyState>
          ) : (
            <>
              <ShareBar segments={stakeholders} showLabels={false} />

              <div className="mt-5">
                {stakeholders.map((s, i) => (
                  <DataRow
                    key={s.id}
                    label={
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 shrink-0"
                          style={{ backgroundColor: segmentColor(i) }}
                        />
                        <span className="text-bone">{s.name}</span>
                      </span>
                    }
                    sub={s.role}
                    value={formatPercent(s.split_percentage)}
                    sys={
                      <span className="num font-mono text-[0.6875rem] text-dust">
                        {formatCurrency(
                          Math.round(vault.total_funds * (s.split_percentage / 100)),
                        )}
                      </span>
                    }
                    last={i === stakeholders.length - 1}
                  />
                ))}
              </div>
            </>
          )}

          {!balanced && (
            <div className="mt-4 flex items-start gap-3 border border-amber bg-amber-wash px-4 py-2.5">
              <span className="sys shrink-0 pt-px text-micro text-amber">UNBALANCED</span>
              <p className="font-plex text-[0.75rem] leading-relaxed text-bone">
                {dict.ledger.unbalancedHint}{" "}
                <span className="num font-mono text-amber">
                  {remaining > 0
                    ? `${dict.ledger.remaining}: ${formatPercent(remaining)}`
                    : `${dict.ledger.over}: ${formatPercent(Math.abs(remaining))}`}
                </span>
              </p>
            </div>
          )}
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Bank sync snapshot                                               */}
        {/* ---------------------------------------------------------------- */}
        <Panel
          sys="OPEN BANKING / MOCK"
          title={dict.home.bankSnapshot}
          caption={`${dict.bank.lastSync} ${formatStamp(lastSync)}`}
          flush
          action={
            <Link
              href="/bank"
              className="sys border border-weld px-3 py-1.5 text-micro text-ash transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
            >
              OPEN
            </Link>
          }
        >
          <ul>
            {recentTx.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-3 border-b border-hair px-5 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-plex text-[0.8125rem] text-bone">
                    {tx.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="num font-mono text-[0.625rem] text-dust">
                      {maskAccount(tx.account)}
                    </span>
                    <StatusPill status={tx.sync_status} />
                  </div>
                </div>
                <span
                  className={cx(
                    "num shrink-0 font-mono text-[0.8125rem] font-bold",
                    tx.type === "inflow" ? "text-bone" : "text-ash",
                  )}
                >
                  {tx.type === "inflow" ? "+" : "−"}
                  {formatNumber(tx.amount)}
                </span>
              </li>
            ))}
          </ul>

          <PanelFooter>
            <p className="font-plex text-[0.6875rem] leading-relaxed text-dust">
              {dict.bank.simulated}
            </p>
          </PanelFooter>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Burn snapshot                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Panel
          className="lg:col-span-2"
          sys="BURN / TREND"
          title={dict.home.burnSnapshot}
          caption={dict.burn.subtitle}
          action={
            <Link
              href="/burn"
              className="sys border border-weld px-3 py-1.5 text-micro text-ash transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
            >
              OPEN
            </Link>
          }
        >
          <div className="mb-4 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <Stat
              label={dict.burn.monthlyBurn}
              value={formatNumber(forecast.monthlyBurn)}
              unit={dict.common.currency}
              sys="LINEAR FIT"
            />
            <Stat
              label={dict.burn.runway}
              value={
                forecast.runwayMonths !== null
                  ? `~${formatNumber(forecast.runwayMonths, 1)}`
                  : "∞"
              }
              unit={dict.common.months}
              tone={runwayLow ? "amber" : "bone"}
              sys={runwayLow ? "LOW" : "OK"}
            />
            <Stat
              label={dict.burn.depletion}
              value={forecast.depletionDate ? formatDate(forecast.depletionDate) : dict.common.none}
              numeric={false}
              sys="PROJECTED"
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <BurnChart data={chartData} height={220} compact />
          <div className="mt-4">
            <BurnLegend />
          </div>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Recent audit entries                                             */}
        {/* ---------------------------------------------------------------- */}
        <Panel
          sys="AUDIT CHAIN"
          title={dict.home.recentAudit}
          caption={dict.audit.subtitle}
          flush
          action={
            <Link
              href="/ledger#audit"
              className="sys border border-weld px-3 py-1.5 text-micro text-ash transition-colors duration-100 ease-mech hover:border-bone hover:bg-bone hover:text-void"
            >
              ALL
            </Link>
          }
        >
          <div className="px-5">
            <AuditList entries={audit} dense />
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
