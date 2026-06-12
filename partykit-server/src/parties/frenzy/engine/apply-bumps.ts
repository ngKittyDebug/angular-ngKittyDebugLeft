import { FRENZY } from '@game/frenzy/config';
import type { GameEvent, ServerState } from '@game/frenzy/types';

import { applyHpDeltas } from './apply-hp-deltas';
import { bumpFaintCause } from './faint-cause';
import type { HpDelta } from './item-behaviors';
import type { BumpDamage } from './tick/separate-players';

export interface BumpResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Applies collision (bump) damage produced by the separation pass, reusing `applyHpDeltas` so fainting, stage
 * recompute and shield-warding stay single-sourced. Each victim's killer is its own rammer, so the cause is
 * resolved per player (`bumpFaintCause`) — a bump that finishes a Pokémon off surfaces a `fainted` event naming the
 * culprit, exactly like a thrown item. Survivors get a `bumped` float event; the fatal ones get their `fainted`
 * quip instead (so a Pokémon never shows both). Pure — a no-op for an empty bump list.
 */
export function applyBumpDamage(state: ServerState, bumps: readonly BumpDamage[]): BumpResult {
  if (bumps.length === 0) {
    return { state, events: [] };
  }

  const hpDeltas: HpDelta[] = bumps.map((bump) => ({
    playerId: bump.playerId,
    amount: FRENZY.playerCollision.bumpDamage,
  }));
  const killerByVictim = new Map(bumps.map((bump) => [bump.playerId, bump.killerId]));
  const resolved = applyHpDeltas(state, hpDeltas, (playerId) => {
    const killerId = killerByVictim.get(playerId);

    return killerId === undefined ? undefined : bumpFaintCause(killerId);
  });

  const events: GameEvent[] = [...resolved.events];
  const floated = new Set<string>();

  // One float per surviving victim (deduped — a body rammed by two rivals still floats once). A victim removed by
  // the hit isn't in the post-damage state, so it gets its `fainted`/obituary line above instead of a bump quip.
  for (const victimId of killerByVictim.keys()) {
    if (!floated.has(victimId) && resolved.state.players.some((player) => player.id === victimId)) {
      floated.add(victimId);
      events.push({ type: 'bumped', playerId: victimId });
    }
  }

  return { state: resolved.state, events };
}
