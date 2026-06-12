import { FRENZY } from '@game/frenzy/config';
import type { GameEvent, ServerState } from '@game/frenzy/types';

import { applyEffects, resolveGrants } from '../apply-effect';
import { applyHpDeltas } from '../apply-hp-deltas';
import { applyImpulses } from '../apply-impulses';
import { itemFaintCause } from '../faint-cause';
import { getItemBehavior } from '../item-behaviors';
import { findCollisionTarget } from './collision-target';
import { detonated } from './detonated';

export interface CollisionResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Collision pass: an item overlapping a drifting Pokémon resolves against the closest alive one. Resolution is
 * one-shot — a collided item is consumed, so a parked Pokémon can't be hit every tick. Effect pickups grant the
 * timed effect (reported `effectGranted`) plus any heal; bombs detonate over the whole area (`detonated`); plain
 * food is eaten (`eaten`). Consumed items are filtered out of the returned state. Iterates `state.items` as it
 * stood at entry (the engine sets it to the surviving items before calling this).
 */
export function resolveCollisions(
  state: ServerState,
  rng: () => number,
  now: number,
): CollisionResult {
  let working = state;
  const events: GameEvent[] = [];
  const collidedItemIds = new Set<string>();

  for (const item of state.items) {
    const onCollide = getItemBehavior(item.type).onCollide;

    if (onCollide === undefined) {
      continue;
    }

    // The bomb detonates on true contact (no catch assist) so it doesn't blow up half a body early; everything
    // else keeps the forgiving catch reach.
    const generosity =
      item.type === 'bomb'
        ? FRENZY.collision.bombCatchGenerosity
        : FRENZY.collision.catchGenerosity;
    const target = findCollisionTarget(item, working.players, generosity);

    if (target === undefined) {
      continue;
    }

    const interaction = onCollide(item, target, working, rng);

    // Effect pickup (shield/vitamin/easter egg) by drifting into it: grant the timed effect (report
    // `effectGranted`, not `eaten`) and apply any heal hp delta it carries. Vitamin/egg heal; shield doesn't.
    if (interaction.effects !== undefined && interaction.effects.length > 0) {
      const applications = resolveGrants(interaction.effects, now);

      working = applyEffects(working, applications);

      const resolved = applyHpDeltas(working, interaction.hpDeltas, itemFaintCause(item));

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

    const resolved = applyHpDeltas(working, interaction.hpDeltas, itemFaintCause(item));

    working = applyImpulses(resolved.state, interaction.impulses ?? []);

    if (interaction.explodes) {
      // A bomb that bumps a Pokémon detonates over the whole area — not a one-on-one "eat".
      events.push(detonated(item, interaction.hpDeltas));
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
