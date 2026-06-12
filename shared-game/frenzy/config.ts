/**
 * Single source of game tunables for Feeding Frenzy.
 * Contract shared by the server (authoritative) and the client (render/UI) — imported by both via `@game/frenzy/config`.
 * Coordinates are normalized (0..1): the client multiplies them by the viewport size.
 *
 * The flat `FRENZY` object is assembled from per-concern partials under `./config/*`; edit a partial to retune a
 * concern. `FRENZY.features` (see `./config/features`) gates which items take part — toggled via `isItemEnabled`.
 */
import type { ItemType, NpcKind, ScoreKind } from './types';

import { BUFFS } from './config/buffs';
import { COLLISION } from './config/collision';
import { FEATURES } from './config/features';
import { FLOATS } from './config/floats';
import { ITEMS } from './config/items';
import { LOOP } from './config/loop';
import { HP } from './config/hp';
import { NPC } from './config/npc';
import { PLAYER } from './config/player';
import { PLAYER_COLLISION } from './config/player-collision';
import { SCORE } from './config/score';
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
  ...PLAYER_COLLISION,
  ...LOOP,
  ...FLOATS,
  ...SCORE,
  npc: NPC,
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

/**
 * Whether an NPC kind is currently enabled (see `FRENZY.features.npc`). Gates the NPC spawner so a disabled
 * autobot never enters play — mirrors `isItemEnabled`.
 */
export function isNpcEnabled(kind: NpcKind): boolean {
  return FRENZY.features.npc[kind].enabled;
}

/**
 * Weighted sum of a player's session `scores` by axis (see `FRENZY.score.weights`). The single way score is
 * collapsed to one number for ranking/medals — computed identically on the server and the client (the wire
 * carries the raw `scores`, never this total). Missing axes count as 0; `crownKills` stacks ON TOP of `kills`.
 */
export function totalScore(scores: Partial<Record<ScoreKind, number>>): number {
  const { weights } = FRENZY.score;

  // Data-driven over the weights record (typed `Record<ScoreKind, number>` in `config/score`), so a new `ScoreKind`
  // is forced to carry a weight AND is summed here automatically — no axis can silently drop out of the total.
  return (Object.keys(weights) as ScoreKind[]).reduce(
    (sum, kind) => sum + (scores[kind] ?? 0) * weights[kind],
    0,
  );
}

/**
 * Whether Pokémon↔Pokémon collision (soft separation + mini-bump) is on (see `FRENZY.features.playerCollision`).
 * Consulted once per tick by the orchestrator to gate the whole `separatePlayers` pass; off → Pokémon overlap freely.
 */
export function isPlayerCollisionEnabled(): boolean {
  return FRENZY.features.playerCollision.enabled;
}

/**
 * Deterministic per-item resting y (normalized) within `range` (default `FRENZY.itemRestYRange`), hashed from the
 * item id. Server-authoritative: the engine settles a landing item here, and the client extrapolator clamps the
 * fall to the SAME value (so no snap on the confirming snapshot). Spreading rest y by id scatters settled items
 * across the seabed instead of stacking them on one row.
 */
export function restYFor(
  id: string,
  range: readonly [number, number] = FRENZY.itemRestYRange,
): number {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  const [min, max] = range;
  const fraction = (Math.abs(hash) % 1000) / 1000;

  return min + fraction * (max - min);
}
