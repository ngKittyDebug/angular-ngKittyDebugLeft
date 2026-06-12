/** Collision between falling/resting items and drifting Pokémon (resolved in applyTick). */
export const COLLISION = {
  collision: {
    /** Catch reach generosity. The item↔Pokémon hit radius is the sum of their physical half-extents (so a
     * bigger Pokémon reaches further) times this factor — >1 keeps catches forgiving. Distance is measured in
     * world px (`FRENZY.world`), so the hit area is a true circle, not the ellipse a single normalized radius gave. */
    catchGenerosity: 1.5,
    /** Hp removed when a rock bonks a Pokémon (collision only; clicking a rock still does nothing). */
    rockDamage: -15,
    /** Hp removed when a brick bonks a Pokémon — twice a rock's hit (collision only; clicking does nothing). */
    brickDamage: -30,
  },
} as const;
