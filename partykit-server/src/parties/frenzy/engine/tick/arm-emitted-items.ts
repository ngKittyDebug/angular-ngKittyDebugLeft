import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

/**
 * Whether an emitted item still OVERLAPS its owner's body — the same size-aware AABB `findCollisionTarget` uses (in
 * world px), with the item's own physical size (the bomb is bigger). While true the owner stays immune; the moment
 * the item drifts off the body it arms. Deliberately NOT the bomb's blast radius: that radius is large (~0.18), so
 * a slow, gravity-free bomb hovering near its owner never left it and stayed immune forever — the owner could swim
 * through its own mine. Tying immunity to body-overlap instead means the bomb arms as soon as it separates, then
 * detonates the moment it touches anyone (incl. the ex-owner who rams it again).
 */
function stillHuggingOwner(item: Item, owner: Player): boolean {
  const itemHalfPx =
    (item.type === 'bomb' ? FRENZY.physicalSizePx.bomb : FRENZY.physicalSizePx.item) / 2;
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
