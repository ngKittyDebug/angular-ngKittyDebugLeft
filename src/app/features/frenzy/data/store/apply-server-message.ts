import type { ServerMessage, ServerState } from '@game/frenzy/types';

const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

export function applyServerMessage(
  previous: ServerState | null,
  message: ServerMessage,
): ServerState | null {
  switch (message.type) {
    case 'snapshot': {
      return message.state;
    }

    case 'spawned': {
      const base = previous ?? EMPTY_STATE;

      return { ...base, items: [...base.items, message.item] };
    }

    case 'eaten': {
      if (previous === null) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter((item) => item.id !== message.itemId),
        players: previous.players.map((player) => {
          if (player.id !== message.playerId) {
            return player;
          }

          return { ...player, mass: message.newMass };
        }),
      };
    }

    case 'evolved': {
      if (previous === null) {
        return previous;
      }

      return {
        ...previous,
        players: previous.players.map((player) => {
          if (player.id !== message.playerId) {
            return player;
          }

          return { ...player, stage: message.newStage };
        }),
      };
    }

    case 'fainted': {
      if (previous === null) {
        return previous;
      }

      return {
        ...previous,
        players: previous.players.filter((player) => player.id !== message.playerId),
      };
    }

    case 'rejoined': {
      return previous;
    }

    case 'roomFull': {
      return previous;
    }
  }
}
