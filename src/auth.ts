import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import type { UserRole } from "@/lib/domain";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const row = getDb()
          .prepare("SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?")
          .get(email.toLowerCase()) as UserRow | undefined;

        // Compare unconditionally against a dummy hash when the user is absent,
        // so a missing account and a wrong password take the same time.
        const hash = row?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = bcrypt.compareSync(password, hash);
        if (!row || !ok) return null;

        return {
          id: String(row.id),
          email: row.email,
          name: row.display_name,
          role: row.role,
        };
      },
    }),
  ],
});
