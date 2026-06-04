import { GAME } from '@game/frenzy/constants';
import type { Player } from '@game/frenzy/types';

export interface CreatePlayerInput {
  sessionToken: string;
  name: string;
  appearance: string;
  now: number;
  existingPlayers?: readonly Player[];
  rng?: () => number;
}

interface Point {
  x: number;
  y: number;
}

function randomPointInZone(rng: () => number): Point {
  const { minX, maxX, minY, maxY } = GAME.playerDriftZone;

  return {
    x: minX + rng() * (maxX - minX),
    y: minY + rng() * (maxY - minY),
  };
}

function isFarEnough(point: Point, others: readonly Player[]): boolean {
  return others.every(
    (other) => Math.hypot(point.x - other.x, point.y - other.y) >= GAME.playerSpawnMinDistance,
  );
}

// Best-effort: try a few random points and keep the first that is not too close to an existing
// Pokémon. On a crowded scene the attempts run out — fall back to the last point so spawning never hangs.
function pickSpawnPoint(existingPlayers: readonly Player[], rng: () => number): Point {
  let point = randomPointInZone(rng);

  for (let attempt = 1; attempt < GAME.playerSpawnMaxAttempts; attempt += 1) {
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
  now,
  existingPlayers = [],
  rng = Math.random,
}: CreatePlayerInput): Player {
  const { x, y } = pickSpawnPoint(existingPlayers, rng);
  const angle = rng() * Math.PI * 2;

  return {
    id: sessionToken,
    name,
    appearance,
    stage: 1,
    mass: GAME.startingMass,
    x,
    y,
    vx: Math.cos(angle) * GAME.playerDriftSpeed,
    vy: Math.sin(angle) * GAME.playerDriftSpeed,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    effects: [],
  };
}
