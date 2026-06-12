import { FRENZY } from '@game/frenzy/config';
import type { Item, ServerState } from '@game/frenzy/types';

import type { ItemBehavior, ItemInteraction, HpDelta } from './types';

/**
 * The blast: every alive, unshielded Pokémon within the radius takes damage — friendly fire hits the batter too.
 * Skipped entirely (no damage, no "−25" float, absent from `detonated.playerIds`): shielded Pokémon, and the
 * bomb's own `ownerId` (an easter-egg layer is immune to the bombs it laid — it can't blow itself up).
 * `explodes` tells the engine to report a `detonated` event (not `eaten`), whether triggered by land or collision.
 */
function bombBlast(item: Item, state: ServerState): ItemInteraction {
  const radiusSquared = FRENZY.bomb.blastRadius * FRENZY.bomb.blastRadius;
  const hpDeltas: HpDelta[] = [];

  for (const player of state.players) {
    if (
      player.status !== 'alive' ||
      player.id === item.ownerId ||
      player.effects.some((effect) => effect.kind === 'shield')
    ) {
      continue;
    }

    const dx = player.x - item.x;
    const dy = player.y - item.y;

    if (dx * dx + dy * dy <= radiusSquared) {
      hpDeltas.push({ playerId: player.id, amount: FRENZY.bomb.damage });
    }
  }

  return { hpDeltas, consumed: true, explodes: true };
}

/**
 * Bomb: a click doesn't eat it — it bats it sideways by the player's chosen displacement (a fixed pixel step
 * the client converts to normalized units, signed by which side of the sprite was tapped), capped for safety.
 * Fallback when no displacement is supplied: away from the nearest edge. Position clamp lives in applyClick.
 * It detonates the moment it touches a Pokémon mid-air, or when it hits the floor — same area blast either way.
 */
export const bombBehavior: ItemBehavior = {
  onClick: (item, _clickerId, _state, nudgeX) => {
    if (nudgeX !== undefined && Number.isFinite(nudgeX) && nudgeX !== 0) {
      const capped = Math.max(-FRENZY.bomb.maxNudge, Math.min(FRENZY.bomb.maxNudge, nudgeX));

      return { hpDeltas: [], consumed: false, nudgeX: capped };
    }

    const direction = item.x < 0.5 ? 1 : -1;

    return { hpDeltas: [], consumed: false, nudgeX: direction * FRENZY.bomb.nudgeStep };
  },
  onCollide: (item, _player, state) => bombBlast(item, state),
  onLand: (item, state) => bombBlast(item, state),
};
