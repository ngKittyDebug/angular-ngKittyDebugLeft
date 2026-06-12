import type { PlayerBody } from '@game/frenzy/types';

// Shared per-stage body for specs: distinct sizes per stage (so AABB/size-aware tests see growth), gentle speed
// curve, and hp gates matching the old global thresholds (200/500) so existing evolution-boundary cases hold.
export const TEST_BODY: PlayerBody = {
  1: { width: 60, height: 60, speed: 0.03, maxSpeed: 0.07, hp: 0 },
  2: { width: 90, height: 90, speed: 0.028, maxSpeed: 0.065, hp: 200 },
  3: { width: 120, height: 120, speed: 0.024, maxSpeed: 0.055, hp: 500 },
};
