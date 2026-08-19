import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * The logo: the wordmark in Cabinet Grotesk 800, tracked wide, with a 6px
 * sakura four-point sparkle floating at the baseline of the final letter.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-end", className)}>
      <span
        className="font-display text-ink"
        style={{ fontWeight: 800, letterSpacing: "0.18em", lineHeight: 1 }}
      >
        {APP_NAME}
      </span>
      <svg
        width={6}
        height={6}
        viewBox="-5 -5 10 10"
        aria-hidden="true"
        className="mb-[1px] ml-[3px] shrink-0"
      >
        <path
          d="M 0 -5 Q 0.9 -0.9 5 0 Q 0.9 0.9 0 5 Q -0.9 0.9 -5 0 Q -0.9 -0.9 0 -5 Z"
          fill="var(--sakura)"
        />
      </svg>
    </span>
  );
}
