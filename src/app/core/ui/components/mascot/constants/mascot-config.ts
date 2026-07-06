// Behavior tuning for the mascot (glossary: Chase, Standing, Idle).
export const MASCOT_CONFIG = {
  // Horizontal cursor↔mascot distance (px) that starts a chase; within it the mascot stands.
  chaseThresholdPx: 100,
  walkSpeedPxPerSecond: 180,
  // Continuous Standing this long puts the mascot into Idle; only a new chase resets it.
  idleTimeoutMs: 15_000,
} as const;
