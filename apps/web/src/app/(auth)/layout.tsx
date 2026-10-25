import Link from "next/link";
import EmblemMark from "@/components/brand/EmblemMark";
import { siteConfig } from "@/lib/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <EmblemMark size={26} />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{siteConfig.brandName}</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">{children}</main>
    </div>
  );
}
