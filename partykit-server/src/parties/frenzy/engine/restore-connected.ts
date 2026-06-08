import type { Player, ServerState } from '@game/frenzy/types';

export function restoreConnected(state: ServerState, sessionToken: string): ServerState {
  let changed = false;
  const players: Player[] = state.players.map((player) => {
    if (player.id !== sessionToken || player.status !== 'disconnected') {
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
