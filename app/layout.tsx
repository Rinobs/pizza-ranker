import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pizza Ranker",
  description: "Bewerte deine Lieblings-Tiefkühlpizzen!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 text-gray-900 font-sans`}
      >
        <Providers>
          {/* ⭐ GLOBALER HEADER */}
          <header className="mb-8">
            <div className="flex flex-col items-center text-center">
              {/* Logo-Kreis */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center shadow-lg mb-4">
                <span className="text-4xl">🍕</span>
              </div>

              {/* Titel */}
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                Pizza Ranker
              </h1>

              {/* Subtitle */}
              <p className="text-gray-600 text-sm">
                Bewerte deine Lieblings-Tiefkühlpizzen.
              </p>
            </div>
          </header>

          <main className="p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
