import type { FaintCause, Item } from '@game/frenzy/types';

/**
 * Builds the `item` fault cause for a lethal item: carries the item type and, when the item was emitted by a
 * player's easter-egg/poop aura, that player's id as `killerId` (so the client can name the culprit). Naturally
 * spawned items have no owner, so `killerId` is omitted entirely (kept off the wire rather than set undefined).
 */
export function itemFaintCause(item: Item): FaintCause {
  return item.ownerId === undefined
    ? { by: 'item', itemType: item.type }
    : { by: 'item', itemType: item.type, killerId: item.ownerId };
}
