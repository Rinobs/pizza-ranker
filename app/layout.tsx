import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodRanker",
  description: "Bewerte deine Lieblings-Lebensmittel!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full bg-[#14181C]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#14181C] text-white min-h-screen`}
      >
        <Providers>
          <Header />
          <main className="min-h-screen bg-[#14181C] pt-24">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
