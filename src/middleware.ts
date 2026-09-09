import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Route guard. Uses the edge-safe config only — the credentials provider and
 * its SQLite dependency stay out of the edge bundle.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.svg$).*)"],
};
