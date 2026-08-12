import { redirect } from "next/navigation";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const email = await getAdminEmail();
  if (email) redirect("/admin/analytics");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Sign in to Signal</h1>
      <LoginForm />
    </main>
  );
}
