import type { GameDefinition } from '@game/engine/definition';
import type { GameEvent, ServerState } from '@game/engine/types';

import { applyHpDeltas } from './apply-hp-deltas';
import { contactRamSpec, damageDealtMultiplier } from './effect-modifiers';
import { bumpFaintCause } from './faint-cause';
import type { HpDelta } from '../verbs';
import type { BumpDamage } from './tick/separate-players';

export interface BumpResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/**
 * Applies collision (bump) damage produced by the separation pass, reusing `applyHpDeltas` so fainting, stage
 * recompute and damage-warding stay single-sourced. The per-bump amount: a rammer with a `contactRam` aura (cactus)
 * deals ITS OWN split damage — `ramDamage` on a hard ram, `scratchDamage` on a gentle scratch — overriding the
 * generic `bumpDamage`; anyone else deals `bumpDamage` scaled by their `damageDealt.bump` multipliers (the victim's
 * `damageTaken.bump` applies inside `applyHpDeltas`). A rammer no longer in the state deals the unscaled base. Each
 * victim's killer is its own rammer, so the cause is
 * resolved per player (`bumpFaintCause`) — a bump that finishes a player off surfaces a `fainted` event naming the
 * culprit, exactly like a thrown item. Survivors get a `bumped` event carrying the net hp they lost (so the client
 * floats the number); the fatal ones get their `fainted` quip instead (so a player never shows both). Pure — a
 * no-op for an empty bump list.
 */
export function applyBumpDamage<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  bumps: readonly BumpDamage[],
): BumpResult<TItemId, TEffectId, TNpcId> {
  if (bumps.length === 0) {
    return { state, events: [] };
  }

  const playerById = new Map(state.players.map((player) => [player.id, player]));
  const hpDeltas: HpDelta[] = bumps.map((bump) => {
    const rammer = playerById.get(bump.killerId);
    const contact = rammer === undefined ? undefined : contactRamSpec(game.effects, rammer.effects);
    const amount =
      contact !== undefined
        ? bump.scratch
          ? contact.scratchDamage
          : contact.ramDamage
        : game.playerCollision.bumpDamage *
          (rammer === undefined ? 1 : damageDealtMultiplier(game.effects, rammer.effects, 'bump'));

    return { playerId: bump.playerId, amount, source: 'bump' };
  });

  // Per-victim total of the dealt amounts — what the `bumped` float shows. A body rammed by two rivals floats once
  // with the summed hit. No bump victim is bump-warded (warded ones are dropped in the separation pass), so the
  // dealt amount equals the net hp lost; the snapshot still reconciles the bar.
  const damageByVictim = new Map<string, number>();

  for (const delta of hpDeltas) {
    damageByVictim.set(delta.playerId, (damageByVictim.get(delta.playerId) ?? 0) + delta.amount);
  }

  const killerByVictim = new Map(bumps.map((bump) => [bump.playerId, bump.killerId]));
  const resolved = applyHpDeltas(game, state, hpDeltas, (playerId) => {
    const killerId = killerByVictim.get(playerId);

    return killerId === undefined ? undefined : bumpFaintCause(killerId);
  });

  const events: GameEvent<TItemId, TEffectId>[] = [...resolved.events];
  const floated = new Set<string>();

  // One float per surviving victim (deduped — a body rammed by two rivals still floats once). A victim removed by
  // the hit isn't in the post-damage state, so it gets its `fainted`/obituary line above instead of a bump quip.
  for (const victimId of killerByVictim.keys()) {
    if (!floated.has(victimId) && resolved.state.players.some((player) => player.id === victimId)) {
      floated.add(victimId);
      events.push({
        type: 'bumped',
        playerId: victimId,
        amount: damageByVictim.get(victimId) ?? 0,
      });
    }
  }

  return { state: resolved.state, events };
}
