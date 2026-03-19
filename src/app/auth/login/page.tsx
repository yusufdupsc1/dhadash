import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    institution?: string;
  }>;
}) {
  const params = await searchParams;

  const loginUrl = new URL("/auth/login/admin", "http://localhost");
  if (params.callbackUrl) loginUrl.searchParams.set("callbackUrl", params.callbackUrl);
  if (params.error) loginUrl.searchParams.set("error", params.error);
  if (params.institution) loginUrl.searchParams.set("institution", params.institution);

  redirect(`${loginUrl.pathname}${loginUrl.search}`);
}
