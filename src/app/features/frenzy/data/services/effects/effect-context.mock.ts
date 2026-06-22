import type { Player, ServerState } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';

/**
 * Builds an `EffectContext` for specs, mirroring `FrenzyEffectsService.buildContext` so handler tests exercise the
 * same `message + context → floats/sounds` shape the orchestrator feeds at runtime.
 */
export function effectContext(options: {
  myId?: string | null;
  state?: ServerState | null;
}): EffectContext {
  const players: readonly Player[] = options.state?.players ?? [];

  return {
    myId: options.myId ?? null,
    players,
    playerById: (id) => players.find((player) => player.id === id),
  };
}
