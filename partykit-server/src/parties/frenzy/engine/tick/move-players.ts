import { FRENZY, halfExtentNorm } from '@game/frenzy/config';
import type { Player } from '@game/frenzy/types';

/**
 * Slow drift with wall bounce, applied every tick (not only on decay ticks). Each player advances by its
 * velocity and bounces off the four edges. Bounds are size-aware: the looser of `playerDriftZone` and a
 * half-sprite inset (from the player's per-stage `body`), so a big Pokémon never clips through a wall. On a
 * bounce the reflected component is damped (`bounceDamping`, the floor harder than the side walls), then the
 * total speed is floored back up to the stage's cruising `speed` so damping can never stall a Pokémon in a corner.
 */
export function movePlayers(players: readonly Player[], deltaSeconds: number): Player[] {
  const zone = FRENZY.playerDriftZone;
  const world = FRENZY.world;
  const damping = FRENZY.bounceDamping;

  return players.map((player) => {
    let { x, y, vx, vy } = player;
    const stageBody = player.body[player.stage];
    const insetX = halfExtentNorm(stageBody.width, world.width);
    const insetY = halfExtentNorm(stageBody.height, world.height);
    const minX = Math.max(zone.minX, insetX);
    const maxX = Math.min(zone.maxX, 1 - insetX);
    const minY = Math.max(zone.minY, insetY);
    const maxY = Math.min(zone.maxY, 1 - insetY);
    let bounced = false;

    x += vx * deltaSeconds;
    y += vy * deltaSeconds;

    if (x <= minX) {
      x = minX;
      vx = Math.abs(vx) * damping.wall;
      bounced = true;
    }

    if (x >= maxX) {
      x = maxX;
      vx = -Math.abs(vx) * damping.wall;
      bounced = true;
    }

    if (y <= minY) {
      y = minY;
      vy = Math.abs(vy) * damping.wall;
      bounced = true;
    }

    if (y >= maxY) {
      y = maxY;
      vy = -Math.abs(vy) * damping.floor;
      bounced = true;
    }

    if (bounced) {
      const speed = Math.hypot(vx, vy);
      const cruise = stageBody.speed;

      if (speed > 0 && speed < cruise) {
        vx = (vx / speed) * cruise;
        vy = (vy / speed) * cruise;
      }
    }

    return { ...player, x, y, vx, vy };
  });
}
