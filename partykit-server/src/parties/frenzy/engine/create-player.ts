import { FRENZY } from '@game/frenzy/config';
import type { Player, PlayerBody } from '@game/frenzy/types';

import { calculateStage } from './calculate-stage';

export interface CreatePlayerInput {
  sessionToken: string;
  name: string;
  appearance: string;
  body: PlayerBody;
  now: number;
  existingPlayers?: readonly Player[];
  rng?: () => number;
}

interface Point {
  x: number;
  y: number;
}

function randomPointInZone(rng: () => number): Point {
  const { minX, maxX, minY, maxY } = FRENZY.playerDriftZone;

  return {
    x: minX + rng() * (maxX - minX),
    y: minY + rng() * (maxY - minY),
  };
}

function isFarEnough(point: Point, others: readonly Player[]): boolean {
  return others.every(
    (other) => Math.hypot(point.x - other.x, point.y - other.y) >= FRENZY.playerSpawnMinDistance,
  );
}

// Best-effort: try a few random points and keep the first that is not too close to an existing
// Pokémon. On a crowded scene the attempts run out — fall back to the last point so spawning never hangs.
function pickSpawnPoint(existingPlayers: readonly Player[], rng: () => number): Point {
  let point = randomPointInZone(rng);

  for (let attempt = 1; attempt < FRENZY.playerSpawnMaxAttempts; attempt += 1) {
    if (isFarEnough(point, existingPlayers)) {
      return point;
    }

    point = randomPointInZone(rng);
  }

  return point;
}

export function createPlayer({
  sessionToken,
  name,
  appearance,
  body,
  now,
  existingPlayers = [],
  rng = Math.random,
}: CreatePlayerInput): Player {
  const { x, y } = pickSpawnPoint(existingPlayers, rng);
  const angle = rng() * Math.PI * 2;
  // Stage and cruising speed come from the player's own descriptor, not a global — startingHp picks the entry
  // stage via its hp gates, and that stage's `speed` sets the initial drift magnitude.
  const stage = calculateStage(FRENZY.startingHp, body);
  const speed = body[stage].speed;

  return {
    id: sessionToken,
    name,
    appearance,
    body,
    stage,
    hp: FRENZY.startingHp,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    // Spawn-protection ward: a brief shield on join/respawn so a fresh Pokémon can't be killed the instant it
    // appears. Reuses the regular `shield` effect (same decay/damage immunity + bubble aura), just a shorter window.
    // Only created here, so a network-blip reconnect (which restores the existing player, not re-creates) gets none.
    effects: [{ kind: 'shield', expiresAt: now + FRENZY.shield.spawnShieldMs }],
    // Sparse by contract (`Partial<Record<ScoreKind, number>>`): start empty — every reader coalesces a missing
    // axis to 0, so there's nothing to seed and nothing to keep in sync with `ScoreKind` here.
    scores: {},
  };
}
