import type { PlayerMovementSpec } from '../../engine/definition';

/** Player movement: drift, the zone it stays within, steering input, wall bounce and spawn placement. */
export const PLAYER = {
  /** Rectangular zone (normalized 0..1) players spawn and drift within — the lower ~4/5 of the scene, inset just
   * enough that a sprite stays fully visible (side inset ≈ half a sprite width / world width). They bounce off all
   * four edges. Side insets are small so a player can reach close to the wall before bouncing. */
  driftZone: { minX: 0.04, maxX: 0.96, minY: 0.12, maxY: 0.92 },
  /** Steering: tapping empty water adds a velocity impulse toward the tap, on top of the current drift; the
   * per-stage `maxSpeed` from `Player.body` caps the result, so the cap is no longer global. */
  steer: { impulse: 0.02 },
  /** Speed retained per reflected velocity component on a wall bounce (0..1). `wall` is the three soft edges;
   * `floor` (the bottom) bites harder, so a player sinking into the seabed loses more momentum than a side
   * graze. After damping the engine floors the total speed at the stage's cruising `speed` so a bounce never
   * stalls a player in a corner. */
  bounceDamping: { wall: 0.85, floor: 0.6 },
  /** Minimum 2D distance kept between players when picking a spawn point (best-effort). */
  spawnMinDistance: 0.12,
  /** How many random points to try before falling back to the last one when the scene is crowded. */
  spawnMaxAttempts: 12,
} as const satisfies PlayerMovementSpec;
