import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

/**
 * Whether an emitted item still sits in its owner's immediate interaction zone — for a bomb, inside its blast
 * radius (normalized distance, mirroring `bombBlast`); for any other item, overlapping the owner's collision box
 * (the same size-aware AABB `findCollisionTarget` uses, in world px). While true the owner stays immune; once
 * false the item is safe to arm.
 */
function stillHuggingOwner(item: Item, owner: Player): boolean {
  if (item.type === 'bomb') {
    const dx = owner.x - item.x;
    const dy = owner.y - item.y;
    const radius = FRENZY.bomb.blastRadius;

    return dx * dx + dy * dy <= radius * radius;
  }

  const itemHalfPx = FRENZY.physicalSizePx.item / 2;
  const stageBody = owner.body[owner.stage];
  const generosity = FRENZY.collision.catchGenerosity;
  const reachX = itemHalfPx + (stageBody.width / 2) * generosity;
  const reachY = itemHalfPx + (stageBody.height / 2) * generosity;
  const dx = Math.abs(owner.x - item.x) * FRENZY.world.width;
  const dy = Math.abs(owner.y - item.y) * FRENZY.world.height;

  return dx <= reachX && dy <= reachY;
}

/**
 * Arms emitted items (those carrying an `ownerId`) once they clear their owner's interaction zone, lifting the
 * owner-immunity so a Pokémon can be hit by its own output after it has separated — fixing a pooped bomb the
 * emitter could otherwise swim through forever. Sticky: an armed item stays armed even if it drifts back, so the
 * bomb that left and returns detonates the ex-owner. An item whose owner has vanished (left/fainted) arms too —
 * there is no one left to protect. Pure pass.
 */
export function armEmittedItems(items: readonly Item[], players: readonly Player[]): Item[] {
  return items.map((item) => {
    if (item.ownerId === undefined || item.armed === true) {
      return item;
    }

    const owner = players.find((player) => player.id === item.ownerId);

    if (owner !== undefined && owner.status === 'alive' && stillHuggingOwner(item, owner)) {
      return item;
    }

    return { ...item, armed: true };
  });
}
