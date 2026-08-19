"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  emoji?: string;
  /** 0–1. Boolean habits are simply 0 or 1. */
  progress: number;
  /** Break habits count clean days — they fill sakura instead of matcha. */
  variant?: "build" | "break";
  onToggle?: (next: boolean) => void;
  className?: string;
};

const SIZE = 44;
const STROKE = 3;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Four-point sparkle, drawn from the centre outward. */
function Sparkle({ size = 7 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-5 -5 10 10" aria-hidden="true">
      <path
        d="M 0 -5 Q 0.9 -0.9 5 0 Q 0.9 0.9 0 5 Q -0.9 0.9 -5 0 Q -0.9 -0.9 0 -5 Z"
        fill="var(--sakura)"
      />
    </svg>
  );
}

const BURST = [
  { x: -18, y: -14 },
  { x: 18, y: -12 },
  { x: -14, y: 16 },
  { x: 16, y: 15 },
];

export function HabitRing({
  label,
  emoji,
  progress,
  variant = "build",
  onToggle,
  className,
}: Props) {
  const id = useId();
  const reduced = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  const done = progress >= 1;
  const fill = variant === "break" ? "var(--sakura)" : "var(--matcha)";
  const clamped = Math.max(0, Math.min(1, progress));

  function handleClick() {
    const next = !done;
    if (next) setBurstKey((k) => k + 1); // sparkles only on the way to done
    onToggle?.(next);
  }

  return (
    <div className={cn("flex w-16 flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={done}
        aria-labelledby={id}
        className="relative grid place-items-center rounded-full"
        style={{ width: SIZE, height: SIZE }}
      >
        <motion.svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          animate={done && !reduced ? { scale: [1, 0.94, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.25, 0.7, 1] }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--haze)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={fill}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - clamped)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 320ms var(--ease-bounce)" }}
          />
        </motion.svg>

        {emoji ? (
          <span className="pointer-events-none absolute text-caption leading-none">{emoji}</span>
        ) : null}

        {/* Four sakura sparkles bursting outward, then gone. */}
        <AnimatePresence>
          {burstKey > 0 && done && !reduced
            ? BURST.map((b, i) => (
                <motion.span
                  key={`${burstKey}-${i}`}
                  className="pointer-events-none absolute"
                  initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.7], x: b.x, y: b.y }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 }}
                >
                  <Sparkle />
                </motion.span>
              ))
            : null}
        </AnimatePresence>
      </button>

      <span
        id={id}
        className={cn(
          "text-center text-eyebrow leading-tight",
          done ? "text-ink" : "text-ink-soft",
        )}
      >
        {label}
      </span>
    </div>
  );
}
