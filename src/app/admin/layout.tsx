import { redirect } from "next/navigation";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const email = await getAdminEmail();
  if (!email) redirect("/login");

  return (
    <div className="min-h-full bg-neutral-50">
      <AdminNav email={email} />
      <main className="mx-auto w-full max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
