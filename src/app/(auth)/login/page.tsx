import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AuthFormError, AuthShell } from "@/features/auth/auth-shell";
import { AuthSwapLink } from "@/features/auth/auth-swap";
import { LoginForm } from "@/features/auth/login-form";
import { firstParam } from "@/validation/common";
import { sanitizeRedirectPath } from "@/validation/redirect";

export const metadata: Metadata = {
  title: "Accedi",
};

// Su mobile la barra del browser prende il nero della barra superiore della pagina.
export const viewport: Viewport = { themeColor: "#0c0b0a" };

const LINK_ERROR = "Il link che hai usato non è valido o è scaduto. Accedi di nuovo o richiedine uno nuovo.";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = firstParam(params.next);
  const nextPath = sanitizeRedirectPath(nextParam ?? null);
  const hasInvalidLink = firstParam(params.link) === "non-valido";

  return (
    <AuthShell
      title="Accedi"
      description="Coach e clienti accedono da qui: ognuno arriva nella propria area."
      footer={
        <>
          <p>
            <Link href="/password-dimenticata" className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Password dimenticata?
            </Link>
          </p>
          <p>
            Sei una nuova cliente o un nuovo cliente?{" "}
            <AuthSwapLink
              href="/registrati"
              target="signup"
              className="font-medium text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              Registrati
            </AuthSwapLink>
          </p>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {hasInvalidLink ? <AuthFormError message={LINK_ERROR} /> : null}
        <LoginForm nextPath={nextPath} />
      </div>
    </AuthShell>
  );
}
