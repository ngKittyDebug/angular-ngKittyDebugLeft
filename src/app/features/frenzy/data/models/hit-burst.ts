/** How a pickup burst plays: `converge` implodes inward (a deliberate click), `burst` sprays outward (a drift-in). */
export type HitBurstMode = 'converge' | 'burst';

/**
 * A server-confirmed successful-pickup point to render on the scene: the (x, y) centre of the item where one of the
 * room's pickups landed (an item eaten / an effect granted). `mode` splits the look by how it was taken — a clicked
 * item's bubbles converge (implode where it vanished), a collided item's spray outward like a splash. `mine` is my
 * own Pokémon's pickup, drawn gold-tinted so I can tell my grabs apart from everyone else's.
 */
export interface HitBurst {
  id: string;
  x: number;
  y: number;
  mine: boolean;
  mode: HitBurstMode;
}

/**
 * Cartoon impact sparks shown above a Pokémon that a falling rock/brick just bonked on the head. Owned by the
 * struck player's sprite (carries no coordinates), so the scene nests it in that player's container — it sits above
 * the head and rides the sprite's drift, exactly like an OwnedFloat.
 */
export interface OwnedSpark {
  id: string;
  ownerId: string;
}
