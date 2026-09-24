import type { Metadata, Viewport } from "next";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Serif editoriale per titoli e numeri (con optical size), grotesk leggibile per l'interfaccia.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FESPA Coach AI",
    template: "%s · FESPA Coach AI",
  },
  description: "Strumento interno per le coach FESPA: clienti, check-in, follow-up e un copilota AI.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${newsreader.variable} ${schibstedGrotesk.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
