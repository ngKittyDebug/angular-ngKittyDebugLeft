import type { Player } from '@game/engine/types';

/**
 * Drops lapsed effects from every player up front, so this tick's decay-skip and emission auras reflect only
 * effects still live at `now`. Returns the same player reference when nothing expired (no needless churn).
 */
export function pruneExpiredEffects<TEffectId extends string, TNpcId extends string>(
  players: readonly Player<TEffectId, TNpcId>[],
  now: number,
): Player<TEffectId, TNpcId>[] {
  return players.map((player) => {
    const effects = player.effects.filter((effect) => effect.expiresAt > now);

    return effects.length === player.effects.length ? player : { ...player, effects };
  });
}
