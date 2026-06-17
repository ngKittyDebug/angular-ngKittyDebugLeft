/**
 * A shield-ward beat for a player: incoming damage (a rock/brick bonk, a rotten bite, or a bomb blast) was
 * nullified by an active shield. Owned by the warded player (carries no coordinates) — while at least one is live
 * the scene flares that player's shield bubble (the `.scene__shield--pulse` deflect flash). Per-owner and transient
 * like an OwnedSpark.
 */
export interface OwnedShieldBlock {
  id: string;
  ownerId: string;
}
