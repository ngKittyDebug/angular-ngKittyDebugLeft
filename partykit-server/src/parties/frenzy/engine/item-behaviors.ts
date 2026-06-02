import { GAME } from '@game/frenzy/constants';
import type { Item, ItemType, Player, ServerState } from '@game/frenzy/types';

/** A mass change targeted at one player. Negative amounts are damage. */
export interface MassDelta {
  playerId: string;
  amount: number;
}

/** Outcome of interacting with an item: which mass changes happen and whether the item leaves the field. */
export interface ItemInteraction {
  massDeltas: MassDelta[];
  consumed: boolean;
  /** Horizontal shift (normalized) to apply to the item instead of eating it — used by the bomb's juggle click. */
  nudgeX?: number;
  /** When set, the engine reports this as a `detonated` blast (bomb) rather than an `eaten`/silent landing. */
  explodes?: boolean;
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

// Feeding any of these to a player (by click or by drifting into it) applies its fixed per-type mass delta, then the item is gone.
function eat(itemType: ItemType, playerId: string): ItemInteraction {
  return { massDeltas: [{ playerId, amount: GAME.itemEffects[itemType] }], consumed: true };
}

// Edible items: grabbing or drifting into one applies its per-type mass delta, then it's gone.
// Covers good berries/candy (positive) and rotten "poison" berries (negative) alike — a Pokémon that
// drifts into a rotten berry is poisoned by it, same as eating one on click.
const eatBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (item, player) => eat(item.type, player.id),
};

// Mushroom: a gamble — eating it (by click or collision) rolls a random integer mass delta within the configured range,
// then it's gone. The roll happens server-side at eat time via the injected rng, so the outcome never leaks in a snapshot.
function gambleDelta(rng: () => number): number {
  const { maxDelta, minDelta } = GAME.mushroom;

  return minDelta + Math.floor(rng() * (maxDelta - minDelta + 1));
}

const gambleBehavior: ItemBehavior = {
  onClick: (_item, clickerId, _state, _nudgeX, rng = Math.random) => ({
    massDeltas: [{ playerId: clickerId, amount: gambleDelta(rng) }],
    consumed: true,
  }),
  onCollide: (_item, player, _state, rng = Math.random) => ({
    massDeltas: [{ playerId: player.id, amount: gambleDelta(rng) }],
    consumed: true,
  }),
};

// Rock: clicking it does nothing (mass delta 0) but removes it, while a falling rock that bonks a Pokémon deals collision damage.
const rockBehavior: ItemBehavior = {
  onClick: (item, clickerId) => eat(item.type, clickerId),
  onCollide: (_item, player) => ({
    massDeltas: [{ playerId: player.id, amount: GAME.collision.rockDamage }],
    consumed: true,
  }),
};

// The blast: every alive Pokémon within the radius takes damage, the owner included (friendly fire).
// `explodes` tells the engine to report a `detonated` event (not `eaten`), whether triggered by land or collision.
function bombBlast(item: Item, state: ServerState): ItemInteraction {
  const radiusSquared = GAME.bomb.blastRadius * GAME.bomb.blastRadius;
  const massDeltas: MassDelta[] = [];

  for (const player of state.players) {
    if (player.status !== 'alive') {
      continue;
    }

    const dx = player.x - item.x;
    const dy = player.y - item.y;

    if (dx * dx + dy * dy <= radiusSquared) {
      massDeltas.push({ playerId: player.id, amount: GAME.bomb.damage });
    }
  }

  return { massDeltas, consumed: true, explodes: true };
}

// Bomb: a click doesn't eat it — it bats it sideways by the player's chosen displacement (a fixed pixel step
// the client converts to normalized units, signed by which side of the sprite was tapped), capped for safety.
// Fallback when no displacement is supplied: away from the nearest edge. Position clamp lives in applyClick.
const bombBehavior: ItemBehavior = {
  onClick: (item, _clickerId, _state, nudgeX) => {
    if (nudgeX !== undefined && Number.isFinite(nudgeX) && nudgeX !== 0) {
      const capped = Math.max(-GAME.bomb.maxNudge, Math.min(GAME.bomb.maxNudge, nudgeX));

      return { massDeltas: [], consumed: false, nudgeX: capped };
    }

    const direction = item.x < 0.5 ? 1 : -1;

    return { massDeltas: [], consumed: false, nudgeX: direction * GAME.bomb.nudgeStep };
  },
  // Detonates the moment it touches a Pokémon mid-air, or when it hits the floor — same area blast either way.
  onCollide: (item, _player, state) => bombBlast(item, state),
  onLand: (item, state) => bombBlast(item, state),
};

const ITEM_BEHAVIORS: Record<ItemType, ItemBehavior> = {
  food: eatBehavior,
  rotten: eatBehavior,
  rock: rockBehavior,
  rareCandy: eatBehavior,
  bomb: bombBehavior,
  goldenBerry: eatBehavior,
  crumb: eatBehavior,
  mushroom: gambleBehavior,
};

export function getItemBehavior(type: ItemType): ItemBehavior {
  return ITEM_BEHAVIORS[type];
}
