import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/password-forms";
import { getSessionContext } from "@/server/auth/session";
import { LOGIN_PATH } from "@/validation/redirect";

export const metadata: Metadata = { title: "Nuova password" };

// Si arriva qui dal link di recupero (che crea una sessione) o dall'area personale.
export default async function ResetPasswordPage() {
  const session = await getSessionContext();
  if (!session) {
    redirect(LOGIN_PATH);
  }

  return (
    <AuthShell title="Scegli una nuova password" description={`Account: ${session.user.email}`}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
