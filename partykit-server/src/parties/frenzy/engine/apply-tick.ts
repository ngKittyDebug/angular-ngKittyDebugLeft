import type { GameEvent, ServerState } from '@game/frenzy/types';

import { applyDecayStep } from './tick/apply-decay-step';
import { moveItems } from './tick/move-items';
import { movePlayers } from './tick/move-players';
import { pruneExpiredEffects } from './tick/prune-effects';
import { resolveCollisions } from './tick/resolve-collisions';
import { resolveLandings } from './tick/resolve-landings';

export interface TickResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * One authoritative game-loop step, composed from the per-pass helpers in `./tick/*`:
 * prune lapsed effects → move items (split into floor-survivors and just-expired) → drift players → resolve
 * mid-air/resting collisions → detonate landed explosives → (on decay ticks only) bleed hp. Pure: `rng` and
 * `now` are injected so the whole tick is deterministic in tests.
 */
export function applyTick(
  state: ServerState,
  deltaSeconds: number,
  applyDecay: boolean,
  rng: () => number = Math.random,
  now: number = Date.now(),
): TickResult {
  const livePlayers = pruneExpiredEffects(state.players, now);
  const movedItems = moveItems(state.items, deltaSeconds);
  const survivors = movedItems.filter((item) => item.restMs === undefined || item.restMs > 0);
  const expired = movedItems.filter((item) => item.restMs !== undefined && item.restMs <= 0);

  let working: ServerState = {
    ...state,
    items: survivors,
    players: movePlayers(livePlayers, deltaSeconds),
  };
  const events: GameEvent[] = [];

  const collisions = resolveCollisions(working, rng, now);

  working = collisions.state;
  events.push(...collisions.events);

  const landings = resolveLandings(working, expired);

  working = landings.state;
  events.push(...landings.events);

  if (!applyDecay) {
    return { state: working, events };
  }

  const decay = applyDecayStep(working);

  return { state: decay.state, events: [...events, ...decay.events] };
}
