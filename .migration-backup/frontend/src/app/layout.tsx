import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ChunkLoadRecovery } from "@/components/layout/ChunkLoadRecovery";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "PulseForge — Music Studio OS",
  description:
    "Music studio OS dashboard — manage projects, analyze hit potential, and plan your launch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <ChunkLoadRecovery />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}