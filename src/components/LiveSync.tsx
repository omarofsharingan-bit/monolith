"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/Button";
import { formatClock } from "@/lib/format";

const INTERVAL_MS = 7000;

/**
 * Drives the simulated feed. Polls the mock endpoint, then asks the server
 * component tree to re-render so the new rows appear with real data rather
 * than being faked on the client.
 */
export function LiveSync({ initialSyncedAt }: { initialSyncedAt: string }) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const runSync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/bank/sync", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { synced_at: string };
        setSyncedAt(data.synced_at);
        startTransition(() => router.refresh());
      }
    } catch {
      // A dropped poll is not worth surfacing; the next tick retries.
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(runSync, INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, runSync]);

  const busy = syncing || isPending;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2.5 border border-hair bg-pit px-3 py-1.5">
        <span
          aria-hidden
          className={cx(
            "inline-block h-1.5 w-1.5",
            live ? "animate-blink bg-amber" : "bg-dust",
          )}
        />
        <span className="font-plex text-[0.6875rem] text-ash">
          {live ? dict.bank.live : dict.bank.paused}
        </span>
        <span className="num font-mono text-[0.625rem] text-dust">
          {formatClock(syncedAt)}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={runSync}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? dict.bank.syncing : dict.bank.syncNow}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setLive((v) => !v)}>
        {live ? dict.bank.pause : dict.bank.resume}
      </Button>

      {/* Scan bar: the only motion on the page, and only while a poll is open. */}
      <div className="relative h-px w-24 overflow-hidden bg-hair">
        {busy && <div className="absolute inset-y-0 w-1/2 animate-scan bg-amber" />}
      </div>
    </div>
  );
}
