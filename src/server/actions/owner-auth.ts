"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

const OWNER_LOGIN_ERROR_REDIRECT = "/auth/login?error=CredentialsSignin";

export async function ownerSignInAction(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .slice(0, 80);
  const password = String(formData.get("password") ?? "").slice(0, 128);
  const honeypot = String(formData.get("website") ?? "").trim();

  if (!username || !password || honeypot) {
    redirect(OWNER_LOGIN_ERROR_REDIRECT);
  }

  try {
    const result = await signIn("credentials", {
      scope: "ADMIN",
      loginMode: "PASSWORD",
      email: username.toLowerCase(),
      password,
      redirect: false,
    });

    if (typeof result === "string" && result.includes("error=")) {
      redirect(OWNER_LOGIN_ERROR_REDIRECT);
    }

    const maybeError = (result as { error?: string } | undefined)?.error;
    if (maybeError) {
      redirect(OWNER_LOGIN_ERROR_REDIRECT);
    }

    redirect("/dashboard/owner");
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(OWNER_LOGIN_ERROR_REDIRECT);
    }
    throw error;
  }
}
