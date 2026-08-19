import type { Metadata } from "next";
import { EnergyRibbon } from "@/components/energy-ribbon";
import { BottomTabs, SideRail } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/config";
import { fontVariables } from "@/lib/fonts";
import { getRibbonPoints } from "@/lib/queries/daily";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Closing the gap between who you are and who you're becoming.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const points = await getRibbonPoints(30);

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
            <header className="flex items-center justify-between pt-8">
              <Wordmark className="text-subheading" />
              <ThemeToggle />
            </header>

            {/* The Energy Ribbon sits under the header on every route. */}
            <EnergyRibbon points={points} className="mt-4" />

            <div className="flex gap-12 pb-28 pt-10 lg:pb-16">
              <aside className="hidden w-[160px] shrink-0 lg:block">
                <SideRail />
              </aside>
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>

          <BottomTabs />
        </ThemeProvider>
      </body>
    </html>
  );
}
