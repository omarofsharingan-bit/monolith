"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { authenticate, type AuthState } from "@/app/actions/session";
import { dict } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Field, Input, AlertBar } from "@/components/ui/Field";

type DemoAccount = { email: string; name: string; role: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="solid" full disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="inline-block h-2 w-2 animate-blink bg-void" />
          {dict.auth.submitting}
        </span>
      ) : (
        dict.auth.submit
      )}
    </Button>
  );
}

export function LoginForm({
  accounts,
  demoPassword,
}: {
  accounts: DemoAccount[];
  demoPassword: string;
}) {
  const [state, formAction] = useFormState<AuthState | undefined, FormData>(
    authenticate,
    undefined,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <Field label={dict.auth.email} sys="EMAIL">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            dir="ltr"
            className="text-start"
            placeholder="name@monolith.demo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={dict.auth.password} sys="PASSPHRASE">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className="text-start"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {state?.error && (
          <AlertBar sys="DENIED">{state.error}</AlertBar>
        )}

        <SubmitButton />
      </form>

      {/* Demo credentials, one click to fill. This is a seeded hackathon build. */}
      <div className="border-t border-hair pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-kufi text-[0.8125rem] font-semibold text-bone">
            {dict.auth.demoTitle}
          </h2>
          <span className="sys text-micro text-dust">SEEDED</span>
        </div>
        <p className="mt-1.5 font-plex text-[0.6875rem] text-dust">{dict.auth.demoHint}</p>

        <ul className="mt-3 space-y-2">
          {accounts.map((acc) => (
            <li key={acc.email}>
              <button
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(demoPassword);
                }}
                className="flex w-full items-center justify-between gap-3 border border-hair bg-pit px-3 py-2.5 text-start transition-colors duration-100 ease-mech hover:border-amber"
              >
                <span className="min-w-0">
                  <span className="block font-plex text-[0.8125rem] text-bone">{acc.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-[0.625rem] text-dust">
                    {acc.email}
                  </span>
                </span>
                <span className="sys shrink-0 border border-weld px-2 py-1 text-micro text-ash">
                  {acc.role}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 font-plex text-[0.6875rem] text-dust">
          {dict.auth.demoPassword}:{" "}
          <span className="num font-mono text-ash">{demoPassword}</span>
        </p>
      </div>
    </div>
  );
}
