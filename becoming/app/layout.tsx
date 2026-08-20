import type { Metadata } from "next";
import { EnergyRibbon } from "@/components/energy-ribbon";
import { Cloud, Hills } from "@/components/ghibli";
import { BottomTabs, SideRail } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/config";
import { fontVariables } from "@/lib/fonts";
import { getRibbonPoints } from "@/lib/queries/daily";
import { getMonthlyGoals } from "@/lib/queries/reflect";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Closing the gap between who you are and who you're becoming.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [points, goals] = await Promise.all([getRibbonPoints(30), getMonthlyGoals()]);

  const sidebarGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    done: g.status === "hit",
  }));

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Sky sits behind everything and never scrolls into the content. */}
          <div className="sky-wash" aria-hidden="true" />

          <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
            <Cloud className="cloud -top-2 right-6 hidden lg:block" width={110} />
            <Cloud className="cloud top-24 left-2 hidden lg:block" width={70} />
            <header className="flex items-center justify-between pt-8">
              <Wordmark className="text-subheading" />
              <ThemeToggle />
            </header>

            {/* The Energy Ribbon sits under the header on every route. */}
            <EnergyRibbon points={points} className="mt-4" />

            <div className="flex gap-12 pb-28 pt-10 lg:pb-16">
              <aside className="hidden w-[190px] shrink-0 lg:block">
                <SideRail monthlyGoals={sidebarGoals} />
              </aside>
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>

          <Hills className="pointer-events-none block h-16 w-full lg:h-20" />

          <BottomTabs />
        </ThemeProvider>
      </body>
    </html>
  );
}
