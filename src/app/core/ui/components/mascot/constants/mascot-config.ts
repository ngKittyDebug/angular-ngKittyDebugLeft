// Behavior tuning for the mascot chase (glossary: Chase).
export const MASCOT_CONFIG = {
  // Horizontal cursor↔mascot distance (px) that starts a chase; within it the mascot stands.
  chaseThresholdPx: 50,
  walkSpeedPxPerSecond: 150,
} as const;
