
import { useCountUp } from "@/lib/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number;
  size?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  animate?: boolean;
}

export function Gauge({
  value,
  size = 200,
  label,
  sublabel,
  className,
  animate = true,
}: GaugeProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayValue = useCountUp(value, 800, animate);
  const offset = circumference - (displayValue / 100) * circumference;

  const stroke =
    value >= 65
      ? "var(--color-accent)"
      : value >= 50
        ? "var(--color-warning)"
        : "var(--color-danger)";

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums md:text-5xl">{displayValue}</span>
        {label && (
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="mt-0.5 text-[10px] text-muted/70">{sublabel}</span>
        )}
      </div>
    </div>
  );
}