import type { PlayerEffect, PlayerEffectKind, ServerState } from '@game/frenzy/types';

import type { EffectGrant } from './item-behaviors';

// Mutually exclusive auras: a Pokémon can't be both laying (easter egg) and pooping at once — granting one clears
// the other, so they never coexist (and `applyEmissions` never has to choose between two emit auras).
const EXCLUSIVE_WITH: Partial<Record<PlayerEffectKind, PlayerEffectKind>> = {
  laying: 'pooping',
  pooping: 'laying',
};

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
 * existing one, so a fresh pickup tops the timer up rather than stacking duplicate auras. A grant also clears any
 * aura it is mutually exclusive with (laying ↔ pooping), so those two never coexist on one Pokémon.
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

    const replaced = new Set<PlayerEffectKind>();

    for (const next of incoming) {
      replaced.add(next.kind);

      const exclusive = EXCLUSIVE_WITH[next.kind];

      if (exclusive !== undefined) {
        replaced.add(exclusive);
      }
    }

    const kept = player.effects.filter((existing) => !replaced.has(existing.kind));

    return { ...player, effects: [...kept, ...incoming] };
  });

  return { ...state, players };
}
