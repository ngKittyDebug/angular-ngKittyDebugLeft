import { FRENZY } from '@game/frenzy/config';
import type { ItemType, PlayerEffectKind } from '@game/frenzy/types';

import type { ItemInteraction } from './types';

/**
 * Feeding an item to a player (by click or by drifting into it) applies its fixed per-type mass delta, then the
 * item is gone. Shared by edible items (good/rotten berries, candy) and the rock's no-op click.
 */
export function eat(itemType: ItemType, playerId: string): ItemInteraction {
  return { massDeltas: [{ playerId, amount: FRENZY.itemEffects[itemType] }], consumed: true };
}

/**
 * Effect pickup: grants a timed effect to a target and removes the item, optionally healing some mass at the
 * same time (`hp`). The engine reports an `effectGranted` (not `eaten`) so eat FX/stats stay untouched, while
 * any `hp` rides along as a plain mass delta. Shared by shield/vitamin/easterEgg.
 */
export function grantEffect(
  playerId: string,
  kind: PlayerEffectKind,
  durationMs: number,
  hp = 0,
): ItemInteraction {
  return {
    massDeltas: hp === 0 ? [] : [{ playerId, amount: hp }],
    consumed: true,
    effects: [{ playerId, kind, durationMs }],
  };
}
