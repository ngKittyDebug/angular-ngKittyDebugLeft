import type { ItemType, NpcKind } from '../types';

/**
 * A single on/off gate. Reusable shape for any spawnable/participating game entity — items today, NPCs later.
 */
export interface FeatureFlag {
  enabled: boolean;
}

/**
 * Per-item-type feature gate. Disabling one removes it from EVERY spawn path (regular drops via `pickItemType`
 * and easter-egg emissions, which also go through `pickItemType`), so it never enters play — no spawn means no
 * participation. Flip a flag here to tune the active item roster without touching engine code.
 *
 * Invariant: keep at least one item `enabled` — `pickItemType` needs a non-empty pool to draw from.
 */
export const ITEM_FEATURES: Record<ItemType, FeatureFlag> = {
  food: { enabled: true },
  rotten: { enabled: true },
  rock: { enabled: true },
  brick: { enabled: true },
  rareCandy: { enabled: true },
  bomb: { enabled: true },
  goldenBerry: { enabled: true },
  crumb: { enabled: true },
  mushroom: { enabled: true },
  vitamin: { enabled: true },
  shield: { enabled: true },
  easterEgg: { enabled: true },
  poop: { enabled: true },
};

/**
 * Per-NPC-kind feature gate, same shape as `ITEM_FEATURES`. Disabling one keeps the NPC spawner from ever
 * creating that autobot — one flag, one decision point (gated via `isNpcEnabled`).
 */
export const NPC_FEATURES: Record<NpcKind, FeatureFlag> = {
  angryBomb: { enabled: true },
};

/**
 * Game feature flags. Gates the item roster, the NPC roster and the player-vs-player collision pass.
 */
export const FEATURES = {
  items: ITEM_FEATURES,
  npc: NPC_FEATURES,
  /** Pokémon↔Pokémon collision (soft separation + mini-bump). Off → Pokémon pass through each other (legacy). */
  playerCollision: { enabled: true } satisfies FeatureFlag,
} as const;
