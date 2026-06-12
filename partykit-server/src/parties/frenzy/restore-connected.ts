import type { Player, ServerState } from '@game/frenzy/types';

export function restoreConnected(state: ServerState, playerId: string): ServerState {
  let changed = false;
  const players: Player[] = state.players.map((player) => {
    if (player.id !== playerId || player.status !== 'disconnected') {
      return player;
    }

    changed = true;

    return { ...player, status: 'alive', disconnectedAt: null };
  });

  if (!changed) {
    return state;
  }

  return { ...state, players };
}
