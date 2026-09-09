import type { Metadata } from "next";

import { dict } from "@/lib/i18n";
import { LoginForm } from "@/components/LoginForm";
import { formatStamp } from "@/lib/format";
import seed from "../../../data/seed.json";

export const metadata: Metadata = {
  title: `${dict.auth.title} — ${dict.app.name}`,
};

// The lock-state stamp must read the visit time, not the build time.
export const dynamic = "force-dynamic";

const ROLE_SYS: Record<string, string> = {
  treasurer: "TREASURER",
  founder: "FOUNDER",
  member: "MEMBER",
};

export default function LoginPage() {
  const accounts = seed.users.map((u) => ({
    email: u.email,
    name: u.display_name,
    role: ROLE_SYS[u.role] ?? u.role.toUpperCase(),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[26rem] animate-slab-in">
          {/* The mark, standing alone. */}
          <div className="mb-7 flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center border-2 border-bone bg-bone"
            >
              <span className="block h-5 w-1 bg-void" />
            </span>
            <span>
              <span className="sys block text-micro text-dust">{dict.app.nameSys}</span>
              <span className="mt-0.5 block font-kufi text-xl font-bold text-bone">
                {dict.app.name}
              </span>
            </span>
          </div>

          <div className="border-2 border-weld bg-slab">
            <header className="border-b border-hair px-6 py-5">
              <h1 className="font-kufi text-lg font-bold text-bone">{dict.auth.title}</h1>
              <p className="mt-1.5 font-plex text-[0.8125rem] leading-relaxed text-ash">
                {dict.auth.subtitle}
              </p>
            </header>

            <div className="px-6 py-6">
              <LoginForm accounts={accounts} demoPassword={seed.users[0].password} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="sys text-micro text-dust">
              LOCK STATE · SEALED
            </span>
            <span className="sys text-micro text-dust">{formatStamp(new Date())}</span>
          </div>

          <p className="mt-5 border border-hair bg-pit px-4 py-3 font-plex text-[0.6875rem] leading-relaxed text-dust">
            {dict.bank.simulatedLong}
          </p>
        </div>
      </main>
    </div>
  );
}
