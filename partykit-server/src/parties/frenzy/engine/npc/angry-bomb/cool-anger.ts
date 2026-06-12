import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';
import { isNPC } from '@game/frenzy/types';

/**
 * Passive anger cooldown (O6): bleed `NPC.anger.cooldownPerTick` mana off every NPC each tick, floored at 0. Mana
 * lives in real time, not on the decay grid, so this runs every tick (not only on decay ticks). Humans are untouched
 * (they don't accumulate mana yet). Pure: returns a fresh players array.
 */
export function coolAnger(players: readonly Player[]): Player[] {
  return players.map((player) =>
    isNPC(player)
      ? { ...player, mana: Math.max(0, player.mana - FRENZY.npc.anger.cooldownPerTick) }
      : player,
  );
}
