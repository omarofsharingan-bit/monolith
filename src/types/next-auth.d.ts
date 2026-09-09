import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/domain";

/** Carry the club role through the JWT and session, not just the user id. */
declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

/**
 * `next-auth/jwt` is a bare `export *` from `@auth/core/jwt`, so augmenting the
 * former would declare a second, unrelated JWT. Augment the source module.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    displayName: string;
  }
}
