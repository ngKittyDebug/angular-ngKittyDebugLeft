import { FRENZY } from '@game/frenzy/config';
import { STAGES } from '@game/frenzy/types';
import type { JoinRejectReason, PlayerBody, StageBody } from '@game/frenzy/types';

// Length cap of the opaque appearance id — bounds garbage without coupling the server to the client's roster.
const APPEARANCE_MAX_LENGTH = 32;
// Well-formed appearance id shape: a plain lowercase slug. Roster-agnostic (the server never enumerates the
// client's lines); it stops a tampered join smuggling a prototype-chain builtin name (constructor, __proto__,
// toString, ...) that the client would index into its sprite maps and break every peer's render. The slug rules
// out the underscore/uppercase builtins; the Object.prototype check also rejects `constructor`, a valid-looking slug.
const APPEARANCE_ID_PATTERN = /^[a-z0-9-]+$/;
// Max stored player-name length — mirrors the client input's maxlength (pokemon-picker) and is shared with the
// join adapter (index.ts) so the cap has one source. An over-long name is truncated to this there, not rejected.
export const NAME_MAX_LENGTH = 24;
// Sanity caps for the per-stage body the client authors: a sprite can't be larger than this many world px on an
// axis, and drift/steer speeds can't exceed this (normalized units/sec). Generous bounds — just anti-griefing.
const BODY_MAX_DIMENSION_PX = 300;
const BODY_MAX_SPEED = 0.3;

/** Game-policy bounds on one stage's descriptor (the numbers are already finite — `parse-client-message`). */
function isStageBodyInBounds(stageBody: StageBody): boolean {
  return (
    stageBody.width > 0 &&
    stageBody.width <= BODY_MAX_DIMENSION_PX &&
    stageBody.height > 0 &&
    stageBody.height <= BODY_MAX_DIMENSION_PX &&
    stageBody.speed > 0 &&
    stageBody.maxSpeed >= stageBody.speed &&
    stageBody.maxSpeed <= BODY_MAX_SPEED &&
    stageBody.hp >= 0 &&
    stageBody.hp <= FRENZY.maxHp
  );
}

/** Every stage in bounds, and the hp gates don't decrease across stages (a later stage can't be cheaper to reach). */
function isBodyValid(body: PlayerBody): boolean {
  if (!STAGES.every((stage) => isStageBodyInBounds(body[stage]))) {
    return false;
  }

  return body[1].hp <= body[2].hp && body[2].hp <= body[3].hp;
}

/** A plain-slug appearance id that names no Object.prototype member - defence in depth for the client's lookups. */
function isSafeAppearance(appearance: string): boolean {
  if (!APPEARANCE_ID_PATTERN.test(appearance)) {
    return false;
  }

  return !Object.hasOwn(Object.prototype, appearance);
}

/**
 * Game-policy validation of a (form-valid) join, returning the first failing reason or null if it's accepted.
 * Split from `parse-client-message` (which guarantees shape/types) so the join handler can answer a rejected
 * player with a specific, localizable `joinRejected` reason instead of silently dropping the message.
 */
export function validateJoin(
  name: string,
  appearance: string,
  body: PlayerBody,
): JoinRejectReason | null {
  if (name.trim().length === 0) {
    return 'invalidName';
  }

  if (appearance.length > APPEARANCE_MAX_LENGTH || !isSafeAppearance(appearance)) {
    return 'invalidAppearance';
  }

  if (!isBodyValid(body)) {
    return 'invalidBody';
  }

  return null;
}
