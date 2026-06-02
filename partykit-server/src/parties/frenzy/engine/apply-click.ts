import { GAME } from '@game/frenzy/constants';
import type { EatenEvent, GameEvent, ServerState } from '@game/frenzy/types';

import { applyMassDeltas } from './apply-mass-deltas';
import { getItemBehavior } from './item-behaviors';

export interface ClickResult {
  state: ServerState;
  events: GameEvent[];
}

export function applyClick(
  state: ServerState,
  clickerId: string,
  itemId: string,
  nudgeX?: number,
  rng: () => number = Math.random,
): ClickResult {
  const item = state.items.find((candidate) => candidate.id === itemId);
  const clicker = state.players.find((candidate) => candidate.id === clickerId);

  if (item === undefined || clicker === undefined) {
    return { state, events: [] };
  }

  const interaction = getItemBehavior(item.type).onClick(item, clickerId, state, nudgeX, rng);

  // Juggle (bomb): no eating, no mass change — slide the item horizontally (clamped to the spawn range) and tell clients.
  if (interaction.nudgeX !== undefined && !interaction.consumed) {
    const [minX, maxX] = GAME.itemSpawnXRange;
    const x = Math.max(minX, Math.min(maxX, item.x + interaction.nudgeX));
    const items = state.items.map((candidate) =>
      candidate.id === itemId ? { ...candidate, x } : candidate,
    );

    return { state: { ...state, items }, events: [{ type: 'itemNudged', itemId, x }] };
  }

  const resolved = applyMassDeltas(state, interaction.massDeltas);
  const updatedClicker = resolved.state.players.find((candidate) => candidate.id === clickerId);
  const newMass = updatedClicker?.mass ?? 0;

  const eaten: EatenEvent = {
    type: 'eaten',
    itemId,
    itemType: item.type,
    playerId: clickerId,
    newMass,
    delta: newMass - clicker.mass,
    x: item.x,
    y: item.y,
  };

  const items = interaction.consumed
    ? resolved.state.items.filter((candidate) => candidate.id !== itemId)
    : resolved.state.items;

  return {
    state: { ...resolved.state, items },
    events: [eaten, ...resolved.events],
  };
}
