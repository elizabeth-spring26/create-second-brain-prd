import { Leaf } from "@/components/ghibli";
import { cn } from "@/lib/utils";

/** Shared primitives, styled from tokens only. */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/** Empty states are invitations, never scolds. */
export function Empty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-caption text-ink-soft", className)}>{children}</p>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow mb-1.5">{label}</p>
      <p className="font-mono text-heading leading-none">{value}</p>
      {hint ? <p className="mt-1.5 text-eyebrow text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-title">{title}</h1>
          <Leaf size={13} className="mb-1 shrink-0" />
        </div>
        {subtitle ? (
          <p className="mt-2 font-reflective text-subheading italic text-ink-soft">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** A quiet horizontal meter. Never renders red. */
export function Meter({
  value,
  max,
  token = "iris",
  className,
}: {
  value: number;
  max: number;
  token?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ background: "var(--haze)" }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: `var(--${token})` }}
      />
    </div>
  );
}
