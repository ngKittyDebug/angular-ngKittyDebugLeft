import type { Player } from './types';

/**
 * The crown holder: the alive player with the highest hp (the hp-leader the leaderboard ranks first). Ties are
 * broken by id so an equal-hp pair never flips the crown back and forth. Shared by both sides so they always agree:
 * the server reads it from the PRE-tick players to award the bounty bonus on a crown kill, the client reads it from
 * the latest snapshot to draw the crown marker. Returns `null` when nobody is alive.
 */
export function crownIdOf(players: readonly Player[]): string | null {
  let crown: Player | null = null;

  for (const player of players) {
    if (player.status !== 'alive') {
      continue;
    }

    if (
      crown === null ||
      player.hp > crown.hp ||
      (player.hp === crown.hp && player.id < crown.id)
    ) {
      crown = player;
    }
  }

  return crown?.id ?? null;
}
