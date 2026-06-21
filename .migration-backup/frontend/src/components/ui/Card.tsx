import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "purple" | "blue" | "none";
  interactive?: boolean;
}

export function Card({
  children,
  className,
  interactive = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 md:p-6",
        interactive && "card-interactive",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground md:text-lg">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}