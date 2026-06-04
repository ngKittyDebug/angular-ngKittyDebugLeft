import type { PlayerEffect, ServerState } from '@game/frenzy/types';

import type { EffectGrant } from './item-behaviors';

/** One concrete effect (absolute `expiresAt`) to apply to a player — `EffectGrant`'s `durationMs` resolved against the clock. */
export interface EffectApplication {
  playerId: string;
  effect: PlayerEffect;
}

/** Resolves grant durations against `now` into absolute-expiry applications the engine can apply and report. */
export function resolveGrants(grants: readonly EffectGrant[], now: number): EffectApplication[] {
  return grants.map((grant) => ({
    playerId: grant.playerId,
    effect: { kind: grant.kind, expiresAt: now + grant.durationMs },
  }));
}

/**
 * Adds (or refreshes) timed player effects. One effect per kind per player: re-granting a kind replaces the
 * existing one, so a fresh pickup tops the timer up rather than stacking duplicate auras.
 */
export function applyEffects(state: ServerState, applications: EffectApplication[]): ServerState {
  if (applications.length === 0) {
    return state;
  }

  const byPlayer = new Map<string, PlayerEffect[]>();

  for (const { playerId, effect } of applications) {
    const incoming = byPlayer.get(playerId) ?? [];

    incoming.push(effect);
    byPlayer.set(playerId, incoming);
  }

  const players = state.players.map((player) => {
    const incoming = byPlayer.get(player.id);

    if (incoming === undefined) {
      return player;
    }

    const kept = player.effects.filter(
      (existing) => !incoming.some((next) => next.kind === existing.kind),
    );

    return { ...player, effects: [...kept, ...incoming] };
  });

  return { ...state, players };
}
