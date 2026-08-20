/**
 * Every line here comes out of Elizabeth's own therapy sessions — her words,
 * her therapists' framing. Nothing is generic, and nothing comes from a quote
 * API. Source dates are kept so a line can be traced back to the session it
 * came from.
 */

export type Line = { text: string; source: string };

/** The core affirmation. Named separately because it recurs across sessions. */
export const CORE_AFFIRMATION: Line = {
  text: "I no longer operate from guilt and shame. I operate from peace and love for myself.",
  source: "Apr 30 & May 18",
};

export const AFFIRMATIONS: Line[] = [
  CORE_AFFIRMATION,
  { text: "I choose who I am and who I want to continue to be.", source: "Apr 30" },
  {
    text: "I'm already ahead of where my parents were at my age.",
    source: "Apr 30",
  },
  {
    text: "I don't ask dumb questions. I ask questions worth asking.",
    source: "May 18",
  },
  {
    text: "I'm not just a college student. I'm a business owner.",
    source: "Jun 16",
  },
  {
    text: "Being decisive matters more than being right.",
    source: "Jun 16",
  },
  {
    text: "I keep small promises to myself, and that's how I learn to trust me.",
    source: "May 18",
  },
  {
    text: "I want to — I don't have to. Every decision here is mine.",
    source: "May 18",
  },
  {
    text: "A stupid moment doesn't make me a stupid person. Successful people have them daily.",
    source: "Apr 30",
  },
  {
    text: "My work speaks. I don't need to over-explain it.",
    source: "Apr 30",
  },
  {
    text: "I respect my own schedule the way I'd respect a class I couldn't skip.",
    source: "May 12",
  },
  {
    text: "Emotional regulation is a skill I'm building, not a trait I lack.",
    source: "Jun 18",
  },
  {
    text: "I can sit with a decision overnight. Uncertainty isn't an emergency.",
    source: "Jun 18",
  },
  {
    text: "What other people see in me is already there. The gap is only belief.",
    source: "Apr 30",
  },
];

/** Reflections rather than affirmations — the thing to think about today. */
export const REFLECTIONS: Line[] = [
  {
    text: "How do I talk to myself when I make a mistake, and how could I be kinder?",
    source: "May 18",
  },
  {
    text: "Am I asking for input because I need it, or because I'm avoiding deciding?",
    source: "May 12",
  },
  {
    text: "What am I comparing myself to today, and is that comparison fair?",
    source: "Apr 21",
  },
  {
    text: "Which lane am I in today — and am I trying to be in all three?",
    source: "Jun 16",
  },
  {
    text: "Where did I hedge today when I could have just said the thing?",
    source: "Jun 16",
  },
  {
    text: "What did I do today that past-me would have found impressive?",
    source: "Apr 21",
  },
  {
    text: "Did I complain about something I could have solved instead?",
    source: "May 12",
  },
];

/** Stable per day — same line all day, a new one tomorrow. */
function pickFor(list: Line[], iso: string, offset = 0): Line {
  const seed = Number(iso.replaceAll("-", ""));
  return list[(seed + offset) % list.length];
}

export function affirmationFor(iso: string): Line {
  return pickFor(AFFIRMATIONS, iso);
}

export function reflectionFor(iso: string): Line {
  // Offset so the pair doesn't move in lockstep day to day.
  return pickFor(REFLECTIONS, iso, 3);
}
