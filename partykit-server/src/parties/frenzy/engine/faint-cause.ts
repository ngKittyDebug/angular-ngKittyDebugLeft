import type { FaintCause, Item } from '@game/frenzy/types';

/**
 * Builds the `item` fault cause for a lethal item, attributing a `killerId` (so the client names the culprit) by
 * preference: the player who last shoved it (`lastNudgedBy`, bombs only — shoving a mine into someone is the lethal
 * act) over the one who emitted it (`ownerId`, easter-egg/poop aura). Naturally spawned, never-shoved items have
 * neither, so `killerId` is omitted entirely (kept off the wire rather than set undefined).
 */
export function itemFaintCause(item: Item): FaintCause {
  const killerId = item.lastNudgedBy ?? item.ownerId;

  return killerId === undefined
    ? { by: 'item', itemType: item.type }
    : { by: 'item', itemType: item.type, killerId };
}

/**
 * Builds the `bump` fault cause for a lethal Pokémon-vs-Pokémon collision: the rammer's id as `killerId`, so the
 * client names the culprit through the same obituary machinery a thrown item uses. Collisions always have a culprit.
 */
export function bumpFaintCause(killerId: string): FaintCause {
  return { by: 'bump', killerId };
}
