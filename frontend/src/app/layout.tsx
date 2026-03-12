import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Football Betting AI | World Cup 2026",
  description:
    "Probability-based match predictions, value bet detection, and AI analysis for the 2026 FIFA World Cup.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-[#0a0f1a]">
          <nav className="sticky top-0 z-50 border-b border-gray-800 bg-[#0a0f1a]/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/20">
                  <span className="text-lg font-bold text-green-400">W</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">WC2026 Betting AI</h1>
                  <p className="text-[10px] text-gray-500">Probability-based analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </a>
                <a href="/value-bets" className="text-gray-300 hover:text-white transition-colors">
                  Value Bets
                </a>
                <a href="/backtest" className="text-gray-300 hover:text-white transition-colors">
                  Backtest
                </a>
                <a href="/matches" className="text-gray-300 hover:text-white transition-colors">
                  Matches
                </a>
              </div>
            </div>
          </nav>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
          <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
            Predictions are probability-based estimates, not guarantees of profit. Bet responsibly.
          </footer>
        </div>
      </body>
    </html>
  );
}
