import { cn } from "@/lib/utils";

interface SectionShellProps {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionShellProps) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        <p className="landing-eyebrow">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}