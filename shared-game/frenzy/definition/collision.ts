import type { CollisionSpec } from '../../engine/definition';

/** Item↔player collision tuning shared across items (resolved in applyTick; per-item overrides live in the item slices). */
export const COLLISION = {
  /** Catch reach generosity. The item enters at its true half-extent (real edge); only the player's per-stage
   * half is scaled by this factor — >1 keeps catches forgiving while a bigger player reaches further. Distance is
   * measured in world px per axis, so the hit area is a padded AABB rectangle. Multiplying only the body half
   * (not the item half) stops the assist from inflating the box past the sprite onto the head. */
  catchGenerosity: 1.5,
} as const satisfies CollisionSpec;
