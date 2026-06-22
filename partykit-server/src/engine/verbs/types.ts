import type { DamageSource, EffectDefinition } from '@game/engine/definition';
import type { Item, ServerState } from '@game/engine/types';

/** A hp change targeted at one player. Negative amounts are damage. */
export interface HpDelta {
  playerId: string;
  amount: number;
  /** Where the change comes from — drives the target's `damageTaken` effect multipliers on negative amounts. */
  source: DamageSource;
}

/** A velocity kick targeted at one player (normalized units/sec), added to their drift. Used by a blast's radial knockback. */
export interface PlayerImpulse {
  playerId: string;
  ix: number;
  iy: number;
  /** Post-kick speed cap as a multiple of the victim's stage `maxSpeed`, stamped by the impulse's producer
   * (a blast spec's `blastImpulseMaxFactor`, the separation pass's `impulseMaxFactor`). `applyImpulses` reads it. */
  maxFactor: number;
}

/** A timed effect to grant a player. `durationMs` is converted to an absolute `expiresAt` by the apply layer (which holds the clock). */
export interface EffectGrant<TEffectId extends string = string> {
  playerId: string;
  kind: TEffectId;
  durationMs: number;
}

/** Outcome of interacting with an item: which hp changes happen and whether the item leaves the field. */
export interface ItemInteraction<TEffectId extends string = string> {
  hpDeltas: HpDelta[];
  consumed: boolean;
  /** Velocity impulse (normalized units/sec) added to the item's drift instead of eating it — a nudge verb's 2D shove click (`nudgeX` horizontal, `nudgeY` vertical). */
  nudgeX?: number;
  nudgeY?: number;
  /** Radial knockback kicks for players caught in a blast — added to their drift, capped server-side. */
  impulses?: PlayerImpulse[];
  /** When set, the engine reports this as a `detonated` blast (with the spec's radius) rather than an `eaten`/silent landing. */
  explodes?: { radius: number };
  /** Timed effects to grant on pickup; the engine reports these as `effectGranted`, not `eaten`. */
  effects?: EffectGrant<TEffectId>[];
}

/**
 * Everything a verb resolver may need about the trigger: the item, the world as it stands, the acting player
 * (absent on a landing — taker verbs resolve to nothing then), the rng for gamble rolls (injected for
 * deterministic tests; defaults at the dispatch) and the click's 2D shove direction (only the nudge verb reads it).
 */
export interface InteractionContext<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  item: Item<TItemId>;
  state: ServerState<TItemId, TEffectId, TNpcId>;
  /** The game's effect roster — blast resolution consults `damageTaken` modifiers (full-ward skip). */
  effects: Record<TEffectId, EffectDefinition>;
  /** The acting player's id (clicker or collider); absent for a landing. */
  takerId?: string;
  rng?: () => number;
  /** Client shove direction (any magnitude — normalized by the nudge verb). */
  nudgeX?: number;
  nudgeY?: number;
}
