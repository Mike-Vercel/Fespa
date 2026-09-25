import type { NextConfig } from "next";

/**
 * Header di sicurezza applicati a tutte le risposte.
 * La CSP contiene solo direttive che non interferiscono con gli script inline di Next
 * (una CSP completa con nonce è un'evoluzione documentata nel README).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // 75 è il predefinito; 90 per le illustrazioni della home (testi piccoli); 100 per il logo (piccolo, deve restare nitido).
  images: { qualities: [75, 90, 100] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
