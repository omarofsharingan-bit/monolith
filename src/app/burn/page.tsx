import type { Metadata } from "next";

import { auth } from "@/auth";
import { dict } from "@/lib/i18n";
import { Shell, PageHead } from "@/components/Shell";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { DataRow, EmptyState, Stat } from "@/components/ui/DataRow";
import { BurnChart, BurnLegend, type BurnPoint } from "@/components/BurnChart";
import { ROLE_LABEL } from "@/lib/roles";
import { cx } from "@/lib/cx";
import { formatCurrency, formatDate, formatMonthLabel, formatNumber } from "@/lib/format";
import { getVault, listTransactions } from "@/lib/repo";
import { RUNWAY_WARN_MONTHS, burnForecast, monthlySeries } from "@/lib/domain";

export const metadata: Metadata = {
  title: `${dict.burn.title} — ${dict.app.name}`,
};

export const dynamic = "force-dynamic";

export default async function BurnPage() {
  const session = await auth();

  const vault = getVault();
  const transactions = listTransactions();
  const series = monthlySeries(transactions);
  const forecast = burnForecast(series, vault.total_funds);

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
  const depletionMonth = forecast.projection.at(-1)?.month ?? null;
  const hasForecast = forecast.sampleSize >= 2;

  return (
    <Shell
      vaultName={vault.name}
      userName={session?.user?.name ?? dict.common.you}
      userRole={ROLE_LABEL[session?.user?.role ?? "member"]}
    >
      <PageHead sys="BURN / TREND" title={dict.burn.title} caption={dict.burn.subtitle} />

      {runwayLow && (
        <div className="mb-6 flex items-start gap-4 border-2 border-amber bg-amber-wash px-5 py-4">
          <span className="sys shrink-0 pt-0.5 text-micro text-amber">RUNWAY LOW</span>
          <p className="font-kufi text-[0.8125rem] font-semibold leading-relaxed text-bone">
            {dict.burn.warnLow}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          sys="BALANCE / LINEAR FIT"
          title={dict.burn.title}
          caption={dict.burn.disclaimer}
        >
          {hasForecast ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Stat
                  label={dict.home.totalFunds}
                  value={formatNumber(vault.total_funds)}
                  unit={dict.common.currency}
                  sys="CURRENT"
                />
                <Stat
                  label={dict.burn.monthlyBurn}
                  value={formatNumber(forecast.monthlyBurn)}
                  unit={dict.common.currency}
                  sys={`OLS · N=${forecast.sampleSize}`}
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
                  value={
                    forecast.depletionDate ? formatDate(forecast.depletionDate) : dict.common.none
                  }
                  numeric={false}
                  sys="PROJECTED"
                />
              </div>

              <BurnChart data={chartData} height={340} depletionMonth={depletionMonth} />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <BurnLegend />
                <p className="font-plex text-[0.6875rem] text-dust">
                  {forecast.runwayMonths !== null
                    ? `~${formatNumber(forecast.runwayMonths, 1)} ${dict.burn.runwayValue}`
                    : dict.burn.runwayInfinite}
                </p>
              </div>
            </>
          ) : (
            <EmptyState sys="INSUFFICIENT DATA">{dict.burn.empty}</EmptyState>
          )}
        </Panel>

        <Panel sys="MONTHLY BREAKDOWN" title={dict.burn.spend} flush>
          <div className="max-h-[34rem] overflow-y-auto px-5 py-2">
            {[...series].reverse().map((point, i, arr) => (
              <DataRow
                key={point.month}
                label={formatMonthLabel(point.month)}
                sub={
                  <span className="num font-mono">
                    {`+${formatNumber(point.inflow)} / −${formatNumber(point.outflow)}`}
                  </span>
                }
                value={
                  <span className={cx(point.net >= 0 ? "text-bone" : "text-ash")}>
                    {point.net >= 0 ? "+" : "−"}
                    {formatNumber(Math.abs(point.net))}
                  </span>
                }
                sys={
                  !point.complete ? (
                    <span className="sys text-micro text-amber">OPEN</span>
                  ) : undefined
                }
                last={i === arr.length - 1}
              />
            ))}
          </div>

          <PanelFooter>
            <DataRow
              label={dict.burn.balance}
              value={formatCurrency(vault.total_funds)}
              emphasis
              last
            />
          </PanelFooter>
        </Panel>
      </div>
    </Shell>
  );
}
