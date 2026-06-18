import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Viral Lab — PulseForge",
  description:
    "Simulate 1 million listeners, analyze viral gaps, and edit music on a timeline — integrated with Music Studio.",
};

export default function ViralLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
  );
}