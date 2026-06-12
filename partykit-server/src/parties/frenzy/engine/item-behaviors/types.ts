import type { Item, Player, PlayerEffectKind, ServerState } from '@game/frenzy/types';

/** A hp change targeted at one player. Negative amounts are damage. */
export interface HpDelta {
  playerId: string;
  amount: number;
}

/** A timed effect to grant a player. `durationMs` is converted to an absolute `expiresAt` by the apply layer (which holds the clock). */
export interface EffectGrant {
  playerId: string;
  kind: PlayerEffectKind;
  durationMs: number;
}

/** Outcome of interacting with an item: which hp changes happen and whether the item leaves the field. */
export interface ItemInteraction {
  hpDeltas: HpDelta[];
  consumed: boolean;
  /** Horizontal shift (normalized) to apply to the item instead of eating it — used by the bomb's juggle click. */
  nudgeX?: number;
  /** When set, the engine reports this as a `detonated` blast (bomb) rather than an `eaten`/silent landing. */
  explodes?: boolean;
  /** Timed effects to grant on pickup (e.g. vitamin → decayShield); the engine reports these as `effectGranted`, not `eaten`. */
  effects?: EffectGrant[];
}

/**
 * Per-type item rules.
 * `onClick` runs when a player grabs the item (server-arbitrated first click).
 * `onLand` runs when the item reaches the floor (e.g. an explosive); omit for "just disappear".
 * `onCollide` runs when the item physically overlaps a drifting Pokémon (resolved against the closest one); omit to ignore collisions.
 * Effects may target the grabber or other players, so collateral interactions are expressible.
 */
export interface ItemBehavior {
  // `nudgeX` is the player's bomb-bat input — a signed normalized displacement; ignored by items that aren't juggled.
  // `rng` is injected so gamble items (mushroom) can roll deterministically in tests; defaults to Math.random at the call site.
  onClick(
    item: Item,
    clickerId: string,
    state: ServerState,
    nudgeX?: number,
    rng?: () => number,
  ): ItemInteraction;
  onLand?(item: Item, state: ServerState): ItemInteraction;
  onCollide?(item: Item, player: Player, state: ServerState, rng?: () => number): ItemInteraction;
}
