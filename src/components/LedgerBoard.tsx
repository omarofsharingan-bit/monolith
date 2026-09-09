"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  createStakeholderAction,
  deleteStakeholderAction,
  distributeAction,
  updateStakeholderAction,
  type FormState,
} from "@/app/actions/ledger";
import type { Stakeholder } from "@/lib/domain";
import { allocate, isBalanced, splitRemaining, splitTotal } from "@/lib/domain";
import { dict } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { Panel, PanelFooter } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, Input, AlertBar } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/DataRow";
import { ShareBar, segmentColor } from "@/components/ui/ShareBar";

function Pending({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="solid" size="sm" disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

/** Inline add/edit row. Doubles as the create form when `editing` is null. */
function StakeholderForm({
  editing,
  onDone,
}: {
  editing: Stakeholder | null;
  onDone: () => void;
}) {
  const action = editing ? updateStakeholderAction : createStakeholderAction;
  const [state, formAction] = useFormState<FormState | undefined, FormData>(action, undefined);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="border border-weld bg-pit p-5">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-kufi text-[0.875rem] font-semibold text-bone">
          {editing ? dict.ledger.editStakeholder : dict.ledger.addStakeholder}
        </h3>
        <span className="sys text-micro text-dust">{editing ? "PATCH" : "INSERT"}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_2fr_1fr]">
        <Field label={dict.ledger.name} sys="NAME">
          <Input
            name="name"
            defaultValue={editing?.name ?? ""}
            placeholder={dict.ledger.namePlaceholder}
            required
            maxLength={80}
          />
        </Field>
        <Field label={dict.ledger.role} sys="ROLE">
          <Input
            name="role"
            defaultValue={editing?.role ?? ""}
            placeholder={dict.ledger.rolePlaceholder}
            maxLength={80}
          />
        </Field>
        <Field label={dict.ledger.share} sys="PCT">
          <Input
            name="split_percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            numeric
            defaultValue={editing?.split_percentage ?? ""}
            placeholder={dict.ledger.sharePlaceholder}
            required
          />
        </Field>
      </div>

      {state?.error && (
        <div className="mt-4">
          <AlertBar sys="REJECTED">{state.error}</AlertBar>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Pending idle={dict.ledger.save} busy={dict.ledger.saving} />
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {dict.ledger.cancel}
        </Button>
      </div>
    </form>
  );
}

function RemoveButton({ stakeholder }: { stakeholder: Stakeholder }) {
  const [, formAction] = useFormState<FormState | undefined, FormData>(
    deleteStakeholderAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(dict.ledger.confirmRemove)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={stakeholder.id} />
      <button
        type="submit"
        className="sys border border-hair px-2.5 py-1 text-micro text-dust transition-colors duration-100 ease-mech hover:border-amber hover:text-amber"
      >
        {dict.ledger.remove}
      </button>
    </form>
  );
}

/** Distribution form with a live preview of who receives what. */
function DistributeForm({
  stakeholders,
  balanced,
}: {
  stakeholders: Stakeholder[];
  balanced: boolean;
}) {
  const [state, formAction] = useFormState<FormState | undefined, FormData>(
    distributeAction,
    undefined,
  );
  const [amount, setAmount] = useState("");

  const preview = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return [];
    return allocate(value, stakeholders);
  }, [amount, stakeholders]);

  useEffect(() => {
    if (state?.ok) setAmount("");
  }, [state]);

  return (
    <form action={formAction}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label={dict.ledger.distributeAmount} sys="SAR">
          <Input
            name="amount"
            type="number"
            step="1"
            min="1"
            numeric
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={dict.ledger.distributeAmountPlaceholder}
            required
          />
        </Field>
        <Field label={dict.ledger.distributeNote} sys="MEMO">
          <Input
            name="note"
            placeholder={dict.ledger.distributeNotePlaceholder}
            maxLength={140}
          />
        </Field>
      </div>

      {preview.length > 0 && (
        <div className="mt-5 border border-hair bg-pit">
          <div className="flex items-baseline justify-between gap-3 border-b border-hair px-4 py-2.5">
            <span className="font-plex text-[0.75rem] text-ash">
              {dict.ledger.distributePreview}
            </span>
            <span className="sys text-micro text-dust">{dict.ledger.perStakeholder}</span>
          </div>
          <ul className="px-4 py-2">
            {preview.map((row, i) => (
              <li
                key={row.id}
                className="flex items-baseline justify-between gap-4 border-b border-hair py-2 last:border-b-0"
              >
                <span className="flex items-center gap-2.5 font-plex text-[0.8125rem] text-ash">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0"
                    style={{ backgroundColor: segmentColor(i) }}
                  />
                  {row.name}
                  <span className="num font-mono text-[0.625rem] text-dust">
                    {formatPercent(row.percentage)}
                  </span>
                </span>
                <span className="num font-mono text-[0.8125rem] font-bold text-bone">
                  {formatCurrency(row.share, row.share % 1 === 0 ? 0 : 2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!balanced && (
        <div className="mt-4">
          <AlertBar sys="BLOCKED">{dict.ledger.distributeBlocked}</AlertBar>
        </div>
      )}
      {state?.error && (
        <div className="mt-4">
          <AlertBar sys="REJECTED">{state.error}</AlertBar>
        </div>
      )}

      <div className="mt-5">
        <DistributeSubmit disabled={!balanced} />
      </div>
    </form>
  );
}

function DistributeSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="solid" disabled={disabled || pending}>
      {pending ? dict.ledger.saving : dict.ledger.distributeConfirm}
    </Button>
  );
}

export function LedgerBoard({
  stakeholders,
  totalFunds,
}: {
  stakeholders: Stakeholder[];
  totalFunds: number;
}) {
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [adding, setAdding] = useState(false);

  const total = splitTotal(stakeholders);
  const balanced = isBalanced(stakeholders);
  const remaining = splitRemaining(stakeholders);

  const closeForm = () => {
    setEditing(null);
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <Panel
        sys="EQUITY MANIFEST"
        title={dict.ledger.manifest}
        caption={dict.ledger.subtitle}
        action={
          !adding && !editing ? (
            <Button variant="solid" size="sm" onClick={() => setAdding(true)}>
              {dict.ledger.addStakeholder}
            </Button>
          ) : null
        }
      >
        {stakeholders.length === 0 ? (
          <EmptyState sys="NO STAKEHOLDERS">{dict.ledger.empty}</EmptyState>
        ) : (
          <>
            <ShareBar segments={stakeholders} height="h-12" showLabels={false} />

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse">
                <thead>
                  <tr className="border-b border-weld bg-pit">
                    <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.ledger.name}
                    </th>
                    <th className="px-3 py-2.5 text-start font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.ledger.role}
                    </th>
                    <th className="px-3 py-2.5 text-end font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.ledger.share}
                    </th>
                    <th className="px-3 py-2.5 text-end font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.ledger.allocation}
                    </th>
                    <th className="px-3 py-2.5 text-end font-plex text-[0.6875rem] font-medium text-dust">
                      {dict.ledger.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stakeholders.map((s, i) => (
                    <tr
                      key={s.id}
                      className={cx(
                        "border-b border-hair transition-colors duration-100 ease-mech hover:bg-pit",
                        editing?.id === s.id && "bg-pit",
                      )}
                    >
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="inline-block h-2.5 w-2.5 shrink-0"
                            style={{ backgroundColor: segmentColor(i) }}
                          />
                          <span className="font-plex text-[0.8125rem] text-bone">{s.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-plex text-[0.75rem] text-ash">
                        {s.role || dict.common.none}
                      </td>
                      <td className="num px-3 py-3 text-end font-mono text-[0.8125rem] font-bold text-bone">
                        {formatPercent(s.split_percentage)}
                      </td>
                      <td className="num px-3 py-3 text-end font-mono text-[0.8125rem] text-ash">
                        {formatCurrency(
                          Math.round(totalFunds * (s.split_percentage / 100)),
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(s);
                              setAdding(false);
                            }}
                            className="sys border border-hair px-2.5 py-1 text-micro text-dust transition-colors duration-100 ease-mech hover:border-bone hover:text-bone"
                          >
                            {dict.ledger.edit}
                          </button>
                          <RemoveButton stakeholder={s} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(adding || editing) && (
          <div className="mt-6 animate-slab-in">
            <StakeholderForm editing={editing} onDone={closeForm} />
          </div>
        )}

        <PanelFooter className="-mx-5 -mb-4 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-plex text-[0.75rem] text-ash">{dict.ledger.totalShare}</span>
              <span
                className={cx(
                  "num font-kufi text-xl font-bold leading-none",
                  balanced ? "text-bone" : "text-amber",
                )}
              >
                {formatPercent(total)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!balanced && (
                <span className="num font-mono text-[0.6875rem] text-amber">
                  {remaining > 0
                    ? `${dict.ledger.remaining} ${formatPercent(remaining)}`
                    : `${dict.ledger.over} ${formatPercent(Math.abs(remaining))}`}
                </span>
              )}
              <span
                className={cx(
                  "sys border px-2.5 py-1 text-micro",
                  balanced
                    ? "border-bone bg-bone text-void"
                    : "border-amber bg-amber text-void",
                )}
              >
                {balanced ? "BALANCED" : "UNBALANCED"}
              </span>
            </div>
          </div>

          {!balanced && (
            <p className="mt-3 font-plex text-[0.75rem] leading-relaxed text-ash">
              {dict.ledger.unbalancedHint}
            </p>
          )}
        </PanelFooter>
      </Panel>

      <Panel
        sys="DISBURSEMENT"
        title={dict.ledger.distributeTitle}
        caption={`${dict.home.totalFunds}: ${formatNumber(totalFunds)} ${dict.common.currency}`}
      >
        <DistributeForm stakeholders={stakeholders} balanced={balanced} />
      </Panel>
    </div>
  );
}
