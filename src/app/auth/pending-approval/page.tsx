import Link from "next/link";

export default async function PendingApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ institution?: string; scope?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Approval Pending</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your request for {params.scope ?? "role"} access at{" "}
          <span className="font-medium text-foreground">
            {params.institution ?? "this institution"}
          </span>{" "}
          has been submitted. An Admin/Principal will review it shortly.
        </p>

        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-4 text-left text-sm text-muted-foreground">
          <p>
            After approval, use the same scope and credentials on the login
            page.
          </p>
          <p className="mt-1">
            If you need urgent access, contact your institution administrator.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login/admin"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Login
          </Link>
          <Link
            href="/auth/request-access"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Submit Another Request
          </Link>
        </div>
      </div>
    </main>
  );
}
