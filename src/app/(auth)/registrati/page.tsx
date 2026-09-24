import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { AuthSwapLink } from "@/features/auth/auth-swap";
import { SignUpForm } from "@/features/auth/signup-form";
import { emailOnlySchema } from "@/validation/auth";
import { firstParam } from "@/validation/common";

export const metadata: Metadata = { title: "Registrati" };

export default async function SignUpPage({ searchParams }: PageProps<"/registrati">) {
  // Il link d'invito della coach può precompilare l'email (solo se valida).
  const parsedEmail = emailOnlySchema.safeParse({ email: firstParam((await searchParams).email) });

  return (
    <AuthShell
      variant="signup"
      title="Crea il tuo account"
      description="Registrati per inviare i tuoi check-in alla coach e ricevere le sue risposte."
      footer={
        <p>
          Hai già un account?{" "}
          <AuthSwapLink
            href="/login"
            target="access"
            className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Accedi
          </AuthSwapLink>
        </p>
      }
    >
      <SignUpForm defaultEmail={parsedEmail.success ? parsedEmail.data.email : ""} />
    </AuthShell>
  );
}
