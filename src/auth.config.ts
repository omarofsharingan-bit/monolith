import type { NextAuthConfig } from "next-auth";

import type { UserRole } from "@/lib/domain";

/**
 * Edge-safe half of the auth config.
 *
 * This file is imported by middleware, which runs on the edge runtime and
 * therefore cannot load better-sqlite3. The credentials provider — the part
 * that touches the database — lives in auth.ts instead.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // one working day
  },
  callbacks: {
    authorized({ auth, request }) {
      const signedIn = Boolean(auth?.user);
      const onLogin = request.nextUrl.pathname.startsWith("/login");

      if (onLogin) {
        return signedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      return signedIn;
    },
    jwt({ token, user }) {
      // `user` widens to AdapterUser here, which has no role of its own — the
      // credentials provider is what actually puts one on the object.
      if (user) {
        const authored = user as { role?: UserRole; name?: string | null };
        token.role = authored.role ?? "member";
        token.displayName = authored.name ?? "";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.name = token.displayName ?? session.user.name;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts
} satisfies NextAuthConfig;
