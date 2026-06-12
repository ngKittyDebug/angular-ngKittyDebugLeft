/** Pokémon movement: drift, the zone it stays within, steering input and spawn placement. */
export const PLAYER = {
  /** Rectangular zone (normalized 0..1) Pokémon spawn and drift within — the lower ~4/5 of the scene, inset just
   * enough that a sprite stays fully visible (side inset ≈ half a sprite width / world width). They bounce off all
   * four edges. Side insets are small so a Pokémon can reach close to the wall before bouncing. */
  playerDriftZone: { minX: 0.04, maxX: 0.96, minY: 0.12, maxY: 0.92 },
  /** Pokémon drift speed, normalized units per second (applied to both axes via a random initial angle). Slow on purpose. */
  playerDriftSpeed: 0.03,
  /** Player steering: tapping empty water adds a velocity impulse toward the tap, on top of the current drift. */
  steer: {
    /** Velocity added toward the tapped point per tap (normalized units/sec). ~0.7× the base drift, so a tap gently bends the heading. */
    impulse: 0.02,
    /** Hard cap on a Pokémon's total drift speed after steering (normalized units/sec), so repeated taps can't fling it across the scene. ~2.3× the base drift. */
    maxSpeed: 0.07,
  },
  /** Minimum 2D distance kept between Pokémon when picking a spawn point (best-effort). */
  playerSpawnMinDistance: 0.12,
  /** How many random points to try before falling back to the last one when the scene is crowded. */
  playerSpawnMaxAttempts: 12,
} as const;
