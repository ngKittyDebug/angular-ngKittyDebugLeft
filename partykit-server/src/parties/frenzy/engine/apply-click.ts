import type { EatenEvent, GameEvent, ServerState } from '@game/frenzy/types';

import { applyMassDeltas } from './apply-mass-deltas';
import { getItemBehavior } from './item-behaviors';

export interface ClickResult {
  state: ServerState;
  events: GameEvent[];
}

export function applyClick(state: ServerState, clickerId: string, itemId: string): ClickResult {
  const item = state.items.find((candidate) => candidate.id === itemId);
  const clicker = state.players.find((candidate) => candidate.id === clickerId);

  if (item === undefined || clicker === undefined) {
    return { state, events: [] };
  }

  const interaction = getItemBehavior(item.type).onClick(item, clickerId, state);
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
