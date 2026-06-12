import { FRENZY } from '@game/frenzy/config';
import { steerVelocity } from '@game/frenzy/steer-velocity';
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

  if (dx === 0 && dy === 0) {
    return state;
  }

  // Steering cap is per-stage now (from the steerer's body); the per-tap impulse stays global.
  const tuning = { impulse: FRENZY.steer.impulse, maxSpeed: steerer.body[steerer.stage].maxSpeed };
  const { vx, vy } = steerVelocity(steerer, dx, dy, tuning);
  const players = state.players.map((player) =>
    player.id === steererId ? { ...player, vx, vy } : player,
  );

  return { ...state, players };
}
