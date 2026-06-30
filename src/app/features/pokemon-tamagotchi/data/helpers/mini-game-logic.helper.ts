import type { MiniGameType } from '../../models/mini-game.model';

export interface ReflexTarget {
  createdAt: number;
  id: number;
  radius: number;
  x: number;
  y: number;
}

export function createReflexTarget(
  id: number,
  width: number,
  height: number,
  createdAt: number,
  radius = 24,
): ReflexTarget {
  const margin = radius + 8;

  return {
    createdAt,
    id,
    radius,
    x: margin + Math.random() * Math.max(1, width - margin * 2),
    y: margin + Math.random() * Math.max(1, height - margin * 2),
  };
}

export function isHitTarget(target: ReflexTarget, x: number, y: number): boolean {
  const distance = Math.hypot(target.x - x, target.y - y);

  return distance <= target.radius;
}

export function estimateReflexMaxScore(durationSeconds: number, spawnIntervalMs: number): number {
  return Math.max(1, Math.floor((durationSeconds * 1000) / spawnIntervalMs));
}

export function miniGameTypeLabel(gameType: MiniGameType): string {
  switch (gameType) {
    case 'memory':
      return 'memory';

    case 'pattern':
      return 'pattern';

    case 'timing':
      return 'timing';

    case 'reflex':
      return 'reflex';
  }
}
