import { cn } from "@/lib/utils";

interface LandingContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section";
}

export function LandingContainer({
  children,
  className,
  as: Tag = "div",
}: LandingContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}