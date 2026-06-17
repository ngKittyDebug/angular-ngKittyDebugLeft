import type { GameDefinition } from '@game/engine/definition';
import type { Item, Player } from '@game/engine/types';

/**
 * Whether an emitted item still OVERLAPS its owner's body — the same size-aware AABB `findCollisionTarget` uses (in
 * world px), with the item's own physical size (a `physics.sizePx` override counts). While true the owner stays
 * immune; the moment the item drifts off the body it arms. Deliberately NOT an explosive's blast radius: that radius
 * is large, so a slow, gravity-free mine hovering near its owner never left it and stayed immune forever — the owner
 * could swim through its own mine. Tying immunity to body-overlap instead means the item arms as soon as it
 * separates, then detonates the moment it touches anyone (incl. the ex-owner who rams it again).
 */
function stillHuggingOwner<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  owner: Player<TEffectId, TNpcId>,
): boolean {
  const itemHalfPx = (game.items[item.type].physics.sizePx ?? game.world.itemSizePx) / 2;
  const stageBody = owner.body[owner.stage];
  const generosity = game.collision.catchGenerosity;
  const reachX = itemHalfPx + (stageBody.width / 2) * generosity;
  const reachY = itemHalfPx + (stageBody.height / 2) * generosity;
  const dx = Math.abs(owner.x - item.x) * game.world.width;
  const dy = Math.abs(owner.y - item.y) * game.world.height;

  return dx <= reachX && dy <= reachY;
}

/**
 * Arms emitted items (those carrying an `ownerId`) once they clear their owner's interaction zone, lifting the
 * owner-immunity so a player can be hit by its own output after it has separated — fixing an emitted mine the
 * emitter could otherwise swim through forever. Sticky: an armed item stays armed even if it drifts back, so the
 * mine that left and returns detonates the ex-owner. An item whose owner has vanished (left/fainted) arms too —
 * there is no one left to protect. Pure pass.
 */
export function armEmittedItems<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  items: readonly Item<TItemId>[],
  players: readonly Player<TEffectId, TNpcId>[],
): Item<TItemId>[] {
  return items.map((item) => {
    if (item.ownerId === undefined || item.armed === true) {
      return item;
    }

    const owner = players.find((player) => player.id === item.ownerId);

    if (owner !== undefined && owner.status === 'alive' && stillHuggingOwner(game, item, owner)) {
      return item;
    }

    return { ...item, armed: true };
  });
}
