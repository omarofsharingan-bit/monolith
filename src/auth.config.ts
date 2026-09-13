import type { NextAuthConfig } from "next-auth";

import type { UserRole } from "@/lib/domain";

/**
 * Behind a proxy, resolve the public origin before Auth.js reads it.
 *
 * Render terminates TLS and forwards to the app on an internal port, so
 * without this Auth.js builds its redirects from that internal origin and a
 * successful sign-in lands the user on https://localhost:10000 — the session
 * cookie is set correctly, but the page they arrive at does not exist.
 *
 * RENDER_EXTERNAL_URL is injected by the platform and already carries the
 * scheme. An explicit AUTH_URL always wins, so this is a default, not an
 * override, and it is inert anywhere that variable is absent.
 */
if (!process.env.AUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.AUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

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

      // Built from the forwarded headers rather than request.nextUrl: behind
      // Render's proxy that origin is the internal one, which put a dead
      // localhost:10000 address into the sign-in callbackUrl.
      const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const origin = host ? `${proto}://${host}` : request.nextUrl.origin;

      if (onLogin) {
        return signedIn ? Response.redirect(new URL("/", origin)) : true;
      }
      if (signedIn) return true;

      const target = new URL("/login", origin);
      target.searchParams.set(
        "callbackUrl",
        `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return Response.redirect(target);
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
