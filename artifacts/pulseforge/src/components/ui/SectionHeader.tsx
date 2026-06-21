import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("border-t-2 border-foreground pt-4", className)}>
      <h2 className="font-display text-2xl uppercase leading-none tracking-tight md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      )}
    </div>
  );
}