import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic, IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { dict } from "@/lib/i18n";
import "./globals.css";

/** Headers: monolithic Kufi mass. */
const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kufi",
  display: "swap",
});

/** Body and data: legible Arabic humanist sans. */
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

/** Reserved strictly for system/status text: SYNCED, VERIFIED, IDs, hashes. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${dict.app.name} — ${dict.app.tagline}`,
  description: dict.app.tagline,
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${kufi.variable} ${plex.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-void font-plex text-bone antialiased">{children}</body>
    </html>
  );
}
