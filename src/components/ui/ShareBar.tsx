import * as React from "react";
import { cx } from "@/lib/cx";
import { formatPercent } from "@/lib/format";

export type ShareSegment = {
  id: string | number;
  name: string;
  /** Matches the Stakeholder field name so rows pass straight through. */
  split_percentage: number;
};

/**
 * The equity manifest, drawn as a single stark horizontal bar rather than a pie.
 * Inside dir="rtl" the flex row fills from the right edge, which is correct:
 * the first stakeholder reads first.
 *
 * Segments are distinguished by stepped luminance of the same bone white — the
 * accent stays reserved for the unallocated remainder, which is an alert state.
 */
const STEPS = ["#F5F5F5", "#C8C8C8", "#9E9E9E", "#7A7A7A", "#5C5C5C", "#464646", "#363636"];

export function segmentColor(index: number): string {
  return STEPS[index % STEPS.length];
}

export function ShareBar({
  segments,
  height = "h-10",
  showLabels = true,
  className,
}: {
  segments: ShareSegment[];
  height?: string;
  showLabels?: boolean;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.split_percentage, 0);
  const remainder = Math.max(0, 100 - total);
  // Anything over 100% is drawn proportionally so the bar never overflows.
  const scale = total > 100 ? 100 / total : 1;

  return (
    <div className={className}>
      <div className={cx("flex w-full border border-weld bg-pit", height)}>
        {segments.map((seg, i) => {
          const width = seg.split_percentage * scale;
          if (width <= 0) return null;
          return (
            <div
              key={seg.id}
              className="relative flex items-center justify-center overflow-hidden border-e border-void transition-[flex-basis] duration-200 ease-mech last:border-e-0"
              style={{ flexBasis: `${width}%`, backgroundColor: segmentColor(i) }}
              title={`${seg.name} — ${formatPercent(seg.split_percentage)}`}
            >
              {width >= 9 && (
                <span className="num font-mono text-[0.625rem] font-bold text-void">
                  {formatPercent(seg.split_percentage)}
                </span>
              )}
            </div>
          );
        })}
        {remainder > 0.001 && (
          <div
            className="flex items-center justify-center border-s border-void bg-amber-wash"
            style={{ flexBasis: `${remainder}%` }}
            title={formatPercent(remainder)}
          >
            {remainder >= 9 && (
              <span className="num font-mono text-[0.625rem] font-bold text-amber">
                {formatPercent(remainder)}
              </span>
            )}
          </div>
        )}
      </div>

      {showLabels && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {segments.map((seg, i) => (
            <li key={seg.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0"
                style={{ backgroundColor: segmentColor(i) }}
              />
              <span className="font-plex text-[0.75rem] text-ash">{seg.name}</span>
              <span className="num font-mono text-[0.6875rem] text-bone">
                {formatPercent(seg.split_percentage)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
