import { isPlayerCollisionEnabled } from '@game/frenzy/config';
import type { GameEvent, ServerState } from '@game/frenzy/types';

import { applyBumpDamage } from './apply-bumps';
import { applyImpulses } from './apply-impulses';
import { applyDecayStep } from './tick/apply-decay-step';
import { armEmittedItems } from './tick/arm-emitted-items';
import { moveItems } from './tick/move-items';
import { movePlayers } from './tick/move-players';
import { pruneExpiredEffects } from './tick/prune-effects';
import { resolveCollisions } from './tick/resolve-collisions';
import { resolveLandings } from './tick/resolve-landings';
import { separatePlayers } from './tick/separate-players';

export interface TickResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * One authoritative game-loop step, composed from the per-pass helpers in `./tick/*`:
 * prune lapsed effects → move items (split into floor-survivors and just-expired) → drift players → separate
 * overlapping players (when enabled) → resolve mid-air/resting collisions → detonate landed explosives → (on
 * decay ticks only) bleed hp. Pure: `rng` and `now` are injected so the whole tick is deterministic in tests.
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

  if (isPlayerCollisionEnabled()) {
    const separation = separatePlayers(working.players);

    working = { ...working, players: separation.players };

    const bumped = applyBumpDamage(working, separation.bumps);

    working = applyImpulses(bumped.state, separation.impulses);
    events.push(...bumped.events);
  }

  // Lift owner-immunity from emitted items that have separated (a pooped bomb that left its emitter's blast
  // radius), so the next collision/landing pass can detonate or strike the ex-owner instead of phasing through.
  working = { ...working, items: armEmittedItems(working.items, working.players) };

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
