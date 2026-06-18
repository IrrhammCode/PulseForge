import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio — PulseForge",
  description:
    "Create, craft, analyze, and launch your music in one studio workspace.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}