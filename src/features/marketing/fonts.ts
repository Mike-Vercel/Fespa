import { EB_Garamond, Luckiest_Guy } from "next/font/google";

/*
 * Serif editoriale della home: alto contrasto e corsivo calligrafico, come nei riferimenti grafici.
 * Viene scaricato solo dalla home (l'area riservata resta su Newsreader) e sostituisce --font-serif
 * dentro .landing-page (globals.css): nella home restano due famiglie, EB Garamond e Schibsted Grotesk.
 */
export const landingSerif = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
});

/** In prova: carattere display dei titoli della home (vedi .landing-page in globals.css). Un solo peso, niente corsivo. */
export const landingDisplay = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
