import type { NextRequest } from "next/server";
import { updateSession } from "@/server/auth/proxy-session";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Esclude asset e risorse interne di Next (bundle, immagini, dev overlay): non usano la sessione.
  matcher: ["/((?!_next/|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
