import type { Metadata } from "next";
import { EnergyRibbon } from "@/components/energy-ribbon";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/config";
import { fontVariables } from "@/lib/fonts";
import { mockRibbonPoints } from "@/lib/mock";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Closing the gap between who you are and who you're becoming.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Phase 0: mock. Phase 2 swaps this for real check-in data.
  const points = mockRibbonPoints(30);

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="mx-auto max-w-[1120px] px-6">
            <header className="flex items-center justify-between pt-8">
              <Wordmark className="text-subheading" />
              <ThemeToggle />
            </header>

            {/* The Energy Ribbon sits under the header on every route. */}
            <EnergyRibbon points={points} className="mt-4" />

            <main className="pb-24 pt-10">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
