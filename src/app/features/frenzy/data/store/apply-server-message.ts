import type { ServerMessage, ServerState } from '@game/frenzy/types';

const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

// A typed no-op for the switch's `default`: the `never` parameter enforces that every state-changing ServerMessage
// variant is handled above — a newly added one would fail to compile here, naming the missing type —
// while at runtime an unrecognized message simply leaves the state unchanged.
function ignoreUnhandledMessage(_message: never, state: ServerState | null): ServerState | null {
  return state;
}

// Messages that carry no game-state change: connection lifecycle (`rejoined`/`roomFull`), the join-refusal reason
// (recorded elsewhere in the store), the FX-only collision quip (`bumped` — its float lives in the effects service;
// the damaged-but-alive hp reconciles on the next snapshot, faints arrive via their own `fainted` event), and the
// liveness heartbeat (`ping`). Splitting them out as a type guard keeps the state switch within its complexity
// budget and lets its `never` default still prove every state-changing message is handled.
type StatelessMessage = Extract<
  ServerMessage,
  { type: 'rejoined' | 'roomFull' | 'joinRejected' | 'bumped' | 'ping' }
>;

function isStatelessMessage(message: ServerMessage): message is StatelessMessage {
  return (
    message.type === 'rejoined' ||
    message.type === 'roomFull' ||
    message.type === 'joinRejected' ||
    message.type === 'bumped' ||
    message.type === 'ping'
  );
}

export function applyServerMessage(
  previous: ServerState | null,
  message: ServerMessage,
): ServerState | null {
  if (isStatelessMessage(message)) {
    return previous;
  }

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

          return { ...player, hp: message.newHp };
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

          // A shove updates the bomb's 2D drift velocity (and re-syncs its authoritative position); the
          // extrapolator re-anchors from the new vx/vy so the push — and any tug-of-war — shows at once.
          return { ...item, x: message.x, y: message.y, vx: message.vx, vy: message.vy };
        }),
      };
    }

    case 'detonated': {
      if (previous === null) {
        return previous;
      }

      // Drop the bomb itself right away so its sprite doesn't linger until the next snapshot. FX + sound live
      // in the effects service; damaged-but-alive hpes reconcile on the next snapshot, faints via their events.
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

    default: {
      return ignoreUnhandledMessage(message, previous);
    }
  }
}
