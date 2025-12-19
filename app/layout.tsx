import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Aegis Logistics | Mission Control",
  description: "Intelligence for the Industrial World",
  // ADD THIS BLOCK:
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrains.variable} bg-slate-50 text-slate-900 antialiased min-h-screen`}
      >
        <ClerkProvider>
          <Providers>
            <div className="relative min-h-screen overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.6)_0,transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.45)_0,transparent_28%),linear-gradient(120deg,rgba(255,255,255,0.4)_0,rgba(255,255,255,0)_50%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(246,115,54,0.08),transparent_45%),radial-gradient(circle_at_70%_40%,rgba(28,31,51,0.12),transparent_40%)]" />
              <div className="relative">{children}</div>
            </div>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
