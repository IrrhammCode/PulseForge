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
    <Tag className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 2xl:max-w-7xl 3xl:max-w-[96rem] 4xl:max-w-[120rem]", className)}>
      {children}
    </Tag>
  );
}