/**
 * Single source of game tunables for Feeding Frenzy.
 * Contract shared by the server (authoritative) and the client (render/UI) — imported by both via `@game/frenzy/config`.
 * Coordinates are normalized (0..1): the client multiplies them by the viewport size.
 *
 * The flat `FRENZY` object is assembled from per-concern partials under `./config/*`; edit a partial to retune a
 * concern. `FRENZY.features` (see `./config/features`) gates which items take part — toggled via `isItemEnabled`.
 */
import type { ItemType } from './types';

import { BUFFS } from './config/buffs';
import { COLLISION } from './config/collision';
import { FEATURES } from './config/features';
import { FLOATS } from './config/floats';
import { ITEMS } from './config/items';
import { LOOP } from './config/loop';
import { HP } from './config/hp';
import { PLAYER } from './config/player';
import { SPAWN } from './config/spawn';
import { WORLD } from './config/world';

export const FRENZY = {
  ...HP,
  ...WORLD,
  ...COLLISION,
  ...ITEMS,
  ...SPAWN,
  ...BUFFS,
  ...PLAYER,
  ...LOOP,
  ...FLOATS,
  features: FEATURES,
} as const;

/**
 * Normalized half-extent (0..1) of a `sizePx`-wide sprite measured along a world axis of `dimensionPx`.
 * Used for size-aware edge bounds: keeping an actor's centre at least this far from a world wall keeps the
 * whole sprite inside the aquarium (no clipping through the edge). Both axes derive from `FRENZY.world`.
 */
export function halfExtentNorm(sizePx: number, dimensionPx: number): number {
  return sizePx / 2 / dimensionPx;
}

/**
 * Whether an item type is currently enabled (see `FRENZY.features.items`). Consulted by `pickItemType` so a
 * disabled item is dropped from every spawn path. Cheap enough to call per spawn.
 */
export function isItemEnabled(type: ItemType): boolean {
  return FRENZY.features.items[type].enabled;
}
