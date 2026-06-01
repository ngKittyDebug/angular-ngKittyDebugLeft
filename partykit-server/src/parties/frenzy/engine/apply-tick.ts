import { GAME } from '@game/frenzy/constants';
import type { GameEvent, Item, Player, ServerState } from '@game/frenzy/types';

import { applyMassDeltas } from './apply-mass-deltas';
import { getItemBehavior } from './item-behaviors';

export interface TickResult {
  state: ServerState;
  events: GameEvent[];
}

// Closest alive Pokémon whose centre is within the collision radius of the item (squared compare, no sqrt).
function findCollisionTarget(item: Item, players: readonly Player[]): Player | undefined {
  const maxDistanceSquared = GAME.collision.radius * GAME.collision.radius;
  let closest: Player | undefined;
  let closestDistanceSquared = maxDistanceSquared;

  for (const player of players) {
    if (player.status !== 'alive') {
      continue;
    }

    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < closestDistanceSquared) {
      closest = player;
      closestDistanceSquared = distanceSquared;
    }
  }

  return closest;
}

export function applyTick(
  state: ServerState,
  deltaSeconds: number,
  applyDecay: boolean,
): TickResult {
  const restDeltaMs = deltaSeconds * 1000;
  const movedItems = state.items.map((item) => {
    if (item.restMs !== undefined) {
      // Already on the floor — lying there (still edible) while its rest timer counts down.
      return { ...item, restMs: item.restMs - restDeltaMs };
    }

    const y = item.y + item.vy * deltaSeconds;

    if (y >= 1) {
      // Reached the floor: settle, stop falling, start the rest timer.
      return { ...item, y: 1, vy: 0, restMs: GAME.itemRestMs };
    }

    return { ...item, y };
  });
  const survivors = movedItems.filter((item) => item.restMs === undefined || item.restMs > 0);
  const expired = movedItems.filter((item) => item.restMs !== undefined && item.restMs <= 0);

  const zone = GAME.playerDriftZone;
  // Slow drift with wall bounce, applied every tick (not only on decay ticks).
  const movedPlayers = state.players.map((player) => {
    let { x, y, vx, vy } = player;

    x += vx * deltaSeconds;
    y += vy * deltaSeconds;

    if (x <= zone.minX) {
      x = zone.minX;
      vx = Math.abs(vx);
    }

    if (x >= zone.maxX) {
      x = zone.maxX;
      vx = -Math.abs(vx);
    }

    if (y <= zone.minY) {
      y = zone.minY;
      vy = Math.abs(vy);
    }

    if (y >= zone.maxY) {
      y = zone.maxY;
      vy = -Math.abs(vy);
    }

    return { ...player, x, y, vx, vy };
  });

  let working: ServerState = { ...state, items: survivors, players: movedPlayers };
  const events: GameEvent[] = [];

  // Collision pass: an item that overlaps a drifting Pokémon resolves against the closest alive one.
  // Resolution is one-shot — a collided item is consumed, so a parked Pokémon can't be hit every tick.
  const collidedItemIds = new Set<string>();

  for (const item of survivors) {
    const onCollide = getItemBehavior(item.type).onCollide;

    if (onCollide === undefined) {
      continue;
    }

    const target = findCollisionTarget(item, working.players);

    if (target === undefined) {
      continue;
    }

    const interaction = onCollide(item, target, working);
    const resolved = applyMassDeltas(working, interaction.massDeltas);
    const newMass = resolved.state.players.find((player) => player.id === target.id)?.mass ?? 0;

    working = resolved.state;

    events.push({
      type: 'eaten',
      itemId: item.id,
      itemType: item.type,
      playerId: target.id,
      newMass,
      delta: newMass - target.mass,
      x: item.x,
      y: item.y,
    });
    events.push(...resolved.events);

    if (interaction.consumed) {
      collidedItemIds.add(item.id);
    }
  }

  if (collidedItemIds.size > 0) {
    working = { ...working, items: working.items.filter((item) => !collidedItemIds.has(item.id)) };
  }

  for (const item of expired) {
    const onLand = getItemBehavior(item.type).onLand;

    if (onLand === undefined) {
      continue;
    }

    const resolved = applyMassDeltas(working, onLand(item, working).massDeltas);

    working = resolved.state;
    events.push(...resolved.events);
  }

  if (!applyDecay) {
    return { state: working, events };
  }

  const decaySurvivors: Player[] = [];

  for (const player of working.players) {
    const newMass = Math.max(0, player.mass - GAME.decayPerTick);

    if (newMass <= 0) {
      events.push({ type: 'fainted', playerId: player.id });
      continue;
    }

    decaySurvivors.push({ ...player, mass: newMass });
  }

  return { state: { ...working, players: decaySurvivors }, events };
}
