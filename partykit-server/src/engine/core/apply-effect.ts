import type { GameDefinition } from '@game/engine/definition';
import type { PlayerEffect, ServerState } from '@game/engine/types';

import type { EffectGrant } from '../verbs';

/** One concrete effect (absolute `expiresAt`) to apply to a player — `EffectGrant`'s `durationMs` resolved against the clock. */
export interface EffectApplication<TEffectId extends string = string> {
  playerId: string;
  effect: PlayerEffect<TEffectId>;
}

/** Resolves grant durations against `now` into absolute-expiry applications the engine can apply and report. */
export function resolveGrants<TEffectId extends string>(
  grants: readonly EffectGrant<TEffectId>[],
  now: number,
): EffectApplication<TEffectId>[] {
  return grants.map((grant) => ({
    playerId: grant.playerId,
    effect: { kind: grant.kind, expiresAt: now + grant.durationMs },
  }));
}

/**
 * Adds (or refreshes) timed player effects. One effect per kind per player: re-granting a kind replaces the
 * existing one, so a fresh pickup tops the timer up rather than stacking duplicate auras. A grant also clears any
 * active effect sharing its definition's `exclusiveGroup`, so e.g. two emitting auras never coexist on one player.
 */
export function applyEffects<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  applications: EffectApplication<TEffectId>[],
): ServerState<TItemId, TEffectId, TNpcId> {
  if (applications.length === 0) {
    return state;
  }

  const exclusiveGroupOf = (kind: TEffectId): string | undefined =>
    game.effects[kind].exclusiveGroup;

  const byPlayer = new Map<string, PlayerEffect<TEffectId>[]>();

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

    const replacedKinds = new Set<TEffectId>();
    const replacedGroups = new Set<string>();

    for (const next of incoming) {
      replacedKinds.add(next.kind);

      const group = exclusiveGroupOf(next.kind);

      if (group !== undefined) {
        replacedGroups.add(group);
      }
    }

    const kept = player.effects.filter((existing) => {
      if (replacedKinds.has(existing.kind)) {
        return false;
      }

      const group = exclusiveGroupOf(existing.kind);

      return group === undefined || !replacedGroups.has(group);
    });

    return { ...player, effects: [...kept, ...incoming] };
  });

  return { ...state, players };
}
