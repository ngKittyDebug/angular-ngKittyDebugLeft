import { describe, expect, it } from 'vitest';

import {
  hitTestItem,
  resolveNudge,
  resolveNudgeFromCenter,
  resolveSceneTap,
} from './pointer-intent';

// A world rect offset from the viewport origin, so the tests exercise the rect-relative normalization (not raw
// client coords). Centre is at client (500, 250).
const WORLD = { left: 100, top: 50, width: 800, height: 400 };

function elementWith(className: string | null): Element {
  const element = document.createElement('div');

  if (className !== null) {
    element.className = className;
  }

  return element;
}

describe('resolveSceneTap', () => {
  it('normalizes the press to the 0..1 world point relative to the world rect', () => {
    const intent = resolveSceneTap(WORLD, 500, 250, elementWith(null));

    expect(intent.x).toBeCloseTo(0.5);
    expect(intent.y).toBeCloseTo(0.5);
  });

  it('clamps a press landing in the letterbox margin to the 0..1 range', () => {
    const intent = resolveSceneTap(WORLD, 0, 0, elementWith(null));

    expect(intent.x).toBe(0);
    expect(intent.y).toBe(0);
  });

  it('spawns the miss bubble and steers when the press lands on open water', () => {
    const intent = resolveSceneTap(WORLD, 500, 250, elementWith(null));

    expect(intent.spawnBurst).toBe(true);
    expect(intent.steer).toBe(true);
  });

  it('suppresses both the bubble and steering when the press lands on an item', () => {
    const intent = resolveSceneTap(WORLD, 500, 250, elementWith('scene__item'));

    expect(intent.spawnBurst).toBe(false);
    expect(intent.steer).toBe(false);
  });

  it('still spawns the bubble but suppresses steering when the press lands on a poke target', () => {
    const intent = resolveSceneTap(WORLD, 500, 250, elementWith('scene__poke'));

    expect(intent.spawnBurst).toBe(true);
    expect(intent.steer).toBe(false);
  });
});

describe('resolveNudge', () => {
  const BUTTON = { left: 0, top: 0, width: 100, height: 100 };

  it('points away from the tapped side: a press on the right edge shoves left', () => {
    expect(resolveNudge(BUTTON, 100, 50)).toEqual({ x: -1, y: 0 });
  });

  it('points away from the tapped side: a press on the top edge shoves down', () => {
    expect(resolveNudge(BUTTON, 50, 0)).toEqual({ x: 0, y: 1 });
  });

  it('falls back to a straight-up shove for a dead-centre press', () => {
    expect(resolveNudge(BUTTON, 50, 50)).toEqual({ x: 0, y: -1 });
  });

  it('returns a unit vector for an off-centre press', () => {
    const nudge = resolveNudge(BUTTON, 100, 100);

    expect(Math.hypot(nudge.x, nudge.y)).toBeCloseTo(1);
  });
});

describe('resolveNudgeFromCenter', () => {
  // Canvas bomb at the world centre. The tap point is itself normalized (0..1), so — with no DOM rect to measure —
  // the shove points FROM the tap toward the item's world centre, i.e. away from the tapped side, like resolveNudge.
  const BOMB = { x: 0.5, y: 0.5 };

  it('points away from the tapped side: a press left of centre shoves right', () => {
    const nudge = resolveNudgeFromCenter(BOMB, 0.45, 0.5);

    expect(nudge.x).toBeGreaterThan(0);
    expect(nudge.y).toBeCloseTo(0);
  });

  it('falls back to a straight-up shove for a dead-centre press', () => {
    expect(resolveNudgeFromCenter(BOMB, 0.5, 0.5)).toEqual({ x: 0, y: -1 });
  });

  it('returns a unit vector for an off-centre press', () => {
    const nudge = resolveNudgeFromCenter(BOMB, 0.45, 0.45);

    expect(Math.hypot(nudge.x, nudge.y)).toBeCloseTo(1);
  });
});

describe('hitTestItem', () => {
  // Item centred at the normalized world point (0.5, 0.5); a 0.05 × 0.04 normalized half tap box (the world is
  // taller than wide, so the per-axis extents differ).
  const CENTRE = { id: 'a', x: 0.5, y: 0.5 };
  const HALF_X = 0.05;
  const HALF_Y = 0.04;

  it('returns the item whose tap box contains the press', () => {
    expect(hitTestItem([CENTRE], 0.5, 0.5, HALF_X, HALF_Y)).toBe('a');
    expect(hitTestItem([CENTRE], 0.54, 0.46, HALF_X, HALF_Y)).toBe('a');
  });

  it('returns null for a press in open water, past every tap box', () => {
    expect(hitTestItem([CENTRE], 0.6, 0.5, HALF_X, HALF_Y)).toBeNull();
    expect(hitTestItem([], 0.5, 0.5, HALF_X, HALF_Y)).toBeNull();
  });

  it('returns the topmost item (last in draw order) when boxes overlap', () => {
    const under = { id: 'under', x: 0.5, y: 0.5 };
    const over = { id: 'over', x: 0.5, y: 0.5 };

    expect(hitTestItem([under, over], 0.5, 0.5, HALF_X, HALF_Y)).toBe('over');
  });

  it('uses the per-axis half-extent (the tighter y box rejects a vertically-far press x accepts)', () => {
    expect(hitTestItem([CENTRE], 0.5, 0.55, HALF_X, HALF_Y)).toBeNull();
    expect(hitTestItem([CENTRE], 0.5, 0.53, HALF_X, HALF_Y)).toBe('a');
  });
});
