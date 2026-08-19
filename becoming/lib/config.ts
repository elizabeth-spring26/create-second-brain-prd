/**
 * Product-level constants. The app name lives here and nowhere else — renaming
 * the product is a one-line change, per the brief.
 */
export const APP_NAME = "BECOMING";

export const TIMEZONE = "America/New_York";

/** Category -> token name. Every consumer reads colors through these keys. */
export const CATEGORY_TOKENS = {
  networking: "iris",
  friends_family: "sakura",
  self_care: "matcha",
  gym: "matcha",
  work: "ink",
  school: "ink-soft",
  other: "haze",
} as const;

export type EventCategory = keyof typeof CATEGORY_TOKENS;
