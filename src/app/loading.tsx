import { dict } from "@/lib/i18n";

/**
 * Loading skeleton. Blocks are inert hairline frames rather than shimmering
 * placeholders — a pulse animation would break the mechanical register.
 */
function Slab({ className = "" }: { className?: string }) {
  return <div className={`border border-hair bg-slab ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-hair bg-slab">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-4">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center border-2 border-weld">
            <span className="block h-4 w-[3px] animate-blink bg-weld" />
          </span>
          <div>
            <div className="sys text-micro text-dust">{dict.app.nameSys}</div>
            <div className="mt-1 h-3 w-40 bg-hair" />
          </div>
        </div>
        <div className="border-t border-hair">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2.5 w-20 bg-hair" />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-7">
        <div className="mb-6 flex items-center gap-3">
          <span aria-hidden className="h-1.5 w-1.5 animate-blink bg-amber" />
          <span className="sys text-micro text-dust">
            {dict.common.loading} · READING VAULT
          </span>
        </div>

        <Slab className="mb-6 h-56 border-2 border-weld" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Slab className="h-80 lg:col-span-2" />
          <Slab className="h-80" />
          <Slab className="h-72 lg:col-span-2" />
          <Slab className="h-72" />
        </div>
      </main>
    </div>
  );
}
