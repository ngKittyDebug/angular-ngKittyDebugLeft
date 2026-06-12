import type { ScoreKind } from '../types';

/**
 * Session score weights. `totalScore` (see `../config`) is the weighted sum of a player's `scores` by axis:
 * `kills` — points per attributed kill; `crownKills` — EXTRA points on top of `kills` when the victim wore the
 * crown (so a crown kill is worth `kills + crownKills`), making dethroning the leader pay more; `timeAlive` —
 * points per second survived (a slow trickle so longevity matters but never outweighs active play). Tune here.
 */
export const SCORE = {
  score: {
    weights: { kills: 10, crownKills: 25, timeAlive: 0.1 } satisfies Record<ScoreKind, number>,
  },
} as const;
