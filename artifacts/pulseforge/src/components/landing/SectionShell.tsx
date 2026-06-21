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
      <div className="mb-10 border-t-2 border-foreground pt-5 md:mb-14">
        <p className="landing-eyebrow animate-fade-in">{eyebrow}</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl uppercase leading-[0.95] tracking-tight text-foreground md:text-5xl lg:text-6xl 2xl:text-7xl 3xl:max-w-4xl 3xl:text-8xl animate-slide-up">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted md:text-lg animate-slide-up-delayed">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}