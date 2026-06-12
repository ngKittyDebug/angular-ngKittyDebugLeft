import type { Player } from '@game/frenzy/types';

/**
 * Drops lapsed effects from every player up front, so this tick's decay-skip and laying aura reflect only
 * effects still live at `now`. Returns the same player reference when nothing expired (no needless churn).
 */
export function pruneExpiredEffects(players: readonly Player[], now: number): Player[] {
  return players.map((player) => {
    const effects = player.effects.filter((effect) => effect.expiresAt > now);

    return effects.length === player.effects.length ? player : { ...player, effects };
  });
}
