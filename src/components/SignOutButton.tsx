import { signOutAction } from "@/app/actions/session";
import { dict } from "@/lib/i18n";

/** Server-action form: no client JS needed to end a session. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="border border-weld px-3 py-1.5 font-plex text-[0.6875rem] font-medium text-ash transition-colors duration-100 ease-mech hover:border-amber hover:text-amber"
      >
        {dict.nav.signOut}
      </button>
    </form>
  );
}
