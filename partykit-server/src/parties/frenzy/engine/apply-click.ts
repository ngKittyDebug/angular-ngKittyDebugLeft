import { FRENZY } from '@game/frenzy/config';
import type { EatenEvent, GameEvent, Item, Player, ServerState } from '@game/frenzy/types';

import { applyEffects, resolveGrants } from './apply-effect';
import { applyHpDeltas } from './apply-hp-deltas';
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
  itemId: string,
  interaction: ItemInteraction,
  now: number,
): ClickResult {
  const applications = resolveGrants(interaction.effects ?? [], now);
  const withEffects = applyEffects(state, applications);
  const resolved = applyHpDeltas(withEffects, interaction.hpDeltas);
  const items = interaction.consumed
    ? resolved.state.items.filter((candidate) => candidate.id !== itemId)
    : resolved.state.items;
  const events: GameEvent[] = [
    ...applications.map((application) => ({
      type: 'effectGranted' as const,
      playerId: application.playerId,
      effect: application.effect,
      itemId,
    })),
    ...resolved.events,
  ];

  return { state: { ...resolved.state, items }, events };
}

/**
 * Juggle (bomb): no eating, no hp change — slide the item horizontally (clamped to the spawn range) and tell clients.
 */
function nudgeResult(state: ServerState, item: Item, interaction: ItemInteraction): ClickResult {
  const [minX, maxX] = FRENZY.itemSpawnXRange;
  const x = Math.max(minX, Math.min(maxX, item.x + (interaction.nudgeX ?? 0)));
  const items = state.items.map((candidate) =>
    candidate.id === item.id ? { ...candidate, x } : candidate,
  );

  return { state: { ...state, items }, events: [{ type: 'itemNudged', itemId: item.id, x }] };
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
  const resolved = applyHpDeltas(state, interaction.hpDeltas);
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
  rng: () => number = Math.random,
  now: number = Date.now(),
): ClickResult {
  const item = state.items.find((candidate) => candidate.id === itemId);
  const clicker = state.players.find((candidate) => candidate.id === clickerId);

  if (item === undefined || clicker === undefined) {
    return { state, events: [] };
  }

  const interaction = getItemBehavior(item.type).onClick(item, clickerId, state, nudgeX, rng);

  if (interaction.effects !== undefined && interaction.effects.length > 0) {
    return grantEffectResult(state, itemId, interaction, now);
  }

  if (interaction.nudgeX !== undefined && !interaction.consumed) {
    return nudgeResult(state, item, interaction);
  }

  return eatResult(state, item, clicker, interaction);
}
