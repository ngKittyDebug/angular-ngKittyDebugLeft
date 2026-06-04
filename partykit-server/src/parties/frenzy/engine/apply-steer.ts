import { GAME } from '@game/frenzy/constants';
import type { ServerState } from '@game/frenzy/types';

// Steering: add a velocity impulse toward the tapped point on top of the steerer's current drift, then cap the
// resulting speed so repeated taps can't fling the Pokémon. The tap point isn't clamped to the drift zone — it
// only gives a direction; the per-tick wall bounce keeps the Pokémon inside the zone. Returns the same state
// reference (no clone) when the steer is a no-op, so callers can cheaply detect "nothing changed".
export function applySteer(
  state: ServerState,
  steererId: string,
  x: number,
  y: number,
): ServerState {
  const steerer = state.players.find((candidate) => candidate.id === steererId);

  if (steerer === undefined || steerer.status !== 'alive') {
    return state;
  }

  const dx = x - steerer.x;
  const dy = y - steerer.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return state;
  }

  const { impulse, maxSpeed } = GAME.steer;
  let vx = steerer.vx + (dx / distance) * impulse;
  let vy = steerer.vy + (dy / distance) * impulse;
  const speed = Math.hypot(vx, vy);

  if (speed > maxSpeed) {
    vx = (vx / speed) * maxSpeed;
    vy = (vy / speed) * maxSpeed;
  }

  const players = state.players.map((player) =>
    player.id === steererId ? { ...player, vx, vy } : player,
  );

  return { ...state, players };
}
