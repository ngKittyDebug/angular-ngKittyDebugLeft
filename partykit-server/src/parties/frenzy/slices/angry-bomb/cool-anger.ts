import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { NpcPlayer } from '@game/engine/types';
import type { NpcKind, PlayerEffectKind } from '@game/frenzy/types';

/**
 * Passive anger cooldown (O6): bleed `anger.cooldownPerTick` mana off one angry-bomb NPC, floored at 0. Mana
 * lives in real time, not on the decay grid, so the registry calls this every tick (not only on decay ticks);
 * humans never reach it (the registry dispatches NPCs only). Pure: returns a fresh NPC.
 */
export function coolAnger(
  npc: NpcPlayer<PlayerEffectKind, NpcKind>,
): NpcPlayer<PlayerEffectKind, NpcKind> {
  return { ...npc, mana: Math.max(0, npc.mana - ANGRY_BOMB_NPC.anger.cooldownPerTick) };
}
