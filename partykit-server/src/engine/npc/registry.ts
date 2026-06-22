import type { GameEvent } from '@game/engine/types';
import { isNPC } from '@game/engine/types';

import type { NpcHooks, NpcRegistry, NpcRuntime } from './types';

/**
 * Adapt the per-kind registry to the orchestrator's array-shaped hooks: `move`/`coolAnger` dispatch each NPC to
 * its kind's runtime (an unregistered kind passes through untouched — inert by default), `applyBlasts` chains
 * every registered kind's state-level blast pass in REGISTRATION ORDER (load-bearing once a game has >1 kind).
 */
export function npcHooksFromRegistry<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(registry: NpcRegistry<TItemId, TEffectId, TNpcId>): NpcHooks<TItemId, TEffectId, TNpcId> {
  // `Partial<Record<...>>` admits explicitly-undefined entries — filter them so the blast loop can't hit one.
  const runtimes = Object.values(registry).filter(
    (runtime): runtime is NpcRuntime<TItemId, TEffectId, TNpcId> => runtime !== undefined,
  );

  return {
    move: (npcs, items, deltaSeconds, tick) =>
      npcs.map((npc) => registry[npc.npcKind]?.move(npc, items, deltaSeconds, tick) ?? npc),
    applyBlasts: (state) => {
      let working = state;
      const events: GameEvent<TItemId, TEffectId>[] = [];

      for (const runtime of runtimes) {
        const result = runtime.applyBlasts(working);

        working = result.state;
        events.push(...result.events);
      }

      return { state: working, events };
    },
    coolAnger: (players) =>
      players.map((player) =>
        isNPC(player) ? (registry[player.npcKind]?.coolAnger(player) ?? player) : player,
      ),
  };
}
