import type { ItemType } from '../types';

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
};

/**
 * Game feature flags. Currently gates the item roster.
 *
 * NPC extension (no NPCs yet): when they land, add a sibling `npc: Record<NpcKind, FeatureFlag>` of the same
 * shape and gate the NPC spawner exactly like `pickItemType` is gated — one flag, one decision point.
 */
export const FEATURES = {
  items: ITEM_FEATURES,
} as const;
