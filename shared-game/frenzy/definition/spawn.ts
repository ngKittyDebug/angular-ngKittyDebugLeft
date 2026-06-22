import type { SpawnSpec } from '../../engine/definition';

/**
 * Item spawn cadence and lifecycle. Per-item WEIGHTS live in the item slices (`spawn` memberships); the pools
 * themselves are assembled by the definition aggregator (`./index.ts`).
 */
export const SPAWN = {
  /** `[min, max]` ms between item spawns at `referencePlayers`; the actual interval is picked randomly within the range, then scaled by active-player count. Shortened ~×1.5 alongside the world widening (1600→2400) so the wider arena keeps the same item density per unit width rather than reading sparse. */
  intervalMsRange: [480, 880],
  /** Active-player count at which the spawn interval matches `intervalMsRange` as-is. The interval scales by `referencePlayers / activePlayers`, so per capita food income stays ~constant. */
  referencePlayers: 3,
  /** Ceiling on the active-player count used in that scaling: the room is treated as having at most this many
   * actives, so the simultaneous item count never climbs past the `referencePlayers` density no matter how crowded
   * it gets (anti-pileup — items piled up "навалом" at 3-4 players). At `=referencePlayers` (3) a 4+ player room
   * spawns at the calibrated 3-player rate instead of `players/3`x. Dial DOWN to 2 to make 3+ player rooms as sparse
   * as a 2-player one (more food competition); the final number is a tablet-playtest call. */
  scalingMaxPlayers: 3,
  /** `[min, max]` horizontal spawn position of an item (normalized 0..1), inset from the scene edges. */
  xRange: [0.05, 0.95],
  /** How long an item lies on the floor (still edible) after landing before it disappears, ms. Long enough that
   * the floor-bound NPC has time to walk over and eat resting food, without the seabed piling up. */
  restMs: 6_000,
  /** `[min, max]` normalized y where a falling item settles on the seabed — this is the item's CENTRE (the
   * client centre-anchors the sprite on `y`). A per-item value is picked deterministically from its id within
   * this band (see `restYFor`), so resting items scatter across the sand instead of lining up on one ruled row.
   * The band is raised by ~half an item height vs the visual rest line so the sprite's BOTTOM still lands on the
   * sand (its centre sits half-a-sprite above): half item = (60/2)/900 ≈ 0.033, so [0.9,0.97] → [0.867,0.937]. */
  restYRange: [0.867, 0.937],
} as const satisfies SpawnSpec;
