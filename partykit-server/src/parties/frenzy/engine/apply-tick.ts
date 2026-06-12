import { isPlayerCollisionEnabled } from '@game/frenzy/config';
import { crownIdOf } from '@game/frenzy/crown';
import type { FaintedEvent, GameEvent, ServerState } from '@game/frenzy/types';

import { applyBumpDamage } from './apply-bumps';
import { applyImpulses } from './apply-impulses';
import { applyKills } from './apply-scores';
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
  // Snapshot the crown (hp-leader) from the PRE-tick players, before any faint removes it — so the score pass can
  // tell whether a victim died wearing it (a bounty kill) regardless of what this tick's damage does.
  const crownId = crownIdOf(state.players);
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

  if (applyDecay) {
    const decay = applyDecayStep(working);

    working = decay.state;
    events.push(...decay.events);
  }

  // Score pass (last, so it sees every faint this tick): credit attributed kills to the survivors that caused them.
  // Gated on an actual faint — on the common no-faint tick we skip the filter + map + re-spread entirely (mirrors
  // how the steer/emission passes no-op without input), so the hot loop allocates nothing extra.
  if (events.some((event) => event.type === 'fainted')) {
    const faints = events.filter((event): event is FaintedEvent => event.type === 'fainted');

    working = { ...working, players: applyKills(working.players, faints, crownId) };
  }

  return { state: working, events };
}
