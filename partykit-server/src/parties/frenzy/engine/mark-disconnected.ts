import type { Player, ServerState } from '@game/frenzy/types';

export function markDisconnected(
  state: ServerState,
  sessionToken: string,
  now: number,
): ServerState {
  let changed = false;
  const players: Player[] = state.players.map((player) => {
    if (player.id !== sessionToken || player.status !== 'alive') {
      return player;
    }

    changed = true;

    return { ...player, status: 'disconnected', disconnectedAt: now };
  });

  if (!changed) {
    return state;
  }

  return { ...state, players };
}
