import type { Player } from '@game/frenzy/types';

/**
 * Read-only view of server state handed to each effect handler so it can stay a pure adapter
 * (`message + context → floats/sounds`) instead of reaching into `FrenzyStore` itself.
 */
export interface EffectContext {
  myId: string | null;
  players: readonly Player[];
  playerById(id: string): Player | undefined;
}

/** True when the given player is the local player. */
export function isMine(playerId: string, context: EffectContext): boolean {
  return playerId === context.myId;
}
