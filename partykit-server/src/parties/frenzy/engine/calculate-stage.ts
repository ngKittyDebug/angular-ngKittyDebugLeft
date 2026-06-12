import type { PlayerBody, Stage } from '@game/frenzy/types';

/**
 * The stage a Pokémon with `hp` is in, read from its own per-stage `hp` gates (highest stage whose gate it
 * meets). The server stays roster-agnostic: it doesn't know "evolve at 200/500" — those gates ride in on `join`
 * as `Player.body`. Stage 1's gate is the baseline (0), so this always returns a valid stage.
 */
export function calculateStage(hp: number, body: PlayerBody): Stage {
  if (hp >= body[3].hp) {
    return 3;
  }

  if (hp >= body[2].hp) {
    return 2;
  }

  return 1;
}
