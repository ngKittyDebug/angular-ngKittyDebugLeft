import { FRENZY } from '@game/frenzy/config';
import type { EatenEvent, GameEvent, Item, Player, ServerState } from '@game/frenzy/types';

import { applyEffects, resolveGrants } from './apply-effect';
import { applyHpDeltas } from './apply-hp-deltas';
import { itemFaintCause } from './faint-cause';
import { getItemBehavior } from './item-behaviors';
import type { ItemInteraction } from './item-behaviors';

export interface ClickResult {
  state: ServerState;
  events: GameEvent[];
}

/**
 * Effect pickup (shield/vitamin/easter egg): no eating — grant the timed effect, apply any heal hp delta it
 * carries (vitamin/egg heal; shield doesn't), drop the item, report `effectGranted` (+ any evolved/fainted).
 */
function grantEffectResult(
  state: ServerState,
  item: Item,
  interaction: ItemInteraction,
  now: number,
): ClickResult {
  const applications = resolveGrants(interaction.effects ?? [], now);
  const withEffects = applyEffects(state, applications);
  const resolved = applyHpDeltas(withEffects, interaction.hpDeltas, itemFaintCause(item));
  const items = interaction.consumed
    ? resolved.state.items.filter((candidate) => candidate.id !== item.id)
    : resolved.state.items;
  const events: GameEvent[] = [
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
 * Shove (bomb): no eating, no hp change — add the click's 2D inertial impulse to the bomb's drift, then cap the
 * total speed at `bomb.maxDriftSpeed` so repeated clicks can't fling it arbitrarily fast. The shared `vx`/`vy` is
 * what makes tug-of-war emergent: every player's click mutates the same velocity additively. Tell clients the new
 * position + velocity.
 */
function nudgeResult(
  state: ServerState,
  item: Item,
  clickerId: string,
  interaction: ItemInteraction,
): ClickResult {
  const cap = FRENZY.bomb.maxDriftSpeed;
  let vx = (item.vx ?? 0) + (interaction.nudgeX ?? 0);
  let vy = item.vy + (interaction.nudgeY ?? 0);
  const speed = Math.hypot(vx, vy);

  if (speed > cap && speed > 0) {
    vx = (vx / speed) * cap;
    vy = (vy / speed) * cap;
  }

  // Stamp the shover so a kill from this bomb's blast credits them in the obituary (last toucher wins a tug-of-war).
  const items = state.items.map((candidate) =>
    candidate.id === item.id ? { ...candidate, vx, vy, lastNudgedBy: clickerId } : candidate,
  );

  return {
    state: { ...state, items },
    events: [{ type: 'itemNudged', itemId: item.id, x: item.x, y: item.y, vx, vy }],
  };
}

/**
 * Eating (default path): apply the item's hp delta to the clicker, report `eaten` (+ any evolved/fainted) and
 * remove the item when consumed.
 */
function eatResult(
  state: ServerState,
  item: Item,
  clicker: Player,
  interaction: ItemInteraction,
): ClickResult {
  const resolved = applyHpDeltas(state, interaction.hpDeltas, itemFaintCause(item));
  const updatedClicker = resolved.state.players.find((candidate) => candidate.id === clicker.id);
  const newHp = updatedClicker?.hp ?? 0;

  const eaten: EatenEvent = {
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
 * Resolves a player's first click on an item: looks the item/clicker up, asks the item's behaviour what happens,
 * then dispatches to the matching path — effect pickup, bomb juggle or plain eating.
 */
export function applyClick(
  state: ServerState,
  clickerId: string,
  itemId: string,
  nudgeX?: number,
  nudgeY?: number,
  rng: () => number = Math.random,
  now: number = Date.now(),
): ClickResult {
  const item = state.items.find((candidate) => candidate.id === itemId);
  const clicker = state.players.find((candidate) => candidate.id === clickerId);

  if (item === undefined || clicker === undefined) {
    return { state, events: [] };
  }

  const interaction = getItemBehavior(item.type).onClick(
    item,
    clickerId,
    state,
    nudgeX,
    rng,
    nudgeY,
  );

  if (interaction.effects !== undefined && interaction.effects.length > 0) {
    return grantEffectResult(state, item, interaction, now);
  }

  if (interaction.nudgeX !== undefined && !interaction.consumed) {
    return nudgeResult(state, item, clickerId, interaction);
  }

  return eatResult(state, item, clicker, interaction);
}
