import { isLine } from '@game/frenzy/lines';
import type { ClientMessage } from '@game/frenzy/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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
      return typeof data.name === 'string' && data.name.trim().length > 0 && isLine(data.line)
        ? { type: 'join', name: data.name, line: data.line }
        : null;
    }
    case 'click': {
      return isNonEmptyString(data.itemId) ? { type: 'click', itemId: data.itemId } : null;
    }
    case 'leave': {
      return { type: 'leave' };
    }
    default: {
      return null;
    }
  }
}
