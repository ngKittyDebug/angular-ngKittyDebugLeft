import { FRENZY } from '@game/frenzy/config';
import type { Player, ServerState } from '@game/frenzy/types';

import type { PlayerImpulse } from './item-behaviors';

/** Sums the kicks per player, so one player hit by several blasts in a tick gets a single combined impulse. */
function aggregateByPlayer(
  impulses: readonly PlayerImpulse[],
): Map<string, { ix: number; iy: number }> {
  const byPlayer = new Map<string, { ix: number; iy: number }>();

  for (const impulse of impulses) {
    const accumulated = byPlayer.get(impulse.playerId) ?? { ix: 0, iy: 0 };

    byPlayer.set(impulse.playerId, {
      ix: accumulated.ix + impulse.ix,
      iy: accumulated.iy + impulse.iy,
    });
  }

  return byPlayer;
}

/**
 * Adds a knockback kick to a player's drift, then caps the resulting speed at `blastImpulseMaxFactor × maxSpeed`
 * of their stage — knockback may briefly exceed cruising speed (so a blast visibly flings them) but no more than
 * that, and the next wall bounce / re-cruise pulls them back to normal.
 */
function kickPlayer(player: Player, kick: { ix: number; iy: number }): Player {
  let vx = player.vx + kick.ix;
  let vy = player.vy + kick.iy;
  const cap = player.body[player.stage].maxSpeed * FRENZY.bomb.blastImpulseMaxFactor;
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
export function applyImpulses(state: ServerState, impulses: readonly PlayerImpulse[]): ServerState {
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
