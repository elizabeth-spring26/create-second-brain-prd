/**
 * Painted flourishes. Deliberately few and deliberately quiet — the layout
 * stays austere so these read as a moment rather than decoration.
 */

/** Soft cloud made of overlapping circles. No outline: Ghibli clouds are mass, not line. */
export function Cloud({
  className,
  width = 96,
  tone = "var(--card)",
}: {
  className?: string;
  width?: number;
  tone?: string;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={width * 0.5}
      viewBox="0 0 96 48"
      aria-hidden="true"
    >
      <g fill={tone}>
        <circle cx="30" cy="28" r="17" />
        <circle cx="52" cy="22" r="21" />
        <circle cx="72" cy="30" r="15" />
        <rect x="26" y="30" width="52" height="16" rx="8" />
      </g>
    </svg>
  );
}

/** A single leaf, the kind that drifts through a Ghibli pan. */
export function Leaf({
  className,
  size = 16,
  tone = "var(--matcha)",
}: {
  className?: string;
  size?: number;
  tone?: string;
}) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M14 2C7 2 2 6 2 11c0 1.2.4 2.3 1 3C4 9 7.5 6 13 4.6 8.6 6.6 5.6 9.6 4.4 14.4c1 .4 2 .6 3 .6 4.4 0 6.6-4.4 6.6-13Z"
        fill={tone}
      />
    </svg>
  );
}

/** The four-point sparkle, reused from the wordmark. */
export function Sparkle({
  size = 10,
  tone = "var(--sakura)",
  className,
}: {
  size?: number;
  tone?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-5 -5 10 10"
      aria-hidden="true"
    >
      <path
        d="M 0 -5 Q 0.9 -0.9 5 0 Q 0.9 0.9 0 5 Q -0.9 0.9 -5 0 Q -0.9 -0.9 0 -5 Z"
        fill={tone}
      />
    </svg>
  );
}

/** Rolling hills footer — two soft crests, the Ghibli establishing shot. */
export function Hills({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 78 C 180 30, 300 96, 470 72 C 640 48, 760 100, 900 78 C 1020 60, 1120 84, 1200 70 L1200 120 L0 120 Z"
        fill="var(--meadow)"
      />
      <path
        d="M0 100 C 200 72, 340 118, 520 98 C 700 78, 860 116, 1010 100 C 1110 90, 1160 104, 1200 98 L1200 120 L0 120 Z"
        fill="var(--matcha)"
        opacity="0.35"
      />
    </svg>
  );
}
