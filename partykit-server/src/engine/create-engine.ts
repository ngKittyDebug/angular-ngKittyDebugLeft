import type { GameDefinition } from '@game/engine/definition';
import type { Item, Player, ServerState } from '@game/engine/types';

import type { ClickResult } from './core/apply-click';
import { applyClick } from './core/apply-click';
import type { EmissionResult } from './core/apply-emissions';
import { applyEmissions, buildEmitters } from './core/apply-emissions';
import { applySteer } from './core/apply-steer';
import type { TickResult } from './core/apply-tick';
import { applyTick } from './core/apply-tick';
import type { CreatePlayerInput } from './core/create-player';
import { createPlayer } from './core/create-player';
import { spawnItem } from './core/spawn-item';
import { npcHooksFromRegistry } from './npc/registry';
import type { NpcRegistry } from './npc/types';

/**
 * The engine's per-game entry points, bound to one `GameDefinition` (and its NPC hooks) by `createEngine` so the
 * party adapter never threads the definition itself. All functions are pure pass-throughs to the core passes;
 * `rng`/`now`/`createId` default to the real clock/randomness and are injectable for deterministic tests.
 */
export interface Engine<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  applyTick(
    state: ServerState<TItemId, TEffectId, TNpcId>,
    deltaSeconds: number,
    applyDecay: boolean,
    rng?: () => number,
    now?: number,
  ): TickResult<TItemId, TEffectId, TNpcId>;
  applyClick(
    state: ServerState<TItemId, TEffectId, TNpcId>,
    clickerId: string,
    itemId: string,
    nudgeX?: number,
    nudgeY?: number,
    rng?: () => number,
    now?: number,
  ): ClickResult<TItemId, TEffectId, TNpcId>;
  applyEmissions(
    state: ServerState<TItemId, TEffectId, TNpcId>,
    now: number,
    schedule: ReadonlyMap<string, number>,
    rng?: () => number,
    createId?: () => string,
  ): EmissionResult<TItemId, TEffectId, TNpcId>;
  applySteer(
    state: ServerState<TItemId, TEffectId, TNpcId>,
    steererId: string,
    x: number,
    y: number,
  ): ServerState<TItemId, TEffectId, TNpcId>;
  createPlayer(input: CreatePlayerInput<TEffectId, TNpcId>): Player<TEffectId, TNpcId>;
  spawnItem(rng?: () => number, createId?: () => string): Item<TItemId>;
}

/**
 * Binds the generic engine to one game: the data definition plus (optionally) the game's per-kind NPC runtime
 * registry — a game without NPCs omits it and every NPC stays inert. Derived structures that must NOT be rebuilt
 * per tick (the emitting-aura list, the registry-backed NPC hooks) are resolved once here. The returned `Engine`
 * is what a party adapter talks to; see `parties/<game>/game.ts` for a composition root.
 */
export function createEngine<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  npcRegistry: NpcRegistry<TItemId, TEffectId, TNpcId> = {},
): Engine<TItemId, TEffectId, TNpcId> {
  const emitters = buildEmitters(game);
  const npc = npcHooksFromRegistry(npcRegistry);

  return {
    applyTick: (state, deltaSeconds, applyDecay, rng, now) =>
      applyTick(game, npc, state, deltaSeconds, applyDecay, rng, now),
    applyClick: (state, clickerId, itemId, nudgeX, nudgeY, rng, now) =>
      applyClick(game, state, clickerId, itemId, nudgeX, nudgeY, rng, now),
    applyEmissions: (state, now, schedule, rng, createId) =>
      applyEmissions(game, emitters, state, now, schedule, rng, createId),
    applySteer: (state, steererId, x, y) => applySteer(game, state, steererId, x, y),
    createPlayer: (input) => createPlayer(game, input),
    spawnItem: (rng, createId) => spawnItem(game, rng, createId),
  };
}
