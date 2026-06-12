import type { ClientMessage, PlayerBody, Stage } from '@game/frenzy/types';

const STAGES: readonly Stage[] = [1, 2, 3];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// Form check only: a per-stage body has stages 1/2/3, each with five finite numbers. Bounds/monotonicity are
// game policy, validated in `validate-join` so the join handler can answer with a specific `joinRejected` reason.
function isPlayerBodyShape(value: unknown): value is PlayerBody {
  if (!isRecord(value)) {
    return false;
  }

  return STAGES.every((stage) => {
    const stageBody = value[stage];

    return (
      isRecord(stageBody) &&
      isFiniteNumber(stageBody.width) &&
      isFiniteNumber(stageBody.height) &&
      isFiniteNumber(stageBody.speed) &&
      isFiniteNumber(stageBody.maxSpeed) &&
      isFiniteNumber(stageBody.hp)
    );
  });
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
      // Form only — name/appearance just have to be strings and `body` the right shape. Emptiness, length caps
      // and body bounds are policy checked in `validate-join`, which yields a user-facing `joinRejected` reason.
      return typeof data.name === 'string' &&
        typeof data.appearance === 'string' &&
        isPlayerBodyShape(data.body)
        ? { type: 'join', name: data.name, appearance: data.appearance, body: data.body }
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
