import { DEFAULT_OFFER_CRITERIA } from "./schema/career";

/**
 * Elizabeth's starting data. Edit here and re-run `npm run db:seed` — the seed
 * is idempotent and matches on natural keys, so it never duplicates rows.
 */

export const SEED_HABITS = [
  // Build — the things to do more of. From her HABITS.md pillars.
  {
    name: "Gym / workout",
    emoji: "🏋️",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Deep work block",
    emoji: "🎯",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Reach out to one person",
    emoji: "🤝",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Evening journaling",
    emoji: "🌙",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },

  // Build — drawn from the action items in her therapy sessions.
  {
    name: "Say the affirmation",
    emoji: "🌸",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Three things I'm grateful for",
    emoji: "🕊️",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Write down one accomplishment",
    emoji: "✍️",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },
  {
    name: "Mindful walk",
    emoji: "🍃",
    direction: "build" as const,
    kind: "boolean" as const,
    colorToken: "matcha",
  },

  // Break — "what you're letting go of". Named as the thing being released, and
  // measured as clean days counted up. Slips are never tallied.
  {
    name: "Excess screen time",
    emoji: "📵",
    direction: "break" as const,
    kind: "boolean" as const,
    colorToken: "sakura",
  },
  {
    name: "Waking up late and drifting",
    emoji: "☀️",
    direction: "break" as const,
    kind: "boolean" as const,
    colorToken: "sakura",
  },
  {
    name: "Over-explaining and hedging",
    emoji: "💬",
    direction: "break" as const,
    kind: "boolean" as const,
    colorToken: "sakura",
  },
  {
    name: "Complaining instead of solving",
    emoji: "🌀",
    direction: "break" as const,
    kind: "boolean" as const,
    colorToken: "sakura",
  },
];

export const SEED_OFFER_CRITERIA = DEFAULT_OFFER_CRITERIA;

export const SEED_ENGAGEMENTS: {
  name: string;
  kind: "internship" | "client" | "generator" | "personal";
  hoursTargetWeekly?: number;
  hourlyRate?: number;
  isBillableDefault?: boolean;
  colorToken: string;
}[] = [
  { name: "The Generator", kind: "generator", colorToken: "iris" },
  { name: "AI consulting", kind: "client", colorToken: "sakura" },
  // Renamed once she accepts an offer, so hours logged now aren't stranded.
  { name: "Internship", kind: "internship", colorToken: "matcha" },
];

export const SEED_SETTINGS = {
  displayName: "Elizabeth",
  timezone: "America/New_York",
  wakeGoal: "08:00",
  bedGoal: "00:00",
  sleepGoalHours: 8,
  energyGoal: 8,
};
