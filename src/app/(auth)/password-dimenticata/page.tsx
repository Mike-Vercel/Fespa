import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Password dimenticata" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Password dimenticata"
      description="Inserisci la tua email: ti invieremo un link per sceglierne una nuova."
      footer={
        <p>
          <Link href="/login" className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            Torna all&apos;accesso
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
