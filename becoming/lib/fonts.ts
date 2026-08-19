import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

/**
 * Fontshare faces are committed to /public/fonts and served from our own origin
 * — no third-party CDN at runtime, per the brief.
 */

export const cabinet = localFont({
  src: [
    { path: "../public/fonts/CabinetGrotesk-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/CabinetGrotesk-Extrabold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-cabinet",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const zodiak = localFont({
  src: [{ path: "../public/fonts/Zodiak-Italic.woff2", weight: "400", style: "italic" }],
  variable: "--font-zodiak",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "serif"],
});

export const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = [
  cabinet.variable,
  zodiak.variable,
  satoshi.variable,
  jetbrains.variable,
].join(" ");
