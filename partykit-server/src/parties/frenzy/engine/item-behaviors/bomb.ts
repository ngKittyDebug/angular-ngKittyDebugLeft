import { FRENZY } from '@game/frenzy/config';
import type { Item, Player, ServerState } from '@game/frenzy/types';

import type { HpDelta, ItemBehavior, ItemInteraction, PlayerImpulse } from './types';

/**
 * Distance-scaled blast effect on one caught player: damage and knockback both fall off quadratically with the
 * normalized distance `t = dist/radius` (0 at the epicentre, 1 at the edge). Damage is `maxDamage·(1−t)²` floored
 * by magnitude at `minDamage` (anyone inside the radius loses at least that much); knockback is a radial kick of
 * `blastImpulse·(1−t)²` pointing from the blast centre to the player (straight up when they sit exactly on it).
 */
function blastEffect(
  player: Player,
  dx: number,
  dy: number,
  dist: number,
): { hp: HpDelta; impulse: PlayerImpulse } {
  const t = Math.min(1, dist / FRENZY.bomb.blastRadius);
  const falloff = (1 - t) * (1 - t);
  const amount = Math.min(FRENZY.bomb.minDamage, Math.round(FRENZY.bomb.maxDamage * falloff));
  const magnitude = FRENZY.bomb.blastImpulse * falloff;
  // Direction from the epicentre to the player; a player sitting exactly on the bomb gets lifted straight up.
  const dirX = dist > 0 ? dx / dist : 0;
  const dirY = dist > 0 ? dy / dist : -1;

  return {
    hp: { playerId: player.id, amount },
    impulse: { playerId: player.id, ix: dirX * magnitude, iy: dirY * magnitude },
  };
}

/**
 * The blast: every alive, unshielded Pokémon within the radius takes distance-scaled damage AND a radial knockback
 * kick — friendly fire hits the batter too. Skipped entirely (no damage, no knockback, no float, absent from
 * `detonated.playerIds`): shielded Pokémon, and the bomb's own `ownerId` while it is still un-armed (a freshly
 * pooped bomb won't blast its emitter — but once it drifts out of blast range and arms, the emitter is fair game
 * again). `explodes` tells the engine to report a `detonated` event (not `eaten`), whether triggered by land or
 * collision.
 */
function bombBlast(item: Item, state: ServerState): ItemInteraction {
  const radiusSquared = FRENZY.bomb.blastRadius * FRENZY.bomb.blastRadius;
  const hpDeltas: HpDelta[] = [];
  const impulses: PlayerImpulse[] = [];
  // Owner-immunity only holds while the bomb still hugs its emitter; once armed (separated) it can blast them too.
  const immuneOwnerId = item.armed === true ? undefined : item.ownerId;

  for (const player of state.players) {
    if (
      player.status !== 'alive' ||
      player.id === immuneOwnerId ||
      player.effects.some((effect) => effect.kind === 'shield')
    ) {
      continue;
    }

    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared) {
      const effect = blastEffect(player, dx, dy, Math.sqrt(distanceSquared));

      hpDeltas.push(effect.hp);
      impulses.push(effect.impulse);
    }
  }

  return { hpDeltas, impulses, consumed: true, explodes: true };
}

/**
 * Bomb: a click doesn't eat it — it shoves it by adding a fixed inertial impulse (`bomb.clickImpulse`) to its drift
 * velocity, in the 2D direction AWAY from the tapped side (the client sends a `nudgeX`/`nudgeY` direction vector;
 * tap the top → push down, the right → push left, etc.). The bomb then drifts freely (constant-velocity 2D drift +
 * wall bounce, see move-items). Velocity accumulation + speed cap live in applyClick. Fallback when no direction is supplied: shove
 * away from the nearest horizontal edge. It detonates the moment it touches a Pokémon mid-air, or hits the floor.
 */
export const bombBehavior: ItemBehavior = {
  onClick: (item, _clickerId, _state, nudgeX, _rng, nudgeY) => {
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
