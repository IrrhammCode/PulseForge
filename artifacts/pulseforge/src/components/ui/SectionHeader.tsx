import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted/80">{subtitle}</p>
        )}
      </div>
      <div className="hidden h-px flex-1 bg-border sm:block" />
    </div>
  );
}