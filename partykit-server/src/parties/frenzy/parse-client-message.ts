import type { ClientMessage } from '@game/frenzy/types';

// Max length of the opaque appearance id — bounds garbage without coupling the server to the client's roster.
const APPEARANCE_MAX_LENGTH = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// The server doesn't know the Pokémon roster — it only checks the appearance is a sane, bounded string and
// relays it. The client maps it to a sprite (with a fallback for ids it doesn't recognise).
function isAppearance(value: unknown): value is string {
  return isNonEmptyString(value) && value.length <= APPEARANCE_MAX_LENGTH;
}

// The only place that trusts wire data: JSON.parse + shape validation.
// Handlers in index.ts receive an already-typed ClientMessage and don't re-check.
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data)) {
    return null;
  }

  switch (data.type) {
    case 'identify': {
      return isNonEmptyString(data.sessionToken)
        ? { type: 'identify', sessionToken: data.sessionToken }
        : null;
    }
    case 'join': {
      return typeof data.name === 'string' &&
        data.name.trim().length > 0 &&
        isAppearance(data.appearance)
        ? { type: 'join', name: data.name, appearance: data.appearance }
        : null;
    }
    case 'click': {
      if (!isNonEmptyString(data.itemId)) {
        return null;
      }

      const nudgeX =
        typeof data.nudgeX === 'number' && Number.isFinite(data.nudgeX) ? data.nudgeX : undefined;

      return { type: 'click', itemId: data.itemId, nudgeX };
    }
    case 'steer': {
      return typeof data.x === 'number' &&
        Number.isFinite(data.x) &&
        typeof data.y === 'number' &&
        Number.isFinite(data.y)
        ? { type: 'steer', x: data.x, y: data.y }
        : null;
    }
    case 'leave': {
      return { type: 'leave' };
    }
    default: {
      return null;
    }
  }
}
