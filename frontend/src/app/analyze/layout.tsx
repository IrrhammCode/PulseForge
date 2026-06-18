import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyze Track — PulseForge",
  description:
    "Search your track and get hit potential scoring, listener simulation, and marketing recommendations.",
};

export default function AnalyzeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
  );
}