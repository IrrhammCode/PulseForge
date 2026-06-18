import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Landing — PulseForge",
  description:
    "Your music studio, all in one place. Write, produce, analyze, and launch — built for Musixmatch Musicathon 2026.",
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}