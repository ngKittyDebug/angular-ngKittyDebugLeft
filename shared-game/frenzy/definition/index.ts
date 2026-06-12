import type {
  EffectDefinition,
  GameDefinition,
  ItemDefinition,
  NpcDefinition,
} from '../../engine/definition';
import { COLLISION } from './collision';
import type { EffectKey } from './effects';
import { FRENZY_EFFECTS } from './effects';
import { FLOATS } from './floats';
import { HP } from './hp';
import type { FrenzyItemDefinition, ItemKey } from './items';
import { FRENZY_ITEMS } from './items';
import { LOOP } from './loop';
import { ANGRY_BOMB_NPC } from './npcs/angry-bomb';
import { PLAYER } from './player';
import { PLAYER_COLLISION } from './player-collision';
import { SCORE } from './score';
import { SPAWN } from './spawn';
import { WORLD } from './world';

/** The frenzy NPC roster; the `NpcKind` union is `keyof`-derived from this record (mirrors `FRENZY_ITEMS`). */
export const FRENZY_NPCS = {
  angryBomb: ANGRY_BOMB_NPC,
} as const satisfies Record<string, NpcDefinition>;

/** Internal id union of the roster; the public alias is `NpcKind` in `frenzy/types.ts`. */
type NpcKey = keyof typeof FRENZY_NPCS;

/** Roster keys in declaration order — the canonical iteration order for every record derived from the items. */
const ITEM_KEYS = Object.keys(FRENZY_ITEMS) as readonly ItemKey[];

/** Projects every item's definition into a total per-item record, in roster declaration order. */
export function mapItems<T>(
  project: (definition: FrenzyItemDefinition, key: ItemKey) => T,
): Record<ItemKey, T> {
  const result = {} as Record<ItemKey, T>;

  for (const key of ITEM_KEYS) {
    result[key] = project(FRENZY_ITEMS[key], key);
  }

  return result;
}

/**
 * Assembles one weighted spawn pool from the items' `spawn` memberships, walking `order`. KEY ORDER inside a
 * pool is load-bearing (the weighted pick walks `Object.entries` cumulatively under a seeded-rng golden master),
 * so a pool whose historical order differs from roster order passes an explicit pin. Fails fast at module load
 * if a pinned order misses a member that declares the pool — a new item can never silently drop out of a pool.
 */
function poolWeights(
  poolId: string,
  order: readonly ItemKey[] = ITEM_KEYS,
): Readonly<Partial<Record<ItemKey, number>>> {
  // Widen the slice's literal `spawn` to the interface shape, which carries the string index for pool ids.
  const weightOf = (key: ItemKey): number | undefined => {
    const spawn: ItemDefinition['spawn'] = FRENZY_ITEMS[key].spawn;

    return spawn[poolId];
  };
  const missing = ITEM_KEYS.filter((key) => weightOf(key) !== undefined && !order.includes(key));

  if (missing.length > 0) {
    throw new Error(`Spawn pool '${poolId}' order pin is missing: ${missing.join(', ')}`);
  }

  // The inverse staleness: an explicitly pinned key whose slice no longer declares the pool.
  const stale = order.filter((key) => weightOf(key) === undefined);

  if (order !== ITEM_KEYS && stale.length > 0) {
    throw new Error(`Spawn pool '${poolId}' order pin lists non-members: ${stale.join(', ')}`);
  }

  const pool: Partial<Record<ItemKey, number>> = {};

  for (const key of order) {
    const weight = weightOf(key);

    if (weight !== undefined) {
      pool[key] = weight;
    }
  }

  return pool;
}

/** The egg pool's historical key order (weight-descending) predates the per-item slices — pinned for rng-compat. */
const EGG_EMIT_ORDER: readonly ItemKey[] = [
  'food',
  'crumb',
  'mushroom',
  'vitamin',
  'shield',
  'rareCandy',
  'goldenBerry',
];

/**
 * Weighted item pools by pool id (see `GameDefinition.spawnPools`): `world` drives natural drops (membership is
 * mandatory per item, so it is total); the emitting auras name their curated pool via `EmissionSpec.poolId`.
 */
export const SPAWN_POOLS = {
  world: mapItems((definition) => definition.spawn.world),
  eggEmit: poolWeights('eggEmit', EGG_EMIT_ORDER),
  poopEmit: poolWeights('poopEmit'),
} as const;

// Pool ids are stringly-typed (`ItemDefinition.spawn` keys, `EmissionSpec.poolId`), so a typo would silently
// drop an item from its pool or starve an aura at runtime. Fail fast at module load instead: every declared
// membership and every emission pool must resolve to an assembled pool.
const POOL_IDS = new Set<string>(Object.keys(SPAWN_POOLS));

for (const key of ITEM_KEYS) {
  for (const poolId of Object.keys(FRENZY_ITEMS[key].spawn)) {
    if (!POOL_IDS.has(poolId)) {
      throw new Error(`Item '${key}' declares unknown spawn pool '${poolId}'`);
    }
  }
}

for (const [kind, effect] of Object.entries<EffectDefinition>(FRENZY_EFFECTS)) {
  if (effect.emission !== undefined && !POOL_IDS.has(effect.emission.poolId)) {
    throw new Error(`Effect '${kind}' emits from unknown spawn pool '${effect.emission.poolId}'`);
  }
}

/**
 * The complete data definition of the frenzy game — entity rosters as per-entity slices plus the engine's
 * neutral tuning blocks. The flat `FRENZY` read-model (`../config.ts`) is DERIVED from this; the engine will
 * consume the definition directly in later refactoring phases.
 */
export const FRENZY_DEFINITION = {
  items: FRENZY_ITEMS,
  effects: FRENZY_EFFECTS,
  npcs: FRENZY_NPCS,
  spawnPools: SPAWN_POOLS,
  spawn: SPAWN,
  /** Brief spawn-protection ward auto-granted on join/respawn — reuses the shield effect with a shorter window. */
  spawnEffects: { onJoin: { effectId: 'shield', durationMs: 3_000 } },
  world: WORLD,
  loop: LOOP,
  hp: HP,
  collision: COLLISION,
  playerCollision: PLAYER_COLLISION,
  player: PLAYER,
  score: SCORE,
  floats: FLOATS,
} as const satisfies GameDefinition<ItemKey, EffectKey, NpcKey>;

export { FRENZY_EFFECTS } from './effects';
export { FRENZY_ITEMS } from './items';
export { ANGRY_BOMB_NPC } from './npcs/angry-bomb';
