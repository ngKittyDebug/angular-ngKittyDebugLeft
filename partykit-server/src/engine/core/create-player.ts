import type { GameDefinition } from '@game/engine/definition';
import type { Player, PlayerBody, PlayerEffect } from '@game/engine/types';

import { calculateStage } from './calculate-stage';

/**
 * Spawn-protection ward from `GameDefinition.spawnEffects.onJoin`: a brief effect granted on join/respawn so a
 * fresh player can't be killed the instant it appears. Only consulted at creation, so a network-blip reconnect
 * (which restores the existing player, not re-creates) gets none. No grant declared → spawn bare.
 */
function spawnJoinEffects<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  now: number,
): PlayerEffect<TEffectId>[] {
  const grant = game.spawnEffects?.onJoin;

  return grant === undefined ? [] : [{ kind: grant.effectId, expiresAt: now + grant.durationMs }];
}

export interface CreatePlayerInput<
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  name: string;
  appearance: string;
  body: PlayerBody;
  now: number;
  existingPlayers?: readonly Player<TEffectId, TNpcId>[];
  rng?: () => number;
  // Public player id generator, injectable for deterministic tests. The id is broadcast in every snapshot, so it
  // must NOT be the session token (issue #124) — the room adapter keeps the token→id mapping private.
  createId?: () => string;
}

interface Point {
  x: number;
  y: number;
}

function randomPointInZone(
  zone: { minX: number; maxX: number; minY: number; maxY: number },
  rng: () => number,
): Point {
  const { minX, maxX, minY, maxY } = zone;

  return {
    x: minX + rng() * (maxX - minX),
    y: minY + rng() * (maxY - minY),
  };
}

function isFarEnough<TEffectId extends string, TNpcId extends string>(
  point: Point,
  others: readonly Player<TEffectId, TNpcId>[],
  minDistance: number,
): boolean {
  return others.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= minDistance);
}

// Best-effort: try a few random points and keep the first that is not too close to an existing
// player. On a crowded scene the attempts run out — fall back to the last point so spawning never hangs.
function pickSpawnPoint<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  existingPlayers: readonly Player<TEffectId, TNpcId>[],
  rng: () => number,
): Point {
  let point = randomPointInZone(game.player.driftZone, rng);

  for (let attempt = 1; attempt < game.player.spawnMaxAttempts; attempt += 1) {
    if (isFarEnough(point, existingPlayers, game.player.spawnMinDistance)) {
      return point;
    }

    point = randomPointInZone(game.player.driftZone, rng);
  }

  return point;
}

export function createPlayer<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  {
    name,
    appearance,
    body,
    now,
    existingPlayers = [],
    rng = Math.random,
    createId = () => crypto.randomUUID(),
  }: CreatePlayerInput<TEffectId, TNpcId>,
): Player<TEffectId, TNpcId> {
  const { x, y } = pickSpawnPoint(game, existingPlayers, rng);
  const angle = rng() * Math.PI * 2;
  // Stage and cruising speed come from the player's own descriptor, not a global — startingHp picks the entry
  // stage via its hp gates, and that stage's `speed` sets the initial drift magnitude.
  const stage = calculateStage(game.hp.startingHp, body);
  const speed = body[stage].speed;

  return {
    kind: 'human',
    id: createId(),
    name,
    appearance,
    body,
    stage,
    hp: game.hp.startingHp,
    mana: 0,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    effects: spawnJoinEffects(game, now),
    // Sparse by contract (`Partial<Record<ScoreKind, number>>`): start empty — every reader coalesces a missing
    // axis to 0, so there's nothing to seed and nothing to keep in sync with `ScoreKind` here.
    scores: {},
  };
}
