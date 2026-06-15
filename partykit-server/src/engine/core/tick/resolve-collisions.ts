import type { GameDefinition } from '@game/engine/definition';
import type { GameEvent, ServerState } from '@game/engine/types';

import { applyEffects, resolveGrants } from '../apply-effect';
import { applyHpDeltas } from '../apply-hp-deltas';
import { applyImpulses } from '../apply-impulses';
import { itemFaintCause } from '../faint-cause';
import { resolveInteraction } from '../../verbs';
import { findCollisionTarget } from './collision-target';
import { detonated } from './detonated';

export interface CollisionResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/**
 * Collision pass: an item overlapping a drifting player resolves against the closest alive one. Resolution is
 * one-shot — a collided item is consumed, so a parked player can't be hit every tick. Effect pickups grant the
 * timed effect (reported `effectGranted`) plus any heal; explosives detonate over the whole area (`detonated`);
 * plain food is eaten (`eaten`). Consumed items are filtered out of the returned state. Iterates `state.items` as
 * it stood at entry (the engine sets it to the surviving items before calling this).
 */
export function resolveCollisions<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  rng: () => number,
  now: number,
): CollisionResult<TItemId, TEffectId, TNpcId> {
  let working = state;
  const events: GameEvent<TItemId, TEffectId>[] = [];
  const collidedItemIds = new Set<string>();

  for (const item of state.items) {
    const definition = game.items[item.type];

    if (definition.interactions.onCollide === undefined) {
      continue;
    }

    // An item may override the forgiving catch reach via its physics (e.g. a mine's strict edge-to-edge contact —
    // it detonates on true touch, not half a body early).
    const generosity = definition.physics.catchGenerosity ?? game.collision.catchGenerosity;
    const target = findCollisionTarget(game, item, working.players, generosity);

    if (target === undefined) {
      continue;
    }

    const interaction = resolveInteraction(definition.interactions, 'onCollide', {
      item,
      state: working,
      effects: game.effects,
      takerId: target.id,
      rng,
    });

    if (interaction === undefined) {
      continue;
    }

    // Effect pickup by drifting into the item: grant the timed effect (report `effectGranted`, not `eaten`)
    // and apply any heal/damage hp delta it carries.
    if (interaction.effects !== undefined && interaction.effects.length > 0) {
      const applications = resolveGrants(interaction.effects, now);

      working = applyEffects(game, working, applications);

      const resolved = applyHpDeltas(game, working, interaction.hpDeltas, itemFaintCause(item));

      working = resolved.state;

      for (const application of applications) {
        events.push({
          type: 'effectGranted',
          playerId: application.playerId,
          effect: application.effect,
          itemId: item.id,
          x: item.x,
          y: item.y,
          via: 'collision',
        });
      }

      events.push(...resolved.events);

      if (interaction.consumed) {
        collidedItemIds.add(item.id);
      }

      continue;
    }

    const resolved = applyHpDeltas(game, working, interaction.hpDeltas, itemFaintCause(item));

    working = applyImpulses(resolved.state, interaction.impulses ?? []);

    if (interaction.explodes) {
      // An explosive that bumps a player detonates over the whole area — not a one-on-one "eat".
      events.push(detonated(item, interaction.hpDeltas, interaction.explodes.radius));
    } else {
      const newHp = resolved.state.players.find((player) => player.id === target.id)?.hp ?? 0;

      events.push({
        type: 'eaten',
        itemId: item.id,
        itemType: item.type,
        playerId: target.id,
        newHp,
        delta: newHp - target.hp,
        x: item.x,
        y: item.y,
        via: 'collision',
      });
    }

    events.push(...resolved.events);

    if (interaction.consumed) {
      collidedItemIds.add(item.id);
    }
  }

  if (collidedItemIds.size > 0) {
    working = { ...working, items: working.items.filter((item) => !collidedItemIds.has(item.id)) };
  }

  return { state: working, events };
}
