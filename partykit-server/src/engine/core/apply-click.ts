import type { GameDefinition } from '@game/engine/definition';
import type { EatenEvent, GameEvent, Item, Player, ServerState } from '@game/engine/types';

import { applyEffects, resolveGrants } from './apply-effect';
import { applyHpDeltas } from './apply-hp-deltas';
import { applyImpulses } from './apply-impulses';
import { itemFaintCause } from './faint-cause';
import { detonated } from './tick/detonated';
import { resolveInteraction } from '../verbs';
import type { ItemInteraction } from '../verbs';

export interface ClickResult<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  state: ServerState<TItemId, TEffectId, TNpcId>;
  events: GameEvent<TItemId, TEffectId>[];
}

/**
 * Effect pickup: no eating — grant the timed effect, apply any heal/damage hp delta it carries, drop the item,
 * report `effectGranted` (+ any evolved/fainted).
 */
function grantEffectResult<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  interaction: ItemInteraction<TEffectId>,
  now: number,
): ClickResult<TItemId, TEffectId, TNpcId> {
  const applications = resolveGrants(interaction.effects ?? [], now);
  const withEffects = applyEffects(game, state, applications);
  const resolved = applyHpDeltas(game, withEffects, interaction.hpDeltas, itemFaintCause(item));
  const items = interaction.consumed
    ? resolved.state.items.filter((candidate) => candidate.id !== item.id)
    : resolved.state.items;
  const events: GameEvent<TItemId, TEffectId>[] = [
    ...applications.map((application) => ({
      type: 'effectGranted' as const,
      playerId: application.playerId,
      effect: application.effect,
      itemId: item.id,
      x: item.x,
      y: item.y,
      via: 'click' as const,
    })),
    ...resolved.events,
  ];

  return { state: { ...resolved.state, items }, events };
}

/**
 * Shove (nudge verb): no eating, no hp change — add the click's 2D inertial impulse to the item's drift, then cap
 * the total speed at the nudge spec's `maxDriftSpeed` so repeated clicks can't fling it arbitrarily fast. The shared
 * `vx`/`vy` is what makes tug-of-war emergent: every player's click mutates the same velocity additively. Tell
 * clients the new position + velocity.
 */
function nudgeResult<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  state: ServerState<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  clickerId: string,
  interaction: ItemInteraction<TEffectId>,
  cap: number,
): ClickResult<TItemId, TEffectId, TNpcId> {
  let vx = (item.vx ?? 0) + (interaction.nudgeX ?? 0);
  let vy = item.vy + (interaction.nudgeY ?? 0);
  const speed = Math.hypot(vx, vy);

  if (speed > cap && speed > 0) {
    vx = (vx / speed) * cap;
    vy = (vy / speed) * cap;
  }

  // Stamp the shover so a kill from this item's blast credits them in the obituary (last toucher wins a tug-of-war).
  // Also spend one of the hidden click budget; once it hits the last one the next click detonates instead of
  // nudging (the budget redirect in resolveInteraction). An aura-emitted explosive has no budget (undefined) and stays untouched here.
  const clicksLeft = item.clicksLeft !== undefined ? item.clicksLeft - 1 : undefined;
  const items = state.items.map((candidate) =>
    candidate.id === item.id
      ? {
          ...candidate,
          vx,
          vy,
          lastNudgedBy: clickerId,
          clicksLeft,
        }
      : candidate,
  );

  return {
    state: { ...state, items },
    events: [{ type: 'itemNudged', itemId: item.id, x: item.x, y: item.y, vx, vy, clicksLeft }],
  };
}

/**
 * Eating (default path): apply the item's hp delta to the clicker, report `eaten` (+ any evolved/fainted) and
 * remove the item when consumed.
 */
function eatResult<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  clicker: Player<TEffectId, TNpcId>,
  interaction: ItemInteraction<TEffectId>,
): ClickResult<TItemId, TEffectId, TNpcId> {
  const resolved = applyHpDeltas(game, state, interaction.hpDeltas, itemFaintCause(item));
  const updatedClicker = resolved.state.players.find((candidate) => candidate.id === clicker.id);
  const newHp = updatedClicker?.hp ?? 0;

  const eaten: EatenEvent<TItemId> = {
    type: 'eaten',
    itemId: item.id,
    itemType: item.type,
    playerId: clicker.id,
    newHp,
    delta: newHp - clicker.hp,
    x: item.x,
    y: item.y,
    via: 'click',
  };

  const items = interaction.consumed
    ? resolved.state.items.filter((candidate) => candidate.id !== item.id)
    : resolved.state.items;

  return { state: { ...resolved.state, items }, events: [eaten, ...resolved.events] };
}

/**
 * Click detonation: the click that spent the item's last budget blows it up — a third trigger alongside
 * collision and landing. Mirrors `resolveLandings`: apply the blast hp deltas, then its radial knockback impulses,
 * drop the item and report a `detonated` event ahead of any faints from the deltas.
 */
function detonateClickResult<
  TItemId extends string,
  TEffectId extends string,
  TNpcId extends string,
>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  item: Item<TItemId>,
  interaction: ItemInteraction<TEffectId>,
  radius: number,
): ClickResult<TItemId, TEffectId, TNpcId> {
  const resolved = applyHpDeltas(game, state, interaction.hpDeltas, itemFaintCause(item));
  const withImpulses = applyImpulses(resolved.state, interaction.impulses ?? []);
  const items = withImpulses.items.filter((candidate) => candidate.id !== item.id);

  return {
    state: { ...withImpulses, items },
    events: [detonated(item, interaction.hpDeltas, radius), ...resolved.events],
  };
}

/**
 * Resolves a player's first click on an item: looks the item/clicker up, resolves the item's `onClick` verb
 * descriptor, then dispatches to the matching path — effect pickup, click detonation, shove or plain eating.
 */
export function applyClick<TItemId extends string, TEffectId extends string, TNpcId extends string>(
  game: GameDefinition<TItemId, TEffectId, TNpcId>,
  state: ServerState<TItemId, TEffectId, TNpcId>,
  clickerId: string,
  itemId: string,
  nudgeX?: number,
  nudgeY?: number,
  rng: () => number = Math.random,
  now: number = Date.now(),
): ClickResult<TItemId, TEffectId, TNpcId> {
  const item = state.items.find((candidate) => candidate.id === itemId);
  const clicker = state.players.find((candidate) => candidate.id === clickerId);

  if (item === undefined || clicker === undefined) {
    return { state, events: [] };
  }

  const definition = game.items[item.type];
  const interaction = resolveInteraction(definition.interactions, 'onClick', {
    item,
    state,
    effects: game.effects,
    takerId: clickerId,
    rng,
    nudgeX,
    nudgeY,
  });

  if (interaction === undefined) {
    return { state, events: [] };
  }

  if (interaction.effects !== undefined && interaction.effects.length > 0) {
    return grantEffectResult(game, state, item, interaction, now);
  }

  if (interaction.explodes) {
    return detonateClickResult(game, state, item, interaction, interaction.explodes.radius);
  }

  if (interaction.nudgeX !== undefined && !interaction.consumed) {
    const onClick = definition.interactions.onClick;

    // A nudging interaction can only come from the nudge resolver, whose spec carries the drift-speed cap —
    // anything else here means the dispatch and the descriptors disagree, so fail fast (toInventory style).
    if (onClick.verb !== 'nudge') {
      throw new Error(`Item '${item.type}' produced a nudge without a nudge onClick descriptor`);
    }

    return nudgeResult(state, item, clickerId, interaction, onClick.maxDriftSpeed);
  }

  return eatResult(game, state, item, clicker, interaction);
}
