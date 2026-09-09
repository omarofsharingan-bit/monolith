"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { dict } from "@/lib/i18n";

export type AuthState = { error?: string };

export async function authenticate(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: dict.auth.required };

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: error.type === "CredentialsSignin" ? dict.auth.invalid : dict.common.error,
      };
    }
    // signIn signals success by throwing a redirect — let it through.
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
