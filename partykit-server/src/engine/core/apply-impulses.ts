import type { Player, ServerState } from '@game/engine/types';

import type { PlayerImpulse } from '../verbs';

/** Sums the kicks per player, so one player hit by several blasts in a tick gets a single combined impulse.
 * The cap factor is the max of the contributors' — with one producer per tick they're equal; mixing producers
 * keeps the most permissive cap rather than silently clamping a strong blast by a weak bump's. */
function aggregateByPlayer(
  impulses: readonly PlayerImpulse[],
): Map<string, { ix: number; iy: number; maxFactor: number }> {
  const byPlayer = new Map<string, { ix: number; iy: number; maxFactor: number }>();

  for (const impulse of impulses) {
    const accumulated = byPlayer.get(impulse.playerId) ?? { ix: 0, iy: 0, maxFactor: 0 };

    byPlayer.set(impulse.playerId, {
      ix: accumulated.ix + impulse.ix,
      iy: accumulated.iy + impulse.iy,
      maxFactor: Math.max(accumulated.maxFactor, impulse.maxFactor),
    });
  }

  return byPlayer;
}

/**
 * Adds a knockback kick to a player's drift, then caps the resulting speed at the kick's `maxFactor × maxSpeed`
 * of their stage — knockback may briefly exceed cruising speed (so a blast visibly flings them) but no more than
 * that, and the next wall bounce / re-cruise pulls them back to normal.
 */
function kickPlayer<TEffectId extends string, TNpcId extends string>(
  player: Player<TEffectId, TNpcId>,
  kick: { ix: number; iy: number; maxFactor: number },
): Player<TEffectId, TNpcId> {
  let vx = player.vx + kick.ix;
  let vy = player.vy + kick.iy;
  const cap = player.body[player.stage].maxSpeed * kick.maxFactor;
  const speed = Math.hypot(vx, vy);

  if (speed > cap && speed > 0) {
    vx = (vx / speed) * cap;
    vy = (vy / speed) * cap;
  }

  return { ...player, vx, vy };
}

/**
 * Applies radial blast knockback to caught players: adds each kick to their velocity (capped). Runs AFTER
 * applyHpDeltas in the collision/landing passes, so a player the blast just fainted (removed from state) is
 * simply absent here and skipped. Pure — a no-op for an empty list.
 */
export function applyImpulses<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  state: ServerState<TItemId, TEffectId, TNpcId>,
  impulses: readonly PlayerImpulse[],
): ServerState<TItemId, TEffectId, TNpcId> {
  if (impulses.length === 0) {
    return state;
  }

  const byPlayer = aggregateByPlayer(impulses);
  const players = state.players.map((player) => {
    const kick = byPlayer.get(player.id);

    return kick === undefined ? player : kickPlayer(player, kick);
  });

  return { ...state, players };
}
