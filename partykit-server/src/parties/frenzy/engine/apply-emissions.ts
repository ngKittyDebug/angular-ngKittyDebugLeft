import { FRENZY } from '@game/frenzy/config';
import type { Item, ServerState } from '@game/frenzy/types';

import { pickItemType } from './pick-item-type';

export interface EmissionResult {
  state: ServerState;
  /** Newly emitted items, so the caller can broadcast a `spawned` event per item. */
  spawned: Item[];
}

/**
 * Easter-egg emissions: each alive Pokémon under the `laying` aura has a per-tick chance to spray out a random
 * falling item (any type, incl. bombs). The item spawns at the layer's lower-rear — offset behind its heading and
 * below its centre — and is launched backward (opposite the heading), so it flings out behind rather than dropping
 * from the centre. Emitted items carry `ownerId`, so the layer is immune to them (collision and bomb blast skip the
 * owner). Pure — `rng` and `createId` are injected for tests.
 */
export function applyEmissions(
  state: ServerState,
  rng: () => number = Math.random,
  createId: () => string = () => crypto.randomUUID(),
): EmissionResult {
  const spawned: Item[] = [];
  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

  for (const player of state.players) {
    const isLaying = player.effects.some((effect) => effect.kind === 'laying');

    if (player.status !== 'alive' || !isLaying || rng() >= FRENZY.easterEgg.emitChancePerTick) {
      continue;
    }

    const type = pickItemType(rng);
    // Heading: +1 facing right, -1 facing left (default right when idle). Items fly the opposite way (behind).
    const heading = player.vx < 0 ? -1 : 1;

    spawned.push({
      id: createId(),
      type,
      x: clamp01(player.x - heading * FRENZY.easterEgg.emitBack),
      y: clamp01(player.y + FRENZY.easterEgg.emitDown),
      vx: -heading * FRENZY.easterEgg.emitBackSpeed,
      vy: FRENZY.fallSpeed[type],
      ownerId: player.id,
    });
  }

  if (spawned.length === 0) {
    return { state, spawned };
  }

  return { state: { ...state, items: [...state.items, ...spawned] }, spawned };
}
