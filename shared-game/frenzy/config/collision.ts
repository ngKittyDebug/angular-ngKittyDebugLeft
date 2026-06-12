/** Collision between falling/resting items and drifting Pokémon (resolved in applyTick). */
export const COLLISION = {
  collision: {
    /** Catch reach generosity. The item enters at its true half-extent (real edge); only the Pokémon's per-stage
     * half is scaled by this factor — >1 keeps catches forgiving while a bigger Pokémon reaches further. Distance is
     * measured in world px (`FRENZY.world`) per axis, so the hit area is a padded AABB rectangle. Multiplying only
     * the body half (not the item half) stops the assist from inflating the box past the sprite onto the head. */
    catchGenerosity: 1.5,
    /** Catch reach for the BOMB specifically — no assist (1 = true physical contact). The generous 1.5 helps you
     * grab food, but it made the mine detonate ~half a body early (at the Pokémon's art rect, not its body), so the
     * bomb uses real edge-to-edge contact instead. Tune below 1 to require visible overlap before it goes off. */
    bombCatchGenerosity: 1,
    /** Hp removed when a rock bonks a Pokémon (collision only; clicking a rock still does nothing). */
    rockDamage: -15,
    /** Hp removed when a brick bonks a Pokémon — twice a rock's hit (collision only; clicking does nothing). */
    brickDamage: -30,
  },
} as const;
