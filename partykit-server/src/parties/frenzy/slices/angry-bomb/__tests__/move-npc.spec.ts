import { describe, expect, it } from 'vitest';

import { FRENZY } from '@game/frenzy/config';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type { Item, NpcPlayer } from '@game/frenzy/types';

import { moveNpc } from '../move-npc';

function makeNpc(overrides: Partial<NpcPlayer> = {}): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: 'npc-1',
    name: ANGRY_BOMB_NPC.appearance,
    appearance: ANGRY_BOMB_NPC.appearance,
    body: ANGRY_BOMB_NPC.body,
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.5,
    y: 0.2, // deliberately off the floor — moveNpc must snap it back
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
    ...overrides,
  };
}

function restingItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'food',
    x: 0.8,
    y: FRENZY.npc.floorY,
    vy: 0,
    restMs: 2000,
    ...overrides,
  };
}

const RETARGET = FRENZY.npc.retargetEveryTicks;

describe('moveNpc', () => {
  it('snaps an off-floor NPC into the sandy bob band around floorY', () => {
    const { amplitudeY } = FRENZY.npc.floorBob;
    const moved = moveNpc(makeNpc({ y: 0.1, vy: 0.5 }), [], 0.1, RETARGET);

    // y is pulled back to the seabed and only ever deviates within the bob amplitude (never leaves the sand).
    expect(moved.y).toBeGreaterThanOrEqual(FRENZY.npc.floorY - amplitudeY);
    expect(moved.y).toBeLessThanOrEqual(FRENZY.npc.floorY + amplitudeY);
  });

  it('bobs y across ticks instead of tracking a flat line', () => {
    const npc = makeNpc({ y: FRENZY.npc.floorY });
    const a = moveNpc(npc, [], 0.1, RETARGET);
    const b = moveNpc(npc, [], 0.1, RETARGET + 17);

    // Different ticks → different vertical positions (the wander), so the path is not a ruled horizontal line.
    expect(a.y).not.toBe(b.y);
  });

  it('steers toward the nearest resting edible on a retarget tick', () => {
    const npc = makeNpc({ x: 0.5 });
    const items = [restingItem({ x: 0.9 })];
    const moved = moveNpc(npc, items, 0.1, RETARGET);

    // Food is to the right → vx becomes positive and x advances toward it.
    expect(moved.vx).toBeGreaterThan(0);
    expect(moved.x).toBeGreaterThan(0.5);
  });

  it('ignores hazards and still-falling items as targets', () => {
    const npc = makeNpc({ x: 0.5 });
    const hazards = [
      restingItem({ id: 'rock', type: 'rock', x: 0.9 }),
      restingItem({ id: 'falling', type: 'food', x: 0.9, restMs: undefined }),
    ];
    const moved = moveNpc(npc, hazards, 0.1, RETARGET);

    // No seekable target → it cruises at the stage speed, not steering toward the rock/falling food.
    expect(Math.abs(moved.vx)).toBeCloseTo(npc.body[1].speed, 5);
  });

  it('does not re-pick a target on a non-retarget tick (coasts on current vx)', () => {
    const npc = makeNpc({ x: 0.5, vx: 0.01 });
    const items = [restingItem({ x: 0.1 })]; // food to the LEFT
    const moved = moveNpc(npc, items, 0.1, RETARGET + 1);

    // Off a retarget tick it keeps its rightward vx (does not flip toward the left-side food).
    expect(moved.vx).toBe(0.01);
  });

  it('reverses heading at the right wall instead of grinding into the edge', () => {
    const { maxX } = FRENZY.playerDriftZone;
    const npc = makeNpc({ x: maxX, vx: 0.02 }); // already pinned to the wall, still pushing right

    const moved = moveNpc(npc, [], 0.1, RETARGET + 1); // non-retarget: keeps vx, so it hits the wall

    expect(moved.x).toBe(maxX); // clamped, can't advance past the wall
    expect(moved.vx).toBe(-0.02); // and bounced back away from it
  });

  it('cruises along its current leftward heading when no food is in reach', () => {
    const npc = makeNpc({ x: 0.5, vx: -0.005 }); // heading left, no items
    const moved = moveNpc(npc, [], 0.1, RETARGET);

    // On a retarget tick with no target it eases to a gentle cruise at stage speed, keeping the leftward heading.
    expect(moved.vx).toBeCloseTo(-npc.body[1].speed, 5);
  });

  it('defaults a parked NPC (vx 0) to a rightward cruise when no food is in reach', () => {
    const npc = makeNpc({ x: 0.5, vx: 0 });
    const moved = moveNpc(npc, [], 0.1, RETARGET);

    expect(moved.vx).toBeCloseTo(npc.body[1].speed, 5);
  });
});
