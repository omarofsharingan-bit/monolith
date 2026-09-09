import type { AuditLogEntry } from "@/lib/domain";
import { dict } from "@/lib/i18n";
import { formatStamp } from "@/lib/format";
import { EmptyState } from "@/components/ui/DataRow";
import { cx } from "@/lib/cx";

/** Latin system tag per action — the audit log's machine register. */
const ACTION_SYS: Record<AuditLogEntry["action"], string> = {
  created: "CREATE",
  updated: "UPDATE",
  deleted: "DELETE",
  distributed: "DISBURSE",
};

/**
 * The trust mechanism. Append-only by construction: nothing in the app issues
 * an UPDATE or DELETE against audit_log, so a row here is a permanent record.
 */
export function AuditList({
  entries,
  dense = false,
}: {
  entries: AuditLogEntry[];
  dense?: boolean;
}) {
  if (entries.length === 0) {
    return <EmptyState sys="EMPTY LOG">{dict.audit.empty}</EmptyState>;
  }

  return (
    <ol className="relative">
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          className={cx(
            "relative flex gap-4 border-hair ps-5",
            i !== entries.length - 1 && "border-b",
            dense ? "py-3" : "py-4",
          )}
        >
          {/* Chain spine: a hairline down the reading edge with a node per entry. */}
          <span
            aria-hidden
            className="absolute inset-y-0 start-[3px] w-px bg-hair"
          />
          <span
            aria-hidden
            className={cx(
              "absolute start-0 h-[7px] w-[7px]",
              dense ? "top-3.5" : "top-[18px]",
              entry.action === "distributed" ? "bg-amber" : "bg-weld",
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="sys text-micro text-dust">{ACTION_SYS[entry.action]}</span>
              <span className="font-plex text-[0.8125rem] font-medium text-bone">
                {entry.actor}
              </span>
            </div>

            <p className="mt-1 font-plex text-[0.8125rem] leading-relaxed text-ash">
              {entry.change_description}
            </p>

            {entry.old_value !== null && entry.new_value !== null && (
              <div className="mt-2 inline-flex items-center gap-2 border border-hair bg-pit px-2.5 py-1">
                <span className="font-plex text-[0.6875rem] text-dust">{dict.audit.from}</span>
                <span className="num font-mono text-[0.6875rem] text-ash line-through">
                  {entry.old_value}
                </span>
                {/* Chevron points to the reading direction: RTL means leftward. */}
                <span aria-hidden className="text-dust">
                  ←
                </span>
                <span className="font-plex text-[0.6875rem] text-dust">{dict.audit.to}</span>
                <span className="num font-mono text-[0.6875rem] font-bold text-bone">
                  {entry.new_value}
                </span>
              </div>
            )}
          </div>

          <time
            dateTime={entry.timestamp}
            className="num shrink-0 font-mono text-[0.625rem] leading-relaxed text-dust"
          >
            {formatStamp(entry.timestamp)}
          </time>
        </li>
      ))}
    </ol>
  );
}
