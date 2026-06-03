import type { ServerMessage, ServerState } from '@game/frenzy/types';

const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

// A typed no-op for the switch's `default`: the `never` parameter enforces that every ServerMessage
// variant is handled above — a newly added one would fail to compile here, naming the missing type —
// while at runtime an unrecognized message simply leaves the state unchanged.
function ignoreUnhandledMessage(_message: never, state: ServerState | null): ServerState | null {
  return state;
}

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

    case 'itemNudged': {
      if (previous === null) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.map((item) => {
          if (item.id !== message.itemId) {
            return item;
          }

          return { ...item, x: message.x };
        }),
      };
    }

    case 'detonated': {
      if (previous === null) {
        return previous;
      }

      // Drop the bomb itself right away so its sprite doesn't linger until the next snapshot. FX + sound live
      // in the effects service; damaged-but-alive masses reconcile on the next snapshot, faints via their events.
      return {
        ...previous,
        items: previous.items.filter((item) => item.id !== message.itemId),
      };
    }

    case 'effectGranted': {
      if (previous === null) {
        return previous;
      }

      // Drop the consumed pickup at once and add/refresh the effect so the aura shows immediately
      // (one effect per kind — re-granting replaces it); the next snapshot reconciles either way.
      return {
        ...previous,
        items: previous.items.filter((item) => item.id !== message.itemId),
        players: previous.players.map((player) => {
          if (player.id !== message.playerId) {
            return player;
          }

          const effects = [
            ...player.effects.filter((effect) => effect.kind !== message.effect.kind),
            message.effect,
          ];

          return { ...player, effects };
        }),
      };
    }

    case 'rejoined': {
      return previous;
    }

    case 'roomFull': {
      return previous;
    }

    default: {
      return ignoreUnhandledMessage(message, previous);
    }
  }
}
