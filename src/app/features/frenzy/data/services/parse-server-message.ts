import type { ServerMessage } from '@game/frenzy/types';

// Compile-time completeness guard: adding a ServerMessage type without registering it here fails this Record,
// so the whitelist can't silently rot behind the contract (mirror of the wire-shape spec's exemplar trick).
const KNOWN_TYPE_FLAGS: Record<ServerMessage['type'], true> = {
  snapshot: true,
  slimSnapshot: true,
  spawned: true,
  eaten: true,
  evolved: true,
  fainted: true,
  itemNudged: true,
  detonated: true,
  effectGranted: true,
  bumped: true,
  steered: true,
  npcAngered: true,
  roomFull: true,
  joinRejected: true,
  joined: true,
  identifyRejected: true,
  rejoined: true,
  ping: true,
};

const KNOWN_TYPES: ReadonlySet<string> = new Set(Object.keys(KNOWN_TYPE_FLAGS));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// The two stateful messages drive the whole reducer — check their spine (state object with players/items arrays)
// so a truncated frame can't reach `applyServerMessage` as a plausible-but-broken snapshot.
function hasValidState(message: Record<string, unknown>): boolean {
  if (message['type'] !== 'snapshot' && message['type'] !== 'slimSnapshot') {
    return true;
  }

  const state = message['state'];

  return (
    isRecord(state) &&
    Array.isArray(state['players']) &&
    Array.isArray(state['items']) &&
    typeof state['tick'] === 'number'
  );
}

/**
 * Client mirror of the server's `parse-client-message` guard — the only place that trusts inbound wire data.
 * Deliberately LIGHT: it catches malformed JSON (which previously threw inside the socket's message listener),
 * non-object frames, unknown message types (deploy-skew: an older client just drops what it can't handle instead
 * of feeding it to the reducer) and a missing snapshot spine. Deep per-field validation is consciously skipped —
 * client and server deploy in lockstep from one repo, and the server is the trusted party.
 */
export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data) || typeof data['type'] !== 'string' || !KNOWN_TYPES.has(data['type'])) {
    return null;
  }

  if (!hasValidState(data)) {
    return null;
  }

  return data as unknown as ServerMessage;
}
