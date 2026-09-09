"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dict } from "@/lib/i18n";
import { formatCompact, formatCurrency, formatMonthLabel, formatMonthShort } from "@/lib/format";

export type BurnPoint = {
  month: string;
  /** Actual end-of-month balance. Null once the series moves into the future. */
  balance: number | null;
  /** Fitted trend line. Null before the hand-off month. */
  projected: number | null;
};

const BONE = "#F5F5F5";
const AMBER = "#FFB000";
const HAIR = "#242424";
const DUST = "#5A5A5A";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (rows.length === 0) return null;

  return (
    <div dir="rtl" className="border border-weld bg-void px-3 py-2">
      <div className="sys mb-1.5 text-micro text-dust">{label}</div>
      <div className="font-kufi text-[0.8125rem] font-semibold text-bone">
        {formatMonthLabel(String(label))}
      </div>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => {
          const projected = row.dataKey === "projected";
          return (
            <li key={row.dataKey} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-3.5 shrink-0"
                style={{ backgroundColor: projected ? AMBER : BONE }}
              />
              <span className="font-plex text-[0.6875rem] text-ash">
                {projected ? dict.burn.projected : dict.burn.historical}
              </span>
              <span
                className="num font-mono text-[0.6875rem] font-bold"
                style={{ color: projected ? AMBER : BONE }}
              >
                {formatCurrency(Number(row.value))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Balance history against a linear trend projection.
 *
 * RTL handling is explicit: the X axis is `reversed` so time runs right-to-left
 * with the Arabic reading order, and the Y axis moves to the right edge, which
 * is where the axis sits in an RTL layout.
 */
export function BurnChart({
  data,
  height = 300,
  compact = false,
  depletionMonth,
}: {
  data: BurnPoint[];
  height?: number;
  compact?: boolean;
  /** Draws the vertical marker where the trend reaches zero. */
  depletionMonth?: string | null;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke={HAIR} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            reversed
            tickFormatter={formatMonthShort}
            stroke={HAIR}
            tick={{ fill: DUST, fontSize: 10, fontFamily: "var(--font-plex)" }}
            tickLine={false}
            axisLine={{ stroke: HAIR }}
            interval={compact ? "preserveStartEnd" : 0}
            minTickGap={4}
          />
          <YAxis
            orientation="right"
            tickFormatter={(v: number) => formatCompact(v)}
            stroke={HAIR}
            tick={{ fill: DUST, fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={compact ? 40 : 52}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: DUST, strokeWidth: 1, strokeDasharray: "2 3" }}
          />

          {depletionMonth && (
            <ReferenceLine
              x={depletionMonth}
              stroke={AMBER}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          <Line
            type="linear"
            dataKey="balance"
            stroke={BONE}
            strokeWidth={2}
            // Square dots, not circles — the design language has no curves.
            dot={compact ? false : { fill: BONE, stroke: BONE, r: 2, strokeWidth: 0 }}
            activeDot={{ fill: BONE, stroke: "#0A0A0A", strokeWidth: 2, r: 4 }}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="linear"
            dataKey="projected"
            stroke={AMBER}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ fill: AMBER, stroke: "#0A0A0A", strokeWidth: 2, r: 4 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Shared legend, kept outside the chart so it inherits page typography. */
export function BurnLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <li className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-0.5 w-4 bg-bone" />
        <span className="font-plex text-[0.6875rem] text-ash">{dict.burn.historical}</span>
      </li>
      <li className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-0.5 w-4"
          style={{
            // Hard-edged dashes, no gradient blending.
            backgroundImage: `repeating-linear-gradient(90deg, ${AMBER} 0 5px, transparent 5px 9px)`,
          }}
        />
        <span className="font-plex text-[0.6875rem] text-ash">{dict.burn.projected}</span>
      </li>
    </ul>
  );
}
