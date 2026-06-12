import { FRENZY } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

/**
 * Slow drift with wall bounce, applied every tick (not only on decay ticks). Each player advances by its
 * velocity and bounces off the four edges of `FRENZY.playerDriftZone` — clamped to the wall, velocity reflected
 * inward on that axis.
 */
export function movePlayers(players: readonly Player[], deltaSeconds: number): Player[] {
  const zone = FRENZY.playerDriftZone;

  return players.map((player) => {
    let { x, y, vx, vy } = player;

    x += vx * deltaSeconds;
    y += vy * deltaSeconds;

    if (x <= zone.minX) {
      x = zone.minX;
      vx = Math.abs(vx);
    }

    if (x >= zone.maxX) {
      x = zone.maxX;
      vx = -Math.abs(vx);
    }

    if (y <= zone.minY) {
      y = zone.minY;
      vy = Math.abs(vy);
    }

    if (y >= zone.maxY) {
      y = zone.maxY;
      vy = -Math.abs(vy);
    }

    return { ...player, x, y, vx, vy };
  });
}
