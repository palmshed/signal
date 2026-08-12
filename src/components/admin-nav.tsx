"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin/analytics" className="text-sm font-semibold tracking-tight">
            Signal
          </Link>
          <nav className="flex items-center gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm ${
                  pathname === item.href
                    ? "font-medium text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-400">{email}</span>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800" target="_blank">
            View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
