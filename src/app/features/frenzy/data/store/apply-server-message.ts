import type {
  NpcAngeredMessage,
  Player,
  ServerMessage,
  ServerState,
  SlimServerState,
  SteeredMessage,
} from '@game/frenzy/types';

const EMPTY_STATE: ServerState = { players: [], items: [], tick: 0 };

// Patches one player by id, leaving everyone else (and an unknown id — e.g. an event for someone who joined
// between snapshots) untouched.
function patchPlayer(
  state: ServerState,
  playerId: string,
  patch: (player: Player) => Player,
): ServerState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? patch(player) : player)),
  };
}

// Room-level per-player delta messages (`steered`/`npcAngered`): each re-syncs a couple of fields on one player
// so the input shows at once instead of waiting for the scheduled snapshot. Split out of the main switch to keep
// it within its complexity budget (same move as `isStatelessMessage`).
function applyPlayerDelta(
  previous: ServerState | null,
  message: SteeredMessage | NpcAngeredMessage,
): ServerState | null {
  if (previous === null) {
    return previous;
  }

  if (message.type === 'steered') {
    // A steer re-syncs the authoritative position and the new drift velocity; the extrapolator re-anchors
    // from all four so the heading change shows at once (mirrors itemNudged for bombs).
    return patchPlayer(previous, message.playerId, (player) => ({
      ...player,
      x: message.x,
      y: message.y,
      vx: message.vx,
      vy: message.vy,
    }));
  }

  return patchPlayer(previous, message.npcId, (player) => ({ ...player, mana: message.mana }));
}

// Periodic slim snapshot: dynamic fields only — the static half (name/appearance/body/joinedAt, kind) merges in
// from the previously cached full player by id. Slim membership is authoritative (an absent player drops out,
// same as a full snapshot). An unknown id is dropped until the announcing full snapshot arrives — the server
// guarantees that full one precedes any slim referencing the id on the ordered socket, so this is a vanish-proof
// safety net, not the normal path. A pre-bootstrap slim (null previous) is ignored for the same reason.
function applySlimSnapshot(
  previous: ServerState | null,
  state: SlimServerState,
): ServerState | null {
  if (previous === null) {
    return previous;
  }

  const knownById = new Map(previous.players.map((player) => [player.id, player]));

  return {
    tick: state.tick,
    items: state.items,
    players: state.players.flatMap((slim) => {
      const known = knownById.get(slim.id);

      return known === undefined ? [] : [{ ...known, ...slim }];
    }),
  };
}

// A typed no-op for the switch's `default`: the `never` parameter enforces that every state-changing ServerMessage
// variant is handled above — a newly added one would fail to compile here, naming the missing type —
// while at runtime an unrecognized message simply leaves the state unchanged.
function ignoreUnhandledMessage(_message: never, state: ServerState | null): ServerState | null {
  return state;
}

// Messages that carry no game-state change: connection lifecycle (`rejoined`/`roomFull`/`joined`/
// `identifyRejected` — the latter two are handled in the store's message fan-out: my-id capture and token
// rotation), the join-refusal reason
// (recorded elsewhere in the store), the FX-only collision quip (`bumped` — its float lives in the effects service;
// the damaged-but-alive hp reconciles on the next snapshot, faints arrive via their own `fainted` event), and the
// liveness heartbeat (`ping`). Splitting them out as a type guard keeps the state switch within its complexity
// budget and lets its `never` default still prove every state-changing message is handled.
type StatelessMessage = Extract<
  ServerMessage,
  {
    type:
      'rejoined' | 'roomFull' | 'joinRejected' | 'joined' | 'identifyRejected' | 'bumped' | 'ping';
  }
>;

function isStatelessMessage(message: ServerMessage): message is StatelessMessage {
  return (
    message.type === 'rejoined' ||
    message.type === 'roomFull' ||
    message.type === 'joinRejected' ||
    message.type === 'joined' ||
    message.type === 'identifyRejected' ||
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

    case 'slimSnapshot': {
      return applySlimSnapshot(previous, message.state);
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

    case 'steered': {
      return applyPlayerDelta(previous, message);
    }

    case 'npcAngered': {
      return applyPlayerDelta(previous, message);
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
          // extrapolator re-anchors from the new vx/vy so the push — and any tug-of-war — shows at once. The
          // spent click budget rides along so the sensor-light danger speeds up on the shove, not a snapshot later.
          return {
            ...item,
            x: message.x,
            y: message.y,
            vx: message.vx,
            vy: message.vy,
            clicksLeft: message.clicksLeft ?? item.clicksLeft,
          };
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
