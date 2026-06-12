import { FRENZY } from '@game/frenzy/config';
import type { Item, ServerState } from '@game/frenzy/types';

import { computeBlast, itemBombBlastParams } from './compute-blast';
import type { ItemBehavior, ItemInteraction } from './types';

/**
 * The blast: every alive, unshielded Pokémon within the radius takes distance-scaled damage AND a radial knockback
 * kick — friendly fire hits the batter too. Skipped entirely (no damage, no knockback, no float, absent from
 * `detonated.hits`): shielded Pokémon, and the bomb's own `ownerId` while it is still un-armed (a freshly
 * pooped bomb won't blast its emitter — but once it drifts out of blast range and arms, the emitter is fair game
 * again). `explodes` tells the engine to report a `detonated` event (not `eaten`), whether triggered by land or
 * collision. The per-player falloff math lives in the shared `computeBlast` (reused by the NPC's blasts).
 */
function bombBlast(item: Item, state: ServerState): ItemInteraction {
  // Owner-immunity only holds while the bomb still hugs its emitter; once armed (separated) it can blast them too.
  const immuneOwnerId = item.armed === true ? undefined : item.ownerId;
  const { hpDeltas, impulses } = computeBlast(
    itemBombBlastParams(item.x, item.y),
    state.players,
    immuneOwnerId,
  );

  return { hpDeltas, impulses, consumed: true, explodes: true };
}

/**
 * Bomb: a click doesn't eat it — it shoves it by adding a fixed inertial impulse (`bomb.clickImpulse`) to its drift
 * velocity, in the 2D direction AWAY from the tapped side (the client sends a `nudgeX`/`nudgeY` direction vector;
 * tap the top → push down, the right → push left, etc.). The bomb then drifts freely (constant-velocity 2D drift +
 * wall bounce, see move-items). Velocity accumulation + speed cap live in applyClick. Fallback when no direction is supplied: shove
 * away from the nearest horizontal edge. It detonates the moment it touches a Pokémon mid-air, or hits the floor.
 *
 * Click budget (a third detonation trigger): a spawned mine carries a hidden `clicksLeft`. While it has budget to
 * spare (`clicksLeft > 1`) a click just shoves it; the click that spends the last one (`clicksLeft <= 1`) blasts
 * instead. The actual decrement of the stored item happens in applyClick (behaviours are pure). An aura-emitted
 * bomb has no `clicksLeft` (undefined) and never click-detonates — it always keeps nudging.
 */
export const bombBehavior: ItemBehavior = {
  onClick: (item, _clickerId, state, nudgeX, _rng, nudgeY) => {
    if (item.clicksLeft !== undefined && item.clicksLeft <= 1) {
      return bombBlast(item, state);
    }

    const dirX = nudgeX !== undefined && Number.isFinite(nudgeX) ? nudgeX : 0;
    const dirY = nudgeY !== undefined && Number.isFinite(nudgeY) ? nudgeY : 0;
    const magnitude = Math.hypot(dirX, dirY);
    // No usable direction → fall back to a horizontal shove away from the nearest edge.
    const [unitX, unitY] =
      magnitude > 0 ? [dirX / magnitude, dirY / magnitude] : [item.x < 0.5 ? 1 : -1, 0];

    return {
      hpDeltas: [],
      consumed: false,
      nudgeX: unitX * FRENZY.bomb.clickImpulse,
      nudgeY: unitY * FRENZY.bomb.clickImpulse,
    };
  },
  onCollide: (item, _player, state) => bombBlast(item, state),
  onLand: (item, state) => bombBlast(item, state),
};
