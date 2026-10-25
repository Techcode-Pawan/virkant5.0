import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <p className="code-id text-txt-faint">404</p>
      <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-txt-muted">This address doesn&apos;t match any page. It may have moved, or the link may be mistyped.</p>
      <Link href="/dashboard" className="btn-primary mt-6">Go to dashboard</Link>
    </div>
  );
}
